# 사장님용 관리 페이지 설정 가이드

## 📋 개요

사장님이 자신의 가게에 들어온 예약을 확인하고 수락/거절할 수 있는 관리 페이지입니다.

## 🔑 로그인 방법

1. `/admin` 경로로 접속
2. **가게 ID**와 **가게 이름**을 정확히 입력
   - 예: `store-1`, `주점A`
3. 로그인 버튼 클릭

## 📱 주요 기능

### 1. 대기 중인 예약 목록
- 로그인하면 자동으로 `PENDING` 상태의 예약만 표시
- 예약 정보 확인:
  - 예약자 이름, 단체명
  - 날짜, 시간, 인원
  - 주문 메뉴 및 총 금액
  - 예약금 정보 (있는 경우)

### 2. 예약 수락/거절
- **수락 버튼**:
  - 예약금이 있는 가게: `DEPOSIT_PENDING` 상태로 변경 (예약금 입금 대기)
  - 예약금이 없는 가게: `CONFIRMED` 상태로 변경 (즉시 확정)
- **거절 버튼**: `CANCELED` 상태로 변경

## 🔄 예약 상태 흐름

### 예약금이 있는 경우
```
PENDING → (수락) → DEPOSIT_PENDING → (입금 확인) → DEPOSIT_CONFIRMED
```

### 예약금이 없는 경우
```
PENDING → (수락) → CONFIRMED
```

## 🛠️ 기술 구조

### 프론트엔드
- `/admin` - 로그인 페이지
- `/admin/dashboard` - 대기 중인 예약 목록

### API 엔드포인트
- `POST /api/admin/auth` - 로그인 인증
- `GET /api/admin/reservations?storeId=xxx&status=PENDING` - 예약 목록 조회
- `PATCH /api/admin/reservations/[id]` - 예약 상태 변경

### Google Apps Script 함수
- `handleGetReservationsByStore()` - 가게별 예약 조회
- `handleUpdateReservationStatus()` - 예약 상태 업데이트

## 📝 Google Sheets 설정

### store 시트 필수 컬럼
- `storeId` - 가게 고유 ID (예: store-1)
- `name` - 가게 이름 (로그인 인증에 사용)
- `depositAmount` - 예약금 (0이면 예약금 없음)

### reservation 시트 필수 컬럼
- `reservationId` - 예약 ID
- `storeId` - 가게 ID
- `status` - 예약 상태 (PENDING, CONFIRMED, DEPOSIT_PENDING, etc.)
- `userName`, `userPhone`, `date`, `startTime`, `endTime`, `headcount`, `totalAmount` 등

## 🚀 배포 체크리스트

1. ✅ Apps Script 배포 완료
2. ✅ `.env.local`에 `NEXT_PUBLIC_SHEETS_URL` 설정
3. ✅ Vercel 환경 변수에도 동일하게 설정
4. ✅ Google Sheets에 store 데이터 입력
5. ✅ 로컬에서 `/admin` 접속 테스트
6. ✅ 로그인 → 예약 목록 → 수락/거절 테스트

## 🔒 보안 참고사항

현재는 간단한 storeId + name 인증 방식입니다.
- 실제 운영 시에는 더 강력한 인증 방식 고려 필요
- sessionStorage 사용 (브라우저 탭 닫으면 로그아웃)
