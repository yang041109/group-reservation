import { getStoreByAdminToken } from '@/lib/admin-token';

/**
 * 사장님 토큰으로 storeId 검증.
 * - 토큰이 유효하지 않거나 다른 가게의 storeId면 null 반환
 * - 일치하면 정규화된 storeId 반환
 */
export async function requireOwnerStoreId(
  token: string,
  requestedStoreId: string,
): Promise<string | null> {
  const t = (token ?? '').trim();
  const sid = (requestedStoreId ?? '').trim();
  if (!t || !sid) return null;
  const store = await getStoreByAdminToken(t);
  if (!store) return null;
  if (store.id !== sid) return null;
  return store.id;
}

/** 토큰만으로 storeId 가져오기 (요청 storeId 없이도 사용) */
export async function getStoreIdFromToken(token: string): Promise<string | null> {
  const t = (token ?? '').trim();
  if (!t) return null;
  const store = await getStoreByAdminToken(t);
  return store ? store.id : null;
}
