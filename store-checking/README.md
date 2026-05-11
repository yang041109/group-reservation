# 사장님 페이지 백업

이 폴더에는 사장님 전용 관리 페이지 파일들이 백업되어 있습니다.

## 파일 구조

### 페이지 파일
- `admin-login-page.tsx` → `/src/app/admin/page.tsx`
- `admin-layout.tsx` → `/src/app/admin/layout.tsx`
- `admin-dashboard-page.tsx` → `/src/app/admin/dashboard/page.tsx`
- `admin-calendar-page.tsx` → `/src/app/admin/calendar/page.tsx`

### 컴포넌트 파일
- `ConditionalHeader.tsx` → `/src/components/ConditionalHeader.tsx`

## 기능 설명

### 1. 로그인 페이지 (`/admin`)
- 가게 ID와 이름으로 로그인
- API: `POST /api/admin/auth`
- 로그인 성공 시 sessionStorage에 저장 후 대시보드로 이동

### 2. 대시보드 (`/admin/dashboard`)
- 대기 중인 예약 목록 표시
- 예약 수락/거절 기능
- API: `GET /api/admin/reservations?storeId=xxx&status=PENDING`
- API: `PATCH /api/admin/reservations/[id]` (action: accept/reject)

### 3. 캘린더 (`/admin/calendar`)
- 날짜별 예약 조회
- 통계 표시 (총 예약 건수, 총 인원, 예상 매출)
- 확정된 예약 취소 기능
- API: `GET /api/admin/reservations?storeId=xxx&date=YYYY-MM-DD`
- API: `PATCH /api/admin/reservations/[id]` (action: cancel)

### 4. ConditionalHeader
- admin 페이지에서는 일반 사용자용 헤더(우르르 로고, 내 예약) 숨김
- pathname이 `/admin`으로 시작하면 헤더 렌더링하지 않음

## 사용 방법

1. 로그인: `http://localhost:3000/admin`
2. 대시보드: 로그인 후 자동 이동 또는 `http://localhost:3000/admin/dashboard`
3. 캘린더: 대시보드에서 "📅 날짜별 예약" 버튼 클릭

## 주의사항

- 이 파일들은 `.gitignore`에 포함되어 있어 git에 커밋되지 않습니다
- 로컬 개발 환경에서만 사용됩니다
- 배포 시에는 포함되지 않습니다
