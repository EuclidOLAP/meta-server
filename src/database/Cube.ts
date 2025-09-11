import { DataTypes, Model } from "sequelize";
import sequelize_conn from "../config/database";
import { Cube as CubeType } from "@euclidolap/olap-model";

class Cube extends Model<CubeType> implements CubeType {
  public gid?: number;
  public code?: string;
  public name!: string;
  public alias?: string;
  public display?: string;
  public created_at?: Date;
  public updated_at?: Date;
  public created_by?: number;
  public updated_by?: number;
  public description?: string;
}

Cube.init(
  {
    gid: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    code: { type: DataTypes.STRING(255), allowNull: true },
    name: { type: DataTypes.STRING(255), allowNull: false },
    alias: { type: DataTypes.STRING(255), allowNull: true },
    display: { type: DataTypes.STRING(255), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, defaultValue: 0 },
    updated_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true, defaultValue: 0 },
  },
  {
    sequelize: sequelize_conn,
    tableName: "cube",
    freezeTableName: true,
    timestamps: true,   // 自动管理 created_at / updated_at
    underscored: true,  // 驼峰 <-> 下划线
  }
);

export default Cube;
