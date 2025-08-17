import { Router, Request, Response } from "express";

const { olapClient } = require("../grpc-client-impl");
const MdxExecutionLog = require("../../models/MdxExecutionLog");

// 工具函数
function formatCol(col: any) {
  if (!Array.isArray(col) || col.length === 0) return "{}";
  const transposed = col[0].map((_: any, i: any) => col.map((row) => row[i]));
  return `{ ${transposed
    .map((tuple: any) => `(${tuple.join(", ")})`)
    .join(", ")} }`;
}

function formatRow(row: any) {
  if (!Array.isArray(row)) return "{}";
  return `{ ${row.map((pair) => `(${pair.join(",")})`).join(", ")} }`;
}

function formatSlice(slice: any) {
  if (!Array.isArray(slice)) return "()";
  return `(${slice.join(", ")})`;
}

const adhocRouters = Router();

adhocRouters.post("/mdx", async (request, response) => {
  const { mdx } = request.body;

  console.log(mdx);

  // 异步执行存储到数据库中，并不需要处理返回值，无需 await
  /* let execution_log = await */ MdxExecutionLog.create({
    mdx: mdx,
  });

  // 定义要调用的服务端方法参数
  const requestPayload = {
    operation_type: "MDX", // 示例操作类型，具体根据实际需求调整
    statement: mdx, // 示例 MDX 查询语句
  };
  // 调用 ExecuteOperation 方法
  olapClient.ExecuteOperation(
    requestPayload,
    (error: any, grpc_olap_response: any) => {
      if (error) {
        console.error("Error calling ExecuteOperation:", error);
        return;
      }

      // 处理成功的响应
      console.log("Grpc Response from ExecuteOperation:", grpc_olap_response);

      response.status(200).json(grpc_olap_response.vectors);
    }
  );
});

export default adhocRouters;
