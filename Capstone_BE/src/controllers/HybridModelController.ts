import { Request, Response } from "express";
import { uploadToS3 } from "../services/s3Service";
import { 
  createModelHybrid, 
  buyLicenseHybrid, 
  updateModelMetadata,
  SignatureMode 
} from "../services/hybridSolanaService";
import { AuthRequest } from "../middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * 🔑 모델 등록 - 사용자 서명 (중요한 트랜잭션)
 */
export const handleModelRegistration = async (req: AuthRequest, res: Response): Promise<void> => {
  const wallet = req.user?.wallet;
  const { s3_key, royalty, is_derivative, signature_mode = "user" } = req.body;

  if (!wallet || !s3_key || royalty === undefined || is_derivative === undefined) {
    res.status(400).json({ error: "필수 파라미터 누락" });
    return;
  }

  try {
    const mode = signature_mode === "backend" ? SignatureMode.BACKEND_SIGNATURE : SignatureMode.USER_SIGNATURE;
    
    const result = await createModelHybrid(
      wallet,
      s3_key,
      royalty,
      is_derivative,
      mode
    );

    if (result.mode === SignatureMode.USER_SIGNATURE) {
      // 🔑 사용자 서명: Base64 트랜잭션 반환
      res.status(200).json({
        message: "트랜잭션 생성 완료. 프론트엔드에서 서명하세요.",
        transaction: result.transaction,
        modelPda: result.modelPda,
        requiresUserSignature: true
      });
    } else {
      // 🤖 백엔드 서명: 완료된 트랜잭션 반환
      res.status(200).json({
        message: "모델 등록 완료",
        txid: result.txid,
        modelPda: result.modelPda,
        requiresUserSignature: false
      });
    }
  } catch (error) {
    console.error("모델 등록 실패:", error);
    res.status(500).json({ error: "모델 등록 실패" });
  }
};

/**
 * 🛒 라이선스 구매 - 선택적 서명 방식
 */
export const handleLicensePurchase = async (req: AuthRequest, res: Response): Promise<void> => {
  const wallet = req.user?.wallet;
  const { modelPda, licenseType = 1, signature_mode = "user", amount } = req.body;

  if (!wallet || !modelPda) {
    res.status(400).json({ error: "필수 파라미터 누락" });
    return;
  }

  try {
    // 💰 결제 금액에 따른 서명 방식 결정
    const mode = amount > 1000 || signature_mode === "user" 
      ? SignatureMode.USER_SIGNATURE    // 고액 결제는 사용자 서명
      : SignatureMode.BACKEND_SIGNATURE; // 소액 결제는 백엔드 서명

    const result = await buyLicenseHybrid(
      wallet,
      modelPda,
      licenseType,
      mode
    );

    // DB에 라이선스 기록
    const user = await prisma.user.findUnique({
      where: { wallet_address: wallet },
    });

    if (user) {
      await prisma.license.create({
        data: {
          userId: user.id,
          modelId: parseInt(modelPda.slice(-8), 16), // 임시 ID 생성
        },
      });
    }

    if (result.mode === SignatureMode.USER_SIGNATURE) {
      res.status(200).json({
        message: "라이선스 구매 트랜잭션 생성. 서명이 필요합니다.",
        transaction: result.transaction,
        licensePda: result.modelPda,
        requiresUserSignature: true,
        amount: amount
      });
    } else {
      res.status(200).json({
        message: "라이선스 구매 완료",
        txid: result.txid,
        licensePda: result.modelPda,
        requiresUserSignature: false,
        amount: amount
      });
    }
  } catch (error) {
    console.error("라이선스 구매 실패:", error);
    res.status(500).json({ error: "라이선스 구매 실패" });
  }
};

/**
 * 📝 메타데이터 업데이트 - 백엔드 서명 전용 (관리 작업)
 */
export const handleMetadataUpdate = async (req: AuthRequest, res: Response): Promise<void> => {
  const { modelPda, newUrl } = req.body;

  if (!modelPda || !newUrl) {
    res.status(400).json({ error: "modelPda와 newUrl이 필요합니다." });
    return;
  }

  try {
    // 🤖 관리 작업은 항상 백엔드 서명
    const txid = await updateModelMetadata(modelPda, newUrl);

    res.status(200).json({
      message: "메타데이터 업데이트 완료",
      txid: txid,
      newUrl: newUrl
    });
  } catch (error) {
    console.error("메타데이터 업데이트 실패:", error);
    res.status(500).json({ error: "메타데이터 업데이트 실패" });
  }
};

/**
 * 🎯 스마트 라우팅 - 자동으로 최적의 서명 방식 선택
 */
export const handleSmartTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
  const { transactionType, ...params } = req.body;

  try {
    let signatureMode: SignatureMode;

    // 📋 트랜잭션 유형별 서명 방식 결정
    switch (transactionType) {
      case "model_registration":
      case "high_value_license":
      case "ownership_transfer":
        signatureMode = SignatureMode.USER_SIGNATURE; // 중요한 트랜잭션
        break;
      
      case "metadata_update":
      case "status_change":
      case "low_value_license":
        signatureMode = SignatureMode.BACKEND_SIGNATURE; // 일반적인 트랜잭션
        break;
      
      default:
        signatureMode = SignatureMode.USER_SIGNATURE; // 기본값
    }

    res.status(200).json({
      message: "스마트 라우팅 완료",
      recommendedSignatureMode: signatureMode,
      transactionType: transactionType,
      reasoning: getSignatureModeReasoning(transactionType, signatureMode)
    });
  } catch (error) {
    console.error("스마트 라우팅 실패:", error);
    res.status(500).json({ error: "스마트 라우팅 실패" });
  }
};

/**
 * 📊 서명 방식 선택 이유 설명
 */
function getSignatureModeReasoning(transactionType: string, mode: SignatureMode): string {
  if (mode === SignatureMode.USER_SIGNATURE) {
    return `${transactionType}은(는) 중요한 트랜잭션이므로 보안을 위해 사용자 서명이 필요합니다.`;
  } else {
    return `${transactionType}은(는) 일반적인 작업이므로 편의성을 위해 백엔드에서 자동 처리됩니다.`;
  }
}

export default {
  handleModelRegistration,
  handleLicensePurchase,
  handleMetadataUpdate,
  handleSmartTransaction,
}; 