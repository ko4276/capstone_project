import express from "express";
import { buyLicense, getLicense } from "../anchor/client";

const router = express.Router();

router.post("/buy-license", async (req, res) => {
  try {
    const { userWallet, modelPda, licenseType } = req.body;
    
    // 필수 필드 검증
    if (!userWallet || !modelPda || licenseType === undefined) {
      return res.status(400).json({ error: "필수 필드가 누락되었습니다" });
    }
    
    const licensePda = await buyLicense(userWallet, modelPda, licenseType);
    res.json({ licensePda });
  } catch (e) {
    console.error("License purchase failed", e);
    res.status(500).json({ error: "라이선스 구매 실패" });
  }
});

router.get("/:licensePda", async (req, res) => {
  try {
    const { licensePda } = req.params;
    const licenseInfo = await getLicense(licensePda);
    res.json(licenseInfo);
  } catch (e) {
    console.error("License fetch failed", e);
    res.status(500).json({ error: "라이선스 조회 실패" });
  }
});

export default router;
