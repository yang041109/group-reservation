import type { RowDataPacket } from 'mysql2';
import { getPool, isMysqlConfigured } from '@/lib/db';

export interface AdminStoreSession {
  id: string;
  name: string;
  depositAmount: number;
}

/**
 * 사장님 전용 URL 토큰으로 가게 조회 (로그인 없음)
 */
export async function getStoreByAdminToken(token: string): Promise<AdminStoreSession | null> {
  const raw = token.trim();
  if (!raw || !isMysqlConfigured()) return null;

  try {
    const pool = getPool();
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT storeId, name, depositAmount FROM store WHERE adminAccessToken = ? LIMIT 1',
      [raw],
    );
    const row = rows[0] as Record<string, unknown> | undefined;
    if (!row) return null;
    return {
      id: String(row.storeId ?? '').trim(),
      name: String(row.name ?? '').trim(),
      depositAmount: Number(row.depositAmount ?? 0) || 0,
    };
  } catch {
    return null;
  }
}
