"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createInitializeTx = void 0;
const web3_js_1 = require("@solana/web3.js");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const borsh = __importStar(require("borsh"));
// ✅ 프로그램 ID 및 IDL 로딩
const PROGRAM_ID = new web3_js_1.PublicKey(process.env.PROGRAM_ID);
const IDL_PATH = path_1.default.resolve(__dirname, "../idl/my_solana_program.json");
const IDL = JSON.parse(fs_1.default.readFileSync(IDL_PATH, "utf-8"));
console.log("✅ [solanaService] IDL 로딩 성공");
console.log("📄 [IDL] instructions:", IDL.instructions.map((i) => i.name));
console.log("📄 [IDL] accounts:", IDL.accounts.map((a) => a.name));
// ✅ Anchor Connection (provider 없이 사용)
const connection = new web3_js_1.Connection("https://api.devnet.solana.com", "processed");
// ✅ Borsh 클래스 정의
class InitializeArgs {
    constructor(fields) {
        this.s3_key = fields.s3_key;
        this.royalty_bps = fields.royalty_bps;
        this.is_derivative = fields.is_derivative;
    }
}
// ✅ Borsh 스키마 정의 (타입 단언 방식)
const schema = new Map();
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
const createInitializeTx = async (userWalletAddress, s3Key, royalty, is_derivative) => {
    console.log("🛠️ [createInitializeTx] 입력값:", {
        userWalletAddress,
        s3Key,
        royalty,
        is_derivative,
    });
    try {
        const userPubkey = new web3_js_1.PublicKey(userWalletAddress);
        // ✅ PDA 생성
        const [modelPda] = web3_js_1.PublicKey.findProgramAddressSync([
            Buffer.from("model", "utf-8"),
            userPubkey.toBuffer(),
            Buffer.from(s3Key, "utf-8"),
        ], PROGRAM_ID);
        console.log("🔑 [PDA] modelPda:", modelPda.toBase58());
        // ✅ discriminator 추출
        const discriminator = Buffer.from(IDL.instructions.find((i) => i.name === "initialize").discriminator);
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
        const ix = new web3_js_1.TransactionInstruction({
            programId: PROGRAM_ID,
            keys: [
                { pubkey: modelPda, isSigner: false, isWritable: true },
                { pubkey: userPubkey, isSigner: true, isWritable: true },
                { pubkey: web3_js_1.SystemProgram.programId, isSigner: false, isWritable: false },
            ],
            data,
        });
        // ✅ 트랜잭션 생성
        const { blockhash } = await connection.getLatestBlockhash("finalized");
        const tx = new web3_js_1.Transaction({
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
    }
    catch (err) {
        console.error("❌ 트랜잭션 생성 실패:", err);
        throw new Error("트랜잭션 생성 중 오류가 발생했습니다.");
    }
};
exports.createInitializeTx = createInitializeTx;
