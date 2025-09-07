import { DataTypes, Model, Optional } from "sequelize";
import sequelize_conn from "../config/database";
// import { Cube as CubeType } from "@euclidolap/olap-model";
import { UserOlapModelAccess as UserOlapModelAccessType } from "@euclidolap/olap-model";

// 定义 UserOlapModelAccess 的 Optional 类型，表示 id 字段是可选的
interface UserOlapModelAccessCreationAttributes
  extends Optional<UserOlapModelAccessType, "id"> {}

class UserOlapModelAccess
  extends Model<UserOlapModelAccessType, UserOlapModelAccessCreationAttributes>
  implements UserOlapModelAccessType
{
  public id!: number;
  public user_name!: string;
  public permission_scope?: string;
  public dimension_role_gid?: number;
  public olap_entity_gid!: number;
  public has_access!: boolean;
}

UserOlapModelAccess.init(
  {
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      // comment: 'The name of the user to whom the access is granted.',
    },
    permission_scope: {
      type: DataTypes.STRING(255),
      allowNull: true,
      // comment: 'Describes the scope of the permission, e.g., cube, dimensionRole, or member(role).',
    },
    dimension_role_gid: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      // comment: 'When the value of this field is meaningful, it indicates that the entity access permissions are set within the scope of this dimension role.',
    },
    olap_entity_gid: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      // comment: 'The unique identifier of the OLAP entity (cube, dimension, etc.) to which the access is related.',
    },
    has_access: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      // comment: 'Indicates whether the user has access to the specified OLAP entity.',
    },
  },
  {
    sequelize: sequelize_conn,
    tableName: "user_olap_model_access",
    freezeTableName: true,
    timestamps: true, // Automatically manage created_at / updated_at
    underscored: true, // Convert camelCase to snake_case for column names
  }
);

export default UserOlapModelAccess;
