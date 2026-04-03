# 구현 계획: 단체 예약 플랫폼

## 개요

Next.js (App Router) + TypeScript + PostgreSQL 기반의 단체 예약 플랫폼을 구현한다. 데이터 모델 및 유틸리티 함수부터 시작하여 API 라우트, 프론트엔드 페이지, 외부 연동(Slack) 순서로 점진적으로 구축한다.

## Tasks

- [x] 1. 프로젝트 초기 설정 및 데이터베이스 스키마 구성
  - [x] 1.1 Next.js 프로젝트 초기화 및 의존성 설치
    - Next.js (App Router), TypeScript, Tailwind CSS 프로젝트 생성
    - PostgreSQL 클라이언트(prisma 또는 drizzle), fast-check, Slack SDK 설치
    - 환경 변수 설정 파일(.env.example) 생성: DATABASE_URL, SLACK_WEBHOOK_URL, SLACK_SIGNING_SECRET, BACKEND_API_URL
    - _Requirements: 아키텍처 전반_

  - [x] 1.2 데이터베이스 스키마 정의
    - Store, StoreImage, AvailableTime, MenuItem, MinOrderRule, Reservation, ReservationMenu, Notification 테이블 생성
    - 설계 문서의 ER 다이어그램 및 엔티티 정의에 따라 관계 설정
    - _Requirements: 데이터 모델 전반_

  - [x] 1.3 TypeScript 타입 및 인터페이스 정의
    - 설계 문서의 API 인터페이스 및 엔티티 정의를 기반으로 공유 타입 파일 생성 (src/types/)
    - StoreCard, StoreDetail, MenuItemData, CreateReservationRequest, NotificationData 등 정의
    - _Requirements: 컴포넌트 및 인터페이스 전반_

- [x] 2. 핵심 비즈니스 로직 구현
  - [x] 2.1 예약 유효성 검증 함수 구현 (validateReservationRequest)
    - 인원수 미선택, 시간 미선택, 최대 수용 인원 초과, 예약 불가능 시간, 최소 주문 금액 미달 검증
    - ValidationResult 타입 반환
    - _Requirements: 3.2, 3.3, 3.5, 4.5, 4.6, 4.8, 4.9, 5.7_

  - [x] 2.2 Property 3 속성 테스트: 인원수 상한 제한
    - **Property 3: 인원수 상한 제한**
    - 임의의 가게/인원수 조합 생성 → 최대 수용 인원 초과 시 검증 실패 확인
    - **Validates: Requirements 3.2, 3.3**

  - [x] 2.3 Property 4 속성 테스트: 예약 가능 시간만 선택 가능
    - **Property 4: 예약 가능 시간만 선택 가능**
    - 임의의 시간 선택 생성 → 예약 가능 시간 목록에 없는 시간은 검증 실패 확인
    - **Validates: Requirements 3.5**

  - [ ]* 2.4 Property 7 속성 테스트: 예약 필수 조건 검증
    - **Property 7: 예약 필수 조건 검증**
    - 임의의 예약 요청 생성 → 인원수/시간 누락 시 차단 확인
    - **Validates: Requirements 4.8, 4.9**

  - [x] 2.5 메뉴 총 금액 계산 함수 구현 (calculateTotalAmount)
    - 메뉴 아이템별 (가격 × 수량) 합산 로직
    - _Requirements: 4.3, 4.4_

  - [ ]* 2.6 Property 5 속성 테스트: 메뉴 총 금액 계산 정확성
    - **Property 5: 메뉴 총 금액 계산 정확성**
    - 임의의 메뉴/수량 조합 생성 → 총 금액이 각 (가격 × 수량)의 합과 일치 확인
    - **Validates: Requirements 4.3, 4.4**

  - [x] 2.7 인원수 기반 최소 주문 금액 조회 함수 구현 (getMinOrderAmount)
    - 인원수가 속하는 구간의 최소 주문 금액 반환
    - _Requirements: 1.4, 3.6_

  - [ ]* 2.8 Property 13 속성 테스트: 인원수 기반 최소 주문 금액 조회 정확성
    - **Property 13: 인원수 기반 최소 주문 금액 조회 정확성**
    - 임의의 인원수/규칙 조합 생성 → 해당 구간의 최소 주문 금액 정확 반환 확인
    - **Validates: Requirements 1.4, 3.6**

  - [ ]* 2.9 Property 6 속성 테스트: 최소 주문 금액 검증
    - **Property 6: 최소 주문 금액 검증**
    - 임의의 인원수/메뉴 조합 생성 → 최소 주문 금액 미달 시 예약 차단 확인
    - **Validates: Requirements 4.5, 4.6, 5.7**

  - [x] 2.10 예약 상태 전이 로직 구현
    - pending → accepted, pending → rejected만 허용
    - 유효하지 않은 상태 전이 거부 로직
    - _Requirements: 6.4, 6.5, 6.9_

  - [ ]* 2.11 Property 9 속성 테스트: 예약 상태 전이 유효성
    - **Property 9: 예약 상태 전이 유효성**
    - 임의의 상태 전이 요청 생성 → 유효한 전이만 성공 확인
    - **Validates: Requirements 6.4, 6.5, 6.9**

  - [x] 2.12 사이트 내 알림 생성 함수 구현 (createNotificationForReservation)
    - 예약 수락/거절 시 알림 생성, 메시지 및 adminNote 포함
    - 읽지 않은 알림 개수 조회 함수 (getUnreadNotificationCount)
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

  - [ ] 2.13 Property 14 속성 테스트: 사이트 내 알림 생성 정확성
    - **Property 14: 사이트 내 알림 생성 정확성**
    - 임의의 예약 상태 변경 생성 → 알림 타입 및 메시지 정확성 확인
    - **Validates: Requirements 7.1, 7.2**

  - [ ] 2.14 Property 15 속성 테스트: 사이트 내 알림 안내사항 포함
    - **Property 15: 사이트 내 알림 안내사항 포함**
    - 임의의 안내사항 포함 상태 변경 생성 → 알림에 안내사항 포함 확인
    - **Validates: Requirements 7.3**

  - [ ]* 2.15 Property 16 속성 테스트: 알림 읽음 상태 관리
    - **Property 16: 알림 읽음 상태 관리**
    - 임의의 알림 읽음 처리 생성 → 읽음 상태 변경 및 읽지 않은 개수 정확성 확인
    - **Validates: Requirements 7.5, 7.6**

- [x] 3. 체크포인트 - 핵심 비즈니스 로직 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의하세요.

- [x] 4. 가게 관련 API 및 노션 동기화 구현
  - [x] 4.1 GET /api/stores API 구현
    - 메인 홈 가게 리스트 조회 (StoreCard 배열 반환)
    - 가게 이미지, 예약 가능 시간, 최대 수용 인원, 최소 주문 금액 규칙 포함
    - 등록된 가게가 없는 경우 빈 배열 반환 (200)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [x] 4.2 GET /api/stores/:id API 구현
    - 가게 상세 정보 조회 (StoreDetail, MenuItemData[], availableTimes 반환)
    - 존재하지 않는 가게 접근 시 404 반환
    - _Requirements: 3.1, 3.2, 3.4, 3.5, 3.6_

  - [x] ~~4.3 POST /api/admin/sync-notion API~~ (제거됨 — 백엔드 DB 직접 연결로 대체)

  - [ ] ~~4.4 Property 1 속성 테스트: 노션 데이터 동기화 정합성~~ (제거됨)

- [x] 5. 예약 관련 API 구현
  - [x] 5.1 POST /api/reservations API 구현
    - 예약 접수: 유효성 검증 → Reservation/ReservationMenu 저장 → Slack 알림 발송
    - 유효성 검증 실패 시 400 에러 및 에러 메시지 반환
    - _Requirements: 4.5, 4.6, 4.8, 4.9, 5.7, 6.1_

  - [x] 5.2 Slack 알림 서비스 구현 (buildSlackMessage + Webhook 발송)
    - Slack Incoming Webhook을 통한 예약 알림 발송
    - 가게 이름, 인원수, 시간, 메뉴 목록, 총 금액 포함
    - 수락/거절 버튼 및 추가 안내사항 입력 필드 포함
    - 발송 실패 시 재시도 (최대 3회, 지수 백오프)
    - _Requirements: 6.1, 6.2, 6.3, 6.6_

  - [ ]* 5.3 Property 10 속성 테스트: Slack 알림 필수 정보 포함
    - **Property 10: Slack 알림 필수 정보 포함**
    - 임의의 예약 생성 → Slack 알림에 필수 정보 포함 확인
    - **Validates: Requirements 6.2**

  - [ ]* 5.4 Property 11 속성 테스트: Slack 수락/거절 액션 제공
    - **Property 11: Slack 수락/거절 액션 제공**
    - 임의의 Slack 알림 생성 → 수락/거절 버튼 포함 확인
    - **Validates: Requirements 6.3**

  - [x] 5.5 POST /api/reservations/:id/respond API 구현 (Slack Interactive Messages 핸들러)
    - Slack에서 수락/거절 액션 수신 → 예약 상태 업데이트
    - 추가 안내사항(adminNote) 저장
    - 상태 변경 시 사이트 내 알림 생성
    - _Requirements: 6.4, 6.5, 6.6, 6.7, 6.9, 7.1, 7.2, 7.3_

  - [ ]* 5.6 Property 12 속성 테스트: 추가 안내사항 저장
    - **Property 12: 추가 안내사항 저장**
    - 임의의 안내사항 입력 → 예약 정보에 저장 확인
    - **Validates: Requirements 6.6, 6.7**

- [x] 6. 알림 관련 API 구현
  - [x] 6.1 GET /api/notifications API 구현
    - 사용자 알림 목록 조회 (NotificationData 배열 + unreadCount 반환)
    - 알림에 가게 이름, 예약 상태, 메시지, 운영팀 안내사항 포함
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 6.2 PATCH /api/notifications/:id/read API 구현
    - 알림 읽음 처리 (isRead → true)
    - 멱등성 보장 (이미 읽은 알림 재처리 시 정상 응답)
    - _Requirements: 7.5, 7.6_

- [x] 7. 체크포인트 - API 레이어 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의하세요.

- [x] 8. 프론트엔드 - 메인 홈 페이지 구현
  - [x] 8.1 메인 홈 페이지 및 가게 카드 리스트 구현
    - GET /api/stores 호출하여 가게 목록 표시
    - StoreCard 컴포넌트: 가게 이름, 사진, 예약 가능 시간, 최대 수용 인원 표시
    - 등록된 가게가 없는 경우 "현재 등록된 가게가 없습니다" 안내 메시지 표시
    - 가게 카드 클릭 시 상세 페이지로 이동
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [ ]* 8.2 Property 2 속성 테스트: 가게 카드 필수 정보 포함
    - **Property 2: 가게 카드 필수 정보 포함**
    - 임의의 가게 데이터 생성 → 카드에 필수 정보(이름, 사진, 시간, 인원) 포함 확인
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**

- [x] 9. 프론트엔드 - 가게 상세 페이지 구현
  - [x] 9.1 가게 상세 페이지 레이아웃 및 인원수/시간 선택기 구현
    - GET /api/stores/:id 호출하여 가게 상세 정보 표시
    - HeadcountSelector: 인원수 선택 (최대 수용 인원까지)
    - TimeSelector: 예약 가능 시간 목록에서 선택
    - 인원수 변경 시 최소 주문 금액 동적 업데이트
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 9.2 메뉴 섹션 및 총 금액 표시 구현
    - MenuSection: 메뉴 아이템 목록 표시 (카테고리별 그룹핑)
    - MenuItem: 수량 조절 (+/- 버튼)
    - TotalPrice: 실시간 총 금액 계산 및 표시
    - MinOrderAmount: 최소 주문 금액 안내 및 부족 금액 표시
    - 최소 주문 금액 미달 시 "예약하기" 버튼 비활성화
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [x] 9.3 예약하기 버튼 및 유효성 검증 UI 구현
    - 하단 고정 "예약하기" 버튼
    - 인원수/시간 미선택 시 안내 메시지 표시
    - 최소 주문 금액 미달 시 버튼 비활성화 및 부족 금액 안내
    - 유효성 통과 시 예약 확인 페이지로 이동
    - _Requirements: 4.8, 4.9, 4.10_

- [x] 10. 프론트엔드 - 예약 확인 및 완료 페이지 구현
  - [x] 10.1 예약 확인 페이지 구현
    - 가게 이름, 인원수, 시간, 메뉴 목록, 총 금액, 최소 주문 금액 충족 여부 표시
    - "예약 확정" 버튼: POST /api/reservations 호출
    - "뒤로 가기" 버튼: 가게 상세 페이지로 복귀
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9_

  - [ ]* 10.2 Property 8 속성 테스트: 예약 확인 화면 필수 정보 표시
    - **Property 8: 예약 확인 화면 필수 정보 표시**
    - 임의의 예약 데이터 생성 → 확인 화면에 필수 정보 포함 확인
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5, 5.6**

  - [x] 10.3 예약 완료 페이지 구현
    - 예약 완료 메시지 표시
    - 메인 홈으로 돌아가기 링크
    - _Requirements: 5.10_

- [x] 11. 프론트엔드 - 알림 패널 구현
  - [x] 11.1 알림 패널 및 알림 배지 구현
    - NotificationBadge: 읽지 않은 알림 개수 표시 (GET /api/notifications의 unreadCount)
    - NotificationPanel: 알림 목록 표시 (예약 수락/거절 결과, 운영팀 안내사항)
    - NotificationItem: 개별 알림 표시 및 클릭 시 읽음 처리 (PATCH /api/notifications/:id/read)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 12. 체크포인트 - 전체 통합 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의하세요.

- [x] 13. 날짜 선택 및 홈 화면 UX 개선
  - [x] 13.1 DateSelector 컴포넌트 구현 (월간 캘린더)
    - 당일 및 과거 날짜 비활성화 (당일 예약 불가)
    - 예약 불가 날짜 회색 + "마감" 표시
    - 이전/다음 월 이동 지원
    - _Requirements: 2.1, 2.2, 2.3_

  - [x] 13.2 메인 홈에 날짜/인원수 선택기 통합
    - 인원수 선택기를 가게 상세에서 메인 홈으로 이동
    - 인원수 초기값 0명에서 시작
    - 날짜 선택 후 인원수 조건에 맞는 가게만 필터링하여 표시
    - sessionStorage로 날짜/인원수 상태 유지
    - _Requirements: 2.4, 2.5, 2.11, 2.12_

  - [x] 13.3 가게 상세 페이지에서 날짜/인원수 읽기 전용 표시
    - 홈에서 선택한 날짜/인원수를 읽기 전용으로 표시
    - "변경" 버튼으로 홈으로 이동
    - _Requirements: 3.1, 3.2_

  - [x] 13.4 예약 흐름 전체에 날짜 필드 추가
    - CreateReservationRequest, MockReservation, SlackReservationNotification에 date 필드 추가
    - 예약 확인 페이지에 날짜 표시
    - 내 예약 페이지에 날짜 표시
    - 유효성 검증에 당일 예약 불가 검증 추가
    - _Requirements: 5.3_

- [x] 14. 타임테이블 개선
  - [x] 14.1 TimeSelector 11~20시 전체 30분 단위 슬롯 표시
    - 예약 가능(시안)/예약됨(진한 회색)/영업외(연한 회색) 3가지 상태 구분
    - 시간 간격 균등 표시
    - _Requirements: 3.3, 3.4_

  - [x] 14.2 StoreCard 타임테이블도 동일하게 개선
    - 11~20시 전체 슬롯 균등 표시
    - _Requirements: 2.8_

  - [x] 14.3 시간 계산 오류 수정
    - rangeHours 계산에서 +1 → +30분으로 변경
    - 시간/분 형식 표시 (예: 1시간 30분)
    - _Requirements: 3.5_

- [x] 15. 내 예약 관리 기능
  - [x] 15.1 내 예약 페이지에서 가게 상세 이동
    - 예약 카드 클릭 시 해당 가게 상세 페이지로 이동
    - API 응답에 storeId 포함
    - _Requirements: 7.2_

  - [x] 15.2 예약 취소 기능 구현
    - POST /api/reservations/:id/cancel API 구현
    - 예약 날짜 기준 3일 전까지만 취소 가능
    - 취소 불가 시 안내 메시지 표시
    - mock-data에 deleteReservation 함수 추가
    - _Requirements: 7.3, 7.4, 7.5, 7.6_

- [x] 16. 백엔드 API 클라이언트 모듈 수정 (새 API 명세 반영)
  - [x] 16.1 환경 변수 설정
    - .env.example에 BACKEND_API_URL 항목 추가
    - .env.local에 BACKEND_API_URL=http://localhost:8080 설정
    - _Requirements: 9.3_

  - [x] 16.2 backend-api.ts 수정 - 공통 응답 래퍼 파싱 및 새 API 함수 추가
    - `parseBackendResponse<T>` 함수 추가: `{ success: true, data }` → data 추출, `{ success: false, message }` → BackendApiError throw
    - `backendFetch`에 `rawResponse` 옵션 추가: true이면 래퍼 파싱 없이 원본 반환 (관리자 장부 조회용)
    - `backendFetch` 기본 동작: JSON 응답에 `success` 필드가 있으면 자동으로 `parseBackendResponse` 적용
    - 실패 응답(non-ok)도 래퍼 형식일 수 있으므로 JSON 파싱 시도 후 `{ success: false, message }` 처리
    - 새 API 함수 추가: `getStores(date, headcount)`, `getStoreDetail(storeId, date)`, `getReservationsByPhone(userPhone)`, `cancelReservation(reservationId)`
    - 기존 `createBackendReservation` → `createReservation`으로 변경, 새 요청 타입(`BackendCreateReservationRequest`) 사용
    - 기존 `getAdminReservationList`에 `rawResponse: true` 옵션 적용 (순수 배열 응답)
    - _Requirements: 9.1, 9.2, 13.1, 13.2, 13.3, 13.4_

  - [x] 16.3 DTO 변환 함수 수정 - 새 필드 매핑
    - `toBackendReservationRequest` 수정: 새 필드 매핑 (userName ← representativeName, groupName, userPhone ← phone, userNote, slotId ← time, selectedMenus ← menuItems의 menuId/quantity만)
    - `toBackendReservationRequest`에서 totalAmount, minOrderAmount 제거 (백엔드에서 계산/검증)
    - `BackendCreateReservationRequest` 타입 정의: userName, groupName, userPhone, userNote, storeId, slotId, headcount, selectedMenus
    - 기존 `BackendReservationRequest`, `BackendMenuItemRequest` 타입 제거 또는 대체
    - `fromBackendReservation`은 기존 유지
    - _Requirements: 10.2, 10.3, 10.4_

  - [x] 16.4 Property 15 속성 테스트: 환경 변수 기반 base URL 설정
    - **Property 15: 백엔드 API Base URL 환경 변수 설정**
    - 임의의 URL 문자열 생성 → BACKEND_API_URL 환경 변수 값이 base URL로 사용되는지 확인
    - **Validates: Requirements 9.1, 9.2**

  - [x] 16.5 Property 16 속성 테스트: DTO 변환 정확성 (새 필드)
    - **Property 16: 프론트엔드 → 백엔드 예약 DTO 변환 정확성 (새 필드)**
    - 임의의 프론트엔드 예약 요청 생성 → 백엔드 DTO 변환 시 userName, groupName, userPhone, userNote, slotId, selectedMenus 정확 매핑 확인
    - totalAmount, minOrderAmount가 변환 결과에 포함되지 않는지 확인
    - **Validates: Requirements 10.2, 10.3, 10.4**

  - [x] 16.6 Property 17 속성 테스트: 공통 응답 래퍼 파싱
    - **Property 17: 백엔드 공통 응답 래퍼 파싱**
    - 임의의 백엔드 성공 응답 `{ success: true, data: X }` 생성 → parseBackendResponse가 data 값 X를 정확히 반환 확인
    - 임의의 백엔드 실패 응답 `{ success: false, message: M }` 생성 → parseBackendResponse가 message 값 M을 포함하는 에러 발생 확인
    - **Validates: Requirements 13.1, 13.2**

  - [ ]* 16.7 Property 19 속성 테스트: 백엔드 → 프론트엔드 변환 정확성
    - **Property 19: 백엔드 → 프론트엔드 예약 목록 변환 정확성**
    - 임의의 백엔드 Reservation 응답 데이터 생성 → 프론트엔드 표시 형식 변환 시 모든 필드 정확 매핑 확인
    - **Validates: Requirements 11.2**

- [x] 17. POST /api/reservations API Route 수정 (새 필드 + 공통 래퍼 파싱)
  - [x] 17.1 POST /api/reservations 핸들러 수정
    - `toBackendReservationRequest`로 새 필드(userName, groupName, userPhone, userNote, slotId, selectedMenus) 매핑하여 백엔드 프록시
    - 백엔드 성공 응답 `{ success: true, data }` → data에서 예약 정보 추출하여 CreateReservationResponse 반환
    - 백엔드 실패 응답 `{ success: false, message }` → message를 에러 메시지로 반환
    - 백엔드 네트워크 오류/5xx → "예약 처리 중 오류가 발생했습니다" 에러 반환
    - mock 폴백 없음 (백엔드 응답에만 의존)
    - Slack 알림 발송은 기존대로 유지 (백엔드 성공 후 발송)
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

  - [ ]* 17.2 Property 18 속성 테스트: 백엔드 에러 시 에러 전파 및 폴백 미사용
    - **Property 18: 백엔드 API 에러 시 에러 전파 및 폴백 미사용**
    - 임의의 백엔드 에러 응답(네트워크 오류, 4xx, 5xx) 생성 → 에러 전파 확인 및 mock 폴백 미사용 확인
    - **Validates: Requirements 10.5, 10.6, 10.7, 10.8**

- [x] 18. 관리자 예약 목록 조회 API Route 수정 (rawResponse 옵션)
  - [x] 18.1 GET /api/reservations/admin/list 수정
    - `getAdminReservationList`가 `rawResponse: true` 옵션으로 백엔드 호출 (순수 배열 응답, 래퍼 파싱 없음)
    - 백엔드 응답 → `fromBackendReservation`으로 프론트엔드 형식(AdminReservationView[]) 변환
    - 백엔드 실패 시 "예약 목록을 불러올 수 없습니다" 에러 응답 반환
    - _Requirements: 11.1, 11.2, 11.3, 13.3_

- [x] 19. 체크포인트 - 백엔드 API 클라이언트 및 기존 API Route 수정 검증
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의하세요.

- [x] 20. 가게 목록 API Route 수정 (GET /api/stores → 백엔드 프록시)
  - [x] 20.1 GET /api/stores 핸들러를 백엔드 프록시로 전환
    - mock-data의 `getAllStores`/`getStoreScheduleForDate` 대신 `getStores(date, headcount)` 백엔드 API 호출
    - 백엔드 응답 `{ success: true, data: [...] }` → 공통 래퍼 파싱하여 가게 목록 + 타임라인 데이터 반환
    - 쿼리 파라미터: date (YYYY-MM-DD), headcount (number) → 백엔드로 전달
    - 백엔드 실패 시 "가게 정보를 불러올 수 없습니다" 에러 응답 반환
    - _Requirements: 12.1, 12.6, 14.1, 14.2, 14.5_

  - [ ]* 20.2 Property 20 속성 테스트: 가게 목록 백엔드 프록시 + 래퍼 파싱
    - **Property 20: 가게 목록/상세 백엔드 프록시 + 래퍼 파싱**
    - 임의의 날짜/인원수 생성 → 가게 목록 프록시가 백엔드 호출 후 래퍼 파싱하여 data 반환 확인
    - **Validates: Requirements 12.1, 14.1, 14.2**

- [x] 21. 가게 상세 API Route 수정 (GET /api/stores/{id} → 백엔드 프록시)
  - [x] 21.1 GET /api/stores/[id] 핸들러를 백엔드 프록시로 전환
    - mock-data의 `getStoreById`/`getStoreScheduleForDate` 대신 `getStoreDetail(storeId, date)` 백엔드 API 호출
    - 백엔드 응답 `{ success: true, data: { store, menus, minOrderRules, ... } }` → 공통 래퍼 파싱하여 가게 상세 + 메뉴 + minOrderRules 반환
    - 쿼리 파라미터: date (YYYY-MM-DD) → 백엔드로 전달
    - 백엔드 실패 시 "가게 정보를 불러올 수 없습니다" 에러 응답 반환
    - _Requirements: 12.2, 12.6, 14.3, 14.4, 14.5_

- [x] 22. 예약 조회 API Route 추가 (GET /api/reservations/check → 백엔드 프록시)
  - [x] 22.1 GET /api/reservations/check 엔드포인트 생성
    - `src/app/api/reservations/check/route.ts` 파일 생성
    - 쿼리 파라미터 `userPhone`을 받아 `getReservationsByPhone(userPhone)` 백엔드 API 호출
    - 백엔드 응답 `{ success: true, data: [...] }` → 공통 래퍼 파싱하여 예약 목록 반환
    - 백엔드 실패 시 "예약 정보를 불러올 수 없습니다" 에러 응답 반환
    - 해당 전화번호의 예약이 없으면 빈 배열 반환
    - _Requirements: 12.3, 12.6, 15.1, 15.2, 15.3, 15.4_

  - [ ]* 22.2 Property 21 속성 테스트: 전화번호 기반 예약 조회 프록시 + 래퍼 파싱
    - **Property 21: 전화번호 기반 예약 조회 프록시 + 래퍼 파싱**
    - 임의의 전화번호 생성 → 예약 조회 프록시가 백엔드 check 엔드포인트 호출 후 래퍼 파싱하여 data 반환 확인
    - **Validates: Requirements 12.3, 15.1, 15.2**

- [x] 23. 예약 취소 API Route 수정 (PATCH /api/reservations/{id}/cancel → 백엔드 프록시)
  - [x] 23.1 예약 취소 핸들러를 PATCH 메서드 + 백엔드 프록시로 전환
    - `src/app/api/reservations/[id]/cancel/route.ts` 수정
    - 기존 POST 핸들러 → PATCH 핸들러로 변경
    - mock-data의 `getReservationById`/`deleteReservation` 대신 `cancelReservation(reservationId)` 백엔드 API 호출
    - 백엔드 성공 응답 `{ success: true, data }` → 취소 성공 처리
    - 백엔드 실패 응답 `{ success: false, message }` → message를 에러 메시지로 반환
    - 백엔드 네트워크 오류 → "예약 취소 처리 중 오류가 발생했습니다" 에러 반환
    - _Requirements: 12.4, 12.6, 16.1, 16.2, 16.3, 16.4, 16.5_

  - [ ]* 23.2 Property 22 속성 테스트: 예약 취소 PATCH 프록시 + 래퍼 파싱
    - **Property 22: 예약 취소 PATCH 프록시 + 래퍼 파싱**
    - 임의의 예약 ID 생성 → 예약 취소 프록시가 PATCH 메서드로 백엔드 호출 후 래퍼 파싱하여 성공/실패 처리 확인
    - **Validates: Requirements 12.4, 16.1, 16.2, 16.3, 16.4**

- [x] 24. 체크포인트 - 전체 백엔드 API 연결 검증
  - 모든 백엔드 프록시 API Route가 정상 동작하는지 확인
  - 공통 응답 래퍼 파싱이 모든 API에서 일관되게 적용되는지 확인
  - 관리자 장부 조회만 rawResponse(순수 배열)로 처리되는지 확인
  - 모든 테스트가 통과하는지 확인하고, 질문이 있으면 사용자에게 문의하세요.

## Notes

- `*` 표시된 태스크는 선택 사항이며 빠른 MVP를 위해 건너뛸 수 있습니다
- 각 태스크는 추적 가능성을 위해 특정 요구사항을 참조합니다
- 체크포인트는 점진적 검증을 보장합니다
- 속성 테스트는 fast-check 라이브러리를 사용하여 보편적 정확성 속성을 검증합니다
- 단위 테스트는 특정 예제 및 엣지 케이스를 검증합니다
