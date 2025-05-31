import * as anchor from "@project-serum/anchor";
import {
  Connection,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import fs from "fs";
import path from "path";
import * as borsh from "borsh";

// ✅ 프로그램 ID 및 IDL 로딩
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID!);
const IDL_PATH = path.resolve(__dirname, "../idl/my_solana_program.json");
const IDL = JSON.parse(fs.readFileSync(IDL_PATH, "utf-8"));

console.log("✅ [solanaService] IDL 로딩 성공");
console.log("📄 [IDL] instructions:", IDL.instructions.map((i: any) => i.name));
console.log("📄 [IDL] accounts:", IDL.accounts.map((a: any) => a.name));

// ✅ Anchor Connection (provider 없이 사용)
const connection = new Connection("https://api.devnet.solana.com", "processed");

// ✅ Borsh 클래스 정의
class InitializeArgs {
  s3_key: string;
  royalty_bps: number;
  is_derivative: number;

  constructor(fields: {
    s3_key: string;
    royalty_bps: number;
    is_derivative: number;
  }) {
    this.s3_key = fields.s3_key;
    this.royalty_bps = fields.royalty_bps;
    this.is_derivative = fields.is_derivative;
  }
}

// ✅ Borsh 스키마 정의 (타입 단언 방식)
const schema = new Map() as borsh.Schema;
schema.set(InitializeArgs, {
  kind: "struct",
  fields: [
    ["s3_key", "string"],
    ["royalty_bps", "u16"],
    ["is_derivative", "u8"],
  ],
});

/**
 * 트랜잭션 생성 함수
 */
export const createInitializeTx = async (
  userWalletAddress: string,
  s3Key: string,
  royalty: number,
  is_derivative: boolean
): Promise<string> => {
  console.log("🛠️ [createInitializeTx] 입력값:", {
    userWalletAddress,
    s3Key,
    royalty,
    is_derivative,
  });

  try {
    const userPubkey = new PublicKey(userWalletAddress);

    // ✅ PDA 생성
    const [modelPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("model", "utf-8"),
        userPubkey.toBuffer(),
        Buffer.from(s3Key, "utf-8"),
      ],
      PROGRAM_ID
    );

    console.log("🔑 [PDA] modelPda:", modelPda.toBase58());

    // ✅ discriminator 추출
    const discriminator = Buffer.from(
      IDL.instructions.find((i: any) => i.name === "initialize").discriminator
    );

    // ✅ Borsh 직렬화
    const args = new InitializeArgs({
      s3_key: s3Key,
      royalty_bps: royalty,
      is_derivative: is_derivative ? 1 : 0,
    });

    const serializedArgs = borsh.serialize(schema, args);
    const data = Buffer.concat([discriminator, Buffer.from(serializedArgs)]);

    console.log("📦 ix.data (hex):", data.toString("hex"));

    // ✅ Instruction 생성
    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: modelPda, isSigner: false, isWritable: true },
        { pubkey: userPubkey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data,
    });

    // ✅ 트랜잭션 생성
    const { blockhash } = await connection.getLatestBlockhash("finalized");
    const tx = new Transaction({
      feePayer: userPubkey,
      recentBlockhash: blockhash,
    }).add(ix);

    const serialized = tx.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });

    const base64Tx = serialized.toString("base64");
    console.log("📦 [SerializedTx] base64 길이:", base64Tx.length);

    return base64Tx;
  } catch (err) {
    console.error("❌ 트랜잭션 생성 실패:", err);
    throw new Error("트랜잭션 생성 중 오류가 발생했습니다.");
  }
};
