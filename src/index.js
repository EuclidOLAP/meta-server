const express = require('express');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');  // 引入 CORS 中间件

const dimensionRoutes = require('./routes/dimension'); // 引入维度路由
const md_query_api_routes = require('./routes/md-query-api');

// 设置端口号，默认 3000
const PORT = process.env.PORT || 8763;

// 配置 CORS
app.use(cors({
  origin: 'http://dev.vm:8766',  // 允许前端所在的域名
  methods: ['GET', 'POST'],      // 允许的请求方法
  credentials: true              // 如果需要处理认证或cookie，可以启用此选项
}));

app.use(bodyParser.json()); // 解析 JSON 请求体

// 使用维度路由
app.use('/api', dimensionRoutes);

app.use('/md-query', md_query_api_routes);

// 根路由响应
app.get('/', (req, res) => {
  res.send('<h1>EuclidOLAP Meta Server</h1>');
});

// API 路由，返回一些模拟数据
app.get('/api/data', (req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, name: '产品A', value: 100 },
      { id: 2, name: '产品B', value: 200 },
      { id: 3, name: '产品C', value: 300 }
    ]
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Meta-server is running on port ${PORT}`);
});
