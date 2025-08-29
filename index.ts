import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";

// import orderRoutes from "./src/routes/order";
import metaRoutes from "./src/routes/meta-restful-api";
import adhocRoutes from "./src/routes/adhoc-restful";
import authRoutes from "./src/routes/auth";

import { initAdminUsers } from "./src/permission/permission";

initAdminUsers();

const app = express();

app.use(
  cors({
    origin: ["http://dev.vm:18766", "http://analysis:8766"], // 允许前端所在的域名
    methods: ["GET", "POST"], // 允许的请求方法
    credentials: true, // 处理认证或 cookie 时启用
  })
);

app.use(express.json());
app.use(cookieParser());

// 公开路由
app.use("/auth", authRoutes);

app.use("/api", metaRoutes);
app.use("/md-query", adhocRoutes);

// 启动服务器
const PORT = 8763;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}.`);
});

// ############################################################
// ##               start the meta grpc server               ##
// ############################################################
import startMetaGrpcServer from "./src/meta-grpc/olap-meta-grpc-server";
startMetaGrpcServer();
