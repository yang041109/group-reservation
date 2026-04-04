/**
 * 슬롯 막대 축, 30분 블록, 예약 겹침(자정 넘김) 판별.
 *
 * 【막대 축 원칙】
 * `slotStartHour`·`slotEndHour`가 둘 다 **유효한 0~23 시로 파싱되면**
 * availableTimes·ordered slots·timeBlocks 등 **어떤 추론도 쓰지 않고** 그 두 값만 사용한다.
 * (추론 폴백으로 11~20에 붙는 오류를 막기 위함.)
 *
 * 파싱은 숫자·문자열 모두 `Number()` 포함해 단단히 처리한다.
 */

export const DEFAULT_SLOT_START_HOUR = 11;
export const DEFAULT_SLOT_END_HOUR = 20;

export interface SlotHourResolution {
  startHour: number;
  endHour: number;
  crossesMidnight: boolean;
}

// ── 시각 문자열 파싱 (timeBlock 등) ─────────────────────────────

function parseTimeToMinutes(t: string): number | null {
  const s = t.trim();
  const m = /^(\d{1,2}):(\d{2})$/.exec(s);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

function collectMinutesFromBlock(block: string): number[] {
  const parts = block.split(' - ').map((p) => p.trim()).filter(Boolean);
  const out: number[] = [];
  for (const p of parts) {
    const mins = parseTimeToMinutes(p);
    if (mins !== null) out.push(mins);
  }
  return out;
}

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

// ── 예약 겹침 · 슬롯 나열 ─────────────────────────────────────

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
  let lo = timeBlockToExtendedMinutes(resStart.trim(), businessCrossesMidnight, startHour, endHour);
  let hi = timeBlockToExtendedMinutes(resEnd.trim(), businessCrossesMidnight, startHour, endHour);
  if (hi < lo) hi += 24 * 60;
  return slotM >= lo && slotM <= hi;
}

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

// ── 시트/API 시각 정규화 (문자열·숫자 모두) ───────────────────

/**
 * 시트·JSON 값 → 0~23 시.
 * - 문자열은 trim 후 `HH:mm`·ISO `Txx:` 우선, 그다음 **Number(문자열)** 로 숫자만 있는 경우 처리.
 * - `Number(" 17 ")` === 17 처럼 공백 포함 문자열도 통과시키기 위해 반드시 Number 단계를 탄다.
 */
export function normalizeSlotHour(v: unknown): number | undefined {
  if (v === null || v === undefined) return undefined;
  if (typeof v === 'boolean') return undefined;

  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return undefined;
    const h = Math.trunc(v);
    return h >= 0 && h <= 23 ? h : undefined;
  }

  if (typeof v === 'bigint') {
    const n = Number(v);
    if (!Number.isFinite(n)) return undefined;
    const h = Math.trunc(n);
    return h >= 0 && h <= 23 ? h : undefined;
  }

  const s = typeof v === 'string' ? v.trim() : String(v).trim();
  if (s === '') return undefined;

  const hm = /^(\d{1,2})\s*:\s*(\d{2})/.exec(s);
  if (hm) {
    const hh = parseInt(hm[1], 10);
    if (hh >= 0 && hh <= 23) return hh;
    return undefined;
  }

  const iso = /T(\d{2}):/.exec(s);
  if (iso) {
    const hh = parseInt(iso[1], 10);
    if (hh >= 0 && hh <= 23) return hh;
  }

  const n = Number(s);
  if (!Number.isFinite(n)) return undefined;
  const h = Math.trunc(n);
  if (h < 0 || h > 23) return undefined;
  return h;
}

/**
 * 시트에 시작·끝 시가 **둘 다** 있을 때만 막대 축. 없으면 null → 폴백에서 `resolveSlotHourRange` 사용.
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

/** 시트 시각 없을 때: 예약 가능 timeBlock만으로 축 추론 */
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

export interface ResolveSlotHourRangeOptions {
  slotStartHour?: unknown;
  slotEndHour?: unknown;
  availableOnlyBlocks?: string[];
  orderedSlotTimeBlocks?: string[];
  timeBlocks?: string[];
}

/**
 * 막대 축 결정.
 * 1) `slotStartHour`·`slotEndHour` 둘 다 파싱 성공 → **즉시 반환** (다른 필드 무시).
 * 2) 아니면 ordered / available / timeBlocks / 기본값 순 폴백.
 */
export function resolveSlotHourRange(options: ResolveSlotHourRangeOptions): SlotHourResolution {
  const sh = normalizeSlotHour(options.slotStartHour);
  const eh = normalizeSlotHour(options.slotEndHour);
  if (sh !== undefined && eh !== undefined) {
    return {
      startHour: sh,
      endHour: eh,
      crossesMidnight: eh < sh,
    };
  }

  const { orderedSlotTimeBlocks, timeBlocks, availableOnlyBlocks } = options;

  const orderedEnds =
    orderedSlotTimeBlocks && orderedSlotTimeBlocks.length >= 2
      ? resolutionFromOrderedEnds(
          orderedSlotTimeBlocks[0],
          orderedSlotTimeBlocks[orderedSlotTimeBlocks.length - 1],
        )
      : null;

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
