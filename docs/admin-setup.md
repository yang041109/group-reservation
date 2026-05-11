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

### 백엔드 (MySQL)
- `store` / `reservation` / `menu` 테이블 — `docs/mysql-schema.sql` 참고
- API는 `mysql2`로 DB에 직접 조회·갱신합니다.

## 📝 MySQL 필수 데이터

### `store` 테이블
- `storeId`, `name` (로그인 시 이름 일치 검사), `depositAmount` (0이면 예약금 없음)

### `reservation` 테이블
- `reservationId`, `storeId`, `status`, `userName`, `userPhone`, `date`, `startTime`, `endTime`, `headcount`, `totalAmount`, `menuItems` 등

## 🚀 배포 체크리스트

1. ✅ MySQL에 스키마 적용 및 시드 데이터
2. ✅ `.env.local`에 `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` 설정
3. ✅ 배포 환경에도 동일한 `MYSQL_*` 변수 설정
4. ✅ 로컬에서 `npm run dev` 후 `http://localhost:3000/admin` 접속
5. ✅ 로그인 → 예약 목록 → 수락/거절 테스트

## ⚠️ 배포 사이트에서 「서버 오류」·DB 연결 실패 시

Vercel 등 **서버리스**에서 네이버 클라우드 MySQL로 붙을 때는 아래를 맞춰야 합니다.

1. **호스팅 대시보드에 `MYSQL_*` 전부 등록** (특히 `MYSQL_HOST`는 공인 IP 또는 DB 전용 호스트명)
2. **MySQL이 외부 접속을 받도록 설정**  
   - `bind-address`가 `127.0.0.1`만이면 원격에서 거절됩니다.  
   - `urr_user`에 원격 권한(`'%'` 또는 Vercel egress IP 대역) 부여
3. **방화벽·ACG에서 3306** (또는 사용 중인 포트) 허용 — 고정 IP egress가 없으면 일단 `0.0.0.0/0`으로 테스트 후 좁히기
4. 로그인 시 화면에 **구체적인 한글 안내**가 나오면, 그 문구에 맞춰 위 항목을 점검하면 됩니다.

## 🔒 보안 참고사항

현재는 간단한 storeId + name 인증 방식입니다.
- 실제 운영 시에는 더 강력한 인증 방식 고려 필요
- sessionStorage 사용 (브라우저 탭 닫으면 로그아웃)
