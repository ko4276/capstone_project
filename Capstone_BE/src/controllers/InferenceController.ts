import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/authMiddleware";
import { PrismaClient } from "@prisma/client";
import axios from "axios";

const prisma = new PrismaClient();

export const RequestInference = async (req : AuthRequest, res : Response): Promise<void> => {
    console.log("요청 도착");
    console.log("req.user:", req.user);

    const wallet = req.user?.wallet;
    const { model_name, prompt } = req.body;

    if (!wallet || !prompt) {
        res.status(400).json({ message : "prompt를 입력하세요." });
        return;
    }

    try {
        const baseUrl = process.env.CHEETAH_SERVER_URL!;

        const aiRequestBody = {
            prompt : prompt
        };

        console.log(aiRequestBody)
        
        const fixedModelName = "meta-llamaLlama-3.2-3B";

        const aiResponse = await axios.post(`${baseUrl}?model_name=${encodeURIComponent(fixedModelName)}`, aiRequestBody);
	
        const generatedText = aiResponse.data.generated_text;

        res.status(200).json({ generate_text : generatedText });

    } catch (error){
        console.error("AI 추론 실패:", error);
        res.status(500).json({ message: "AI 서버 요청 실패" });
    }
};