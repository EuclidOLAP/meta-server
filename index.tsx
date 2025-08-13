// src/index.tsx
import express from "express";

const app = express();

// 定义一个简单的路由
app.get("/", (req, res) => {
  res.send("Hello from Express + TypeScript!");
});

// 启动服务器
const PORT = 8763;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
