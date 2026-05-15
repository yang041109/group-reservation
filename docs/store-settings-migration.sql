-- 가게별 단체예약 최소 인원, 예약금 입금 정보, 요일별 영업시간, 지정 휴무일
-- MySQL 8.x

ALTER TABLE store
  ADD COLUMN minGroupHeadcount INT NOT NULL DEFAULT 2 COMMENT '단체예약 최소 인원' AFTER maxCapacity,
  ADD COLUMN ownerName VARCHAR(128) NULL COMMENT '예약금 입금 안내용 사장님 성함' AFTER depositTiersJson,
  ADD COLUMN ownerBankAccount VARCHAR(255) NULL COMMENT '예약금 입금 계좌' AFTER ownerName,
  ADD COLUMN weeklyHoursJson JSON NULL COMMENT '{"mon":{"start":11,"end":20},"tue":{"closed":true},...}' AFTER ownerBankAccount,
  ADD COLUMN closedDatesJson JSON NULL COMMENT '["2026-05-01","2026-12-25"] 지정 휴무일' AFTER weeklyHoursJson;
