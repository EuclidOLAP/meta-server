// src/index.tsx
import express from "express";

const app = express();

// 定义一个简单的路由
app.get("/", (req, res) => {
  res.send("Hello from Express + TypeScript!");
});

// mock api
app.get('/mock', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, code: '123_000', value: 101 },
      { id: 2, code: 'qwe_SSS', value: 202 },
    ]
  });
});

// 启动服务器
const PORT = 8763;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
