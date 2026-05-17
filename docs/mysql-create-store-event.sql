-- 사장님이 캘린더에 직접 등록하는 일정(공지/휴무/메모)
-- (한 번만 실행)
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
