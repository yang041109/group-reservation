import { firstAvailableSequenceNumber } from '@/lib/sequence-id';

/** 전역 관리에서 자동 부여하는 가게 ID: store-1, store-2, … (삭제 시 빈 번호 재사용) */
const AUTO_STORE_ID_RE = /^store-(\d+)$/i;

export function parseAutoStoreIdNumber(storeId: string): number | null {
  const m = String(storeId ?? '').trim().match(AUTO_STORE_ID_RE);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return Number.isFinite(n) && n >= 1 ? n : null;
}

export function formatAutoStoreId(n: number): string {
  return `store-${n}`;
}

/** 기존 ID 목록에서 비어 있는 가장 작은 `store-N` (1,2,3… 연속 채우기) */
export function suggestNextAutoStoreId(existingStoreIds: Iterable<string>): string {
  const used: number[] = [];
  for (const id of existingStoreIds) {
    const n = parseAutoStoreIdNumber(id);
    if (n != null) used.push(n);
  }
  return formatAutoStoreId(firstAvailableSequenceNumber(used));
}
