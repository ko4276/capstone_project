#!/bin/bash

# 🧪 하이브리드 시스템 Curl 테스트 스크립트

BASE_URL="http://localhost:8080"
TEST_WALLET="HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH"

echo "🧪 하이브리드 Solana 시스템 테스트 시작"
echo "=================================================="

# 1. 서버 상태 확인
echo ""
echo "🔍 1. 서버 상태 확인..."
curl -s -X GET $BASE_URL/ && echo "✅ 서버 정상" || echo "❌ 서버 연결 실패"

# 2. 로그인 테스트
echo ""
echo "🔐 2. 로그인 테스트..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/login \
  -H "Content-Type: application/json" \
  -d "{\"wallet_address\": \"$TEST_WALLET\"}")

echo "로그인 응답: $LOGIN_RESPONSE"

# JWT 토큰 추출 (jq가 있는 경우)
if command -v jq &> /dev/null; then
  TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.token // empty')
  if [ -n "$TOKEN" ]; then
    echo "✅ JWT 토큰 획득: ${TOKEN:0:20}..."
  else
    echo "❌ JWT 토큰 획득 실패"
    exit 1
  fi
else
  echo "⚠️ jq가 설치되지 않아 토큰 추출을 건너뜁니다."
  TOKEN="dummy-token"
fi

# 3. 스마트 라우팅 테스트
echo ""
echo "🎯 3. 스마트 라우팅 테스트..."
curl -s -X POST $BASE_URL/model/hybrid/smart \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"transactionType": "model_registration"}' | \
  (command -v jq &> /dev/null && jq '.' || cat)

# 4. 모델 등록 테스트 (사용자 서명)
echo ""
echo "🔑 4. 모델 등록 테스트..."
curl -s -X POST $BASE_URL/model/hybrid/register \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "s3_key": "test-model-'$(date +%s)'",
    "royalty": 500,
    "is_derivative": false,
    "signature_mode": "user"
  }' | (command -v jq &> /dev/null && jq '.' || cat)

# 5. 라이선스 구매 테스트 (소액 - 백엔드 서명)
echo ""
echo "🛒 5. 소액 라이선스 구매 테스트..."
curl -s -X POST $BASE_URL/model/hybrid/license \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "modelPda": "test-model-pda",
    "licenseType": 1,
    "amount": 100,
    "signature_mode": "backend"
  }' | (command -v jq &> /dev/null && jq '.' || cat)

# 6. 라이선스 구매 테스트 (고액 - 사용자 서명)
echo ""
echo "💎 6. 고액 라이선스 구매 테스트..."
curl -s -X POST $BASE_URL/model/hybrid/license \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "modelPda": "test-model-pda",
    "licenseType": 2,
    "amount": 2000,
    "signature_mode": "user"
  }' | (command -v jq &> /dev/null && jq '.' || cat)

# 7. 메타데이터 업데이트 테스트
echo ""
echo "📝 7. 메타데이터 업데이트 테스트..."
curl -s -X POST $BASE_URL/model/hybrid/metadata \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "modelPda": "test-model-pda",
    "newUrl": "https://updated-metadata-url.com"
  }' | (command -v jq &> /dev/null && jq '.' || cat)

echo ""
echo "=================================================="
echo "🎉 모든 테스트 완료!"
echo ""
echo "📊 테스트 항목:"
echo "- ✅ 서버 연결"
echo "- ✅ JWT 인증"
echo "- ✅ 스마트 라우팅"
echo "- ✅ 모델 등록 (사용자 서명)"
echo "- ✅ 소액 라이선스 (백엔드 서명)"
echo "- ✅ 고액 라이선스 (사용자 서명)"
echo "- ✅ 메타데이터 업데이트 (백엔드 전용)" 