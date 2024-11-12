const { Sequelize } = require('sequelize');

// 连接到 MySQL 数据库
const sequelize_conn = new Sequelize('olap_mddm_meta', 'xiaobai', '122333', {
  host: 'dev.vm',
  dialect: 'mysql',
  logging: (sqlstr) => console.log(`\nSQL >>>>>> ${sqlstr}\n`)
});

// 导出 sequelize_conn 实例
module.exports = sequelize_conn;
