"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const loginController_1 = require("../controllers/loginController");
const router = express_1.default.Router();
router.get("/nonce", loginController_1.getNonce);
router.post("/verify", loginController_1.verifySignature);
router.post("/refresh", loginController_1.refreshAccessToken);
exports.default = router;
