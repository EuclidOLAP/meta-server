// File: Member.ts
import { DataTypes, Model, Optional } from "sequelize";
import sequelize_conn from "../config/database";
import { Member as MemberType, OlapModelUtil } from "@euclidolap/olap-model";

// 定义 Member 的 Optional 类型，表示 gid 字段是可选的
interface MemberCreationAttributes extends Optional<MemberType, "gid"> {}

class Member
  extends Model<MemberType, MemberCreationAttributes>
  implements MemberType
{
  public gid!: number; // 主键，数据库自动生成
  public code?: string;
  public name!: string;
  public alias?: string;
  public display?: string;
  public dimensionGid!: number;
  public hierarchyGid!: number;
  public levelGid!: number;
  public level!: number;
  public parentGid!: number;
  public measureIndex!: number;
  public leaf!: boolean;
  public fullPath!: Uint8Array;
  public created_at?: Date;
  public updated_at?: Date;
  public created_by?: number;
  public updated_by?: number;
  public description?: string;

  // 静态方法，调用 OlapModelUtil 处理 fullPath
  public static getGidFullPathInUint64(fullPath?: Uint8Array): number[] {
    if (fullPath) {
      return OlapModelUtil.gidFullPath_uint8Arr_into_uint64Arr(fullPath);
    }
    return [];
  }
}

Member.init(
  {
    gid: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true, // 自动生成主键值
      primaryKey: true, // 主键
    },
    code: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    alias: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    display: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    dimensionGid: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    hierarchyGid: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    levelGid: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    level: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    parentGid: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
    },
    measureIndex: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    leaf: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    fullPath: {
      type: DataTypes.BLOB("tiny"), // Store as binary data (Uint8Array)
      allowNull: true,
    },
    // created_at: {
    //   type: DataTypes.DATE,
    //   allowNull: true,
    // },
    // updated_at: {
    //   type: DataTypes.DATE,
    //   allowNull: true,
    // },
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize: sequelize_conn,
    tableName: "member",
    freezeTableName: true,
    timestamps: true, // Auto-manage created_at / updated_at
    underscored: true, // Automatically convert camelCase to snake_case
  }
);

export default Member;
