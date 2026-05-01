# Google Sheets Apps Script 수정 사항

## 현재 reservations 시트 구조

```
reservationId | storeId | userName | groupName | userPhone | userNote | headcount | date | startTime | endTime | menuItems | totalAmount | status | depositAmount | createdAt
```

### 필요한 작업:
- `depositAmount` 컬럼 추가 (N열)
- 기존 데이터가 있다면 `depositAmount` 값을 0 또는 해당 가게의 예약금으로 채우기

---

## 1. handleGetStores 함수 수정

**위치**: `handleGetStores` 함수의 return 부분

**기존 코드**:
```javascript
return {
  storeId: sid,
  name: store.name,
  category: store.category || '',
  maxCapacity: cap,
  imageUrl: store.imageUrl || '',
  description: store.description || '',
  slotStartHour: slotStartHour,
  slotEndHour: slotEndHour,
  timeline: timeline,
  minOrderRules: storeRules.map(r => ({
    minHeadcount: parseInt(r.minHeadcount) || 0,
    maxHeadcount: parseInt(r.maxHeadcount) || 0,
    minOrderAmount: parseInt(r.minOrderAmount) || 0,
  })),
};
```

**수정 후**:
```javascript
return {
  storeId: sid,
  name: store.name,
  category: store.category || '',
  maxCapacity: cap,
  imageUrl: store.imageUrl || '',
  description: store.description || '',
  slotStartHour: slotStartHour,
  slotEndHour: slotEndHour,
  depositAmount: parseInt(store.depositAmount) || 0,  // ← 추가
  timeline: timeline,
  minOrderRules: storeRules.map(r => ({
    minHeadcount: parseInt(r.minHeadcount) || 0,
    maxHeadcount: parseInt(r.maxHeadcount) || 0,
    minOrderAmount: parseInt(r.minOrderAmount) || 0,
  })),
};
```

---

## 2. handleGetStoreDetail 함수 수정

**위치**: `handleGetStoreDetail` 함수의 return 부분 (menus 매핑)

**기존 코드를 찾아서**:
```javascript
return {
  success: true,
  data: {
    store: {
      id: storeId,
      name: store.name,
      images: store.imageUrl ? [store.imageUrl] : [],
      maxCapacity: cap,
      slotStartHour: slotStartHour,
      slotEndHour: slotEndHour,
      // ... 기타
    },
    menus: menus.map(m => ({
      id: String(m.menuId).trim(),
      name: m.name,
      price: parseInt(m.price) || 0,
      category: m.category || '',
      isRequired: String(m.isRequired).toLowerCase() === 'true',
    })),
    // ... 기타
  }
};
```

**수정 후**:
```javascript
return {
  success: true,
  data: {
    store: {
      id: storeId,
      name: store.name,
      images: store.imageUrl ? [store.imageUrl] : [],
      maxCapacity: cap,
      slotStartHour: slotStartHour,
      slotEndHour: slotEndHour,
      depositAmount: parseInt(store.depositAmount) || 0,  // ← 추가
      // ... 기타
    },
    menus: menus.map(m => ({
      id: String(m.menuId).trim(),
      name: m.name,
      price: parseInt(m.price) || 0,
      category: m.category || '',
      isRequired: String(m.isRequired).toLowerCase() === 'true',
      imageUrl: m.imageUrl || '',  // ← 추가
    })),
    // ... 기타
  }
};
```

---

## 3. handleCreateReservation 함수 수정

**위치**: 예약 생성 시 새 행 추가 부분

**수정 후**:
```javascript
function handleCreateReservation(body) {
  const data = body.data;
  if (!data || !data.storeId || !data.date) {
    return { success: false, message: '필수 정보 누락' };
  }

  // 가게 정보 조회 (depositAmount 가져오기)
  const stores = sheetToObjects('store');
  const store = stores.find(s => String(s.storeId).trim() === String(data.storeId).trim());
  if (!store) {
    return { success: false, message: '가게를 찾을 수 없습니다.' };
  }

  const reservationId = 'RSV' + new Date().getTime();
  const reservationSheet = SS.getSheetByName('reservation');
  if (!reservationSheet) {
    return { success: false, message: 'reservation 시트를 찾을 수 없습니다.' };
  }

  // menuItems를 JSON 문자열로 변환
  const menuItemsJson = JSON.stringify(data.selectedMenus || []);

  // 새 행 데이터 (컬럼 순서에 맞게)
  const newRow = [
    reservationId,                              // reservationId
    data.storeId,                               // storeId
    data.userName || '',                        // userName
    data.groupName || '',                       // groupName
    data.userPhone || '',                       // userPhone
    data.userNote || '',                        // userNote
    data.headcount || 0,                        // headcount
    data.date,                                  // date
    data.startTime,                             // startTime
    data.endTime,                               // endTime
    menuItemsJson,                              // menuItems
    data.totalAmount || 0,                      // totalAmount
    'PENDING',                                  // status (초기 상태)
    parseInt(store.depositAmount) || 0,         // depositAmount (가게의 예약금)
    new Date()                                  // createdAt
  ];

  reservationSheet.appendRow(newRow);
  
  return { 
    success: true, 
    reservationId: reservationId,
    message: '예약이 접수되었습니다.' 
  };
}
```

---

## 4. handleGetReservationsByNamePhone4 함수 수정

**위치**: 예약 조회 시 depositAmount 포함

```javascript
function handleGetReservationsByNamePhone4(params) {
  const userName = (params.userName || '').trim();
  const phoneLast4 = (params.phoneLast4 || '').trim();
  
  if (!userName || phoneLast4.length !== 4) {
    return { success: false, message: '이름과 전화번호 뒷 4자리를 입력해주세요.' };
  }

  const reservations = sheetToObjects('reservation');
  const stores = sheetToObjects('store');
  const menus = sheetToObjects('menu');

  const matched = reservations.filter(r => {
    const rName = String(r.userName || '').trim();
    const rPhone = String(r.userPhone || '').replace(/\D/g, '');
    return rName === userName && rPhone.slice(-4) === phoneLast4;
  });

  const result = matched.map(r => {
    const store = stores.find(s => String(s.storeId).trim() === String(r.storeId).trim());
    const storeName = store ? store.name : r.storeId;
    
    // menuItems 파싱
    let menuItems = [];
    try {
      const parsed = JSON.parse(r.menuItems || '[]');
      menuItems = parsed.map(item => {
        const menu = menus.find(m => String(m.menuId).trim() === String(item.menuId).trim());
        return {
          menuId: item.menuId,
          name: menu ? menu.name : item.menuId,
          quantity: parseInt(item.quantity) || 0,
          priceAtTime: menu ? parseInt(menu.price) || 0 : 0
        };
      });
    } catch (e) {
      // JSON 파싱 실패 시 빈 배열
    }

    return {
      id: r.reservationId,
      reservationId: r.reservationId,
      storeId: r.storeId,
      storeName: storeName,
      slotId: '',
      timeBlock: r.startTime || '',
      date: r.date || '',
      headcount: parseInt(r.headcount) || 0,
      totalAmount: parseInt(r.totalAmount) || 0,
      status: r.status || 'PENDING',
      createdAt: r.createdAt || '',
      depositAmount: parseInt(r.depositAmount) || 0,  // ← 추가
      menus: menuItems
    };
  });

  return { 
    success: true, 
    reservations: result 
  };
}
```

---

## 5. 타임라인 계산 시 상태 고려

**buildSlots 함수 수정**: CONFIRMED와 DEPOSIT_CONFIRMED 상태만 타임라인에 반영

```javascript
function buildSlots(maxCapacity, reservations, slotStartHour, slotEndHour, crossesMidnight) {
  // ... 기존 코드 ...
  
  // 확정된 예약만 카운트 (CONFIRMED 또는 DEPOSIT_CONFIRMED)
  const confirmedReservations = reservations.filter(r => 
    r.status === 'CONFIRMED' || r.status === 'DEPOSIT_CONFIRMED'
  );
  
  // confirmedReservations를 사용하여 슬롯 계산
  // ... 나머지 코드 ...
}
```

**handleGetStores와 handleGetStoreDetail에서 예약 필터링**:
```javascript
// 기존:
const confirmedRes = reservations.filter(r =>
  String(r.storeId).trim() === sid &&
  String(r.date).trim() === date &&
  String(r.status).trim() === 'CONFIRMED'
);

// 수정 후:
const confirmedRes = reservations.filter(r =>
  String(r.storeId).trim() === sid &&
  String(r.date).trim() === date &&
  (String(r.status).trim() === 'CONFIRMED' || String(r.status).trim() === 'DEPOSIT_CONFIRMED')
);
```

---

## 6. Google Sheets 컬럼 구조

### stores 시트
```
storeId | name | category | imageUrl | maxCapacity | slotStartHour | slotEndHour | depositAmount | description
```

### menus 시트
```
menuId | storeId | name | price | category | isRequired | imageUrl
```

### reservations 시트 (최종)
```
reservationId | storeId | userName | groupName | userPhone | userNote | headcount | date | startTime | endTime | menuItems | status | totalAmount | depositAmount | createdAt
```

### 상태값 (status)
- `PENDING` - 예약 확인중
- `CONFIRMED` - 예약 확정 (예약금 없음)
- `DEPOSIT_PENDING` - 예약금 입금 대기
- `DEPOSIT_CONFIRMED` - 예약 완료 (예약금 입금 완료)
- `CANCELED` - 취소됨

---

## 적용 순서

1. **Google Sheets에 컬럼 추가**
   - stores 시트: `depositAmount` 컬럼 추가
   - menus 시트: `imageUrl` 컬럼 추가
   - reservations 시트: `status`, `totalAmount`, `depositAmount`, `createdAt` 컬럼 추가

2. **Apps Script 수정**
   - 위의 5개 함수 수정 적용
   - 저장 후 배포 > 웹 앱 > 새 배포

3. **테스트 데이터 입력**
   - stores에 depositAmount 값 입력 (예: 5000)
   - menus에 imageUrl 입력
   - 기존 reservations의 status를 CONFIRMED로 변경

4. **프론트엔드 배포**
   - 로컬 테스트 후 커밋 & 푸시

