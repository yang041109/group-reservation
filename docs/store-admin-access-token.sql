-- 이 프로젝트 MySQL 컬럼명은 camelCase 입니다 (storeId, adminAccessToken).
-- store_id / admin_access_token 이 아닙니다 — Unknown column 방지용.

-- 기존 DB에 사장님 전용 링크 토큰 컬럼 추가 (이미 있으면 에러 나므로 생략)
ALTER TABLE store
  ADD COLUMN adminAccessToken VARCHAR(64) NULL UNIQUE COMMENT '사장님 전용 URL';

-- 예: 가게별로 추측하기 어려운 토큰 부여 후 아래 URL로 접속
--   https://당신의도메인/admin/m/{adminAccessToken}

-- 예시 (store-1, store-2) — 운영 시에는 UUID 등으로 바꿔 쓰세요
UPDATE store SET adminAccessToken = 'adm_demo_store1_secret_token_change_me' WHERE storeId = 'store-1' AND (adminAccessToken IS NULL OR adminAccessToken = '');
UPDATE store SET adminAccessToken = 'adm_demo_store2_secret_token_change_me' WHERE storeId = 'store-2' AND (adminAccessToken IS NULL OR adminAccessToken = '');

-- MySQL 8에서 행마다 무작위 토큰을 넣고 싶다면 (한 번 실행):
-- UPDATE store SET adminAccessToken = CONCAT('adm_', REPLACE(UUID(), '-', '')) WHERE adminAccessToken IS NULL;
