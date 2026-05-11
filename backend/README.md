# group-reservation-api (Spring Boot)

Next.js 프론트엔드의 `POST /api/reservations` 계약과 맞춘 예약 API입니다.

## 실행

```bash
cd backend
mvn spring-boot:run
```

기본 포트: **8080** (`http://localhost:8080/api/reservations`)

## 프론트와 연동

- 예약: `POST http://localhost:8080/api/reservations` (JSON 본문은 `ReservationRequestDTO`와 동일)
- CORS: `http://localhost:3000` 허용 (`WebConfig`)
- 시드 가게 ID: `store-1`, `store-2`, `store-3` (`data.sql`)

Next 앱에서 이 백엔드를 쓰려면 `src/app/stores/[id]/confirm/page.tsx`의 `fetch` URL을 위 주소로 바꾸면 됩니다.

## 빌드

```bash
mvn -f backend/pom.xml compile
```
