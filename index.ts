import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import "dotenv/config";

import metaRoutes from "./src/routes/meta-restful-api";
import adhocRoutes from "./src/routes/adhoc-restful";
import authRoutes from "./src/routes/auth";

import { initAdminUsers } from "./src/permission/permission";

// ############################################################
// ##             Initialize system (admin users etc.)       ##
// ############################################################
initAdminUsers();

// ############################################################
// ##             Create and configure Express app           ##
// ############################################################
const app = express();
app.use(
  cors({
    origin: ["http://dev.vm:18766", "http://analysis:8766"], // allowed frontend domains
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
import startMetaGrpcServer from "./src/meta-grpc/olap-meta-grpc-server";
startMetaGrpcServer();
