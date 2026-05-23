-- URR — MySQL 스키마 (구글 시트 대체)
-- MySQL 8.x 권장, utf8mb4

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS store (
  storeId VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(128) NOT NULL DEFAULT '',
  locationLabel VARCHAR(255) NULL COMMENT '간략 위치 (검색 카드)',
  maxCapacity INT NOT NULL DEFAULT 0,
  minGroupHeadcount INT NOT NULL DEFAULT 2 COMMENT '단체예약 최소 인원',
  imageUrl TEXT NULL,
  slotStartHour INT NULL,
  slotEndHour INT NULL,
  depositAmount INT NOT NULL DEFAULT 0 COMMENT '단일 예약금(원); 구간 모드일 때는 미매칭 시 0',
  depositUseTiers TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1이면 depositTiersJson 구간별 예약금',
  depositTiersJson JSON NULL COMMENT '[{"minHeadcount":1,"maxHeadcount":20,"amount":50000}]',
  ownerName VARCHAR(128) NULL COMMENT '예약금 입금 안내용 사장님 성함',
  ownerBankAccount VARCHAR(255) NULL COMMENT '예약금 입금 계좌',
  weeklyHoursJson JSON NULL COMMENT '요일별 영업시간',
  closedDatesJson JSON NULL COMMENT '지정 휴무일 YYYY-MM-DD 배열',
  closedWeekdaysJson JSON NULL COMMENT '매주 항상 휴무 요일 ["sun","mon"] 형태',
  allowSameDayBooking TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1이면 당일 예약 허용',
  menuNoticeText TEXT NULL COMMENT '메뉴 관련 안내 문구',
  depositActiveMonthRangesJson JSON NULL COMMENT '예약금 적용 기간 [{"start":"MM-DD","end":"MM-DD"}]',
  menuRequiredPeoplePerItem INT NULL COMMENT 'N명당 메뉴 1개 강제. NULL = 제한 없음',
  description TEXT NULL,
  adminAccessToken VARCHAR(64) NULL UNIQUE COMMENT '사장님 전용 URL 토큰 (/admin/m/{token})',
  sortOrder INT NOT NULL DEFAULT 0 COMMENT '목록 표시 순서(작을수록 앞)'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS menu (
  storeId VARCHAR(64) NOT NULL,
  menuId VARCHAR(64) NOT NULL,
  name VARCHAR(255) NOT NULL,
  price INT NOT NULL DEFAULT 0,
  category VARCHAR(128) NOT NULL DEFAULT '',
  sortOrder INT NOT NULL DEFAULT 0 COMMENT '메뉴 표시 순서(작을수록 앞)',
  isRequired TINYINT(1) NOT NULL DEFAULT 0,
  imageUrl TEXT NULL,
  description TEXT NULL COMMENT '메뉴 설명 (재료, 특징 등)',
  PRIMARY KEY (storeId, menuId),
  CONSTRAINT fk_menu_store FOREIGN KEY (storeId) REFERENCES store (storeId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rule (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  storeId VARCHAR(64) NOT NULL,
  minHeadcount INT NOT NULL DEFAULT 0,
  maxHeadcount INT NOT NULL DEFAULT 999,
  minOrderAmount INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_rule_store FOREIGN KEY (storeId) REFERENCES store (storeId) ON DELETE CASCADE,
  KEY idx_rule_store (storeId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 한 가게가 여러 동(zone)으로 나뉘는 경우. zone 0개면 store 단일 운영.
-- NULL 컬럼은 store에서 상속. 참고: docs/zone-schema.sql
CREATE TABLE IF NOT EXISTS zone (
  zoneId VARCHAR(64) NOT NULL PRIMARY KEY,
  storeId VARCHAR(64) NOT NULL,
  name VARCHAR(40) NOT NULL,
  sortOrder INT NOT NULL DEFAULT 0,
  maxCapacity INT NOT NULL,
  minGroupHeadcount INT NULL,
  slotStartHour INT NULL,
  slotEndHour INT NULL,
  weeklyHoursJson JSON NULL,
  closedDatesJson JSON NULL,
  ownerClosedSlotsJson JSON NULL,
  UNIQUE KEY uq_zone_store_name (storeId, name),
  KEY idx_zone_store_sort (storeId, sortOrder),
  CONSTRAINT fk_zone_store FOREIGN KEY (storeId) REFERENCES store (storeId) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Apps Script 예약 로직과 동일하게 동작하려면 아래 확장 컬럼이 필요합니다.
CREATE TABLE IF NOT EXISTS reservation (
  reservationId VARCHAR(64) NOT NULL PRIMARY KEY,
  storeId VARCHAR(64) NOT NULL,
  zoneId VARCHAR(64) NULL COMMENT '동(zone) 단위 운영 시 어느 동의 예약인지. NULL이면 store 단일 운영',
  userName VARCHAR(255) NOT NULL DEFAULT '',
  groupName VARCHAR(255) NOT NULL DEFAULT '',
  userPhone VARCHAR(64) NOT NULL DEFAULT '',
  userNote TEXT NULL,
  headcount INT NOT NULL DEFAULT 0,
  date DATE NOT NULL,
  startTime VARCHAR(16) NOT NULL,
  endTime VARCHAR(16) NOT NULL,
  menuItems JSON NULL,
  totalAmount INT NOT NULL DEFAULT 0,
  status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
  depositAmount INT NOT NULL DEFAULT 0,
  ownerRejectReason VARCHAR(500) NULL COMMENT '사장님 거절 시 예약자에게 전달되는 사유',
  ownerEditNotice VARCHAR(500) NULL COMMENT '사장님이 시간/인원을 변경한 경우 사용자에게 보여줄 안내',
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservation_store FOREIGN KEY (storeId) REFERENCES store (storeId) ON DELETE CASCADE,
  CONSTRAINT fk_reservation_zone FOREIGN KEY (zoneId) REFERENCES zone (zoneId) ON DELETE SET NULL,
  KEY idx_reservation_store_date_status (storeId, date, status),
  KEY idx_reservation_store_zone_date_status (storeId, zoneId, date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
