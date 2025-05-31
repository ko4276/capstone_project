# Capstone_BE 프로젝트 수정 사항 리스트

## 새로 추가된 파일들

### 1. 하이브리드 Solana 서비스
- `src/services/hybridSolanaService.ts` 
  - 사용자/백엔드 서명 방식 선택 가능
  - `SignatureMode` enum (USER_SIGNATURE, BACKEND_SIGNATURE)
  - `createModelHybrid()`: 모델 등록
  - `buyLicenseHybrid()`: 라이선스 구매
  - `updateModelMetadata()`: 메타데이터 업데이트

### 2. 하이브리드 컨트롤러
- `src/controllers/HybridModelController.ts` 
  - `handleModelRegistration()`: 모델 등록 처리
  - `handleLicensePurchase()`: 라이선스 구매 처리
  - `handleMetadataUpdate()`: 메타데이터 업데이트
  - `handleSmartTransaction()`: 스마트 라우팅

### 3. 테스트 파일들
- `test-hybrid.js` - Node.js 기반 종합 테스트 스크립트
- `test-curl.sh` - Bash 기반 curl 테스트 스크립트
- `test-devnet.js` - 실제 Devnet 트랜잭션 테스트

## 수정된 기존 파일들

### 1. 라우팅 시스템
- `src/routes/model.ts` 
  ```typescript
  // 추가된 하이브리드 라우팅
  router.post("/hybrid/register", authenticateJWT, handleModelRegistration);
  router.post("/hybrid/license", authenticateJWT, handleLicensePurchase);
  router.post("/hybrid/metadata", authenticateJWT, handleMetadataUpdate);
  router.post("/hybrid/smart", authenticateJWT, handleSmartTransaction);
  ```

### 2. 로그인 시스템
- `src/routes/login.ts` 
  ```typescript
  // 추가된 테스트용 간단 로그인
  router.post("/", (req, res) => {
    // 테스트용 JWT 토큰 발급
  });
  ```

### 3. 환경 설정
- `prisma/schema.prisma`
  ```prisma
  // Ubuntu WSL 호환성을 위한 수정
  generator client {
    provider      = "prisma-client-js"
    binaryTargets = ["native", "debian-openssl-3.0.x"]
  }
  ```

- `src/services/hybridSolanaService.ts`
  ```typescript
  // 실제 프로그램 ID 설정
  const PROGRAM_ID = new PublicKey("GUrLuMj8yCB2T4NKaJSVqrAWWCMPMf1qtBSnDR8ytYwB");
  ```

## 실제 Devnet 트랜잭션 테스트 방법

### 1단계: 서버 실행
```bash
npm run dev
```

### 2단계: Devnet 테스트 실행
```bash
# 새 터미널에서
node test-devnet.js
```

### 3단계: 백엔드 서명 테스트 (선택사항)
```bash
# Solana CLI 설치
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# 백엔드 지갑 생성
mkdir -p src/config
solana-keygen new --outfile src/config/backend-wallet.json --no-bip39-passphrase

# Devnet SOL 에어드랍
solana airdrop 2 $(solana-keygen pubkey src/config/backend-wallet.json) --url devnet
```

### 4단계: 트랜잭션 확인
```bash
# CLI로 확인
solana transaction [TRANSACTION_ID] --url devnet

# 또는 Solana Explorer에서 확인
# https://explorer.solana.com/tx/[TRANSACTION_ID]?cluster=devnet
```

## 핵심 기능 개선사항

### 1. 하이브리드 서명 시스템
- **이전**: 사용자 서명만 지원
- **현재**: 사용자/백엔드 서명 선택 가능
- **장점**: 보안과 편의성 균형

### 2. 스마트 라우팅
- **자동 서명 방식 선택**:
  - 중요한 트랜잭션 → 사용자 서명
  - 일반 작업 → 백엔드 서명
  - 금액별 자동 선택

### 3. 실제 온체인 연동
- **Devnet 연결**: `https://api.devnet.solana.com`
- **프로그램 ID**: `GUrLuMj8yCB2T4NKaJSVqrAWWCMPMf1qtBSnDR8ytYwB`
- **실제 트랜잭션 전송 가능**

## API 엔드포인트

### 기존 API
```
POST /login/verify          # Solana 서명 검증
POST /model/upload          # 모델 업로드
POST /model/transaction     # 트랜잭션 생성
POST /model/complete        # 모델 등록 완료
```

### 새로 추가된 API 
```
POST /login                 # 테스트용 간단 로그인
POST /model/hybrid/register # 하이브리드 모델 등록
POST /model/hybrid/license  # 하이브리드 라이선스 구매
POST /model/hybrid/metadata # 메타데이터 업데이트
POST /model/hybrid/smart    # 스마트 라우팅
```

## 시스템 아키텍처 변화

### 이전 구조
```
Frontend → Backend → Solana (사용자 서명만)
```

### 현재 구조
```
Frontend → Backend → Hybrid System → Solana Devnet
                  ├── User Signature (보안 중시)
                  └── Backend Signature (편의성 중시)
```

## 최종 결과

**기존 Capstone_BE에서 실제 온체인 연동 하이브리드 시스템으로 업그레이드!**

- 보안과 편의성 균형
- 실제 Solana Devnet 연동
- 완전한 테스트 환경
- 프로그램 ID: `GUrLuMj8yCB2T4NKaJSVqrAWWCMPMf1qtBSnDR8ytYwB`
- 실시간 트랜잭션 전송 가능
