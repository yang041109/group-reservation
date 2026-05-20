import type { Pool, RowDataPacket } from 'mysql2/promise';

let ensurePromise: Promise<void> | null = null;

async function reservationColumnExists(pool: Pool, column: string): Promise<boolean> {
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT 1 AS ok FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservation' AND COLUMN_NAME = ?
     LIMIT 1`,
    [column],
  );
  return rows.length > 0;
}

/**
 * 예약 테이블에 사장님 거절/수정 안내 컬럼이 없으면 추가 (기존 DB 호환).
 */
export async function ensureReservationOwnerColumns(pool: Pool): Promise<void> {
  if (ensurePromise) return ensurePromise;

  ensurePromise = (async () => {
    if (!(await reservationColumnExists(pool, 'ownerRejectReason'))) {
      await pool.execute(
        `ALTER TABLE reservation
         ADD COLUMN ownerRejectReason VARCHAR(500) NULL
         COMMENT '사장님 거절 시 예약자에게 전달되는 사유'
         AFTER depositAmount`,
      );
    }

    if (!(await reservationColumnExists(pool, 'ownerEditNotice'))) {
      const after = (await reservationColumnExists(pool, 'ownerRejectReason'))
        ? 'ownerRejectReason'
        : 'depositAmount';
      await pool.execute(
        `ALTER TABLE reservation
         ADD COLUMN ownerEditNotice VARCHAR(500) NULL
         COMMENT '사장님이 시간/인원을 변경한 경우 사용자에게 보여줄 안내'
         AFTER \`${after}\``,
      );
    }
  })().catch((e) => {
    ensurePromise = null;
    throw e;
  });

  return ensurePromise;
}
