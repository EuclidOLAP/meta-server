import { Router } from "express";
import { signAccessToken, signRefreshToken } from "../middlewares/requireAuth";
import jwt from "jsonwebtoken";

import { REFRESH_TOKEN_SECRET } from "../config/jwt";

const router = Router();

// const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || "1243818cc51e24cd78ef2dde769b19d743a7d8ed680c06fcfa6beb9793ecbc40";

// 登录
router.post("/login", (req, res) => {
  const { username, password } = req.body;

  // TODO: 替换为数据库校验
  if (username !== "admin" || password !== "123@#$") {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const userId = "user-001";

  const accessToken = signAccessToken(userId);
  const refreshToken = signRefreshToken(userId);

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: false, // ⚠️生产环境设为 true
    sameSite: "strict",
  });

  res.json({ accessToken });
});

// 刷新 AccessToken
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

// 登出
router.post("/logout", (req, res) => {
  res.clearCookie("refreshToken");
  res.json({ success: true });
});

export default router;
