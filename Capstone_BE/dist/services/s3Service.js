"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadToS3 = void 0;
// src/services/s3Service.ts
const fs_1 = __importDefault(require("fs"));
const aws_sdk_1 = __importDefault(require("aws-sdk"));
const s3 = new aws_sdk_1.default.S3({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
/**
 * @param filePath - 로컬 임시 경로
 * @param s3Key - S3 저장 키 (상대 경로 포함)
 */
const uploadToS3 = async (filePath, s3Key) => {
    const fileContent = fs_1.default.readFileSync(filePath);
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: s3Key, // 예: models/<wallet>/폴더명/파일명
        Body: fileContent,
        ContentType: "application/octet-stream",
    };
    const result = await s3.upload(params).promise();
    // ✅ 전체 응답 로그
    console.log("✅ S3 응답 전체:", result);
    return {
        s3_key: s3Key,
        url: result.Location,
    };
};
exports.uploadToS3 = uploadToS3;
