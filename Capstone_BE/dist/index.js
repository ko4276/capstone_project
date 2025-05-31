"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const cookie_parser_1 = __importDefault(require("cookie-parser")); // ✅ 쿠키 사용 시 필요
dotenv_1.default.config();
const login_1 = __importDefault(require("./routes/login"));
const model_1 = __importDefault(require("./routes/model"));
const inference_1 = __importDefault(require("./routes/inference"));
const app = (0, express_1.default)();
const PORT = Number(process.env.PORT) || 8080;
// ✅ CORS 설정 (가장 위에 위치해야 함)
app.use((0, cors_1.default)({
    origin: true, // 개발 환경에서는 모든 origin 허용
    credentials: true,
}));
// ✅ 쿠키 파서 및 JSON 파서
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
// ✅ 라우터 연결
app.use("/login", login_1.default);
app.use("/model", model_1.default);
app.use("/inference", inference_1.default);
app.get("/", (req, res) => {
    res.send("Agent Chain Backend is running!");
});
app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
    console.log(`🌐 Access from Windows: http://172.19.150.247:${PORT}`);
});
