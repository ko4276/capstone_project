import express from "express";
import { createModel } from "../anchor/client";
const router = express.Router();
router.post("/create-model", async (req, res) => {
  try {
    const { creatorWallet, model_name, url, royaltyBps, isAllowed } = req.body;
    const modelPda = await createModel(model_name, creatorWallet, url, royaltyBps, isAllowed);
    res.json({ message: "success", modelPda });
  } catch (e) {
    console.error("Model creation failed", e);
    res.status(500).json({ error: "모델 등록 실패" });
  }
});
export default router;
