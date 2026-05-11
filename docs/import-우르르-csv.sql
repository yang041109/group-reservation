-- 자동 생성: 우르르 CSV(Downloads) → MySQL INSERT
-- 순서: store → menu → rule → reservation
--
-- 참고:
-- · 시트의 slotEndHour 2.5 → 컬럼 타입 INT에 맞게 2로 저장했습니다.
-- · 예약 행에서 depositAmount가 비어 있던 경우 0으로 넣었습니다.
-- · createdAt은 ISO8601(Z)에서 MySQL DATETIME 형태로 잘랐습니다.
-- · 빈 DB에 넣거나, 충돌 시 기존 행 삭제 후 실행하세요.
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------- store ----------
INSERT INTO store (storeId, name, category, maxCapacity, imageUrl, slotStartHour, slotEndHour, depositAmount, description, adminAccessToken, sortOrder) VALUES
('store-1','주점A','호프',100,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcRgGKGwMBdvT0kwHTYGC0jEynLjdByGH_g11A&s',17,2,100000,'왕십리 대표 술집','adm_urr_imp_01',10),
('store-2','주점B','호프',100,'https://i.namu.wiki/i/XD9-yTQUqhLrYUr7Q-VaMZhXuWefW9X2c_Zi7mBorfVp-jjKZsbIwCu05CwPjO7FDKdqopcH-lRjSSilr0Z-0w.webp',17,2,200000,'왕십리 대표 술집','adm_urr_imp_02',20),
('store-3','주점C','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w802',17,2,300000,'왕십리 대표 술집','adm_urr_imp_03',30),
('store-4','주점D','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w803',17,2,0,'왕십리 대표 술집','adm_urr_imp_04',40),
('store-5','주점E','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w804',17,2,0,'왕십리 대표 술집','adm_urr_imp_05',50),
('store-6','주점F','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w805',17,2,0,'왕십리 대표 술집','adm_urr_imp_06',60),
('store-7','주점G','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w806',17,2,0,'왕십리 대표 술집','adm_urr_imp_07',70),
('store-8','주점F','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w807',17,2,0,'왕십리 대표 술집','adm_urr_imp_08',80),
('store-9','주점G','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w808',17,2,0,'왕십리 대표 술집','adm_urr_imp_09',90),
('store-10','주점H','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w809',17,2,0,'왕십리 대표 술집','adm_urr_imp_10',100),
('store-11','주점I','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w810',17,2,0,'왕십리 대표 술집','adm_urr_imp_11',110),
('store-12','주점J','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w811',17,2,0,'왕십리 대표 술집','adm_urr_imp_12',120),
('store-13','주점K','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w812',17,2,0,'왕십리 대표 술집','adm_urr_imp_13',130),
('store-14','주점L','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w813',17,2,0,'왕십리 대표 술집','adm_urr_imp_14',140),
('store-15','주점M','호프',100,'https://mblogthumb-phinf.pstatic.net/MjAyMjAzMDFfOTkg/MDAxNjQ2MTIwMDAzNjA1.CCRSnmXbSzHp3mTq1EduJX-QHTAsky2I8ozaIdN0K5Yg.RrEF-oeb14Som4kAjD1EvDhUXhR5kRzrI2jq5fNtvM4g.JPEG.sielle83/SE-15067b2c-97e6-4423-a6fb-a89d3119c42c.jpg?type=w814',17,2,0,'왕십리 대표 술집','adm_urr_imp_15',150);

-- ---------- menu ----------
INSERT INTO menu (storeId, menuId, name, price, category, isRequired, imageUrl) VALUES
('store-1','menu-1-1','돼지김치찌개',14900,'찌개류',0,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv917m42063IcxbTjKf2u0fxfy_BvEQLrzdA&s'),
('store-1','menu-1-2','부대찌개',15900,'찌개류',0,'https://i.namu.wiki/i/Ni7XpClHeRIcHn31TU5uanomCAmT0YcgV3GuOUGNdW1Td6UpW79EzpSCI7aW2NvzaZHAEIzKvGijmPPluC4qIw.webp'),
('store-1','menu-1-3','순대술국',16900,'찌개류',0,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIyFx3RpZ_TbZHqLHFsGuTwLE3mZI4__B6Dg&s'),
('store-1','menu-1-4','오뎅탕',14900,'찌개류',0,NULL),
('store-1','menu-1-5','제육볶음',14900,'볶음류',0,NULL),
('store-1','menu-1-6','모둠소세지',14900,'볶음류',0,NULL),
('store-2','menu-2-1','돼지김치찌개',14900,'찌개류',0,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSv917m42063IcxbTjKf2u0fxfy_BvEQLrzdA&s'),
('store-2','menu-2-2','부대찌개',15900,'찌개류',0,'https://i.namu.wiki/i/Ni7XpClHeRIcHn31TU5uanomCAmT0YcgV3GuOUGNdW1Td6UpW79EzpSCI7aW2NvzaZHAEIzKvGijmPPluC4qIw.webp'),
('store-2','menu-2-3','순대술국',16900,'찌개류',0,'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQIyFx3RpZ_TbZHqLHFsGuTwLE3mZI4__B6Dg&s'),
('store-2','menu-2-4','오뎅탕',14900,'찌개류',0,NULL),
('store-2','menu-2-5','제육볶음',14900,'볶음류',0,NULL),
('store-2','menu-2-6','모둠소세지',14900,'볶음류',0,NULL);

-- ---------- rule ----------
INSERT INTO rule (storeId, minHeadcount, maxHeadcount, minOrderAmount) VALUES
('store-1',1,100,0);

-- ---------- reservation ----------
INSERT INTO reservation (reservationId, storeId, userName, groupName, userPhone, userNote, headcount, date, startTime, endTime, menuItems, totalAmount, status, depositAmount, createdAt) VALUES
('RSV1775793453978','store-1','양민주','ㅇㅇ','010-9999-8888','',70,'2026-04-13','17:00','18:30','[{"menuId":"menu-1-1","quantity":1}]',14900,'CONFIRMED',0,'2026-04-10 03:57:35'),
('RSV1777638106185','store-1','송유현','창동','010-0000-0000','맛도리 주세ㅛㅇ',20,'2026-04-29','21:30','22:00','[{"menuId":"menu-1-3","quantity":15},{"menuId":"menu-1-1","quantity":3},{"menuId":"menu-1-2","quantity":5}]',377700,'CONFIRMED',0,'2026-05-01 12:21:47'),
('RSV1777791862736','store-4','홍길동','동아리 회식','010-1234-5678','',20,'2026-05-06','18:00','19:30','[]',0,'PENDING',0,'2026-05-03 07:04:24'),
('RSV1777805710364','store-1','김한양','총동','010-0000-0000','맛있게 부탁드립니다!',10,'2026-05-04','20:00','21:00','[{"menuId":"menu-1-1","quantity":5},{"menuId":"menu-1-2","quantity":5}]',154000,'DEPOSIT_PENDING',100000,'2026-05-03 10:55:11'),
('RSV1777808046764','store-2','홍길동','동아리 회식','010-1234-5678','',20,'2026-05-05','18:00','19:30','[{"menuId":"menu-2-1","quantity":10}]',149000,'CONFIRMED',200000,'2026-05-03 11:34:07'),
('RSV1777812013994','store-1','홍길동','동아리 회식','010-1234-5678','',20,'2026-05-05','18:00','18:30','[{"menuId":"menu-1-1","quantity":5}]',74500,'CANCELED',100000,'2026-05-03 12:40:15'),
('RSV1777888261536','store-1','양민주','동아리','010-9571-6911','ㅇㅇ',10,'2026-05-06','18:00','19:00','[{"menuId":"menu-1-1","quantity":5}]',74500,'PENDING',100000,'2026-05-04 09:51:02'),
('RSV1777888391647','store-1','dd','dd','010-9999-9999','',1,'2026-05-05','19:30','20:30','[]',0,'DEPOSIT_PENDING',100000,'2026-05-04 09:53:13'),
('RSV1777888681929','store-1','ddd','ddd','010-9571-6911','',10,'2026-05-05','20:00','21:00','[]',0,'PENDING',100000,'2026-05-04 09:58:03'),
('RSV1777888706360','store-1','ddd','ddd','010-9571-6911','',10,'2026-05-05','20:30','21:30','[{"menuId":"menu-1-1","quantity":1}]',14900,'PENDING',100000,'2026-05-04 09:58:28'),
('RSV1777889004096','store-1','dddddd','dd','010-9571-6911','',10,'2026-05-05','20:00','21:00','[]',0,'DEPOSIT_PENDING',100000,'2026-05-04 10:03:26');

SET FOREIGN_KEY_CHECKS = 1;