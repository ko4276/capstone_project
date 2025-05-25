import { PublicKey, SystemProgram, Keypair, Connection, Transaction, TransactionInstruction } from "@solana/web3.js";
import * as fs from 'fs';
import * as path from 'path';
import * as bs58 from 'bs58';

const programId = new PublicKey("GUrLuMj8yCB2T4NKaJSVqrAWWCMPMf1qtBSnDR8ytYwB");

// IDL에서 가져온 discriminator
const CREATE_MODEL_DISCRIMINATOR = Buffer.from([212, 233, 41, 219, 130, 212, 212, 229]);
const BUY_LICENSE_DISCRIMINATOR = Buffer.from([255, 81, 129, 152, 169, 201, 232, 105]);
const REGISTER_DERIVATIVE_MODEL_DISCRIMINATOR = Buffer.from([211, 66, 144, 76, 193, 178, 222, 219]);

// 기존 지갑 파일 로드
const walletKeypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(path.join(__dirname, '../config/my-backend-wallet.json'), "utf-8")))
);

const connection = new Connection("https://api.devnet.solana.com", "confirmed");

// 간단한 직렬화 함수들
function serializeString(str: string): Buffer {
  const strBuffer = Buffer.from(str, 'utf8');
  const lengthBuffer = Buffer.alloc(4);
  lengthBuffer.writeUInt32LE(strBuffer.length, 0);
  return Buffer.concat([lengthBuffer, strBuffer]);
}

function serializeU16(value: number): Buffer {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value, 0);
  return buffer;
}

function serializeBool(value: boolean): Buffer {
  return Buffer.from([value ? 1 : 0]);
}

function serializeCreateModelArgs(modelName: string, url: string, royaltyBps: number, isAllowed: boolean): Buffer {
  return Buffer.concat([
    serializeString(modelName),
    serializeString(url),
    serializeU16(royaltyBps),
    serializeBool(isAllowed)
  ]);
}

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
  const [modelPda, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("model"), creatorPk.toBuffer(), Buffer.from(modelName)],
    programId
  );
  
  try {
    // 실제 create_model instruction 생성
    const serializedArgs = serializeCreateModelArgs(modelName, url, royaltyBps, isAllowed);
    
    // discriminator + args
    const instructionData = Buffer.concat([CREATE_MODEL_DISCRIMINATOR, serializedArgs]);
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: modelPda, isSigner: false, isWritable: true },
        { pubkey: creatorPk, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId,
      data: instructionData
    });

    const transaction = new Transaction();
    transaction.add(instruction);

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
    console.error("Model creation failed:", e);
    throw e;
  }
}

export async function buyLicense(user: string, modelPda: string, licenseType: number) {
  try {
    // user를 백엔드 지갑으로 강제 설정
    const userPk = walletKeypair.publicKey;
    const modelPk = new PublicKey(modelPda);
    const [licensePda] = await PublicKey.findProgramAddress(
      [Buffer.from("license"), modelPk.toBuffer(), userPk.toBuffer()],
      programId
    );
    
    // buy_license instruction 데이터 생성
    const instructionData = Buffer.concat([
      BUY_LICENSE_DISCRIMINATOR,
      Buffer.from([licenseType]) // u8
    ]);
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: licensePda, isSigner: false, isWritable: true },
        { pubkey: userPk, isSigner: true, isWritable: true },
        { pubkey: modelPk, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId,
      data: instructionData
    });

    const transaction = new Transaction();
    transaction.add(instruction);

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
    
    console.log("License purchased successfully:", txid);
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
  const creatorPk = walletKeypair.publicKey; // 백엔드 지갑 사용
  const [newModelPda] = await PublicKey.findProgramAddress(
    [Buffer.from("model"), creatorPk.toBuffer(), Buffer.from(modelName)],
    programId
  );
  
  const [parentModelPda] = await PublicKey.findProgramAddress(
    [Buffer.from("model"), creatorPk.toBuffer(), Buffer.from(parentModelName)],
    programId
  );

  try {
    // register_derivative_model instruction 데이터 생성
    const instructionData = Buffer.concat([
      REGISTER_DERIVATIVE_MODEL_DISCRIMINATOR,
      // 간단한 직렬화 (실제로는 borsh 사용해야 함)
      Buffer.from([modelName.length]), Buffer.from(modelName),
      Buffer.from([url.length]), Buffer.from(url),
      Buffer.from(new Uint16Array([royaltyBps]).buffer),
      Buffer.from([isActive ? 1 : 0]),
      Buffer.from([isAllowed ? 1 : 0])
    ]);
    
    const instruction = new TransactionInstruction({
      keys: [
        { pubkey: newModelPda, isSigner: false, isWritable: true },
        { pubkey: creatorPk, isSigner: true, isWritable: true },
        { pubkey: parentModelPda, isSigner: false, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
      ],
      programId,
      data: instructionData
    });

    const transaction = new Transaction();
    transaction.add(instruction);

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
    
    console.log("Derivative model registered successfully:", txid);
    return newModelPda.toBase58();
  } catch (e) {
    console.error("Derivative model registration error:", e);
    throw e;
  }
}

export async function getModel(modelPda: string) {
  try {
    const modelPk = new PublicKey(modelPda);
    const accountInfo = await connection.getAccountInfo(modelPk);
    
    if (!accountInfo) {
      throw new Error("Model account not found");
    }
    
    // 실제 계정 데이터 파싱 (간단한 구현)
    // 실제로는 borsh 디시리얼라이제이션 필요
    const data = accountInfo.data;
    
    // 더미 파싱 (실제 구현 필요)
    return {
      modelName: "parsed-model",
      creator: walletKeypair.publicKey.toBase58(),
      cid: "https://parsed.com/model",
      royaltyBps: 500,
      createdAt: Date.now(),
      isActive: true,
      parent: null,
      isAllowed: true
    };
  } catch (e) {
    console.error("Get model error:", e);
    throw e;
  }
}

export async function getLicense(licensePda: string) {
  try {
    const licensePk = new PublicKey(licensePda);
    const accountInfo = await connection.getAccountInfo(licensePk);
    
    if (!accountInfo) {
      throw new Error("License account not found");
    }
    
    // 실제 계정 데이터 파싱 (간단한 구현)
    return {
      user: walletKeypair.publicKey.toBase58(),
      model: licensePda,
      licenseType: 1
    };
  } catch (e) {
    console.error("Get license error:", e);
    throw e;
  }
}
