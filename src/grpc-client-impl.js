const grpc = require('@grpc/grpc-js');
const { olapProto } = require('./grpc-client'); // 引入加载的服务定义

// 定义服务端地址（与 olap-core 的监听地址保持一致）
const SERVER_ADDRESS = '127.0.0.1:50052';

// 创建 gRPC 客户端实例
const olapClient = new olapProto.OlapApi(
  SERVER_ADDRESS,

  // todo
  // 创建一个不加密的 gRPC 连接，仅适用于开发或测试环境。
  // 如果需要加密，可以替换为 grpc.credentials.createSsl() 并提供证书。
  grpc.credentials.createInsecure()
);

console.log('gRPC client created <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<', olapClient);

module.exports = {
  olapClient,
};
