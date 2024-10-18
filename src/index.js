const express = require('express');
const app = express();

// 设置端口号，默认 3000
const PORT = process.env.PORT || 8763;

// 根路由响应
app.get('/', (req, res) => {
  res.send('<h1>EuclidOLAP Meta Server.</h1>');
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Meta-server is running on port ${PORT}`);
});
