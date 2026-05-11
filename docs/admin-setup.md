# 사장님용 관리 페이지 설정 가이드

## 📋 개요

사장님이 자신의 가게에 들어온 예약을 확인하고 수락/거절할 수 있는 관리 페이지입니다. **로그인 폼은 없으며**, 가게마다 부여된 **전용 URL(토큰)** 으로만 접속합니다.

## 🔑 접속 방법

1. `store.adminAccessToken` 값을 확인합니다 (`docs/store-admin-access-token.sql` 참고).
2. 사장님에게 아래 형태의 링크를 전달합니다.
   - 대시보드(대기 예약): `https://당신의도메인/admin/m/{adminAccessToken}`
   - 날짜별 캘린더: `https://당신의도메인/admin/m/{adminAccessToken}/calendar`
3. `/admin` 은 **예약 사이트 루트(`/`)로 리다이렉트**됩니다.

## 🛠️ 운영자용 전역 관리 (`/admin/manage`)

가게·메뉴·사장님 토큰·전체 예약을 브라우저에서 다루는 페이지입니다.

- **MVP(로컬 등):** 서버에 **`ADMIN_MANAGE_SECRET`을 설정하지 않으면** 별도 비밀키 입력 없이 바로 사용됩니다.
- **공개 배포:** 서버에 **`ADMIN_MANAGE_SECRET`** 을 **12자 이상**으로 두면, 브라우저에서 같은 값을 한 번 입력해 sessionStorage에 저장하고, API는 헤더 `x-admin-manage-secret` 로 검증합니다. 비밀값은 저장소에 커밋하지 마세요.
- 가게 **목록 표시 순서**는 DB 컬럼 **`sortOrder`**(작을수록 앞)이며, 이 페이지에서 저장합니다. 기존 DB에는 `docs/store-sort-order.sql` 로 컬럼을 추가하세요.

## 📱 주요 기능

### 1. 대기 중인 예약 목록
- 전용 링크로 들어오면 해당 가게의 `PENDING` 예약만 표시
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
- `/admin` — `/` 로 리다이렉트
- `/admin/manage` — 운영자용 전역 관리(가게·메뉴·토큰·예약·`sortOrder`, `ADMIN_MANAGE_SECRET` 선택)
- `/admin/m/[token]` — 대기 중인 예약 목록
- `/admin/m/[token]/calendar` — 월 캘린더·날짜별 예약

구 URL `/admin/dashboard`, `/admin/calendar` 는 **`/`** 로 리다이렉트됩니다.

### API 엔드포인트
- `GET /api/admin/reservations?storeId=xxx&status=PENDING` — 예약 목록 조회
- `PATCH /api/admin/reservations/[id]` — 예약 상태 변경
- 전역 관리(헤더 `x-admin-manage-secret` + `ADMIN_MANAGE_SECRET`): `GET/PATCH /api/admin/manage/stores…`, `GET/POST …/menus`, `PATCH/DELETE …/menus/[menuId]`, `POST …/token`, `GET /api/admin/manage/reservations`

### 백엔드 (MySQL)
- `store` / `reservation` / `menu` 테이블 — `docs/mysql-schema.sql` 참고
- API는 `mysql2`로 DB에 직접 조회·갱신합니다.

## 📝 MySQL 필수 데이터

### `store` 테이블
- `storeId`, `name`, `depositAmount` (0이면 예약금 없음)
- **`adminAccessToken`** — 가게별 고유 토큰(최대 64자, UNIQUE). 없거나 잘못된 토큰이면 관리 페이지 404

### `reservation` 테이블
- `reservationId`, `storeId`, `status`, `userName`, `userPhone`, `date`, `startTime`, `endTime`, `headcount`, `totalAmount`, `menuItems` 등

## 🚀 배포 체크리스트

1. ✅ MySQL에 스키마 적용 및 `adminAccessToken` 컬럼·값 설정 (`docs/store-admin-access-token.sql`)
2. ✅ `.env.local`에 `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE` 설정
3. ✅ 배포 환경에도 동일한 `MYSQL_*` 변수 설정
4. ✅ 로컬에서 `npm run dev` 후 `/admin/m/실제토큰` 으로 접속 테스트
5. ✅ 대기 목록 → 수락/거절, 캘린더 화면 확인

## 🔧 `/api/admin/health` 로 DB만 빠르게 확인

브라우저 또는 터미널에서:

```
https://당신의도메인/api/admin/health
```

- `mysqlEnvConfigured: false` → 서버에 **`MYSQL_HOST` / `MYSQL_USER` / `MYSQL_DATABASE`** 가 프로세스에 안 넘어온 것입니다 (`.env`만 있고 systemd/pm2에 안 붙은 경우 등).
- `ping: "fail"` + `message` → 환경 변수는 있는데 **DB 연결 자체 실패** (방화벽, bind-address, 비밀번호 등).

---

## ⚠️ 배포 사이트에서 「서버 오류」·DB 연결 실패 시

**도메인이 자기 서버(nginx, 예: 101.79.17.198)를 가리키는 경우**, GitHub에 `git push`만 하면 끝이 아닙니다. **그 서버에서** 저장소를 당겨오고 다시 빌드한 뒤 Node 프로세스를 재시작해야 합니다.

```bash
cd /path/to/group-reservation
git pull origin main
npm ci
npm run build
# pm2 사용 시 예:
# pm2 restart urr
# systemd 사용 시 해당 서비스 restart
```

Vercel 등 **서버리스**에서 네이버 클라우드 MySQL로 붙을 때는 아래를 맞춰야 합니다.

1. **호스팅 대시보드에 `MYSQL_*` 전부 등록** (특히 `MYSQL_HOST`는 공인 IP 또는 DB 전용 호스트명)
2. **MySQL이 외부 접속을 받도록 설정**  
   - `bind-address`가 `127.0.0.1`만이면 원격에서 거절됩니다.  
   - `urr_user`에 원격 권한(`'%'` 또는 Vercel egress IP 대역) 부여
3. **방화벽·ACG에서 3306** (또는 사용 중인 포트) 허용 — 고정 IP egress가 없으면 일단 `0.0.0.0/0`으로 테스트 후 좁히기
4. 화면에 **구체적인 한글 안내**가 나오면, 그 문구에 맞춰 위 항목을 점검하면 됩니다.

## 🔒 보안 참고사항

- 관리 페이지는 **URL에 포함된 비밀 토큰**으로 보호됩니다. 링크를 외부에 노출하지 않도록 안내하세요.
- 운영에서는 `docs/store-admin-access-token.sql` 의 예시처럼 **추측하기 어려운 긴 토큰**(UUID 기반 등)을 권장합니다.
