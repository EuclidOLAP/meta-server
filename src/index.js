const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');  // 引入 CORS 中间件

const dimensionRoutes = require('./routes/dimension'); // 引入维度路由
const md_query_api_routes = require('./routes/md-query-api');

const Cube = require('../models/Cube');
const DimensionRole = require('../models/DimensionRole');
const Dimension = require('../models/Dimension');
const Member = require('../models/Member');

const { OlapEntityType, getOlapEntityTypeByGid } = require('./utils');

// 设置端口号，默认 3000
const PORT = process.env.PORT || 8763;

// 配置 CORS
app.use(cors({
  origin: 'http://dev.vm:8766',  // 允许前端所在的域名
  methods: ['GET', 'POST'],      // 允许的请求方法
  credentials: true              // 如果需要处理认证或cookie，可以启用此选项
}));

app.use(bodyParser.json()); // 解析 JSON 请求体

// 使用维度路由
app.use('/api', dimensionRoutes);

app.use('/md-query', md_query_api_routes);

// 根路由响应
app.get('/', (req, res) => {
  res.send('<h1>EuclidOLAP Meta Server</h1>');
});

// API 路由，返回一些模拟数据
app.get('/api/data', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: '产品A', value: 100 },
      { id: 2, name: '产品B', value: 200 },
      { id: 3, name: '产品C', value: 300 }
    ]
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Meta-server is running on port ${PORT}`);
});


/*
 * olap meta grpc server
 */
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');

// 1. 加载 .proto 文件
const PROTO_PATH = './proto/olapmeta.proto';  // 根据你的实际路径调整
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});
const protoDescriptor = grpc.loadPackageDefinition(packageDefinition);
const olapmeta = protoDescriptor.olapmeta;

// 2. 创建服务端并实现服务
function getCubeByGid(call, callback) {

  Cube.findOne({
    where: {
      gid: call.request.gid
    }
  }).then(cube => {
    if (cube) {
      const cubeMeta = {
        gid: cube.gid,
        name: cube.name
      };
      callback(null, { cubeMeta });
    } else {
      callback(new Error('Cube not found'), null);
    }
  }).catch(err => {
    callback(err, null);
  });
}

function getCubeByName(call, callback) {
  Cube.findOne({
    where: {
      name: call.request.name
    }
  }).then(cube => {
    if (cube) {
      const cubeMeta = {
        gid: cube.gid,
        name: cube.name
      };
      callback(null, { cubeMeta });
    } else {
      callback(new Error('Cube not found'), null);
    }
  }).catch(err => {
    callback(err, null);
  });
}

function getDimensionRolesByCubeGid(call, callback) {

    // 使用 Cube GID 查询 DimensionRole 数据
    DimensionRole.findAll({
      where: {
        cubeGid: call.request.gid // 传入的 Cube GID
      },
      order: [['gid', 'ASC']] // 按 gid 从小到大排序
    }).then(dimensionRoles => {
      // 如果找到数据，则返回数据
      if (dimensionRoles && dimensionRoles.length > 0) {
        // 构造返回的响应数据
        const response = {
          dimensionRoles: dimensionRoles.map(role => ({
            gid: role.gid,
            name: role.name,
            cubeGid: role.cubeGid,
            dimensionGid: role.dimensionGid
          }))
        };
        callback(null, response);
      } else {
        callback(new Error('No dimension roles found for the given Cube GID'), null);
      }
    }).catch(err => {
      // 错误处理
      callback(err, null);
    });
}

function GetDefaultDimensionMemberByDimensionGid(call, callback) {

  const dim_gid = call.request.dimensionGid;

  Dimension.findByPk(dim_gid)

    .then(dimension => {

      const def_hier_gid = dimension.defaultHierarchyGid;

      // 查询维度对应的Hierarchy，然后查询Root Member，暂时以维度默认Hierarchy的Root Member为默认Member
      Member.findOne({
        where: {
          hierarchyGid: def_hier_gid,
          parentGid: 0
        }
      }).then(member => {

        console.log(member);

        member = member.dataValues;

        callback(null, {
          gid: member.gid,
          name: member.name,
          dimensionGid: member.dimensionGid,
          hierarchyGid: member.hierarchyGid,
          levelGid: member.levelGid,
          level: member.level,
          parentGid: member.parentGid,
        });

      }).catch(err => {
        callback(err, null);
      });

    }) // then end

    .catch(err => {
      callback(err, null);
    });
}

function GetDimensionRoleByGid(call, callback) {
  const gid = call.request.dimensionRoleGid;  // 获取请求中的 GID

  // 使用 GID 查找 DimensionRole
  DimensionRole.findOne({
    where: { gid }  // 查找对应 GID 的记录
  })
  .then(dimensionRole => {
    if (dimensionRole) {
      // 找到数据后构造返回的响应数据
      const response = {
        gid: dimensionRole.gid,
        code: dimensionRole.code,
        name: dimensionRole.name,
        alias: dimensionRole.alias,
        display: dimensionRole.display,
        created_by: dimensionRole.created_by,
        updated_by: dimensionRole.updated_by,
        description: dimensionRole.description,
        cubeGid: dimensionRole.cubeGid,
        dimensionGid: dimensionRole.dimensionGid,
      };
      callback(null, response);  // 返回查询到的数据
    } else {
      // 如果没有找到对应的 DimensionRole，返回错误
      callback(new Error('Dimension Role not found'), null);
    }
  })
  .catch(err => {
    // 错误处理
    callback(err, null);
  });
}

function GetDimensionRoleByName(call, callback) {
  const { cubeGid, dimensionRoleName } = call.request;  // 获取请求中的 Cube GID 和 DimensionRole 名称

  // 使用 cubeGid 和 dimensionRoleName 查找 DimensionRole
  DimensionRole.findOne({
    where: { 
      cubeGid: cubeGid, 
      name: dimensionRoleName 
    }
  })
  .then(dimensionRole => {
    if (dimensionRole) {
      // 如果找到数据，构造返回的响应数据
      const response = {
        gid: dimensionRole.gid,
        code: dimensionRole.code,
        name: dimensionRole.name,
        alias: dimensionRole.alias,
        display: dimensionRole.display,
        created_by: dimensionRole.created_by,
        updated_by: dimensionRole.updated_by,
        description: dimensionRole.description,
        cubeGid: dimensionRole.cubeGid,
        dimensionGid: dimensionRole.dimensionGid,
      };
      callback(null, response);  // 返回查询到的数据
    } else {
      // 如果没有找到 DimensionRole，返回错误
      callback(new Error('Dimension Role not found'), null);
    }
  })
  .catch(err => {
    // 错误处理
    callback(err, null);
  });
}

async function LocateUniversalOlapEntityByGid(call, callback) {

  const { originGid, targetEntityGid } = call.request;

  let result = {
    olapEntityClass: "Nothing",
  };

  switch (getOlapEntityTypeByGid(originGid)) {
    case OlapEntityType.DIMENSION_ROLE:
        const dim_role = await DimensionRole.findByPk(originGid);
        const dim_gid = dim_role.dataValues.dimensionGid
        const member = await Member.findOne({
          where: {
            gid: targetEntityGid,
            dimensionGid: dim_gid
          }
        });
        result = { olapEntityClass: "Member", ...member.dataValues };
        break;
  }

  callback(null, result);
}

async function LocateUniversalOlapEntityByName(call, callback) {
  const dim = await Dimension.findByPk(100000000000003);
  let result = { olapEntityClass: "Dimension", ...dim.dataValues };
  callback(null, result);
}

// 3. 创建 gRPC 服务
const server = new grpc.Server();
server.addService(olapmeta.OlapMetaService.service, {
  GetCubeByGid: getCubeByGid,
  GetCubeByName: getCubeByName,
  GetDimensionRolesByCubeGid: getDimensionRolesByCubeGid,
  GetDefaultDimensionMemberByDimensionGid: GetDefaultDimensionMemberByDimensionGid,
  GetDimensionRoleByGid: GetDimensionRoleByGid,
  GetDimensionRoleByName: GetDimensionRoleByName,
  LocateUniversalOlapEntityByGid: LocateUniversalOlapEntityByGid,
  LocateUniversalOlapEntityByName: LocateUniversalOlapEntityByName,
});

// 4. 启动服务端
const port = '50051';
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
});