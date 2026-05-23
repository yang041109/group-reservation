import type { Pool, RowDataPacket } from 'mysql2/promise';

async function storeColumnExists(pool: Pool, column: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'store' AND COLUMN_NAME = ?
     LIMIT 1`,
    [column],
  );
  return rows.length > 0;
}

let sameDayEnsurePromise: Promise<void> | null = null;

export async function ensureAllowSameDayBookingColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'allowSameDayBooking')) return true;
  if (sameDayEnsurePromise) {
    await sameDayEnsurePromise;
    return storeColumnExists(pool, 'allowSameDayBooking');
  }

  sameDayEnsurePromise = (async () => {
    if (await storeColumnExists(pool, 'allowSameDayBooking')) return;
    await pool.execute(
      `ALTER TABLE store
       ADD COLUMN allowSameDayBooking TINYINT(1) NOT NULL DEFAULT 0
       COMMENT '1이면 당일 예약 허용'`,
    );
  })()
    .catch((e) => {
      console.warn('[ensureAllowSameDayBookingColumn]', e);
    })
    .finally(() => {
      sameDayEnsurePromise = null;
    });

  await sameDayEnsurePromise;
  return storeColumnExists(pool, 'allowSameDayBooking');
}

let closedWeekdaysEnsurePromise: Promise<void> | null = null;

export async function ensureClosedWeekdaysColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'closedWeekdaysJson')) return true;
  if (closedWeekdaysEnsurePromise) {
    await closedWeekdaysEnsurePromise;
    return storeColumnExists(pool, 'closedWeekdaysJson');
  }

  closedWeekdaysEnsurePromise = (async () => {
    if (await storeColumnExists(pool, 'closedWeekdaysJson')) return;
    await pool.execute(
      `ALTER TABLE store
       ADD COLUMN closedWeekdaysJson JSON NULL
       COMMENT '매주 항상 휴무 요일 ["sun","mon"] 형태'`,
    );
  })()
    .catch((e) => {
      console.warn('[ensureClosedWeekdaysColumn]', e);
    })
    .finally(() => {
      closedWeekdaysEnsurePromise = null;
    });

  await closedWeekdaysEnsurePromise;
  return storeColumnExists(pool, 'closedWeekdaysJson');
}

/** 두 컬럼을 한꺼번에 보장. 가게 조회/수정 직전에 호출. */
export async function ensureStoreBookingRulesColumns(pool: Pool): Promise<void> {
  await Promise.all([
    ensureAllowSameDayBookingColumn(pool),
    ensureClosedWeekdaysColumn(pool),
  ]);
}

export async function storeHasAllowSameDayBookingColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'allowSameDayBooking')) return true;
  return ensureAllowSameDayBookingColumn(pool);
}

export async function storeHasClosedWeekdaysColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'closedWeekdaysJson')) return true;
  return ensureClosedWeekdaysColumn(pool);
}
