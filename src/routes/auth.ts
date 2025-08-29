// auth.ts
import { Router } from "express";
import { signAccessToken, signRefreshToken, requireAuth } from "../middlewares/requireAuth";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../permission/User";
import { REFRESH_TOKEN_SECRET } from "../config/jwt";

const router = Router();

// Login
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findByPk(username);
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const match = await bcrypt.compare(password, user.pswd_hash);
    if (!match) return res.status(401).json({ error: "Invalid credentials" });

    const userId = user.user_name;

    const accessToken = signAccessToken(userId);
    const refreshToken = signRefreshToken(userId);

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: false, // ⚠️ set true in production
      sameSite: "strict",
    });

    res.json({ accessToken });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Refresh AccessToken
router.post("/refresh", (req, res) => {
  const token = req.cookies.refreshToken;
  if (!token) return res.status(401).json({ error: "No refresh token" });

  try {
    const payload = jwt.verify(token, REFRESH_TOKEN_SECRET) as { userId: string };
    const newAccessToken = signAccessToken(payload.userId);
    res.json({ accessToken: newAccessToken });
  } catch {
    return res.status(403).json({ error: "Invalid refresh token" });
  }
});

// Logout
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ success: true });
});

// ===== 新增获取当前用户接口 =====
router.get("/me", requireAuth, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const user = await User.findByPk(userId, {
      // attributes: ["user_name", "is_admin", "code", "alias", "display"]
      attributes: ["user_name", "is_admin"],
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ user: { user_name: user.user_name } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// // 获取全部用户
// router.get("/users", requireAuth, async (req, res) => {
//   try {
//     // 只返回 user_name 和 is_admin，避免泄露密码
//     const users = await User.findAll({
//       attributes: ["user_name", "is_admin", "created_at", "updated_at", "description"],
//     });

//     res.json({ users });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Internal server error" });
//   }
// });

export default router;
