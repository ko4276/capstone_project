import * as anchor from "@project-serum/anchor";
import { PublicKey, SystemProgram, Keypair } from "@solana/web3.js";
import * as fs from 'fs';
import * as path from 'path';
import { idl } from './types';

const programId = new PublicKey("GUrLuMj8yCB2T4NKaJSVqrAWWCMPMf1qtBSnDR8ytYwB");

// 기존 지갑 파일 로드
const walletKeypair = Keypair.fromSecretKey(
  Buffer.from(JSON.parse(fs.readFileSync(path.join(__dirname, '../config/my-backend-wallet.json'), "utf-8"))) // 위 경로에 api 요청을 보낼려는 지갑이 있어야 함 없으면 생성후 수정
);

// modelAccount 키페어 파일 경로
const modelKeypairPath = path.join(__dirname, '../config/model-keypair.json');  // 위 경로에 api 요청을 보낼려는 지갑이 있어야 함 없으면 생성후 수정

// modelAccount 키페어 로드 또는 생성
let modelKeypair: Keypair;
try {
  const modelKeypairData = JSON.parse(fs.readFileSync(modelKeypairPath, 'utf-8'));
  modelKeypair = Keypair.fromSecretKey(Buffer.from(modelKeypairData));
} catch (e) {
  // 파일이 없으면 새로운 키페어 생성 및 저장
  modelKeypair = Keypair.generate();
  fs.writeFileSync(modelKeypairPath, JSON.stringify(Array.from(modelKeypair.secretKey)));
}

const wallet = new anchor.Wallet(walletKeypair);
const provider = new anchor.AnchorProvider(
  new anchor.web3.Connection("https://api.devnet.solana.com"),
  wallet,
  { commitment: "confirmed" }
);
anchor.setProvider(provider);

// Program 인스턴스 생성
const program = new anchor.Program(idl, programId, provider);

export async function createModel(modelName: string, creator: string, url: string, royaltyBps: number, isAllowed: boolean) {
  const creatorPk = new PublicKey(creator);
  const [modelPda] = await PublicKey.findProgramAddress(
    [Buffer.from("model"), creatorPk.toBuffer(), Buffer.from(modelName)],
    programId
  );
  
  await program.methods.createModel(modelName, url, royaltyBps, isAllowed)
    .accounts({
      creator: walletKeypair.publicKey,
      modelAccount: modelPda,
      systemProgram: SystemProgram.programId
    })
    .signers([walletKeypair])
    .preInstructions([
      SystemProgram.createAccount({
        fromPubkey: walletKeypair.publicKey,
        newAccountPubkey: modelPda,
        space: 1000,  // 적절한 공간 할당
        lamports: await provider.connection.getMinimumBalanceForRentExemption(1000),
        programId: programId
      })
    ])
    .rpc();
  return modelPda.toBase58();
}

export async function buyLicense(user: string, modelPda: string, licenseType: number) {
  const userPk = new PublicKey(user);
  const modelPk = new PublicKey(modelPda);
  const [licensePda] = await PublicKey.findProgramAddress(
    [Buffer.from("license"), userPk.toBuffer(), modelPk.toBuffer()],
    programId
  );
  await program.methods.buyLicense(licenseType)
    .accounts({
      user: userPk,
      modelAccount: modelPk,
      licenseAccount: licensePda,
      systemProgram: SystemProgram.programId
    })
    .rpc();
  return licensePda.toBase58();
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
  await program.methods.registerDerivativeModel(modelName, url, royaltyBps, isActive, isAllowed)
    .accounts({
      creator: creatorPk,
      parentModelAccount: parentModelName,
      newModelAccount: newModelPda,
      systemProgram: SystemProgram.programId
    })
    .rpc();
  return newModelPda.toBase58();
}

