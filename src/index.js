const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');  // 引入 CORS 中间件

const dimensionRoutes = require('./routes/dimension'); // 引入维度路由
const md_query_api_routes = require('./routes/md-query-api');

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
  // 假设你有一个根据 GID 查询的实现逻辑
  const gid = call.request.gid;
  console.log(`Fetching Cube with GID: ${gid}`);
  // 假数据，实际应该从数据库或其他存储获取
  const cubeMeta = {
    gid: gid * 100,
    name: `Cube-${gid}`
  };
  callback(null, { cubeMeta });
}

function getCubeByName(call, callback) {
  const name = call.request.name;
  console.log(`Fetching Cube with Name: ${name}`);
  // 假数据，实际应该从数据库或其他存储获取
  const cubeMeta = {
    gid: 99000000123,  // 假设每个 Cube 都有一个 gid
    name: `Cube ... ${name}`
  };
  callback(null, { cubeMeta });
}

// 3. 创建 gRPC 服务
const server = new grpc.Server();
server.addService(olapmeta.OlapMetaService.service, {
  GetCubeByGid: getCubeByGid,
  GetCubeByName: getCubeByName
});

// 4. 启动服务端
const port = '50051';
server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), () => {
  console.log(`Server running at http://127.0.0.1:${port}`);
});