import { Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import jwt from "jsonwebtoken";
import { PublicKey } from "@solana/web3.js";
import nacl from "tweetnacl";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ACCESS_SECRET = process.env.JWT_SECRET || "dev_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";

// 메모리 저장소 (실제 환경에서는 Redis 또는 DB 사용 권장)
const nonceStore: Record<string, string> = {};

// ✅ GET /login/nonce
export const getNonce = (req: Request, res: Response): void => {
  const wallet = req.query.wallet as string;

  if (!wallet) {
    res.status(400).json({ error: "지갑 주소(wallet)가 필요합니다." });
    return;
  }

  const nonce = uuidv4();
  nonceStore[wallet] = nonce;

  res.json({ wallet, nonce });
  console.log("nonce : ", nonce);
};

// ✅ POST /login/verify
export const verifySignature = async (req: Request, res: Response): Promise<void> => {
  const { wallet, signature } = req.body;

  if (!wallet || !signature) {
    res.status(400).json({ error: "wallet과 signature가 필요합니다." });
    return;
  }

  const nonce = nonceStore[wallet];
  if (!nonce) {
    res.status(400).json({ error: "해당 wallet에 대한 nonce가 없습니다." });
    return;
  }

  try {
    const pubKeyBytes = new PublicKey(wallet).toBytes();
    const sigBuffer = Buffer.from(signature, "base64");
    const msgBuffer = Buffer.from(nonce);

    const isValid = nacl.sign.detached.verify(msgBuffer, sigBuffer, pubKeyBytes);
    delete nonceStore[wallet];

    if (!isValid) {
      res.status(401).json({ error: "서명 검증 실패" });
      return;
    }

    // ✅ DB에서 사용자 존재 여부 확인
    let user = await prisma.user.findUnique({
      where: { wallet_address: wallet },
    });

    // ✅ 존재하지 않으면 새로 등록
    if (!user) {
      user = await prisma.user.create({
        data: { wallet_address: wallet },
      });
      console.log("신규 지갑 등록:", wallet);
    } else {
      console.log("기존 사용자 로그인:", wallet);
    }

    // ✅ JWT 발급
    const accessToken = jwt.sign({ wallet }, ACCESS_SECRET, { expiresIn: "15m" });
    const refreshToken = jwt.sign({ wallet }, REFRESH_SECRET, { expiresIn: "1d" });

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 24 * 60 * 60 * 1000, // 1일
    });

    res.json({ token: accessToken });
  } catch (err) {
    console.error("서명 검증 중 오류:", err);
    res.status(500).json({ error: "서버 오류" });
  }
};

// ✅ POST /login/refresh
export const refreshAccessToken = (req: Request, res: Response): void => {
  const token = req.cookies.refreshToken;
  if (!token) {
    res.status(401).json({ error: "리프레시 토큰 없음" });
    return;
  }

  try {
    const payload = jwt.verify(token, REFRESH_SECRET) as { wallet: string };
    const newAccessToken = jwt.sign({ wallet: payload.wallet }, ACCESS_SECRET, {
      expiresIn: "15m",
    });
    res.json({ token: newAccessToken });
  } catch (err) {
    res.status(403).json({ error: "리프레시 토큰이 유효하지 않거나 만료됨" });
  }
};
