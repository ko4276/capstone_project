import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Request 타입 확장
export interface AuthRequest extends Request {
  user?: { wallet: string };
}

// 인증 미들웨어
export const authenticateJWT = (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: "인증 토큰이 없습니다." });
    return;
  }

  const token = authHeader.split(' ')[1]; // "Bearer {token}" → token 부분만 분리

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { wallet: string };
    req.user = { wallet: decoded.wallet }; // ✅ 요청에 사용자 지갑주소 추가
    next(); // 다음 미들웨어 또는 컨트롤러로 넘어감
  } catch (err) {
    console.error("JWT 인증 실패:", err);
    res.status(403).json({ error: "잘못된 토큰입니다." });
    return;
  }
};
