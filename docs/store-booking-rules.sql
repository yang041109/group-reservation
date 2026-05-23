-- 가게별 예약 규칙 두 가지
-- 1) allowSameDayBooking : 당일 예약 허용 여부 (기본 0 = 불가)
-- 2) closedWeekdaysJson  : 매주 항상 휴무인 요일 배열. 예: ["sun","mon"]
--                          기존 weeklyHoursJson 과 별개로 동작 (이쪽이 단순 휴무 토글용).
-- 코드가 자동으로 컬럼을 추가하려고 시도하지만, ALTER 권한이 없거나 자동 실행이 실패한 경우 수동으로 적용.
ALTER TABLE store
  ADD COLUMN allowSameDayBooking TINYINT(1) NOT NULL DEFAULT 0
    COMMENT '1이면 당일 예약 허용',
  ADD COLUMN closedWeekdaysJson JSON NULL
    COMMENT '["sun","mon"] 형태. 해당 요일은 항상 휴무로 처리.';
