import express from "express";
import { registerDerivativeModel } from "../anchor/client";

const router = express.Router();

router.post("/register-derivative-model", async (req, res) => {
  try {
    const { creatorWallet, parentModelName, model_name, url, royaltyBps, isActive, isAllowed } = req.body;
    
    // 필수 필드 검증
    if (!creatorWallet || !parentModelName || !model_name || !url || royaltyBps === undefined || isActive === undefined || isAllowed === undefined) {
      return res.status(400).json({ error: "필수 필드가 누락되었습니다" });
    }
    
    const modelPda = await registerDerivativeModel(creatorWallet, parentModelName, model_name, url, royaltyBps, isActive, isAllowed);
    res.json({ message: "success", modelPda });
  } catch (e) {
    console.error("Derivative model registration failed", e);
    res.status(500).json({ error: "파생 모델 등록 실패" });
  }
});

export default router;
