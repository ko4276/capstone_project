const axios = require('axios');

// 🔧 테스트 설정
const BASE_URL = 'http://localhost:8080';
const TEST_WALLET = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH'; // 테스트용 지갑 주소

// 🔑 테스트용 JWT 토큰 (실제로는 로그인 후 받아야 함)
let authToken = '';

// 📋 테스트 함수들
async function testLogin() {
  console.log('\n🔐 1. 로그인 테스트...');
  try {
    const response = await axios.post(`${BASE_URL}/login`, {
      wallet_address: TEST_WALLET
    });
    
    authToken = response.data.token;
    console.log('✅ 로그인 성공:', response.data.message);
    return true;
  } catch (error) {
    console.log('❌ 로그인 실패:', error.response?.data || error.message);
    return false;
  }
}

async function testSmartRouting() {
  console.log('\n🎯 2. 스마트 라우팅 테스트...');
  
  const testCases = [
    { transactionType: 'model_registration', description: '모델 등록' },
    { transactionType: 'high_value_license', description: '고액 라이선스' },
    { transactionType: 'metadata_update', description: '메타데이터 업데이트' },
    { transactionType: 'low_value_license', description: '소액 라이선스' }
  ];

  for (const testCase of testCases) {
    try {
      const response = await axios.post(`${BASE_URL}/model/hybrid/smart`, testCase, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      console.log(`✅ ${testCase.description}:`, response.data.recommendedSignatureMode);
      console.log(`   이유: ${response.data.reasoning}`);
    } catch (error) {
      console.log(`❌ ${testCase.description} 실패:`, error.response?.data || error.message);
    }
  }
}

async function testModelRegistration() {
  console.log('\n🔑 3. 모델 등록 테스트 (사용자 서명)...');
  try {
    const response = await axios.post(`${BASE_URL}/model/hybrid/register`, {
      s3_key: 'test-model-' + Date.now(),
      royalty: 500, // 5%
      is_derivative: false,
      signature_mode: 'user'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ 모델 등록 트랜잭션 생성 성공');
    console.log('📝 트랜잭션 길이:', response.data.transaction?.length || 0);
    console.log('🏠 모델 PDA:', response.data.modelPda);
    console.log('🔏 사용자 서명 필요:', response.data.requiresUserSignature);
    
    return response.data.modelPda;
  } catch (error) {
    console.log('❌ 모델 등록 실패:', error.response?.data || error.message);
    return null;
  }
}

async function testLicensePurchase(modelPda) {
  console.log('\n🛒 4. 라이선스 구매 테스트...');
  
  // 소액 결제 테스트 (백엔드 서명)
  console.log('💰 소액 결제 (백엔드 서명):');
  try {
    const response = await axios.post(`${BASE_URL}/model/hybrid/license`, {
      modelPda: modelPda || 'test-model-pda',
      licenseType: 1,
      amount: 100, // 소액
      signature_mode: 'backend'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ 소액 라이선스 구매:', response.data.message);
    console.log('🔏 사용자 서명 필요:', response.data.requiresUserSignature);
  } catch (error) {
    console.log('❌ 소액 라이선스 구매 실패:', error.response?.data || error.message);
  }

  // 고액 결제 테스트 (사용자 서명)
  console.log('\n💎 고액 결제 (사용자 서명):');
  try {
    const response = await axios.post(`${BASE_URL}/model/hybrid/license`, {
      modelPda: modelPda || 'test-model-pda',
      licenseType: 2,
      amount: 2000, // 고액
      signature_mode: 'user'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ 고액 라이선스 구매 트랜잭션 생성');
    console.log('🔏 사용자 서명 필요:', response.data.requiresUserSignature);
  } catch (error) {
    console.log('❌ 고액 라이선스 구매 실패:', error.response?.data || error.message);
  }
}

async function testMetadataUpdate() {
  console.log('\n📝 5. 메타데이터 업데이트 테스트 (백엔드 전용)...');
  try {
    const response = await axios.post(`${BASE_URL}/model/hybrid/metadata`, {
      modelPda: 'test-model-pda',
      newUrl: 'https://updated-metadata-url.com'
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ 메타데이터 업데이트 성공:', response.data.message);
    console.log('🔗 새 URL:', response.data.newUrl);
  } catch (error) {
    console.log('❌ 메타데이터 업데이트 실패:', error.response?.data || error.message);
  }
}

// 🚀 메인 테스트 실행
async function runAllTests() {
  console.log('🧪 하이브리드 Solana 시스템 테스트 시작\n');
  console.log('=' .repeat(50));
  
  // 서버 연결 확인
  try {
    await axios.get(`${BASE_URL}/`);
    console.log('✅ 서버 연결 확인');
  } catch (error) {
    console.log('❌ 서버에 연결할 수 없습니다. 서버가 실행 중인지 확인하세요.');
    return;
  }

  // 순차적 테스트 실행
  const loginSuccess = await testLogin();
  if (!loginSuccess) {
    console.log('\n❌ 로그인 실패로 테스트를 중단합니다.');
    return;
  }

  await testSmartRouting();
  const modelPda = await testModelRegistration();
  await testLicensePurchase(modelPda);
  await testMetadataUpdate();

  console.log('\n' + '='.repeat(50));
  console.log('🎉 모든 테스트 완료!');
  console.log('\n📊 테스트 결과 요약:');
  console.log('- 스마트 라우팅: 트랜잭션 유형별 서명 방식 자동 선택');
  console.log('- 모델 등록: 사용자 서명 (보안 중시)');
  console.log('- 라이선스 구매: 금액별 서명 방식 선택');
  console.log('- 메타데이터 업데이트: 백엔드 서명 (편의성 중시)');
}

// 실행
runAllTests().catch(console.error); 