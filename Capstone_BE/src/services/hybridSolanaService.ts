import * as anchor from "@project-serum/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  Keypair,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";
import * as borsh from "borsh";

// ✅ 설정
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!);
const IDL_PATH = path.resolve(__dirname, "../idl/my_solana_program.json");
const IDL = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));
const connection = new Connection("https://api.devnet.solana.com", "processed");

// ✅ 백엔드 지갑 로드 (옵션)
let backendWallet: Keypair | null = null;
try {
  const walletPath = path.resolve(__dirname, "../config/backend-wallet.json");
  if (fs.existsSync(walletPath)) {
    const walletData = JSON.parse(fs.readFileSync(walletPath, "utf-8"));
    backendWallet = Keypair.fromSecretKey(Buffer.from(walletData));
  }
} catch (error) {
  console.warn("⚠️ 백엔드 지갑을 로드할 수 없습니다. 사용자 서명만 사용됩니다.");
}

// ✅ Discriminators
const CREATE_MODEL_DISCRIMINATOR = Buffer.from([212, 233, 41, 219, 130, 212, 212, 229]);
const BUY_LICENSE_DISCRIMINATOR = Buffer.from([255, 81, 129, 152, 169, 201, 232, 105]);

// ✅ Borsh 스키마
class InitializeArgs {
  s3_key: string;
  royalty_bps: number;
  is_derivative: number;

  constructor(fields: { s3_key: string; royalty_bps: number; is_derivative: number }) {
    this.s3_key = fields.s3_key;
    this.royalty_bps = fields.royalty_bps;
    this.is_derivative = fields.is_derivative;
  }
}

const schema = new Map() as borsh.Schema;
schema.set(InitializeArgs, {
  kind: "struct",
  fields: [
    ["s3_key", "string"],
    ["royalty_bps", "u16"],
    ["is_derivative", "u8"],
  ],
});

// ✅ 서명 방식 열거형
export enum SignatureMode {
  USER_SIGNATURE = "user",      // 사용자가 프론트엔드에서 서명
  BACKEND_SIGNATURE = "backend" // 백엔드에서 자동 서명
}

// ✅ 트랜잭션 결과 타입
export interface TransactionResult {
  mode: SignatureMode;
  transaction?: string;  // Base64 (사용자 서명용)
  txid?: string;        // 트랜잭션 ID (백엔드 서명 완료)
  modelPda?: string;    // 생성된 PDA
}

/**
 * 🔑 모델 등록 (하이브리드)
 */
export const createModelHybrid = async (
  userWalletAddress: string,
  s3Key: string,
  royalty: number,
  isDerivative: boolean,
  mode: SignatureMode = SignatureMode.USER_SIGNATURE
): Promise<TransactionResult> => {
  const userPubkey = new PublicKey(userWalletAddress);
  
  // PDA 계산
  const [modelPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("model"), userPubkey.toBuffer(), Buffer.from(s3Key)],
    PROGRAM_ID
  );

  // Instruction 데이터 준비
  const discriminator = Buffer.from(
    IDL.instructions.find((i: any) => i.name === "initialize").discriminator
  );
  
  const args = new InitializeArgs({
    s3_key: s3Key,
    royalty_bps: royalty,
    is_derivative: isDerivative ? 1 : 0,
  });

  const serializedArgs = borsh.serialize(schema, args);
  const data = Buffer.concat([discriminator, Buffer.from(serializedArgs)]);

  // Instruction 생성
  const ix = new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: modelPda, isSigner: false, isWritable: true },
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });

  // 트랜잭션 생성
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  const tx = new Transaction({
    feePayer: userPubkey,
    recentBlockhash: blockhash,
  }).add(ix);

  if (mode === SignatureMode.USER_SIGNATURE) {
    // 🔑 사용자 서명 모드: Base64 반환
    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return {
      mode: SignatureMode.USER_SIGNATURE,
      transaction: serialized.toString("base64"),
      modelPda: modelPda.toBase58(),
    };
  } else {
    // 🤖 백엔드 서명 모드: 직접 전송
    if (!backendWallet) {
      throw new Error("백엔드 지갑이 설정되지 않았습니다.");
    }

    // 백엔드 지갑으로 서명
    tx.sign(backendWallet);
    
    // 트랜잭션 전송
    const txid = await connection.sendRawTransaction(tx.serialize());
    
    // 확인 대기
    await connection.confirmTransaction({
      signature: txid,
      blockhash: blockhash,
      lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
    });

    return {
      mode: SignatureMode.BACKEND_SIGNATURE,
      txid: txid,
      modelPda: modelPda.toBase58(),
    };
  }
};

/**
 * 🛒 라이선스 구매 (하이브리드)
 */
export const buyLicenseHybrid = async (
  userWalletAddress: string,
  modelPda: string,
  licenseType: number,
  mode: SignatureMode = SignatureMode.USER_SIGNATURE
): Promise<TransactionResult> => {
  const userPubkey = new PublicKey(userWalletAddress);
  const modelPk = new PublicKey(modelPda);
  
  // 라이선스 PDA 계산
  const [licensePda] = PublicKey.findProgramAddressSync(
    [Buffer.from("license"), modelPk.toBuffer(), userPubkey.toBuffer()],
    PROGRAM_ID
  );

  // Instruction 데이터
  const instructionData = Buffer.concat([
    BUY_LICENSE_DISCRIMINATOR,
    Buffer.from([licenseType])
  ]);

  // Instruction 생성
  const ix = new TransactionInstruction({
    keys: [
      { pubkey: licensePda, isSigner: false, isWritable: true },
      { pubkey: userPubkey, isSigner: true, isWritable: true },
      { pubkey: modelPk, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    programId: PROGRAM_ID,
    data: instructionData,
  });

  // 트랜잭션 생성
  const { blockhash } = await connection.getLatestBlockhash("finalized");
  const tx = new Transaction({
    feePayer: userPubkey,
    recentBlockhash: blockhash,
  }).add(ix);

  if (mode === SignatureMode.USER_SIGNATURE) {
    // 🔑 사용자 서명 모드
    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    return {
      mode: SignatureMode.USER_SIGNATURE,
      transaction: serialized.toString("base64"),
      modelPda: licensePda.toBase58(),
    };
  } else {
    // 🤖 백엔드 서명 모드
    if (!backendWallet) {
      throw new Error("백엔드 지갑이 설정되지 않았습니다.");
    }

    tx.sign(backendWallet);
    const txid = await connection.sendRawTransaction(tx.serialize());
    
    await connection.confirmTransaction({
      signature: txid,
      blockhash: blockhash,
      lastValidBlockHeight: (await connection.getLatestBlockhash()).lastValidBlockHeight,
    });

    return {
      mode: SignatureMode.BACKEND_SIGNATURE,
      txid: txid,
      modelPda: licensePda.toBase58(),
    };
  }
};

/**
 * 🔧 메타데이터 업데이트 (백엔드 전용)
 */
export const updateModelMetadata = async (
  modelPda: string,
  newUrl: string
): Promise<string> => {
  if (!backendWallet) {
    throw new Error("메타데이터 업데이트는 백엔드 서명만 지원됩니다.");
  }

  // 메타데이터 업데이트 로직 (예시)
  // 실제 구현은 스마트 컨트랙트에 따라 달라집니다
  
  console.log(`📝 모델 ${modelPda}의 메타데이터를 ${newUrl}로 업데이트`);
  return "metadata-update-txid";
};

export default {
  createModelHybrid,
  buyLicenseHybrid,
  updateModelMetadata,
  SignatureMode,
}; 