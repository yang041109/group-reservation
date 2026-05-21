-- menu 테이블에 설명 컬럼 추가 (한 번만 실행)
ALTER TABLE menu
  ADD COLUMN description TEXT NULL COMMENT '메뉴 설명 (재료, 특징 등)'
  AFTER imageUrl;
