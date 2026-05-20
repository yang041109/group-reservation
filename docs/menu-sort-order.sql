-- 메뉴 표시 순서 (작을수록 앞). 기존 DB에 한 번만 실행.
ALTER TABLE menu
  ADD COLUMN sortOrder INT NOT NULL DEFAULT 0 COMMENT '메뉴 표시 순서(작을수록 앞)' AFTER category;

-- 기존 행: menuId 순으로 10, 20, 30… 부여 (선택)
SET @r := 0;
UPDATE menu m
JOIN (
  SELECT storeId, menuId, (@r := @r + 10) AS so
  FROM menu
  ORDER BY storeId, menuId
) t ON m.storeId = t.storeId AND m.menuId = t.menuId
SET m.sortOrder = t.so;
