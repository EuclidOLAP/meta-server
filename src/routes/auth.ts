// auth.ts
import { Router } from "express";
import { signAccessToken, signRefreshToken, requireAuth } from "../middlewares/requireAuth";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import User from "../database/User";
import { REFRESH_TOKEN_SECRET } from "../config/jwt";

const router = Router();

// // 前置通知：日志记录
// const logRequest = (req, res, next) => {
//   console.log(`[前置通知] 请求：${req.method} ${req.originalUrl}`);
//   next();  // 继续执行后续的中间件或路由处理
// };

// // 后置通知：修改响应数据
// const modifyResponse = (req, res, next) => {
//   const originalSend = res.send;
//   res.send = (body) => {
//     // 记录响应数据
//     console.log(`[后置通知] 响应数据：`, body);

//     // 在响应数据中添加一个字段
//     const modifiedBody = { ...JSON.parse(body), modified: true };
//     originalSend.call(res, JSON.stringify(modifiedBody));  // 发送修改后的响应
//   };
//   next();  // 继续执行后续的中间件或路由处理
// };

// // 为整个路由模块添加前置通知和后置通知
// router.use(logRequest);  // 全局前置通知
// router.use(modifyResponse);  // 全局后置通知

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

    res.json({ user: { user_name: user.user_name, is_admin: user.is_admin } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 获取全部用户
router.get("/users", requireAuth, async (req, res) => {
  try {
    // 只返回 user_name 和 is_admin，避免泄露密码
    const users = await User.findAll({
      attributes: ["user_name", "is_admin", "created_at", "updated_at", "description"],
    });
    res.json({ users });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 创建用户
router.post("/user", requireAuth, async (req, res) => {
  try {
    const { username, password, is_admin = false, description = "" } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required" });
    }

    // 检查是否已存在
    const existingUser = await User.findByPk(username);
    if (existingUser) {
      return res.status(409).json({ error: "User already exists" });
    }

    // 加密密码
    const pswd_hash = await bcrypt.hash(password, 10);

    // 插入数据库
    const newUser = await User.create({
      user_name: username,
      pswd_hash,
      is_admin,
      description,
    });

    // 返回新建用户（不返回 hash）
    res.status(201).json({
      user: {
        user_name: newUser.user_name,
        is_admin: newUser.is_admin,
        description: newUser.description,
        created_at: newUser.created_at,
        updated_at: newUser.updated_at,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
