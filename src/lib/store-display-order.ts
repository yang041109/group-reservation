/** 가게 목록 표시 순서 — 전역 관리(/admin/manage) sortOrder 와 동일 */

export type StoreSortable = {
  sortOrder?: number | null;
  name?: string | null;
};

export function storeSortOrderValue(sortOrder: unknown): number {
  const n = typeof sortOrder === 'number' ? sortOrder : parseInt(String(sortOrder ?? '0'), 10);
  return Number.isFinite(n) ? n : 0;
}

/** sortOrder 오름차순 → 이름(한글) */
export function compareStoresByDisplayOrder(a: StoreSortable, b: StoreSortable): number {
  const oa = storeSortOrderValue(a.sortOrder);
  const ob = storeSortOrderValue(b.sortOrder);
  if (oa !== ob) return oa - ob;
  return String(a.name ?? '').localeCompare(String(b.name ?? ''), 'ko');
}
