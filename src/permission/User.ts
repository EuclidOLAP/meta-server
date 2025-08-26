import { DataTypes, Model } from "sequelize";
import sequelize_conn from "../config/database";

class User extends Model {
  public user_name!: string;
  public pswd_hash!: string;
  public is_admin!: boolean;
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
      comment: "Hashed password for security.",
    },
    is_admin: {
      type: DataTypes.BOOLEAN, // maps to MySQL tinyint(1)
      defaultValue: false,
      comment: "Indicates whether the user is an admin.",
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
