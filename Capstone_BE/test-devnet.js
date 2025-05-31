const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');

// 🌐 설정
const BASE_URL = 'http://localhost:8080';
const TEST_WALLET = 'HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH';
const PROGRAM_ID = 'GUrLuMj8yCB2T4NKaJSVqrAWWCMPMf1qtBSnDR8ytYwB';
const connection = new Connection('https://api.devnet.solana.com', 'processed');

let authToken = '';

// 🔍 프로그램 정보 확인
async function checkProgramInfo() {
  console.log('\n🔍 프로그램 정보 확인...');
  try {
    const programId = new PublicKey(PROGRAM_ID);
    const accountInfo = await connection.getAccountInfo(programId);
    
    if (accountInfo) {
      console.log('✅ 프로그램이 Devnet에 배포되어 있습니다!');
      console.log(`📊 프로그램 크기: ${accountInfo.data.length} bytes`);
      console.log(`💰 프로그램 잔액: ${accountInfo.lamports / 1e9} SOL`);
      console.log(`👤 소유자: ${accountInfo.owner.toBase58()}`);
      return true;
    } else {
      console.log('❌ 프로그램을 찾을 수 없습니다.');
      return false;
    }
  } catch (error) {
    console.log('❌ 프로그램 확인 실패:', error.message);
    return false;
  }
}

// 🔐 로그인
async function login() {
  console.log('\n🔐 로그인...');
  try {
    const response = await axios.post(`${BASE_URL}/login`, {
      wallet_address: TEST_WALLET
    });
    
    authToken = response.data.token;
    console.log('✅ 로그인 성공');
    return true;
  } catch (error) {
    console.log('❌ 로그인 실패:', error.response?.data || error.message);
    return false;
  }
}

// 🚀 실제 Devnet 트랜잭션 테스트
async function testDevnetTransaction() {
  console.log('\n🚀 Devnet 트랜잭션 생성 테스트...');
  
  try {
    const response = await axios.post(`${BASE_URL}/model/hybrid/register`, {
      s3_key: `devnet-test-${Date.now()}`,
      royalty: 250, // 2.5%
      is_derivative: false,
      signature_mode: 'user' // 사용자 서명 모드로 트랜잭션만 생성
    }, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    console.log('✅ 트랜잭션 생성 성공!');
    console.log(`📝 트랜잭션 크기: ${response.data.transaction?.length || 0} bytes`);
    console.log(`🏠 모델 PDA: ${response.data.modelPda}`);
    console.log(`🔏 서명 필요: ${response.data.requiresUserSignature}`);
    
    // PDA 주소 유효성 검증
    try {
      const pda = new PublicKey(response.data.modelPda);
      console.log(`✅ 유효한 PDA 주소: ${pda.toBase58()}`);
    } catch (error) {
      console.log('❌ 잘못된 PDA 주소');
    }
    
    return response.data;
  } catch (error) {
    console.log('❌ 트랜잭션 생성 실패:', error.response?.data || error.message);
    return null;
  }
}

// 🔍 PDA 계정 상태 확인
async function checkPDAAccount(modelPda) {
  console.log('\n🔍 PDA 계정 상태 확인...');
  try {
    const pda = new PublicKey(modelPda);
    const accountInfo = await connection.getAccountInfo(pda);
    
    if (accountInfo) {
      console.log('✅ PDA 계정이 이미 존재합니다!');
      console.log(`📊 데이터 크기: ${accountInfo.data.length} bytes`);
      console.log(`💰 잔액: ${accountInfo.lamports / 1e9} SOL`);
    } else {
      console.log('📝 PDA 계정이 아직 생성되지 않았습니다 (정상)');
      console.log('💡 트랜잭션을 서명하고 전송하면 계정이 생성됩니다.');
    }
  } catch (error) {
    console.log('❌ PDA 확인 실패:', error.message);
  }
}

// 🌐 네트워크 상태 확인
async function checkNetworkStatus() {
  console.log('\n🌐 Devnet 네트워크 상태 확인...');
  try {
    const slot = await connection.getSlot();
    const blockHeight = await connection.getBlockHeight();
    const { blockhash } = await connection.getLatestBlockhash();
    
    console.log(`✅ 현재 슬롯: ${slot}`);
    console.log(`📏 블록 높이: ${blockHeight}`);
    console.log(`🔗 최신 블록해시: ${blockhash.slice(0, 8)}...`);
    
    return true;
  } catch (error) {
    console.log('❌ 네트워크 연결 실패:', error.message);
    return false;
  }
}

// 🎯 메인 테스트 실행
async function runDevnetTest() {
  console.log('🧪 Solana Devnet 실제 트랜잭션 테스트');
  console.log('='.repeat(60));
  console.log(`🎯 프로그램 ID: ${PROGRAM_ID}`);
  console.log(`🌐 네트워크: Devnet`);
  console.log(`👤 테스트 지갑: ${TEST_WALLET}`);
  
  // 순차적 테스트
  const networkOk = await checkNetworkStatus();
  if (!networkOk) return;
  
  const programExists = await checkProgramInfo();
  if (!programExists) {
    console.log('\n⚠️ 프로그램이 배포되지 않았을 수 있습니다.');
    console.log('💡 그래도 트랜잭션 생성 테스트는 계속 진행합니다...');
  }
  
  const loginOk = await login();
  if (!loginOk) return;
  
  const txData = await testDevnetTransaction();
  if (txData && txData.modelPda) {
    await checkPDAAccount(txData.modelPda);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🎉 Devnet 테스트 완료!');
  console.log('\n📋 다음 단계:');
  console.log('1. 프론트엔드에서 트랜잭션을 서명');
  console.log('2. 서명된 트랜잭션을 Devnet에 전송');
  console.log('3. Solana Explorer에서 결과 확인');
  console.log(`   https://explorer.solana.com/?cluster=devnet`);
}

// 실행
runDevnetTest().catch(console.error); 