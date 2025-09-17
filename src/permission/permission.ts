import User from "../database/User";
import Cube from "../database/Cube";
import UserOlapModelAccess from "../database/UserOlapModelAccess";

import bcrypt from "bcrypt";

import { Request } from "express";
import { ResponseResult } from "@euclidolap/olap-model";

const SALT_ROUNDS = 10;

/**
 * Ensure initial admin users exist.
 * If the user table is empty, create default admin accounts.
 */
export async function initAdminUsers() {
  const count = await User.count();

  if (count === 0) {
    const adminPasswordHash = await bcrypt.hash("123@#$", SALT_ROUNDS);

    await User.create({
      user_name: "admin",
      pswd_hash: adminPasswordHash,
      is_admin: true,
    });

    console.log("Default admin users created: admin, as");
  } else {
    console.log("User table already has entries, skipping admin creation.");
  }
}

export async function filterDataByUser(
  req: Request,
  result: any
): Promise<void> {
  if (!(result instanceof ResponseResult)) {
    console.error("Result is not an instance of ResponseResult.");
    return;
  }

  const user_name: string = (req as any).userId;
  if (!user_name) {
    console.error("User not found in request.");
    result.data = null;
    return;
  }

  const current_user = await User.findByPk(user_name);
  if (current_user?.is_admin) {
    console.log("User is admin, allowing access to all data.");
    return;
  }

  const userAccessRecords =
    await UserOlapModelAccess.getUserAccessByNameAndStatus(user_name, true);

  const { success, message, data } = result;

  // ***********************************************************************
  // **        filter data when data is an array of Cube instances        **
  // ***********************************************************************
  if (Array.isArray(data) && data.every((item) => item instanceof Cube)) {
    const allowedOlapEntityGids = new Set<number>();
    userAccessRecords.forEach((record) => {
      if (record.olap_entity_gid) {
        allowedOlapEntityGids.add(record.olap_entity_gid);
      }
    });

    result.data = data.filter((cube) => {
      const cube_gid = cube.gid;
      if (!cube_gid) {
        console.error(`Cube GID not found for cube: ${cube.name}.`);
        return false; // 过滤掉该 cube
      }

      return allowedOlapEntityGids.has(cube_gid);
    });

    return;
  }

  console.error("[hsur8647bo96] Data is not an array of Cube instances.");
}
