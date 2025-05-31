"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshAccessToken = exports.verifySignature = exports.getNonce = void 0;
const uuid_1 = require("uuid");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const web3_js_1 = require("@solana/web3.js");
const tweetnacl_1 = __importDefault(require("tweetnacl"));
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const ACCESS_SECRET = process.env.JWT_SECRET || "dev_secret";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "refresh_secret";
// 메모리 저장소 (실제 환경에서는 Redis 또는 DB 사용 권장)
const nonceStore = {};
// ✅ GET /login/nonce
const getNonce = (req, res) => {
    const wallet = req.query.wallet;
    if (!wallet) {
        res.status(400).json({ error: "지갑 주소(wallet)가 필요합니다." });
        return;
    }
    const nonce = (0, uuid_1.v4)();
    nonceStore[wallet] = nonce;
    res.json({ wallet, nonce });
    console.log("nonce : ", nonce);
};
exports.getNonce = getNonce;
// ✅ POST /login/verify
const verifySignature = async (req, res) => {
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
        const pubKeyBytes = new web3_js_1.PublicKey(wallet).toBytes();
        const sigBuffer = Buffer.from(signature, "base64");
        const msgBuffer = Buffer.from(nonce);
        const isValid = tweetnacl_1.default.sign.detached.verify(msgBuffer, sigBuffer, pubKeyBytes);
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
        }
        else {
            console.log("기존 사용자 로그인:", wallet);
        }
        // ✅ JWT 발급
        const accessToken = jsonwebtoken_1.default.sign({ wallet }, ACCESS_SECRET, { expiresIn: "15m" });
        const refreshToken = jsonwebtoken_1.default.sign({ wallet }, REFRESH_SECRET, { expiresIn: "1d" });
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "none",
            maxAge: 24 * 60 * 60 * 1000, // 1일
        });
        res.json({ token: accessToken });
    }
    catch (err) {
        console.error("서명 검증 중 오류:", err);
        res.status(500).json({ error: "서버 오류" });
    }
};
exports.verifySignature = verifySignature;
// ✅ POST /login/refresh
const refreshAccessToken = (req, res) => {
    const token = req.cookies.refreshToken;
    if (!token) {
        res.status(401).json({ error: "리프레시 토큰 없음" });
        return;
    }
    try {
        const payload = jsonwebtoken_1.default.verify(token, REFRESH_SECRET);
        const newAccessToken = jsonwebtoken_1.default.sign({ wallet: payload.wallet }, ACCESS_SECRET, {
            expiresIn: "15m",
        });
        res.json({ token: newAccessToken });
    }
    catch (err) {
        res.status(403).json({ error: "리프레시 토큰이 유효하지 않거나 만료됨" });
    }
};
exports.refreshAccessToken = refreshAccessToken;
