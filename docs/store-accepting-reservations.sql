-- 사장님 예약받기 on/off (오늘 기준 슬롯 마감)
ALTER TABLE store
  ADD COLUMN acceptingReservations TINYINT(1) NOT NULL DEFAULT 1
    COMMENT '1=예약 받는 중, 0=오늘 토글 시각 이후 마감',
  ADD COLUMN acceptingReservationsAt DATETIME NULL
    COMMENT '마지막 on/off 시각 (Asia/Seoul 기준으로 저장)';
