import express from "express";
import { createModel, getModel } from "../anchor/client";
import { PublicKey } from "@solana/web3.js";
const router = express.Router();

router.post("/create-model", async (req, res) => {
  try {
    const { 
      model_name, 
      creatorWallet, 
      url, 
      royaltyBps, 
      isAllowed
    } = req.body;

    // 필수 필드 검증
    if (!model_name || !creatorWallet || !url || royaltyBps === undefined || isAllowed === undefined) {
      return res.status(400).json({ error: "필수 필드가 누락되었습니다" });
    }

    const modelPda = await createModel(model_name, creatorWallet, url, royaltyBps, isAllowed);
    res.json({ message: "success", modelPda });
  } catch (e) {
    console.error("Model creation failed", e);
    res.status(500).json({ error: "모델 등록 실패" });
  }
});

router.get("/:modelPda", async (req, res) => {
  try {
    const { modelPda } = req.params;
    const modelInfo = await getModel(modelPda);
    res.json(modelInfo);
  } catch (e) {
    console.error("Model fetch failed", e);
    res.status(500).json({ error: "모델 조회 실패" });
  }
});

export default router;
