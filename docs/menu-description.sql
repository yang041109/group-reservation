-- menu 테이블에 설명 컬럼 추가
-- 코드가 자동으로 이 컬럼을 만들려고 시도하지만, ALTER 권한이 없거나 자동 실행이 실패한 경우 수동으로 적용.
ALTER TABLE menu
  ADD COLUMN description TEXT NULL
  COMMENT '메뉴 설명 (재료, 특징 등)'
  AFTER imageUrl;
