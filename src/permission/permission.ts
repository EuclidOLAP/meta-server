import User from "../database/User";
import bcrypt from "bcrypt";

const SALT_ROUNDS = 10;

/**
 * Ensure initial admin users exist.
 * If the user table is empty, create default admin accounts.
 */
export async function initAdminUsers() {
  const count = await User.count();

  if (count === 0) {
    const adminPasswordHash = await bcrypt.hash("123@#$", SALT_ROUNDS);
    const asPasswordHash = await bcrypt.hash("as", SALT_ROUNDS);

    await User.bulkCreate([
      {
        user_name: "admin",
        pswd_hash: adminPasswordHash,
        is_admin: true,
      },
      {
        user_name: "as",
        pswd_hash: asPasswordHash,
        is_admin: true,
      },
    ]);

    console.log("Default admin users created: admin, as");
  } else {
    console.log("User table already has entries, skipping admin creation.");
  }
}
