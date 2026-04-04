// ============================================================
// 우르르 (urr) - Google Sheets 백엔드 Apps Script
// 스프레드시트 > 확장 프로그램 > Apps Script에 붙여넣기
// 배포: 배포 > 웹 앱 > 액세스: 모든 사용자 > 배포
// ============================================================

const SS = SpreadsheetApp.getActiveSpreadsheet();

function doGet(e) {
  const action = (e.parameter.action || '').trim();
  try {
    let result;
    switch (action) {
      case 'getStores':
        result = handleGetStores(e.parameter);
        break;
      case 'getStoreDetail':
        result = handleGetStoreDetail(e.parameter);
        break;
      case 'getReservations':
        result = handleGetReservations(e.parameter);
        break;
      case 'cancelReservation':
        result = handleCancelReservation(e.parameter);
        break;
      default:
        result = { success: false, message: 'Unknown action: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action || '';
    let result;
    switch (action) {
      case 'createReservation':
        result = handleCreateReservation(body);
        break;
      default:
        result = { success: false, message: 'Unknown action: ' + action };
    }
    return jsonResponse(result);
  } catch (err) {
    return jsonResponse({ success: false, message: err.message });
  }
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ── 시트 헬퍼 ──────────────────────────────────────────────────

function sheetToObjects(sheetName) {
  const sheet = SS.getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return [];
  const headers = data[0].map(h => String(h).trim());
  return data.slice(1).filter(row => row[0] !== '').map(row => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = row[i]; });
    return obj;
  });
}

function appendRow(sheetName, obj, headers) {
  const sheet = SS.getSheetByName(sheetName);
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
}

// ── 가게 목록 조회 ─────────────────────────────────────────────

function handleGetStores(params) {
  const date = params.date || '';
  const headcount = parseInt(params.headcount) || 0;
  const stores = sheetToObjects('store');
  const menus = sheetToObjects('menu');
  const rules = sheetToObjects('rule');
  const reservations = sheetToObjects('reservation');

  const result = stores.map(store => {
    const sid = String(store.storeId).trim();
    const cap = parseInt(store.maxCapacity) || 0;
    const storeMenus = menus.filter(m => String(m.storeId).trim() === sid);
    const storeRules = rules.filter(r => String(r.storeId).trim() === sid);

    // 해당 날짜의 확정 예약에서 시간대별 예약 인원 합산
    const confirmedRes = reservations.filter(r =>
      String(r.storeId).trim() === sid &&
      String(r.date).trim() === date &&
      String(r.status).trim() === 'CONFIRMED'
    );

    // 11:00~20:30 슬롯 생성
    const timeline = buildSlots(cap, confirmedRes);

    return {
      storeId: sid,
      name: store.name,
      category: store.category || '',
      maxCapacity: cap,
      imageUrl: store.imageUrl || '',
      description: store.description || '',
      timeline: timeline,
      minOrderRules: storeRules.map(r => ({
        minHeadcount: parseInt(r.minHeadcount) || 0,
        maxHeadcount: parseInt(r.maxHeadcount) || 0,
        minOrderAmount: parseInt(r.minOrderAmount) || 0,
      })),
    };
  });

  return { success: true, data: result };
}

// ── 가게 상세 조회 ─────────────────────────────────────────────

function handleGetStoreDetail(params) {
  const storeId = (params.storeId || '').trim();
  const date = params.date || '';
  const stores = sheetToObjects('store');
  const store = stores.find(s => String(s.storeId).trim() === storeId);
  if (!store) return { success: false, message: '가게를 찾을 수 없습니다.' };

  const menus = sheetToObjects('menu').filter(m => String(m.storeId).trim() === storeId);
  const rules = sheetToObjects('rule').filter(r => String(r.storeId).trim() === storeId);
  const reservations = sheetToObjects('reservation').filter(r =>
    String(r.storeId).trim() === storeId &&
    String(r.date).trim() === date &&
    String(r.status).trim() === 'CONFIRMED'
  );

  const cap = parseInt(store.maxCapacity) || 0;
  const slots = buildSlots(cap, reservations);

  return {
    success: true,
    data: {
      store: {
        id: storeId,
        name: store.name,
        images: store.imageUrl ? [store.imageUrl] : [],
        maxCapacity: cap,
        availableTimes: slots.filter(s => s.isAvailable).map(s => s.timeBlock),
        slots: slots,
        minOrderRules: rules.map(r => ({
          minHeadcount: parseInt(r.minHeadcount) || 0,
          maxHeadcount: parseInt(r.maxHeadcount) || 0,
          minOrderAmount: parseInt(r.minOrderAmount) || 0,
        })),
      },
      menus: menus.map(m => ({
        id: String(m.menuId).trim(),
        name: m.name,
        price: parseInt(m.price) || 0,
        category: m.category || '',
        isRequired: String(m.isRequired).toLowerCase() === 'true',
      })),
      slots: slots,
      availableTimes: slots.filter(s => s.isAvailable).map(s => s.timeBlock),
      reservedTimes: slots.filter(s => !s.isAvailable).map(s => s.timeBlock),
    },
  };
}

// ── 슬롯 생성 (11:00~20:30, 30분 단위) ────────────────────────

function buildSlots(maxPeople, confirmedReservations) {
  const slots = [];
  for (let h = 11; h <= 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const time = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
      // 해당 시간대에 걸치는 예약의 인원 합산
      let booked = 0;
      confirmedReservations.forEach(r => {
        const start = String(r.startTime).trim();
        const end = String(r.endTime).trim();
        if (time >= start && time <= end) {
          booked += parseInt(r.headcount) || 0;
        }
      });
      const remaining = Math.max(0, maxPeople - booked);
      slots.push({
        slotId: 'slot-' + time.replace(':', ''),
        timeBlock: time,
        isAvailable: remaining > 0,
        maxPeople: maxPeople,
        currentHeadcount: booked,
      });
    }
  }
  return slots;
}

// ── 예약 생성 ──────────────────────────────────────────────────

function handleCreateReservation(body) {
  const data = body.data || body;
  const reservationId = 'RSV' + new Date().getTime();

  // 잔여 인원 체크
  const storeId = String(data.storeId).trim();
  const date = String(data.date).trim();
  const headcount = parseInt(data.headcount) || 0;
  const startTime = String(data.startTime || data.slotId || '').trim();
  const endTime = String(data.endTime || startTime).trim();

  const stores = sheetToObjects('store');
  const store = stores.find(s => String(s.storeId).trim() === storeId);
  if (!store) return { success: false, message: '가게를 찾을 수 없습니다.' };

  const cap = parseInt(store.maxCapacity) || 0;
  const existing = sheetToObjects('reservation').filter(r =>
    String(r.storeId).trim() === storeId &&
    String(r.date).trim() === date &&
    String(r.status).trim() === 'CONFIRMED'
  );

  // 요청 시간대의 최소 잔여 인원 확인
  const slots = buildSlots(cap, existing);
  const targetSlots = slots.filter(s => s.timeBlock >= startTime && s.timeBlock <= endTime);
  const minRemaining = Math.min(...targetSlots.map(s => cap - s.currentHeadcount));

  if (headcount > minRemaining) {
    return { success: false, message: `해당 시간대 잔여 인원(${minRemaining}명)을 초과합니다.` };
  }

  // 최소 주문 금액 체크
  const rules = sheetToObjects('rule').filter(r => String(r.storeId).trim() === storeId);
  const rule = rules.find(r =>
    headcount >= (parseInt(r.minHeadcount) || 0) &&
    headcount <= (parseInt(r.maxHeadcount) || 999)
  );
  const minOrder = rule ? parseInt(rule.minOrderAmount) || 0 : 0;
  const totalAmount = parseInt(data.totalAmount) || 0;
  if (minOrder > 0 && totalAmount < minOrder) {
    return { success: false, message: `최소 주문 금액(${minOrder.toLocaleString()}원)을 충족하지 못합니다.` };
  }

  // 필수 메뉴 체크
  const menus = sheetToObjects('menu').filter(m => String(m.storeId).trim() === storeId);
  const requiredMenus = menus.filter(m => String(m.isRequired).toLowerCase() === 'true');
  const selectedMenus = data.selectedMenus || [];
  for (const req of requiredMenus) {
    const found = selectedMenus.find(sm => String(sm.menuId).trim() === String(req.menuId).trim());
    if (!found || (parseInt(found.quantity) || 0) < 1) {
      return { success: false, message: `필수 메뉴 "${req.name}"을(를) 선택해주세요.` };
    }
  }

  const row = {
    reservationId: reservationId,
    storeId: storeId,
    userName: data.userName || '',
    groupName: data.groupName || '',
    userPhone: data.userPhone || '',
    userNote: data.userNote || '',
    headcount: headcount,
    date: date,
    startTime: startTime,
    endTime: endTime,
    menuItems: JSON.stringify(selectedMenus),
    totalAmount: totalAmount,
    status: 'CONFIRMED',
    createdAt: new Date().toISOString(),
  };

  const headers = ['reservationId','storeId','userName','groupName','userPhone','userNote','headcount','date','startTime','endTime','menuItems','totalAmount','status','createdAt'];
  appendRow('reservation', row, headers);

  return {
    success: true,
    data: {
      reservationId: reservationId,
      status: 'CONFIRMED',
      totalAmount: totalAmount,
      createdAt: row.createdAt,
    },
  };
}

// ── 전화번호로 예약 조회 ───────────────────────────────────────

function handleGetReservations(params) {
  const phone = (params.userPhone || '').replace(/[-\s]/g, '').trim();
  if (!phone) return { success: false, message: '전화번호를 입력해주세요.' };

  const reservations = sheetToObjects('reservation');
  const stores = sheetToObjects('store');
  const menus = sheetToObjects('menu');

  const matched = reservations.filter(r =>
    String(r.userPhone).replace(/[-\s]/g, '').trim() === phone
  );

  const result = matched.map(r => {
    const sid = String(r.storeId).trim();
    const store = stores.find(s => String(s.storeId).trim() === sid);
    let parsedMenus = [];
    try { parsedMenus = JSON.parse(r.menuItems || '[]'); } catch(e) {}

    const menuDetails = parsedMenus.map(sm => {
      const menu = menus.find(m => String(m.menuId).trim() === String(sm.menuId).trim());
      return {
        menuId: sm.menuId,
        name: menu ? menu.name : sm.menuId,
        quantity: parseInt(sm.quantity) || 0,
        priceAtTime: menu ? parseInt(menu.price) || 0 : 0,
      };
    });

    return {
      reservationId: r.reservationId,
      storeId: sid,
      storeName: store ? store.name : sid,
      timeBlock: r.startTime + ' ~ ' + r.endTime,
      headcount: parseInt(r.headcount) || 0,
      totalAmount: parseInt(r.totalAmount) || 0,
      status: r.status,
      createdAt: r.createdAt,
      menus: menuDetails,
    };
  });

  return { success: true, data: result };
}

// ── 예약 취소 ──────────────────────────────────────────────────

function handleCancelReservation(params) {
  const id = (params.reservationId || '').trim();
  if (!id) return { success: false, message: '예약 ID가 필요합니다.' };

  const sheet = SS.getSheetByName('reservation');
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).trim());
  const idCol = headers.indexOf('reservationId');
  const statusCol = headers.indexOf('status');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === id) {
      if (String(data[i][statusCol]).trim() === 'CANCELED') {
        return { success: false, message: '이미 취소된 예약입니다.' };
      }
      sheet.getRange(i + 1, statusCol + 1).setValue('CANCELED');
      return {
        success: true,
        data: { reservationId: id, status: 'CANCELED' },
      };
    }
  }
  return { success: false, message: '예약을 찾을 수 없습니다.' };
}
