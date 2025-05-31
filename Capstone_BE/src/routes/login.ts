import express from "express";
import { getNonce, verifySignature, refreshAccessToken } from "../controllers/loginController";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/nonce", getNonce); 
router.post("/verify", verifySignature);
router.post("/refresh", refreshAccessToken);

// 🧪 테스트용 간단 로그인 (개발 환경에서만 사용)
router.post("/", (req, res) => {
  const { wallet_address } = req.body;
  
  if (!wallet_address) {
    res.status(400).json({ error: "wallet_address가 필요합니다." });
    return;
  }

  // 테스트용 JWT 토큰 발급
  const ACCESS_SECRET = process.env.JWT_SECRET || "dev_secret";
  const token = jwt.sign({ wallet: wallet_address }, ACCESS_SECRET, { expiresIn: "1h" });
  
  res.json({ 
    token: token,
    message: "테스트 로그인 성공",
    wallet: wallet_address
  });
});

export default router;
