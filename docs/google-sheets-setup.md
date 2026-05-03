# Google Sheets 구성 가이드

## 📊 시트 구조

Google Sheets에 다음 4개의 시트를 생성하세요:

---

## 1. store 시트

가게 정보를 관리하는 시트입니다.

### 컬럼 구조 (첫 번째 행)

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| storeId | name | category | imageUrl | maxCapacity | slotStartHour | slotEndHour | depositAmount | description |

### 컬럼 설명

- **storeId**: 가게 고유 ID (예: `store-1`)
- **name**: 가게 이름 (예: `극극피자 동대문직영점`)
- **category**: 카테고리 (예: `양식`, `한식`, `일식`)
- **imageUrl**: 가게 대표 이미지 URL
- **maxCapacity**: 최대 수용 인원 (예: `80`)
- **slotStartHour**: 예약 시작 시간 (0-23, 예: `9`)
- **slotEndHour**: 예약 종료 시간 (0-23, 예: `21`)
- **depositAmount**: 예약금 (원, 예: `5000`, 없으면 `0`)
- **description**: 가게 설명 (선택)

### 예시 데이터

```
storeId    | name                      | category | imageUrl                    | maxCapacity | slotStartHour | slotEndHour | depositAmount | description
store-1    | 극극피자 동대문직영점      | 양식     | https://example.com/img1.jpg | 80          | 9             | 21          | 5000          | 단체 예약 전문
store-2    | 영천 얼큰 돼지국밥         | 한식     | https://example.com/img2.jpg | 80          | 9             | 21          | 0             | 국밥 전문점
```

---

## 2. menu 시트

메뉴 정보를 관리하는 시트입니다.

### 컬럼 구조 (첫 번째 행)

| A | B | C | D | E | F | G |
|---|---|---|---|---|---|---|
| menuId | storeId | name | price | category | isRequired | imageUrl |

### 컬럼 설명

- **menuId**: 메뉴 고유 ID (예: `menu-1`)
- **storeId**: 가게 ID (store 시트의 storeId와 연결)
- **name**: 메뉴 이름 (예: `허니콤보+퐁듀치즈볼`)
- **price**: 가격 (원, 예: `25500`)
- **category**: 메뉴 카테고리 (예: `세트`, `단품`)
- **isRequired**: 필수 메뉴 여부 (`TRUE` 또는 `FALSE`)
- **imageUrl**: 메뉴 이미지 URL

### 예시 데이터

```
menuId  | storeId | name                    | price | category | isRequired | imageUrl
menu-1  | store-1 | 허니콤보+퐁듀치즈볼      | 25500 | 세트     | FALSE      | https://example.com/menu1.jpg
menu-2  | store-1 | 갈릭반반순살+퐁듀치즈볼  | 27500 | 세트     | FALSE      | https://example.com/menu2.jpg
menu-3  | store-1 | 콜라 1.5L               | 3000  | 음료     | FALSE      | https://example.com/cola.jpg
```

---

## 3. rule 시트

인원별 최소 주문 금액 규칙을 관리하는 시트입니다.

### 컬럼 구조 (첫 번째 행)

| A | B | C | D |
|---|---|---|---|
| ruleId | storeId | minHeadcount | maxHeadcount | minOrderAmount |

### 컬럼 설명

- **ruleId**: 규칙 고유 ID (예: `rule-1`)
- **storeId**: 가게 ID
- **minHeadcount**: 최소 인원 (예: `1`)
- **maxHeadcount**: 최대 인원 (예: `30`)
- **minOrderAmount**: 최소 주문 금액 (원, 예: `12000`)

### 예시 데이터

```
ruleId  | storeId | minHeadcount | maxHeadcount | minOrderAmount
rule-1  | store-1 | 1            | 30           | 12000
rule-2  | store-1 | 31           | 80           | 10000
rule-3  | store-2 | 1            | 80           | 12000
```

---

## 4. reservation 시트

예약 정보를 관리하는 시트입니다.

### 컬럼 구조 (첫 번째 행)

| A | B | C | D | E | F | G | H | I | J | K | L | M | N | O |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| reservationId | storeId | userName | groupName | userPhone | userNote | headcount | date | startTime | endTime | menuItems | status | totalAmount | depositAmount | createdAt |

### 컬럼 설명

- **reservationId**: 예약 고유 ID (자동 생성, 예: `RSV1234567890`)
- **storeId**: 가게 ID
- **userName**: 예약자 이름 (예: `홍길동`)
- **groupName**: 단체명/행사명 (예: `청춘`)
- **userPhone**: 전화번호 (예: `010-1234-5678`)
- **userNote**: 요청사항 (예: `맛있게 주세요`)
- **headcount**: 인원수 (예: `70`)
- **date**: 예약 날짜 (YYYY-MM-DD, 예: `2026-04-13`)
- **startTime**: 시작 시간 (HH:mm, 예: `17:00`)
- **endTime**: 종료 시간 (HH:mm, 예: `18:30`)
- **menuItems**: 주문 메뉴 JSON (예: `[{"menuId":"menu-1","quantity":20}]`)
- **status**: 예약 상태 (아래 참조)
- **totalAmount**: 총 금액 (원, 예: `510000`)
- **depositAmount**: 예약금 (원, 가게의 depositAmount 복사)
- **createdAt**: 생성 시간 (자동, 예: `2026-04-01 10:30:00`)

### 상태값 (status)

- **PENDING**: 예약 확인중 (초기 상태)
- **CONFIRMED**: 예약 확정 (예약금 없는 경우)
- **DEPOSIT_PENDING**: 예약금 입금 대기 (예약금 있는 경우)
- **DEPOSIT_CONFIRMED**: 예약 완료 (예약금 입금 완료)
- **CANCELED**: 취소됨

### 예시 데이터

```
reservationId    | storeId | userName | groupName | userPhone      | userNote      | headcount | date       | startTime | endTime | menuItems                              | status          | totalAmount | depositAmount | createdAt
RSV1775794539    | store-1 | 양민주   |           | 010-9999-8888  |               | 70        | 2026-04-13 | 17:00     | 18:30   | [{"menuId":"menu-1","quantity":20}]    | PENDING         | 510000      | 5000          | 2026-04-01 10:30:00
RSV1776381061    | store-1 | 송유현   | 청춘      | 010-0000-0000  | 맛있게 주세요 | 20        | 2026-04-29 | 21:30     | 22:00   | [{"menuId":"menu-2","quantity":10}]    | CONFIRMED       | 275000      | 0             | 2026-04-02 15:20:00
```

---

## 🔧 설정 방법

### 1. Google Sheets 생성
1. Google Drive에서 새 스프레드시트 생성
2. 이름을 "우르르 예약 시스템" 등으로 설정

### 2. 시트 생성
1. 기본 "Sheet1"을 "store"로 이름 변경
2. 하단의 "+" 버튼으로 "menu", "rule", "reservation" 시트 추가

### 3. 헤더 행 입력
- 각 시트의 첫 번째 행에 위의 컬럼명을 정확히 입력
- 대소문자 구분 필수!

### 4. 테스트 데이터 입력
- 위의 예시 데이터를 참고하여 입력
- reservation 시트는 비워두고 앱에서 예약하면 자동으로 추가됨

### 5. Apps Script 설정
1. 확장 프로그램 > Apps Script 클릭
2. `docs/apps-script.js` 파일의 코드 전체 복사
3. Apps Script 에디터에 붙여넣기
4. 저장 (Ctrl+S)
5. 배포 > 새 배포 > 유형: 웹 앱
6. 액세스 권한: "모든 사용자"
7. 배포 후 URL 복사

### 6. 환경 변수 설정
- `.env.local` 파일에 Apps Script URL 추가:
```
NEXT_PUBLIC_SHEETS_URL=https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec
```

---

## ✅ 체크리스트

- [ ] 4개 시트 생성 (store, menu, rule, reservation)
- [ ] 각 시트의 헤더 행 입력
- [ ] store 시트에 가게 정보 입력
- [ ] menu 시트에 메뉴 정보 입력
- [ ] rule 시트에 최소 주문 규칙 입력
- [ ] Apps Script 코드 붙여넣기
- [ ] 웹 앱으로 배포
- [ ] 환경 변수 설정
- [ ] 테스트 예약 진행

---

## 📝 주의사항

1. **컬럼명은 정확히 입력**: 대소문자, 띄어쓰기 모두 일치해야 함
2. **날짜 형식**: `YYYY-MM-DD` (예: `2026-04-13`)
3. **시간 형식**: `HH:mm` (예: `17:00`)
4. **숫자 형식**: 쉼표 없이 입력 (예: `25500`)
5. **Boolean 값**: `TRUE` 또는 `FALSE` (대문자)
6. **JSON 형식**: menuItems는 JSON 배열 문자열

