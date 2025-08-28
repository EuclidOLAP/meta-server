import { DataTypes, Model } from "sequelize";
import sequelize_conn from "../config/database";
import { User as UserType } from "../../shared/types";

class User extends Model implements UserType {
  public user_name!: string;
  public pswd_hash!: string;
  public is_admin!: boolean;
  public created_at!: Date;
  public updated_at!: Date;
  public description?: string;
}

User.init(
  {
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      primaryKey: true,
    },
    pswd_hash: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    is_admin: {
      type: DataTypes.BOOLEAN, // maps to MySQL tinyint(1)
      defaultValue: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    created_at: {
      type: DataTypes.DATE,
      // defaultValue: DataTypes.NOW,
      allowNull: false,
    },
    updated_at: {
      type: DataTypes.DATE,
      // defaultValue: DataTypes.NOW,
      allowNull: false,
    },
  },
  {
    sequelize: sequelize_conn,
    tableName: "user",
    freezeTableName: true,
    timestamps: true, // automatically maps created_at, updated_at
    underscored: true, // maps camelCase <-> snake_case
  }
);

export default User;
