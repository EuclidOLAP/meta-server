// multi-dimensional query API







// const grpc = require('@grpc/grpc-js');
// const { olapProto } = require('./grpc-client');
const { olapClient } = require('../grpc-client-impl');














const express = require('express');
const mdq_api_router = express.Router();

mdq_api_router.post('/mdx', async (request, response) => {


  const { mdx } = request.body;

  console.log(mdx);







  // 定义要调用的服务端方法参数
const requestPayload = {
  operation_type: 'MDX',   // 示例操作类型，具体根据实际需求调整
  statement: mdx, // 示例 MDX 查询语句
};
// 调用 ExecuteOperation 方法
olapClient.ExecuteOperation(requestPayload, (error, response) => {
  if (error) {
    console.error('Error calling ExecuteOperation:', error);
    return;
  }

  // 处理成功的响应
  console.log('Response from ExecuteOperation:', response);
});










  response.status(200).json({ website: 'www.euclidolap.com' });

});

module.exports = mdq_api_router;
