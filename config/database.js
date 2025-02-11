const { Sequelize } = require('sequelize');

const DB_HOST = 'dev.vm';
const DB_USER = 'xiaobai';
const DB_PASSWORD = '122333';
const DB_NAME = 'olap_mddm_meta';
// const DB_PORT = '3306';
const DB_DIALECT ='mysql';

// 连接到 MySQL 数据库
const sequelize_conn = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  dialect: DB_DIALECT,
  // logging: (sqlstr) => console.log(`\nSQL >>>>>>\n${sqlstr}\n<<<<<< sql ending >>>>>>`)
});

// 导出 sequelize_conn 实例
module.exports = sequelize_conn;
