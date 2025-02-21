// multi-dimensional query API

// const grpc = require('@grpc/grpc-js');
// const { olapProto } = require('./grpc-client');
const { olapClient } = require('../grpc-client-impl');

const express = require('express');
const mdq_api_router = express.Router();

const MdxExecutionLog = require('../../models/MdxExecutionLog');

mdq_api_router.post('/mdx', async (request, response) => {

  const { mdx } = request.body;

  console.log(mdx);
  
  // 异步执行存储到数据库中，并不需要处理返回值，无需 await
  /* let execution_log = await */ MdxExecutionLog.create({
    mdx: mdx
  });

  // 定义要调用的服务端方法参数
  const requestPayload = {
    operation_type: 'MDX',   // 示例操作类型，具体根据实际需求调整
    statement: mdx, // 示例 MDX 查询语句
  };
  // 调用 ExecuteOperation 方法
  olapClient.ExecuteOperation(requestPayload, (error, grpc_olap_response) => {
    if (error) {
      console.error('Error calling ExecuteOperation:', error);
      return;
    }

    // 处理成功的响应
    console.log('Grpc Response from ExecuteOperation:', grpc_olap_response);

    response.status(200).json(grpc_olap_response.vectors);
  });

});

module.exports = mdq_api_router;
