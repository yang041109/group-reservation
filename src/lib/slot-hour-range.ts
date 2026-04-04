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

export function resolveSlotHourRange(options: {
  slotStartHour?: number;
  slotEndHour?: number;
  timeBlocks?: string[];
}): SlotHourResolution {
  const { slotStartHour, slotEndHour, timeBlocks } = options;
  if (
    typeof slotStartHour === 'number' &&
    typeof slotEndHour === 'number' &&
    Number.isInteger(slotStartHour) &&
    Number.isInteger(slotEndHour) &&
    slotStartHour >= 0 &&
    slotStartHour <= 23 &&
    slotEndHour >= 0 &&
    slotEndHour <= 23
  ) {
    const crossesMidnight = slotEndHour < slotStartHour;
    return {
      startHour: slotStartHour,
      endHour: slotEndHour,
      crossesMidnight,
    };
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
