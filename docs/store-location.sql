-- 가게 위치 간략 표기 (검색 카드·지도핀용)
ALTER TABLE store
  ADD COLUMN locationLabel VARCHAR(255) NULL COMMENT '예: 강남역 도보 5분' AFTER category;
