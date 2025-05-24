
import express from "express";
import { buyLicense } from "../anchor/client";

const router = express.Router();

router.post("/buy-license", async (req, res) => {
  try {
    const { userWallet, modelPda, licenseType } = req.body;
    const licensePda = await buyLicense(userWallet, modelPda, licenseType);
    res.json({ licensePda });
  } catch (e) {
    console.error("License purchase failed", e);
    res.status(500).json({ error: "라이선스 구매 실패" });
  }
});

export default router;
