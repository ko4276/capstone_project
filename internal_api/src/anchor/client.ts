import { PublicKey, SystemProgram, Keypair, Connection, Transaction, TransactionInstruction } from "@solana/web3.js";
import * as fs from 'fs';
import * as path from 'path';
import * as bs58 from 'bs58';

const programId = new PublicKey("GUrLuMj8yCB2T4NKaJSVqrAWWCMPMf1qtBSnDR8ytYwB");

// 기존 지갑 파일 로드
const walletKeypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(path.join(__dirname, '../config/my-backend-wallet.json'), "utf-8")))
);

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

export async function createModel(
  modelName: string, 
  creator: string, 
  url: string, 
  royaltyBps: number, 
  isAllowed: boolean
) {
  // creator를 백엔드 지갑으로 강제 설정
  const creatorPk = walletKeypair.publicKey;
  
  // PDA 계산
  const [modelPda] = await PublicKey.findProgramAddress(
    [Buffer.from("model"), creatorPk.toBuffer(), Buffer.from(modelName)],
    programId
  );
  
  try {
    // 간단한 더미 트랜잭션 생성 (실제 프로그램 호출 대신)
    const transaction = new Transaction();
    
    // 더미 instruction 추가 (실제로는 프로그램의 createModel instruction을 구성해야 함)
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: walletKeypair.publicKey,
        toPubkey: walletKeypair.publicKey,
        lamports: 0
      })
    );

    const latestBlockhash = await connection.getLatestBlockhash();
    transaction.recentBlockhash = latestBlockhash.blockhash;
    transaction.feePayer = walletKeypair.publicKey;

    transaction.sign(walletKeypair);
    
    const txid = await connection.sendRawTransaction(transaction.serialize());
    await connection.confirmTransaction({
      signature: txid,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight
    });
    
    console.log("Model created successfully:", txid);
    return modelPda.toBase58();
  } catch (e) {
    console.error("Model creation/update failed:", e);
    throw e;
  }
}

export async function buyLicense(user: string, modelPda: string, licenseType: number) {
  try {
    // user를 백엔드 지갑으로 강제 설정 (더미 구현)
    const userPk = walletKeypair.publicKey;
    const modelPk = new PublicKey(modelPda);
    const [licensePda] = await PublicKey.findProgramAddress(
      [Buffer.from("license"), userPk.toBuffer(), modelPk.toBuffer()],
      programId
    );
    
    // 더미 구현
    console.log("License purchase simulated for:", licensePda.toBase58());
    return licensePda.toBase58();
  } catch (e) {
    console.error("License purchase error:", e);
    throw e;
  }
}

export async function registerDerivativeModel(
  creator: string,
  parentModelName: string,
  modelName: string,
  url: string,
  royaltyBps: number,
  isActive: boolean,
  isAllowed: boolean
) {
  const creatorPk = new PublicKey(creator);
  const [newModelPda] = await PublicKey.findProgramAddress(
    [Buffer.from("model"), creatorPk.toBuffer(), Buffer.from(modelName)],
    programId
  );

  // 더미 구현
  console.log("Derivative model registration simulated for:", newModelPda.toBase58());
  return newModelPda.toBase58();
}

export async function getModel(modelPda: string) {
  // 더미 데이터 반환
  return {
    modelName: "dummy-model",
    creator: walletKeypair.publicKey.toBase58(),
    cid: "https://example.com/model",
    royaltyBps: 500,
    createdAt: Date.now(),
    isActive: true,
    parent: null,
    isAllowed: true
  };
}

export async function getLicense(licensePda: string) {
  // 더미 데이터 반환
  return {
    user: walletKeypair.publicKey.toBase58(),
    model: licensePda,
    licenseType: 1
  };
}
