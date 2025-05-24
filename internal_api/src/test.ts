import { createModel } from './anchor/client';

async function testCreateModel() {
  try {
    const modelName = "test-model";
    const creator = "GUrLuMj8yCB2T4NKaJSVqrAWWCMPMf1qtBSnDR8ytYwB"; // 프로그램 ID를 creator로 사용
    const url = "https://example.com/model";
    const royaltyBps = 500; // 5%
    const isAllowed = true;

    console.log("모델 생성 시작...");
    const modelPda = await createModel(modelName, creator, url, royaltyBps, isAllowed);
    console.log("모델 생성 성공!");
    console.log("생성된 모델 PDA:", modelPda);
  } catch (error) {
    console.error("에러 발생:", error);
  }
}

testCreateModel(); 