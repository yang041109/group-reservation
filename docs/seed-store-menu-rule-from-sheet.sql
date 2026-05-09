-- 구글 시트 store / menu / rule 탭 → MySQL INSERT
-- 출처: 레포 내 정적 데이터(src/lib/store-data.ts). 실제 스프레드시트와 숫자·문구가 다르면 이 파일만 수정해 맞추면 됩니다.
-- 실행 순서: store → menu → rule (FK). 기존 테이블에 행이 있으면 PK 충돌납니다 — 빈 DB이거나 아래 정리 블록을 사용하세요.
--
-- [선택] 예약 없이 마스터만 비우고 다시 넣기:
-- SET FOREIGN_KEY_CHECKS = 0;
-- TRUNCATE TABLE reservation;
-- TRUNCATE TABLE rule;
-- TRUNCATE TABLE menu;
-- TRUNCATE TABLE store;
-- SET FOREIGN_KEY_CHECKS = 1;

SET NAMES utf8mb4;

INSERT INTO store (storeId, name, category, maxCapacity, imageUrl, slotStartHour, slotEndHour, depositAmount, description) VALUES
('store-1', '맛있는 한식당', '한식', 30, 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&h=450&fit=crop', NULL, NULL, 0, '넉넉한 단체석 · 주차 가능'),
('store-2', '화덕 피자 하우스', '양식', 20, 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&h=450&fit=crop', NULL, NULL, 0, '프라이빗 룸 완비'),
('store-3', '스시 오마카세', '일식', 12, 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=450&fit=crop', NULL, NULL, 0, '정통 일식 오마카세');

INSERT INTO menu (storeId, menuId, name, price, category, isRequired, imageUrl) VALUES
('store-1', 'menu-1-1', '김치찌개', 9000, '찌개', 0, NULL),
('store-1', 'menu-1-2', '된장찌개', 8000, '찌개', 0, NULL),
('store-1', 'menu-1-3', '불고기', 15000, '메인', 0, NULL),
('store-1', 'menu-1-4', '잡채', 12000, '메인', 0, NULL),
('store-1', 'menu-1-5', '공기밥', 1000, '사이드', 1, NULL),
('store-1', 'menu-1-6', '계란말이', 7000, '사이드', 0, NULL),
('store-2', 'menu-2-1', '마르게리타 피자', 18000, '피자', 0, NULL),
('store-2', 'menu-2-2', '페퍼로니 피자', 20000, '피자', 0, NULL),
('store-2', 'menu-2-3', '고르곤졸라 피자', 22000, '피자', 0, NULL),
('store-2', 'menu-2-4', '시저 샐러드', 12000, '사이드', 0, NULL),
('store-2', 'menu-2-5', '콜라', 3000, '음료', 0, NULL),
('store-3', 'menu-3-1', '런치 오마카세', 45000, '코스', 0, NULL),
('store-3', 'menu-3-2', '디너 오마카세', 80000, '코스', 0, NULL),
('store-3', 'menu-3-3', '사케', 12000, '음료', 0, NULL);

INSERT INTO rule (storeId, minHeadcount, maxHeadcount, minOrderAmount) VALUES
('store-1', 1, 5, 50000),
('store-1', 6, 15, 100000),
('store-1', 16, 30, 200000),
('store-2', 1, 4, 40000),
('store-2', 5, 10, 80000),
('store-2', 11, 20, 150000),
('store-3', 1, 4, 100000),
('store-3', 5, 12, 200000);
