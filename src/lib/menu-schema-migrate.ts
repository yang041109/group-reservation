import type { Pool, RowDataPacket } from 'mysql2/promise';

let ensurePromise: Promise<void> | null = null;

async function menuColumnExists(pool: Pool, column: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'menu' AND COLUMN_NAME = ?
     LIMIT 1`,
    [column],
  );
  return rows.length > 0;
}

/** menu.sortOrder 컬럼이 없으면 추가 */
export async function ensureMenuSortOrderColumn(pool: Pool): Promise<void> {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    if (await menuColumnExists(pool, 'sortOrder')) return;

    await pool.execute(
      `ALTER TABLE menu
       ADD COLUMN sortOrder INT NOT NULL DEFAULT 0
       COMMENT '메뉴 표시 순서(작을수록 앞)'
       AFTER category`,
    );

    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT storeId, menuId FROM menu ORDER BY storeId, menuId',
    );
    let lastStore = '';
    let n = 0;
    for (const r of rows) {
      const sid = String(r.storeId ?? '');
      if (sid !== lastStore) {
        lastStore = sid;
        n = 0;
      }
      n += 10;
      await pool.execute('UPDATE menu SET sortOrder = ? WHERE storeId = ? AND menuId = ?', [
        n,
        sid,
        String(r.menuId ?? ''),
      ]);
    }
  })().catch((e) => {
    ensurePromise = null;
    throw e;
  });

  return ensurePromise;
}
