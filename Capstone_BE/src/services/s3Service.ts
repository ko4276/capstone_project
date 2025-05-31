// src/services/s3Service.ts
import fs from "fs";
import AWS from "aws-sdk";
import path from "path";

const s3 = new AWS.S3({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

/**
 * @param filePath - 로컬 임시 경로
 * @param s3Key - S3 저장 키 (상대 경로 포함)
 */
export const uploadToS3 = async (
  filePath: string,
  s3Key: string
): Promise<{ s3_key: string; url: string }> => {
  const fileContent = fs.readFileSync(filePath);

  const params = {
    Bucket: process.env.S3_BUCKET_NAME!,
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
