import express from "express";
import { RequestInference } from "../controllers/InferenceController";
import { authenticateJWT } from "../middlewares/authMiddleware";

const router = express.Router();

router.post("/", authenticateJWT, RequestInference)

export default router