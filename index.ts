import express from "express";
import cors from "cors";

// import orderRoutes from "./src/routes/order";

const app = express();

app.use(
  cors({
    origin: ["http://dev.vm:18766", "http://analysis:8766"], // 允许前端所在的域名
    methods: ["GET", "POST"], // 允许的请求方法
    credentials: true, // 处理认证或 cookie 时启用
  })
);

app.use(express.json());

// 定义一个简单的路由
app.get("/", (req, res) => {
  res.send("Hello from Express + TypeScript!");
});

// mock api
app.get("/mock", (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, code: "123_000", value: 101 },
      { id: 2, code: "qwe_SSS", value: 202 },
    ],
  });
});

// // 挂载订单路由
// app.use("/orders", orderRoutes);

// 启动服务器
const PORT = 8763;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
