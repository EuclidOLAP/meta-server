import { DataTypes, Model } from "sequelize";
import sequelize_conn from "../config/database";
import { User as UserType } from "@euclidolap/olap-model";

class User extends Model<UserType> implements UserType {
  public user_name!: string;
  public pswd_hash!: string;
  public is_admin!: boolean;
  // public code?: string;
  // public alias?: string;
  // public display?: string;
  public created_at?: Date;
  public updated_at?: Date;
  public created_by?: number;
  public updated_by?: number;
  public description?: string;
}

User.init(
  {
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      primaryKey: true,
    },
    pswd_hash: { type: DataTypes.STRING(255), allowNull: false },
    is_admin: { type: DataTypes.BOOLEAN, defaultValue: false },
    // code: { type: DataTypes.STRING(255), allowNull: true },
    // alias: { type: DataTypes.STRING(255), allowNull: true },
    // display: { type: DataTypes.STRING(255), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      defaultValue: 0,
    },
    updated_by: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      defaultValue: 0,
    },
  },
  {
    sequelize: sequelize_conn,
    tableName: "user",
    freezeTableName: true,
    timestamps: true, // 自动管理 created_at, updated_at
    underscored: true, // 驼峰 <-> 下划线
  }
);

export default User;
