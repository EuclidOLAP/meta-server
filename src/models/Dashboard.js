const { DataTypes } = require("sequelize");
const sequelize_conn = require("../config/database");

const Dashboard = sequelize_conn.define(
  "Dashboard",
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    created_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: 0,
    },
    updated_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      defaultValue: 0,
    },
    description: {
      type: DataTypes.TEXT,
    },
    json_str: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: "dashboard",
    freezeTableName: true,
    timestamps: true,
    underscored: true,
  }
);

module.exports = Dashboard;
