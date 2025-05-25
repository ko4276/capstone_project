import { Keypair } from "@solana/web3.js";
import * as bs58 from "bs58";
import * as nacl from "tweetnacl";

// 테스트용 키페어 생성 (실제 환경에서는 기존 키페어를 사용해야 함)
const keypair = Keypair.generate();
const creatorWallet = keypair.publicKey.toBase58();

// 테스트용 메시지
const message = JSON.stringify({
    model_name: "test-model2",
    creatorWallet: creatorWallet,
    url: "https://example.com/model",
    royaltyBps: 500,
    isAllowed: true
});

// 메시지 서명
const messageBytes = new TextEncoder().encode(message);
const signature = bs58.encode(nacl.sign.detached(messageBytes, keypair.secretKey));

console.log("Public Key:", creatorWallet);
console.log("Message:", message);
console.log("Signature:", signature);

// curl 명령어 출력
console.log("\ncurl 명령어:");
console.log(`curl -X POST http://localhost:3000/create-model \\
-H "Content-Type: application/json" \\
-d '{
    "model_name": "test-model2",
    "creatorWallet": "${creatorWallet}",
    "url": "https://example.com/model",
    "royaltyBps": 500,
    "isAllowed": true,
    "message": "${message.replace(/"/g, '\\"')}",
    "signature": "${signature}"
}'`); 