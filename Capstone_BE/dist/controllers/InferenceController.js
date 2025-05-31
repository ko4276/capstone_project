"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestInference = void 0;
const client_1 = require("@prisma/client");
const axios_1 = __importDefault(require("axios"));
const prisma = new client_1.PrismaClient();
const RequestInference = async (req, res) => {
    console.log("요청 도착");
    console.log("req.user:", req.user);
    const wallet = req.user?.wallet;
    const { model_name, prompt } = req.body;
    if (!wallet || !prompt) {
        res.status(400).json({ message: "prompt를 입력하세요." });
        return;
    }
    try {
        const baseUrl = process.env.CHEETAH_SERVER_URL;
        const aiRequestBody = {
            prompt: prompt
        };
        console.log(aiRequestBody);
        const fixedModelName = "meta-llamaLlama-3.2-3B";
        const aiResponse = await axios_1.default.post(`${baseUrl}?model_name=${encodeURIComponent(fixedModelName)}`, aiRequestBody);
        const generatedText = aiResponse.data.generated_text;
        res.status(200).json({ generate_text: generatedText });
    }
    catch (error) {
        console.error("AI 추론 실패:", error);
        res.status(500).json({ message: "AI 서버 요청 실패" });
    }
};
exports.RequestInference = RequestInference;
