import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";
import metaRoutes from "./routes/meta-restful-api";
import adhocRoutes from "./routes/adhoc-restful";
import authRoutes from "./routes/auth";
import { initAdminUsers } from "./permission/permission";
import startMetaGrpcServer from "./meta-grpc/olap-meta-grpc-server";

export function startup_olap_meta_service() {
  // ############################################################
  // ##             Initialize system (admin users etc.)       ##
  // ############################################################
  initAdminUsers();

  // ############################################################
  // ##             Create and configure Express app           ##
  // ############################################################
  const app = express();

  // // ############################################################
  // // ##        前置通知（Before Advice）: 日志记录、身份验证等    ##
  // // ############################################################
  // const logRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  //   console.log(`收到请求: ${req.method} ${req.originalUrl}`);
  //   next();  // 继续执行后续中间件或路由
  // };
  // // 注册全局前置通知
  // app.use(logRequest); // 前置通知

  app.use(
    cors({
      origin: ["http://dev.vm:18766", "http://dev.vm:8766"], // allowed frontend domains
      methods: ["GET", "POST", "DELETE"], // allowed request methods
      credentials: true, // enable cookies or auth headers
    })
  );
  app.use(express.json()); // parse JSON request body
  app.use(cookieParser()); // parse cookies

  // ############################################################
  // ##                  Register route modules                ##
  // ############################################################
  app.use("/auth", authRoutes); // authentication routes
  app.use("/api", metaRoutes); // metadata routes
  app.use("/md-query", adhocRoutes); // ad-hoc query routes

  // // ############################################################
  // // ##        后置通知（After Advice）: 修改响应数据等          ##
  // // ############################################################
  // const modifyResponse = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  //   const originalSend = res.send;  // 保存原始的 send 方法
  //   res.send = (body: any) => {
  //     console.log("发送响应前修改数据");
  //     const modifiedBody = { ...JSON.parse(body), modified: true };  // 对响应数据进行修改
  //     originalSend.call(res, JSON.stringify(modifiedBody));  // 发送修改后的响应
  //   };
  //   next();  // 继续执行后续中间件或路由
  // };
  // // 注册后置通知
  // app.use(modifyResponse);  // 后置通知

  // ############################################################
  // ##                  Start HTTP server                     ##
  // ############################################################
  const PORT = 8763;
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}.`);
  });

  // ############################################################
  // ##                  Start Meta gRPC server                ##
  // ############################################################
  startMetaGrpcServer();
}
