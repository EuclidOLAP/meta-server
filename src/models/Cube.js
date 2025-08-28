const { DataTypes } = require("sequelize");
const sequelize_conn = require("../config/database");

// 定义 Cube 模型
const Cube = sequelize_conn.define(
  "Cube",
  {
    gid: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(255),
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    alias: {
      type: DataTypes.STRING(255),
    },
    display: {
      type: DataTypes.STRING(255),
    },
    created_by: {
      type: DataTypes.BIGINT.UNSIGNED,
    },
    updated_by: {
      type: DataTypes.BIGINT.UNSIGNED,
    },
    description: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "cube", // 指定数据库中的表名
    freezeTableName: true, // 禁用 Sequelize 自动管理表结构
    timestamps: true,
    underscored: true, // 启用驼峰到下划线的自动转换
  }
);

module.exports = Cube;
