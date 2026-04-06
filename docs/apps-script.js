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
      case 'getAllData':
        result = handleGetAllData();
        break;
      case 'createReservation':
        // GET 폴백: POST가 리다이렉트로 실패할 때 payload 파라미터로 전달
        try {
          var payload = JSON.parse(e.parameter.payload || '{}');
          result = handleCreateReservation(payload);
        } catch(err) {
          result = { success: false, message: 'payload 파싱 실패: ' + err.message };
        }
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
    headers.forEach((h, i) => {
      const val = row[i];
      // Google Sheets가 Date 객체로 자동 변환한 경우 → YYYY-MM-DD 또는 HH:mm 문자열로 복원
      if (val instanceof Date) {
        if (h === 'date' || h === 'slotDate' || h === 'slot_date') {
          obj[h] = Utilities.formatDate(val, 'Asia/Seoul', 'yyyy-MM-dd');
        } else if (h === 'startTime' || h === 'endTime' || h === 'timeBlock' || h === 'time') {
          obj[h] = Utilities.formatDate(val, 'Asia/Seoul', 'HH:mm');
        } else if (
          h === 'slotStartHour' || h === 'slotEndHour' ||
          h === 'SlotStartHour' || h === 'SlotEndHour' ||
          h === 'slot_start_hour' || h === 'slot_end_hour' ||
          h === '슬롯시작' || h === '슬롯종료' || h === '예약시작시' || h === '예약종료시'
        ) {
          // 시트에서 "시간" 서식이면 Date로 들어옴 → 0~23 시 정수로만 쓴다 (parseInt 실패 방지)
          obj[h] = parseInt(Utilities.formatDate(val, 'Asia/Seoul', 'HH'), 10);
        } else {
          obj[h] = val.toISOString();
        }
      } else {
        obj[h] = val;
      }
    });
    return obj;
  });
}

function appendRow(sheetName, obj, headers) {
  const sheet = SS.getSheetByName(sheetName);
  // 먼저 행 추가
  const rowNum = sheet.getLastRow() + 1;
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
  
  // 전화번호/날짜/시간 셀을 텍스트 서식으로 강제 설정
  const textFields = ['userPhone', 'date', 'startTime', 'endTime', 'reservationId'];
  textFields.forEach(field => {
    const colIdx = headers.indexOf(field);
    if (colIdx >= 0) {
      const cell = sheet.getRange(rowNum, colIdx + 1);
      cell.setNumberFormat('@'); // 텍스트 서식
      cell.setValue(String(obj[field] || ''));
    }
  });
}

// ── 가게별 예약 슬롯 시간축 (store 시트 컬럼, 없으면 11~20) ─────
// slotEndHour < slotStartHour 이면 자정 넘김 (예: 17~3 = 저녁~새벽)

/** 시트 1행 헤더가 조금 달라도 읽기 (빈칸·대소문자 등) */
function firstDefinedField(obj, keys) {
  for (var i = 0; i < keys.length; i++) {
    var k = keys[i];
    if (!Object.prototype.hasOwnProperty.call(obj, k)) continue;
    var v = obj[k];
    if (v === '' || v === null || v === undefined) continue;
    return v;
  }
  return undefined;
}

/** 시트/JSON 값 → 0~23 시 (실패 시 NaN). 숫자·"17"·"17:00"·ISO 문자열(시간 부분) 대응 */
function coerceHourFromSheetValue(v) {
  if (v === '' || v === null || v === undefined) return NaN;
  if (v instanceof Date) {
    return parseInt(Utilities.formatDate(v, 'Asia/Seoul', 'HH'), 10);
  }
  if (typeof v === 'number' && isFinite(v)) {
    var hn = Math.floor(v);
    if (hn >= 0 && hn <= 23) return hn;
    return NaN;
  }
  var s = String(v).trim();
  var hm = /^(\d{1,2})\s*:\s*(\d{2})/.exec(s);
  if (hm) {
    var hh = parseInt(hm[1], 10);
    if (hh >= 0 && hh <= 23) return hh;
    return NaN;
  }
  var isoM = /T(\d{2}):/.exec(s);
  if (isoM) {
    var ih = parseInt(isoM[1], 10);
    if (ih >= 0 && ih <= 23) return ih;
  }
  var n = parseInt(s, 10);
  if (!isNaN(n) && n >= 0 && n <= 23) return n;
  return NaN;
}

function getSlotHourRangeFromStore(store) {
  const DEFAULT_START = 11;
  const DEFAULT_END = 20;
  var startRaw = firstDefinedField(store, [
    'slotStartHour',
    'SlotStartHour',
    'slot_start_hour',
    'startHour',
    'openHour',
    '슬롯시작',
    '예약시작시',
  ]);
  var endRaw = firstDefinedField(store, [
    'slotEndHour',
    'SlotEndHour',
    'slot_end_hour',
    'endHour',
    'closeHour',
    '슬롯종료',
    '예약종료시',
  ]);
  var start = coerceHourFromSheetValue(startRaw);
  var end = coerceHourFromSheetValue(endRaw);
  if (isNaN(start) || start < 0 || start > 23) start = DEFAULT_START;
  if (isNaN(end) || end < 0 || end > 23) end = DEFAULT_END;
  var crossesMidnight = end < start;
  return { slotStartHour: start, slotEndHour: end, crossesMidnight: crossesMidnight };
}

function hhmmToMinutes(s) {
  var p = String(s).trim().split(':');
  var h = parseInt(p[0], 10);
  var m = parseInt(p[1] || '0', 10);
  if (isNaN(h) || isNaN(m)) return 0;
  return h * 60 + m;
}

function timeToExtendedMinutes(timeStr, crossesMidnight, startHour, endHour) {
  var mins = hhmmToMinutes(timeStr);
  if (!crossesMidnight) return mins;
  var h = (mins / 60) | 0;
  if (h >= startHour) return mins;
  if (h <= endHour) return mins + 24 * 60;
  return mins;
}

function slotOverlapsReservation(slotTime, resStart, resEnd, crossesMidnight, startHour, endHour) {
  var sm = timeToExtendedMinutes(slotTime, crossesMidnight, startHour, endHour);
  var lo = timeToExtendedMinutes(String(resStart).trim(), crossesMidnight, startHour, endHour);
  var hi = timeToExtendedMinutes(String(resEnd).trim(), crossesMidnight, startHour, endHour);
  if (hi < lo) hi += 24 * 60;
  return sm >= lo && sm <= hi;
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
    const range = getSlotHourRangeFromStore(store);
    var slotStartHour = range.slotStartHour;
    var slotEndHour = range.slotEndHour;
    var crossesMidnight = range.crossesMidnight;

    // 해당 날짜의 확정 예약에서 시간대별 예약 인원 합산
    const confirmedRes = reservations.filter(r =>
      String(r.storeId).trim() === sid &&
      String(r.date).trim() === date &&
      String(r.status).trim() === 'CONFIRMED'
    );

    const timeline = buildSlots(cap, confirmedRes, slotStartHour, slotEndHour, crossesMidnight);

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
  const range = getSlotHourRangeFromStore(store);
  var slotStartHour = range.slotStartHour;
  var slotEndHour = range.slotEndHour;
  var crossesMidnight = range.crossesMidnight;
  const slots = buildSlots(cap, reservations, slotStartHour, slotEndHour, crossesMidnight);

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

// ── 슬롯 생성 (자정 넘김: startHour > endHour 인 경우 저녁~새벽) ──

function buildSlots(maxPeople, confirmedReservations, startHour, endHour, crossesMidnight) {
  const h0 = typeof startHour === 'number' ? startHour : 11;
  const h1 = typeof endHour === 'number' ? endHour : 20;
  const cross = !!crossesMidnight;
  const slotTimes = [];
  function pushHour(h) {
    slotTimes.push(String(h).padStart(2, '0') + ':00');
    slotTimes.push(String(h).padStart(2, '0') + ':30');
  }
  if (!cross) {
    for (let h = h0; h <= h1; h++) pushHour(h);
  } else {
    for (let h = h0; h <= 23; h++) pushHour(h);
    for (let h = 0; h <= h1; h++) pushHour(h);
  }
  const slots = [];
  for (let i = 0; i < slotTimes.length; i++) {
    const time = slotTimes[i];
      let booked = 0;
      confirmedReservations.forEach(r => {
        const start = String(r.startTime).trim();
        const end = String(r.endTime).trim();
        if (slotOverlapsReservation(time, start, end, cross, h0, h1)) {
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
  const range = getSlotHourRangeFromStore(store);
  var slotStartHour = range.slotStartHour;
  var slotEndHour = range.slotEndHour;
  var crossesMidnight = range.crossesMidnight;
  const existing = sheetToObjects('reservation').filter(r =>
    String(r.storeId).trim() === storeId &&
    String(r.date).trim() === date &&
    String(r.status).trim() === 'CONFIRMED'
  );

  // 요청 시간대의 최소 잔여 인원 확인
  const slots = buildSlots(cap, existing, slotStartHour, slotEndHour, crossesMidnight);
  const targetSlots = slots.filter(function (s) {
    return slotOverlapsReservation(s.timeBlock, startTime, endTime, crossesMidnight, slotStartHour, slotEndHour);
  });
  if (!targetSlots.length) {
    return { success: false, message: '선택한 시간이 예약 가능한 슬롯에 없습니다.' };
  }
  const minRemaining = Math.min.apply(null, targetSlots.map(function (s) { return cap - s.currentHeadcount; }));

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

  const matched = reservations.filter(r => {
    // Sheets가 전화번호를 숫자로 변환할 수 있으므로 다양한 형식 대응
    let rPhone = String(r.userPhone || '').replace(/[-\s']/g, '').trim();
    // 숫자로 변환된 경우 (예: 1.01235E+10 → 10123456789) 앞에 0 붙이기
    if (rPhone.length === 10 && !rPhone.startsWith('0')) rPhone = '0' + rPhone;
    return rPhone === phone;
  });

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
      date: String(r.date || '').trim(),
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

// ── 전체 데이터 한 번에 가져오기 (SWR 캐싱용) ──────────────────

function handleGetAllData() {
  const stores = sheetToObjects('store');
  const menus = sheetToObjects('menu');
  const rules = sheetToObjects('rule');
  const reservations = sheetToObjects('reservation');

  const storeList = stores.map(store => {
    const sid = String(store.storeId).trim();
    const cap = parseInt(store.maxCapacity) || 0;
    const range = getSlotHourRangeFromStore(store);
    return {
      storeId: sid,
      name: store.name,
      category: store.category || '',
      maxCapacity: cap,
      imageUrl: store.imageUrl || '',
      description: store.description || '',
      slotStartHour: range.slotStartHour,
      slotEndHour: range.slotEndHour,
      menus: menus.filter(m => String(m.storeId).trim() === sid).map(m => ({
        id: String(m.menuId).trim(),
        name: m.name,
        price: parseInt(m.price) || 0,
        category: m.category || '',
        isRequired: String(m.isRequired).toLowerCase() === 'true',
      })),
      minOrderRules: rules.filter(r => String(r.storeId).trim() === sid).map(r => ({
        minHeadcount: parseInt(r.minHeadcount) || 0,
        maxHeadcount: parseInt(r.maxHeadcount) || 0,
        minOrderAmount: parseInt(r.minOrderAmount) || 0,
      })),
    };
  });

  // 확정된 예약만 (CANCELED 제외)
  const confirmedReservations = reservations
    .filter(r => String(r.status).trim() === 'CONFIRMED')
    .map(r => ({
      reservationId: r.reservationId,
      storeId: String(r.storeId).trim(),
      headcount: parseInt(r.headcount) || 0,
      date: String(r.date).trim(),
      startTime: String(r.startTime).trim(),
      endTime: String(r.endTime).trim(),
    }));

  return {
    success: true,
    data: {
      stores: storeList,
      reservations: confirmedReservations,
    },
  };
}
