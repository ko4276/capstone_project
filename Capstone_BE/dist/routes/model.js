"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// routes/modelRoutes.ts
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const ModelController_1 = require("../controllers/ModelController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = express_1.default.Router();
const upload = (0, multer_1.default)({ dest: "uploads/" });
router.post("/upload", authMiddleware_1.authenticateJWT, upload.array("files"), ModelController_1.handleModelUpload);
router.post("/transaction", authMiddleware_1.authenticateJWT, ModelController_1.handleTransactionInit);
router.post("/complete", authMiddleware_1.authenticateJWT, ModelController_1.handleModelComplete);
router.get("/list", authMiddleware_1.authenticateJWT, ModelController_1.getAllModellist);
router.post("/buy", authMiddleware_1.authenticateJWT, ModelController_1.buyLicense);
router.get("/owned", authMiddleware_1.authenticateJWT, ModelController_1.getOwnedModels);
exports.default = router;
