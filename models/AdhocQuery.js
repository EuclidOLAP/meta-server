const { DataTypes } = require('sequelize');
const sequelize_conn = require('../config/database');

// 定义 AdhocQuery 模型
const AdhocQuery = sequelize_conn.define('AdhocQuery', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  uuid: {
    type: DataTypes.STRING(255)
  },
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  created_by: {
    type: DataTypes.BIGINT.UNSIGNED
  },
  updated_by: {
    type: DataTypes.BIGINT.UNSIGNED
  },
  description: {
    type: DataTypes.TEXT
  },
  cubeGid: {
    type: DataTypes.BIGINT.UNSIGNED
  },
  jsonStr: {
    type: DataTypes.TEXT
  },
}, {
  tableName: 'adhoc_query',  // 指定数据库中的表名
  freezeTableName: true, // 禁用 Sequelize 自动管理表结构
  timestamps: true,
  underscored: true // 启用驼峰到下划线的自动转换
});

module.exports = AdhocQuery;