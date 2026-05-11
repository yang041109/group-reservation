-- 기존 DB: 인원 구간별 예약금 (선택)
ALTER TABLE store
  ADD COLUMN depositUseTiers TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1이면 depositTiersJson 구간별 예약금',
  ADD COLUMN depositTiersJson JSON NULL COMMENT '예: [{"minHeadcount":1,"maxHeadcount":10,"amount":50000}]';
