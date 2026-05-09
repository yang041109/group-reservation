-- URR — MySQL 스키마 (구글 시트 대체)
-- MySQL 8.x 권장, utf8mb4

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS store (
  storeId VARCHAR(64) NOT NULL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(128) NOT NULL DEFAULT '',
  maxCapacity INT NOT NULL DEFAULT 0,
  imageUrl TEXT NULL,
  slotStartHour INT NULL,
  slotEndHour INT NULL,
  depositAmount INT NOT NULL DEFAULT 0,
  description TEXT NULL
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
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reservation_store FOREIGN KEY (storeId) REFERENCES store (storeId) ON DELETE CASCADE,
  KEY idx_reservation_store_date_status (storeId, date, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
