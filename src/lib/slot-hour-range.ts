/**
 * 타임슬롯 히트맵/선택기의 시간축(시 단위)을 결정한다.
 * - API가 slotStartHour / slotEndHour 를 주면 그대로 사용
 * - **끝 시 < 시작 시** (예: 17 ~ 3) → 자정 넘김 영업으로 간주 (술집 등)
 * - 없으면 timeBlock 문자열(HH:MM)들에서 최소·최대 시각을 추론 (같은 날만)
 * - 추론 불가 시 기본 11~20시
 */

export const DEFAULT_SLOT_START_HOUR = 11;
export const DEFAULT_SLOT_END_HOUR = 20;

export interface SlotHourResolution {
  startHour: number;
  endHour: number;
  /** true면 startHour(저녁) ~ 자정 ~ endHour(새벽) 까지 슬롯 생성 */
  crossesMidnight: boolean;
}

function parseTimeToMinutes(t: string): number | null {
  const s = t.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

/** "11:00 - 13:00" 같은 범위면 시작·끝 모두 반영 */
function collectMinutesFromBlock(block: string): number[] {
  const parts = block.split(' - ').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return [];
  const out: number[] = [];
  for (const p of parts) {
    const mins = parseTimeToMinutes(p);
    if (mins !== null) out.push(mins);
  }
  return out;
}

/** slots 배열의 첫·끝 timeBlock으로 축 후보 (끝 < 시작 분이면 자정 넘김) */
function resolutionFromOrderedEnds(first: string, last: string): SlotHourResolution | null {
  const a = parseTimeToMinutes(first);
  const b = parseTimeToMinutes(last);
  if (a === null || b === null) return null;
  const crossesMidnight = b < a;
  return {
    startHour: Math.floor(a / 60),
    endHour: Math.floor(b / 60),
    crossesMidnight,
  };
}

/** 30분 단위 timeBlock → "영업 밤" 기준 분 (0~47*60+30) */
export function timeBlockToExtendedMinutes(
  timeBlock: string,
  crossesMidnight: boolean,
  startHour: number,
  endHour: number,
): number {
  const m = parseTimeToMinutes(timeBlock);
  if (m === null) return 0;
  if (!crossesMidnight) return m;
  const h = Math.floor(m / 60);
  if (h >= startHour) return m;
  if (h <= endHour) return m + 24 * 60;
  return m;
}

export function slotOverlapsReservation(
  slotTimeBlock: string,
  resStart: string,
  resEnd: string,
  businessCrossesMidnight: boolean,
  startHour: number,
  endHour: number,
): boolean {
  const slotM = timeBlockToExtendedMinutes(
    slotTimeBlock,
    businessCrossesMidnight,
    startHour,
    endHour,
  );
  let lo = timeBlockToExtendedMinutes(
    resStart.trim(),
    businessCrossesMidnight,
    startHour,
    endHour,
  );
  let hi = timeBlockToExtendedMinutes(
    resEnd.trim(),
    businessCrossesMidnight,
    startHour,
    endHour,
  );
  if (hi < lo) hi += 24 * 60;
  return slotM >= lo && slotM <= hi;
}

/** 30분 슬롯 문자열 목록 (예: 17:00 … 23:30, 00:00 … 03:30) */
export function generateSlotTimeBlocks(
  startHour: number,
  endHour: number,
  crossesMidnight: boolean,
): string[] {
  const out: string[] = [];
  const pushHour = (h: number) => {
    out.push(`${String(h).padStart(2, '0')}:00`);
    out.push(`${String(h).padStart(2, '0')}:30`);
  };
  if (!crossesMidnight) {
    for (let h = startHour; h <= endHour; h++) pushHour(h);
  } else {
    for (let h = startHour; h <= 23; h++) pushHour(h);
    for (let h = 0; h <= endHour; h++) pushHour(h);
  }
  return out;
}

/** 시간 눈금 (표시용), 자정 넘김이면 17…23, 0…3 */
export function getHourLabels(
  startHour: number,
  endHour: number,
  crossesMidnight: boolean,
): number[] {
  if (!crossesMidnight) {
    const r: number[] = [];
    for (let h = startHour; h <= endHour; h++) r.push(h);
    return r;
  }
  const r: number[] = [];
  for (let h = startHour; h <= 23; h++) r.push(h);
  for (let h = 0; h <= endHour; h++) r.push(h);
  return r;
}

/** 시트/JSON에서 온 값 (숫자, "17", "17:00", Apps Script가 넣은 ISO 등) → 0~23 시간 */
export function normalizeSlotHour(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'string' && v.trim() === '') return undefined;
  if (typeof v === 'string') {
    const t = v.trim();
    const hm = /^(\d{1,2})\s*:\s*(\d{2})/.exec(t);
    if (hm) {
      const hh = parseInt(hm[1], 10);
      if (hh >= 0 && hh <= 23) return hh;
      return undefined;
    }
    const iso = /T(\d{2}):/.exec(t);
    if (iso) {
      const hh = parseInt(iso[1], 10);
      if (hh >= 0 && hh <= 23) return hh;
    }
  }
  const n = Number(v);
  if (!Number.isFinite(n)) return undefined;
  const h = Math.trunc(n);
  if (h < 0 || h > 23) return undefined;
  return h;
}

/**
 * 시트의 slotStartHour·slotEndHour가 **둘 다** 있을 때만 사용.
 * 막대 축은 이 값만 따르고(첫 칸 = 시작 시 :00, 끝 시까지 :30 포함), available/slots 추론으로 바꾸지 않는다.
 * 하나라도 없으면 null → `resolveSlotHourRange`로 폴백.
 */
export function slotHourRangeFromSheet(
  slotStartHour: unknown,
  slotEndHour: unknown,
): SlotHourResolution | null {
  const sh = normalizeSlotHour(slotStartHour);
  const eh = normalizeSlotHour(slotEndHour);
  if (sh === undefined || eh === undefined) return null;
  return {
    startHour: sh,
    endHour: eh,
    crossesMidnight: eh < sh,
  };
}

/**
 * 예약 가능 시간만 있을 때 축 추론 (전체 slots가 11~20이어도 available이 17~만 있으면 17부터)
 * 새벽(0~6) + 저녁(17~)이 같이 있으면 자정 넘김 영업으로 본다.
 */
export function inferRangeFromAvailableBlocks(blocks: string[]): SlotHourResolution | null {
  const hours: number[] = [];
  for (const raw of blocks) {
    const m = parseTimeToMinutes(raw.trim());
    if (m === null) continue;
    hours.push(Math.floor(m / 60));
  }
  if (hours.length === 0) return null;

  const lowBand = hours.filter((h) => h <= 6);
  const highBand = hours.filter((h) => h >= 17);
  if (lowBand.length > 0 && highBand.length > 0) {
    return {
      startHour: Math.min(...highBand),
      endHour: Math.max(...lowBand),
      crossesMidnight: true,
    };
  }
  return {
    startHour: Math.min(...hours),
    endHour: Math.max(...hours),
    crossesMidnight: false,
  };
}

export function resolveSlotHourRange(options: {
  slotStartHour?: unknown;
  slotEndHour?: unknown;
  /** 예약 가능한 timeBlock만 (우선 추론에 사용) */
  availableOnlyBlocks?: string[];
  /** API timeline/slots 배열 순서 (첫·끝 timeBlock으로 자정 넘김 추론) */
  orderedSlotTimeBlocks?: string[];
  timeBlocks?: string[];
}): SlotHourResolution {
  const { orderedSlotTimeBlocks, timeBlocks, availableOnlyBlocks } = options;
  const slotStartHour = normalizeSlotHour(options.slotStartHour);
  const slotEndHour = normalizeSlotHour(options.slotEndHour);
  if (slotStartHour !== undefined && slotEndHour !== undefined) {
    const crossesMidnight = slotEndHour < slotStartHour;
    return {
      startHour: slotStartHour,
      endHour: slotEndHour,
      crossesMidnight,
    };
  }

  const orderedEnds =
    orderedSlotTimeBlocks && orderedSlotTimeBlocks.length >= 2
      ? resolutionFromOrderedEnds(
          orderedSlotTimeBlocks[0],
          orderedSlotTimeBlocks[orderedSlotTimeBlocks.length - 1],
        )
      : null;

  // 자정 넘김 영업: 예약 가능 목록만으로 축을 잡으면(예: 저녁만 가능) 새벽 슬롯이 UI에서 통째로 사라짐 → 전체 슬롯(ordered) 축 우선
  if (orderedEnds?.crossesMidnight) {
    return orderedEnds;
  }

  if (availableOnlyBlocks && availableOnlyBlocks.length > 0) {
    const inferred = inferRangeFromAvailableBlocks(availableOnlyBlocks);
    if (inferred) return inferred;
  }

  if (orderedEnds) {
    return orderedEnds;
  }

  let minM = Infinity;
  let maxM = -Infinity;
  for (const raw of timeBlocks ?? []) {
    for (const mins of collectMinutesFromBlock(raw)) {
      minM = Math.min(minM, mins);
      maxM = Math.max(maxM, mins);
    }
  }

  if (minM === Infinity || maxM < 0) {
    return {
      startHour: DEFAULT_SLOT_START_HOUR,
      endHour: DEFAULT_SLOT_END_HOUR,
      crossesMidnight: false,
    };
  }

  const startHour = Math.min(23, Math.max(0, Math.floor(minM / 60)));
  const endHour = Math.min(23, Math.max(startHour, Math.floor(maxM / 60)));
  return { startHour, endHour, crossesMidnight: false };
}
