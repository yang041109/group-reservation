-- 사장님 수동 타임슬롯 마감 (오늘 날짜·30분 블록 목록)
ALTER TABLE store
  ADD COLUMN ownerClosedSlotsJson JSON NULL
    COMMENT '{"date":"YYYY-MM-DD","blocks":["17:00","17:30"]}';
