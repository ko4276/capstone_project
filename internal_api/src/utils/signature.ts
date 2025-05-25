import { PublicKey } from "@solana/web3.js";
import * as bs58 from "bs58";
import nacl from "tweetnacl";

export async function verifySignature(
  publicKey: PublicKey,
  message: string,
  signature: string
): Promise<boolean> {
  try {
    const messageBytes = new TextEncoder().encode(message);
    const signatureBytes = bs58.decode(signature);
    return nacl.sign.detached.verify(
      messageBytes,
      signatureBytes,
      publicKey.toBytes()
    );
  } catch (e) {
    console.error("Signature verification failed:", e);
    return false;
  }
} 