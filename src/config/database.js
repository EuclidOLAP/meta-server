const { Sequelize } = require('sequelize');

const DB_HOST = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
// const DB_PORT = '3306';
const DB_DIALECT = process.env.DB_DIALECT;

// 连接到 MySQL 数据库
const sequelize_conn = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: DB_DIALECT,
  logging: false,
  // logging: (sqlstr) => console.log(`\nSQL >>>>>>\n${sqlstr}\n<<<<<< sql ending >>>>>>`)
});

// 导出 sequelize_conn 实例
module.exports = sequelize_conn;
