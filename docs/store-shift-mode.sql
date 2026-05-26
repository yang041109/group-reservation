-- 가게별 교대제(부제) 운영 옵션
-- shiftStartTimesJson         : 허용되는 시작 시각 목록. 예: ["18:00","21:00"]
-- shiftActiveMonthRangesJson  : 적용 기간(연중 반복). 예: [{"start":"03-01","end":"03-31"}]
--                               비어있으면 미적용(=자유 예약).
-- 코드가 자동으로 컬럼을 추가하려고 시도하지만, ALTER 권한이 없거나 자동 실행이 실패한 경우 수동으로 적용.
-- 컬럼 한 줄씩 분리해서 ADD — 한쪽이 이미 있어도 다른 쪽은 추가되도록.

ALTER TABLE store
  ADD COLUMN shiftStartTimesJson JSON NULL
    COMMENT '교대제 시작 시각 ["18:00","21:00"]';

ALTER TABLE store
  ADD COLUMN shiftActiveMonthRangesJson JSON NULL
    COMMENT '교대제 적용 기간 [{"start":"MM-DD","end":"MM-DD"}]';
