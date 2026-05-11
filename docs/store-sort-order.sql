-- 기존 DB: 가게 목록 정렬용 sortOrder (camelCase)
ALTER TABLE store
  ADD COLUMN sortOrder INT NOT NULL DEFAULT 0 COMMENT '목록 표시 순서(작을수록 앞)';

-- 예: 가나다순에 맞추고 싶으면 수동으로 번호 부여 후 /admin/manage 에서 조정
-- UPDATE store SET sortOrder = 10 WHERE storeId = 'store-1';
