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

let menuNoticeEnsurePromise: Promise<void> | null = null;

export async function ensureMenuNoticeTextColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'menuNoticeText')) return true;
  if (menuNoticeEnsurePromise) {
    await menuNoticeEnsurePromise;
    return storeColumnExists(pool, 'menuNoticeText');
  }
  menuNoticeEnsurePromise = (async () => {
    if (await storeColumnExists(pool, 'menuNoticeText')) return;
    await pool.execute(
      `ALTER TABLE store
       ADD COLUMN menuNoticeText TEXT NULL
       COMMENT '메뉴 관련 안내 문구'`,
    );
  })()
    .catch((e) => {
      console.warn('[ensureMenuNoticeTextColumn]', e);
    })
    .finally(() => {
      menuNoticeEnsurePromise = null;
    });
  await menuNoticeEnsurePromise;
  return storeColumnExists(pool, 'menuNoticeText');
}

let depositRangesEnsurePromise: Promise<void> | null = null;

export async function ensureDepositActiveMonthRangesColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'depositActiveMonthRangesJson')) return true;
  if (depositRangesEnsurePromise) {
    await depositRangesEnsurePromise;
    return storeColumnExists(pool, 'depositActiveMonthRangesJson');
  }
  depositRangesEnsurePromise = (async () => {
    if (await storeColumnExists(pool, 'depositActiveMonthRangesJson')) return;
    await pool.execute(
      `ALTER TABLE store
       ADD COLUMN depositActiveMonthRangesJson JSON NULL
       COMMENT '예약금 적용 기간 [{"start":"MM-DD","end":"MM-DD"}]'`,
    );
  })()
    .catch((e) => {
      console.warn('[ensureDepositActiveMonthRangesColumn]', e);
    })
    .finally(() => {
      depositRangesEnsurePromise = null;
    });
  await depositRangesEnsurePromise;
  return storeColumnExists(pool, 'depositActiveMonthRangesJson');
}

let shiftStartTimesEnsurePromise: Promise<void> | null = null;

export async function ensureShiftStartTimesColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'shiftStartTimesJson')) return true;
  if (shiftStartTimesEnsurePromise) {
    await shiftStartTimesEnsurePromise;
    return storeColumnExists(pool, 'shiftStartTimesJson');
  }
  shiftStartTimesEnsurePromise = (async () => {
    if (await storeColumnExists(pool, 'shiftStartTimesJson')) return;
    await pool.execute(
      `ALTER TABLE store
       ADD COLUMN shiftStartTimesJson JSON NULL
       COMMENT '교대제(부제) 운영 시 허용되는 시작 시각 목록 ["18:00","21:00"]'`,
    );
  })()
    .catch((e) => {
      console.warn('[ensureShiftStartTimesColumn]', e);
    })
    .finally(() => {
      shiftStartTimesEnsurePromise = null;
    });
  await shiftStartTimesEnsurePromise;
  return storeColumnExists(pool, 'shiftStartTimesJson');
}

let shiftRangesEnsurePromise: Promise<void> | null = null;

export async function ensureShiftActiveMonthRangesColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'shiftActiveMonthRangesJson')) return true;
  if (shiftRangesEnsurePromise) {
    await shiftRangesEnsurePromise;
    return storeColumnExists(pool, 'shiftActiveMonthRangesJson');
  }
  shiftRangesEnsurePromise = (async () => {
    if (await storeColumnExists(pool, 'shiftActiveMonthRangesJson')) return;
    await pool.execute(
      `ALTER TABLE store
       ADD COLUMN shiftActiveMonthRangesJson JSON NULL
       COMMENT '교대제 적용 기간 [{"start":"MM-DD","end":"MM-DD"}]. 비어있으면 미적용.'`,
    );
  })()
    .catch((e) => {
      console.warn('[ensureShiftActiveMonthRangesColumn]', e);
    })
    .finally(() => {
      shiftRangesEnsurePromise = null;
    });
  await shiftRangesEnsurePromise;
  return storeColumnExists(pool, 'shiftActiveMonthRangesJson');
}

export async function storeHasShiftStartTimesColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'shiftStartTimesJson')) return true;
  return ensureShiftStartTimesColumn(pool);
}

export async function storeHasShiftActiveMonthRangesColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'shiftActiveMonthRangesJson')) return true;
  return ensureShiftActiveMonthRangesColumn(pool);
}

let menuRequiredEnsurePromise: Promise<void> | null = null;

export async function ensureMenuRequiredPeoplePerItemColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'menuRequiredPeoplePerItem')) return true;
  if (menuRequiredEnsurePromise) {
    await menuRequiredEnsurePromise;
    return storeColumnExists(pool, 'menuRequiredPeoplePerItem');
  }
  menuRequiredEnsurePromise = (async () => {
    if (await storeColumnExists(pool, 'menuRequiredPeoplePerItem')) return;
    await pool.execute(
      `ALTER TABLE store
       ADD COLUMN menuRequiredPeoplePerItem INT NULL
       COMMENT 'N명당 메뉴 1개 강제. NULL = 제한 없음'`,
    );
  })()
    .catch((e) => {
      console.warn('[ensureMenuRequiredPeoplePerItemColumn]', e);
    })
    .finally(() => {
      menuRequiredEnsurePromise = null;
    });
  await menuRequiredEnsurePromise;
  return storeColumnExists(pool, 'menuRequiredPeoplePerItem');
}

export async function storeHasMenuNoticeTextColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'menuNoticeText')) return true;
  return ensureMenuNoticeTextColumn(pool);
}

export async function storeHasDepositActiveMonthRangesColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'depositActiveMonthRangesJson')) return true;
  return ensureDepositActiveMonthRangesColumn(pool);
}

export async function storeHasMenuRequiredPeoplePerItemColumn(pool: Pool): Promise<boolean> {
  if (await storeColumnExists(pool, 'menuRequiredPeoplePerItem')) return true;
  return ensureMenuRequiredPeoplePerItemColumn(pool);
}

/** 모든 부가 컬럼을 한꺼번에 보장. 가게 조회/수정 직전에 호출. */
export async function ensureStoreBookingRulesColumns(pool: Pool): Promise<void> {
  await Promise.all([
    ensureAllowSameDayBookingColumn(pool),
    ensureClosedWeekdaysColumn(pool),
    ensureMenuNoticeTextColumn(pool),
    ensureDepositActiveMonthRangesColumn(pool),
    ensureMenuRequiredPeoplePerItemColumn(pool),
    ensureShiftStartTimesColumn(pool),
    ensureShiftActiveMonthRangesColumn(pool),
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
