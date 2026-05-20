-- 사장님 예약 수정/거절 안내 컬럼 (한 번만 실행, 없는 컬럼만 추가)
-- 앱에서도 ensureReservationOwnerColumns 로 자동 추가 시도합니다.

-- 1) 거절 사유 (없을 때만)
SET @has_reject := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservation' AND COLUMN_NAME = 'ownerRejectReason'
);
SET @sql_reject := IF(
  @has_reject = 0,
  'ALTER TABLE reservation ADD COLUMN ownerRejectReason VARCHAR(500) NULL COMMENT ''사장님 거절 시 예약자에게 전달되는 사유'' AFTER depositAmount',
  'SELECT 1'
);
PREPARE stmt FROM @sql_reject;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 2) 수정 안내 (없을 때만)
SET @has_edit := (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reservation' AND COLUMN_NAME = 'ownerEditNotice'
);
SET @sql_edit := IF(
  @has_edit = 0,
  'ALTER TABLE reservation ADD COLUMN ownerEditNotice VARCHAR(500) NULL COMMENT ''사장님이 시간/인원을 변경한 경우 사용자 예약 조회 화면에 보여줄 안내'' AFTER ownerRejectReason',
  'SELECT 1'
);
PREPARE stmt FROM @sql_edit;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
