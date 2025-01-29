const { DataTypes } = require('sequelize');
const sequelize_conn = require('../config/database');

// 定义 MdxExecutionLog 模型
const MdxExecutionLog = sequelize_conn.define('MdxExecutionLog', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true
  },
  created_by: {
    type: DataTypes.BIGINT.UNSIGNED
  },
  updated_by: {
    type: DataTypes.BIGINT.UNSIGNED
  },
  mdx: {
    type: DataTypes.TEXT
  }
}, {
  tableName: 'mdx_execution_log',  // 指定数据库中的表名
  freezeTableName: true, // 禁用 Sequelize 自动管理表结构
  timestamps: true,
  underscored: true // 启用驼峰到下划线的自动转换
});

module.exports = MdxExecutionLog;