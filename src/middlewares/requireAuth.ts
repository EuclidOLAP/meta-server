import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET, ACCESS_TOKEN_TTL, REFRESH_TOKEN_TTL } from "../config/jwt";

// ===== 签发 AccessToken =====
export function signAccessToken(userId: string) {
  return jwt.sign({ userId }, ACCESS_TOKEN_SECRET, { expiresIn: ACCESS_TOKEN_TTL });
}

// ===== 签发 RefreshToken =====
export function signRefreshToken(userId: string) {
  return jwt.sign({ userId }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_TTL });
}

// ===== 校验 AccessToken 的中间件 =====
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1]; // "Bearer xxx"

  if (!token) {
    return res.status(401).json({ error: "No access token" });
  }

  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET) as { userId: string };
    (req as any).userId = payload.userId; // 挂到 req 对象上
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired access token" });
  }
}
