const path = require('path'); // 用于构造路径
const protoLoader = require('@grpc/proto-loader'); // 加载 .proto 文件
const grpc = require('@grpc/grpc-js'); // gRPC 客户端库

// 定义 .proto 文件的路径
const PROTO_PATH = path.resolve(__dirname, '../proto/euclidolap.proto');

// 使用 protoLoader 加载 .proto 文件
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,          // 保留字段大小写
    longs: String,           // 将 int64 转换为字符串
    enums: String,           // 将枚举类型转换为字符串
    defaults: true,          // 包含默认值
    oneofs: true,            // 包含 oneof 字段
});

// 加载 gRPC 服务定义
const olapProto = grpc.loadPackageDefinition(packageDefinition).euclidolap;

// console.log('Loaded proto >>>>>>>>>>>>>>>>>>>:::::::::::::', olapProto);

module.exports = {
    olapProto,
};
