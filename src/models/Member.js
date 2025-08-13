const { DataTypes } = require("sequelize");
const sequelize_conn = require("../config/database");

// 定义 Member 模型
const Member = sequelize_conn.define(
  "Member",
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
    dimensionGid: {
      type: DataTypes.BIGINT.UNSIGNED,
    },
    hierarchyGid: {
      type: DataTypes.BIGINT.UNSIGNED,
    },
    levelGid: {
      type: DataTypes.BIGINT.UNSIGNED,
    },
    level: {
      type: DataTypes.INTEGER.UNSIGNED,
    },
    parentGid: {
      type: DataTypes.BIGINT.UNSIGNED,
    },
    measureIndex: {
      type: DataTypes.INTEGER.UNSIGNED,
    },
    leaf: {
      type: DataTypes.BOOLEAN,
      // allowNull: false,
      defaultValue: true,
    },
    fullPath: {
      type: DataTypes.BLOB("tiny"),
      allowNull: true,
    },
  },
  {
    tableName: "member", // 指定数据库中的表名
    freezeTableName: true, // 禁用 Sequelize 自动管理表结构
    timestamps: true,
    underscored: true, // 启用驼峰到下划线的自动转换
  }
);

module.exports = Member;
