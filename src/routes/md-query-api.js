// // the file be useless at 2025-09-11 18:22:08, because it is not used in the project.



// const jsyaml = require('js-yaml');
//                     const express = require('express');

// // multi-dimensional query API
// // const grpc = require('@grpc/grpc-js');
// // const { olapProto } = require('./grpc-client');

//                     const { olapClient } = require('../grpc-client-impl');
//                     const MdxExecutionLog = require('../../models/MdxExecutionLog');






//                     const mdq_api_router = express.Router();







//                     mdq_api_router.post('/mdx', async (request, response) => {

//                       const { mdx } = request.body;

//                       console.log(mdx);
                      
//                       // 异步执行存储到数据库中，并不需要处理返回值，无需 await
//                       /* let execution_log = await */ MdxExecutionLog.create({
//                         mdx: mdx
//                       });

//                       // 定义要调用的服务端方法参数
//                       const requestPayload = {
//                         operation_type: 'MDX',   // 示例操作类型，具体根据实际需求调整
//                         statement: mdx, // 示例 MDX 查询语句
//                       };
//                       // 调用 ExecuteOperation 方法
//                       olapClient.ExecuteOperation(requestPayload, (error, grpc_olap_response) => {
//                         if (error) {
//                           console.error('Error calling ExecuteOperation:', error);
//                           return;
//                         }

//                         // 处理成功的响应
//                         console.log('Grpc Response from ExecuteOperation:', grpc_olap_response);

//                         response.status(200).json(grpc_olap_response.vectors);
//                       });
                      
//                     });








//                     // 工具函数
//                     function formatCol(col) {
//                       if (!Array.isArray(col) || col.length === 0) return '{}';
//                       const transposed = col[0].map((_, i) => col.map(row => row[i]));
//                       return `{ ${transposed.map(tuple => `(${tuple.join(', ')})`).join(', ')} }`;
//                     }

//                     function formatRow(row) {
//                       if (!Array.isArray(row)) return '{}';
//                       return `{ ${row.map(pair => `(${pair.join(',')})`).join(', ')} }`;
//                     }

//                     function formatSlice(slice) {
//                       if (!Array.isArray(slice)) return '()';
//                       return `(${slice.join(', ')})`;
//                     }











// // 路由定义
// mdq_api_router.post('/yaml', async (request, response) => {
//   const { yaml } = request.body;
//   if (typeof yaml !== 'string') {
//     return response.status(400).json({ error: 'Invalid or missing YAML string in request body.' });
//   }

//   let yaml_mdx_str = '';

//   try {
//     const parsed = jsyaml.load(yaml);
//     console.log("✅ YAML parsed successfully.");

//     const type = parsed?.type || '';
//     const model = parsed?.model;
//     const col = parsed?.col;
//     const row = parsed?.row;
//     const slice = parsed?.slice;

//     if (!model || !col || !row || !slice) {
//       return response.status(400).json({ error: 'YAML missing required fields: model, col, row, or slice.' });
//     }

//     const mdxCube = model;
//     const mdxColumns = formatCol(col);
//     const mdxRows = formatRow(row);
//     const mdxWhere = formatSlice(slice);

//     yaml_mdx_str = `select
//       ${mdxColumns}
//       on columns,
//       ${mdxRows}
//       on rows
//     from ${mdxCube}
//     where ${mdxWhere}`;

//     console.log("📄 Generated MDX from YAML:");
//     console.log(yaml_mdx_str);

//     // 异步写入日志（不 await，后台执行）
//     MdxExecutionLog.create({ mdx: yaml_mdx_str });

//     // 构造请求
//     const requestPayload = {
//       operation_type: 'MDX',
//       statement: yaml_mdx_str,
//     };

//     // 执行 gRPC 请求
//     olapClient.ExecuteOperation(requestPayload, (error, grpc_olap_response) => {
//       if (error) {
//         console.error('❌ gRPC call failed:', error);
//         return response.status(500).json({ error: 'gRPC call failed', details: error.message });
//       }

//       console.log('✅ gRPC response received.');
//       return response.status(200).json(grpc_olap_response.vectors);
//     });

//   } catch (e) {
//     console.error("❌ Failed to parse YAML:", e);
//     return response.status(400).json({ error: 'Invalid YAML', details: e.message });
//   }
// });














//                     module.exports = mdq_api_router;
