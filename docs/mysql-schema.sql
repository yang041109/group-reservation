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
  isRequired TINYINT(1) NOT NULL DEFAULT 0,
  imageUrl TEXT NULL,
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

-- Apps Script 예약 로직과 동일하게 동작하려면 아래 확장 컬럼이 필요합니다.
CREATE TABLE IF NOT EXISTS reservation (
  reservationId VARCHAR(64) NOT NULL PRIMARY KEY,
  storeId VARCHAR(64) NOT NULL,
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
  KEY idx_reservation_store_date_status (storeId, date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 사장님이 캘린더에 직접 등록하는 일정(공지/휴무/메모)
CREATE TABLE IF NOT EXISTS store_event (
  eventId VARCHAR(64) NOT NULL,
  storeId VARCHAR(64) NOT NULL,
  title VARCHAR(120) NOT NULL,
  memo VARCHAR(500) NULL,
  category VARCHAR(16) NOT NULL DEFAULT 'OTHER' COMMENT 'BLOCK|NOTICE|MEMO|OTHER',
  date DATE NOT NULL,
  startTime TIME NOT NULL,
  endTime TIME NOT NULL,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (eventId),
  CONSTRAINT fk_event_store FOREIGN KEY (storeId) REFERENCES store (storeId) ON DELETE CASCADE,
  KEY idx_event_store_date (storeId, date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
