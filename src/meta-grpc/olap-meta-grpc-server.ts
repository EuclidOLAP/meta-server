const grpc = require("@grpc/grpc-js");
const protoLoader = require("@grpc/proto-loader");

const CalculatedMetric = require("../models/CalculatedMetric");

// const Cube = require("../models/Cube");
import Cube from "../database/Cube";
import UserOlapModelAccess from "../database/UserOlapModelAccess";

const DimensionRole = require("../models/DimensionRole");
const Level = require("../models/Level");
const Dimension = require("../models/Dimension");
const Member = require("../models/Member");
const { OlapEntityType, getOlapEntityTypeByGid } = require("../utils");

// 1. 加载 .proto 文件
const PROTO_PATH = "./proto/olapmeta.proto"; // 根据你的实际路径调整
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
function getCubeByGid(call: any, callback: any) {
  Cube.findOne({
    where: {
      gid: call.request.gid,
    },
  })
    .then((cube: any) => {
      if (cube) {
        const cubeMeta = {
          gid: cube.gid,
          name: cube.name,
        };
        callback(null, { cubeMeta });
      } else {
        callback(new Error("Cube not found"), null);
      }
    })
    .catch((err: any) => {
      callback(err, null);
    });
}

function getCubeByName(call: any, callback: any) {
  Cube.findOne({
    where: {
      name: call.request.name,
    },
  })
    .then((cube: any) => {
      if (cube) {
        const cubeMeta = {
          gid: cube.gid,
          name: cube.name,
        };
        callback(null, { cubeMeta });
      } else {
        callback(new Error("Cube not found"), null);
      }
    })
    .catch((err: any) => {
      callback(err, null);
    });
}

function getDimensionRolesByCubeGid(call: any, callback: any) {
  // 使用 Cube GID 查询 DimensionRole 数据
  DimensionRole.findAll({
    where: {
      cubeGid: call.request.gid, // 传入的 Cube GID
    },
    order: [["gid", "ASC"]], // 按 gid 从小到大排序
  })
    .then((dimensionRoles: any) => {
      // 如果找到数据，则返回数据
      if (dimensionRoles && dimensionRoles.length > 0) {
        // 构造返回的响应数据
        const response = {
          dimensionRoles: dimensionRoles.map((role: any) => ({
            gid: role.gid,
            name: role.name,
            cubeGid: role.cubeGid,
            dimensionGid: role.dimensionGid,
            measureFlag: role.measureFlag,
          })),
        };
        callback(null, response);
      } else {
        callback(
          new Error("No dimension roles found for the given Cube GID"),
          null
        );
      }
    })
    .catch((err: any) => {
      // 错误处理
      callback(err, null);
    });
}

function GetDefaultDimensionMemberByDimensionGid(call: any, callback: any) {
  const dim_gid = call.request.dimensionGid;

  Dimension.findByPk(dim_gid)

    .then((dimension: any) => {
      const def_hier_gid = dimension.defaultHierarchyGid;

      // 查询维度对应的Hierarchy，然后查询Root Member，暂时以维度默认Hierarchy的Root Member为默认Member
      Member.findOne({
        where: {
          hierarchyGid: def_hier_gid,
          parentGid: 0,
        },
      })
        .then((member: any) => {
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
            leaf: member.leaf,
          });
        })
        .catch((err: any) => {
          callback(err, null);
        });
    }) // then end

    .catch((err: any) => {
      callback(err, null);
    });
}

function GetDimensionRoleByGid(call: any, callback: any) {
  const gid = call.request.dimensionRoleGid; // 获取请求中的 GID

  // 使用 GID 查找 DimensionRole
  DimensionRole.findOne({
    where: { gid }, // 查找对应 GID 的记录
  })
    .then((dimensionRole: any) => {
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
          defaultHierarchyGid: dimensionRole.defaultHierarchyGid,
          measureFlag: dimensionRole.measureFlag,
        };
        callback(null, response); // 返回查询到的数据
      } else {
        // 如果没有找到对应的 DimensionRole，返回错误
        callback(new Error("Dimension Role not found"), null);
      }
    })
    .catch((err: any) => {
      // 错误处理
      callback(err, null);
    });
}

function GetDimensionRoleByName(call: any, callback: any) {
  const { cubeGid, dimensionRoleName } = call.request; // 获取请求中的 Cube GID 和 DimensionRole 名称

  // 使用 cubeGid 和 dimensionRoleName 查找 DimensionRole
  DimensionRole.findOne({
    where: {
      cubeGid: cubeGid,
      name: dimensionRoleName,
    },
  })
    .then((dimensionRole: any) => {
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
          measureFlag: dimensionRole.measureFlag,
        };
        callback(null, response); // 返回查询到的数据
      } else {
        // 如果没有找到 DimensionRole，返回错误
        callback(new Error("Dimension Role not found"), null);
      }
    })
    .catch((err: any) => {
      // 错误处理
      callback(err, null);
    });
}

async function LocateUniversalOlapEntityByGid(call: any, callback: any) {
  const { originGid, targetEntityGid } = call.request;

  let result = {
    olapEntityClass: "Nothing",
  };

  switch (getOlapEntityTypeByGid(originGid)) {
    case OlapEntityType.DIMENSION_ROLE:
      const dim_role = await DimensionRole.findByPk(originGid);
      const dim_gid = dim_role.dataValues.dimensionGid;
      const member = await Member.findOne({
        where: {
          gid: targetEntityGid,
          dimensionGid: dim_gid,
        },
      });
      result = { olapEntityClass: "Member", ...member.dataValues };
      break;
  }

  callback(null, result);
}

async function LocateUniversalOlapEntityByName(call: any, callback: any) {
  console.log(
    "// todo LocateUniversalOlapEntityByName .......................................... process.exit ..........."
  );
  process.exit(0);
  const dim = await Dimension.findByPk(100000000000003);
  let result = { olapEntityClass: "Dimension", ...dim.dataValues };
  callback(null, result);
}

async function GetUniversalOlapEntityByGid(call: any, callback: any) {
  const { universalOlapEntityGid } = call.request;

  let result = {
    olapEntityClass: "Nothing............",
  };

  switch (getOlapEntityTypeByGid(universalOlapEntityGid)) {
    case OlapEntityType.MEMBER:
      const member = await Member.findByPk(universalOlapEntityGid);
      result = { olapEntityClass: "Member", ...member.dataValues };
      break;
  }

  callback(null, result);
}

async function GetChildMembersByGid(call: any, callback: any) {
  let childMembers = await Member.findAll({
    where: {
      parentGid: call.request.parentMemberGid,
    },
  });

  if (childMembers && childMembers.length > 0) {
    const response = {
      childMembers: childMembers.map((member: any) => ({
        gid: member.gid,
        name: member.name,
        dimensionGid: member.dimensionGid,
        hierarchyGid: member.hierarchyGid,
        levelGid: member.levelGid,
        level: member.level,
        parentGid: member.parentGid,
      })),
    };
    callback(null, response);
  } else {
    callback(
      new Error("No child members found for the given parent member GID"),
      null
    );
  }
}

async function GetAllDimensionRoles(call: any, callback: any) {
  try {
    const dimensionRoles = await DimensionRole.findAll({
      order: [["gid", "ASC"]],
    });

    if (dimensionRoles && dimensionRoles.length > 0) {
      const response = {
        dimensionRoles: dimensionRoles.map((role: any) => ({
          gid: role.gid,
          code: role.code,
          name: role.name,
          alias: role.alias,
          display: role.display,
          created_by: role.created_by,
          updated_by: role.updated_by,
          description: role.description,
          cubeGid: role.cubeGid,
          dimensionGid: role.dimensionGid,
          measureFlag: role.measureFlag,
          defaultHierarchyGid: role.defaultHierarchyGid,
        })),
      };
      callback(null, response);
    } else {
      callback(new Error("No DimensionRoles found"), null);
    }
  } catch (err) {
    callback(err, null);
  }
}

async function GetAllLevels(call: any, callback: any) {
  try {
    const levels = await Level.findAll({
      order: [["gid", "ASC"]],
    });

    if (levels && levels.length > 0) {
      const response = {
        levels: levels.map((lv: any) => ({
          olapEntityClass: "Level",
          gid: lv.gid,
          name: lv.name,
          // measureIndex: 0,
          level: lv.level,
          // parentGid: 0,
          dimensionGid: lv.dimensionGid,
          hierarchyGid: lv.hierarchyGid,
          openingPeriodGid: lv.openingPeriodGid,
          closingPeriodGid: lv.closingPeriodGid,
        })),
      };
      callback(null, response);
    } else {
      callback(new Error("No Levels found"), null);
    }
  } catch (err) {
    callback(err, null);
  }
}

async function GetAllMembers(call: any, callback: any) {
  try {
    const members = await Member.findAll({
      order: [["gid", "ASC"]],
    });

    if (members && members.length > 0) {
      const response = {
        members: members.map((member: any) => ({
          gid: member.gid,
          name: member.name,
          dimensionGid: member.dimensionGid,
          hierarchyGid: member.hierarchyGid,
          levelGid: member.levelGid,
          level: member.level,
          parentGid: member.parentGid,
          leaf: member.leaf,
        })),
      };
      callback(null, response);
    } else {
      callback(new Error("No Members found"), null);
    }
  } catch (err) {
    callback(err, null);
  }
}

async function GetAllCubes(call: any, callback: any) {
  try {
    const cubes = await Cube.findAll();

    if (cubes && cubes.length > 0) {
      const response = {
        cubes: cubes.map((cube: any) => ({
          gid: cube.gid,
          name: cube.name,
        })),
      };
      callback(null, response);
    } else {
      callback(new Error("No Cubes found"), null);
    }
  } catch (err) {
    callback(err, null);
  }
}

async function GetAllFormulaMembers(call: any, callback: any) {
  try {
    const formulaMembers = await CalculatedMetric.findAll();

    // if (formulaMembers && formulaMembers.length > 0) {
    const response = {
      formulaMembers: formulaMembers.map((fm: any) => ({
        olapEntityClass: "FormulaMember",
        gid: fm.dataValues.gid,
        name: fm.dataValues.name,
        level: fm.dataValues.level,
        levelGid: fm.dataValues.levelGid,
        dimensionGid: fm.dataValues.dimensionGid,
        hierarchyGid: fm.dataValues.hierarchyGid,
        cubeGid: fm.dataValues.cubeGid,
        dimensionRoleGid: fm.dataValues.dimensionRoleGid,
        mountPointGid: fm.dataValues.mountPointGid,
        exp: fm.dataValues.exp,
      })),
    };
    callback(null, response);
    // } else {
    //   callback(new Error("No FormulaMembers found"), null);
    // }
  } catch (err) {
    callback(err, null);
  }
}

async function LoadUserOlapModelAccesses(call: any, callback: any) {
  try {
    const accesses: UserOlapModelAccess[] = await UserOlapModelAccess.findAll({
      where: {
        user_name: call.request.user_name,
      },
    });

    const response = {
      model_accesses: accesses,
    };

    callback(null, response);
  } catch (err) {
    callback(err, null);
  }
}

const startMetaGrpcServer = () => {
  // 3. 创建 gRPC 服务
  const server = new grpc.Server();
  server.addService(olapmeta.OlapMetaService.service, {
    GetCubeByGid: getCubeByGid,
    GetCubeByName: getCubeByName,
    GetDimensionRolesByCubeGid: getDimensionRolesByCubeGid,
    GetDefaultDimensionMemberByDimensionGid:
      GetDefaultDimensionMemberByDimensionGid,
    GetDimensionRoleByGid: GetDimensionRoleByGid,
    GetDimensionRoleByName: GetDimensionRoleByName,
    LocateUniversalOlapEntityByGid: LocateUniversalOlapEntityByGid,
    LocateUniversalOlapEntityByName: LocateUniversalOlapEntityByName,
    GetUniversalOlapEntityByGid: GetUniversalOlapEntityByGid,
    GetChildMembersByGid,
    GetAllDimensionRoles,
    GetAllLevels,
    GetAllMembers,
    GetAllCubes,
    GetAllFormulaMembers,
    LoadUserOlapModelAccesses,
  });

  // 4. 启动服务端
  const port = "50051";
  server.bindAsync(
    `0.0.0.0:${port}`,
    grpc.ServerCredentials.createInsecure(),
    () => {
      console.log(`Server running at http://127.0.0.1:${port}`);
    }
  );

  console.log("Starting meta gRPC server...");
};

export default startMetaGrpcServer;
