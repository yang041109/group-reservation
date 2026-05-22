-- 한 가게가 여러 동(zone)으로 나뉘는 경우를 지원하는 스키마 변경.
-- 예) 주점A: A동(30명) / B동(20명) / C동(40명). 메뉴·사장님·예약금은 store에 그대로,
-- 동마다 다를 수 있는 것(수용인원, 영업시간, 휴무, 사장님 수동 마감)만 zone에.
-- zone 컬럼이 NULL이면 store의 같은 이름 컬럼을 fallback 으로 사용한다.

CREATE TABLE IF NOT EXISTS zone (
  zoneId VARCHAR(64) NOT NULL PRIMARY KEY,
  storeId VARCHAR(64) NOT NULL,
  name VARCHAR(40) NOT NULL COMMENT '"A동", "B동" 등 표시 이름',
  sortOrder INT NOT NULL DEFAULT 0,
  maxCapacity INT NOT NULL COMMENT '이 동의 동시 수용 인원 (필수)',

  -- 아래는 NULL 이면 store 행의 같은 컬럼을 상속
  minGroupHeadcount INT NULL,
  slotStartHour INT NULL,
  slotEndHour INT NULL,
  weeklyHoursJson JSON NULL,
  closedDatesJson JSON NULL,
  ownerClosedSlotsJson JSON NULL COMMENT '동별 사장님 수동 마감 슬롯',

  UNIQUE KEY uq_zone_store_name (storeId, name),
  KEY idx_zone_store_sort (storeId, sortOrder),
  CONSTRAINT fk_zone_store FOREIGN KEY (storeId) REFERENCES store (storeId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 예약은 어느 동에 속하는지 기록. zone 0개인 가게는 NULL 유지 (하위 호환).
ALTER TABLE reservation
  ADD COLUMN zoneId VARCHAR(64) NULL AFTER storeId,
  ADD KEY idx_reservation_store_zone_date_status (storeId, zoneId, date, status),
  ADD CONSTRAINT fk_reservation_zone
    FOREIGN KEY (zoneId) REFERENCES zone (zoneId) ON DELETE SET NULL;
