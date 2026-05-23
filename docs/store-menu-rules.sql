-- 가게별 메뉴/예약금 부가 규칙 3가지
-- 1) menuNoticeText                : 메뉴 위에 띄울 안내 문구 (예: "전 인원 동일 메뉴 주문 부탁드립니다")
-- 2) depositActiveMonthRangesJson  : [{"start":"03-01","end":"09-30"}] 형태.
--                                    비어있거나 NULL이면 연중 예약금 적용.
--                                    범위 안에 드는 날짜에만 예약금이 부과된다.
-- 3) menuRequiredPeoplePerItem     : N명당 메뉴 1개 강제. NULL이면 제한 없음.
--                                    예: 2 → 40명 예약 시 메뉴 20개 이상 필요.
-- 코드가 자동으로 컬럼을 추가하려고 시도하지만, ALTER 권한이 없거나 자동 실행이 실패한 경우 수동으로 적용.
ALTER TABLE store
  ADD COLUMN menuNoticeText TEXT NULL
    COMMENT '메뉴 관련 안내 문구 (예: 전 인원 동일 메뉴)',
  ADD COLUMN depositActiveMonthRangesJson JSON NULL
    COMMENT '예약금 적용 기간 [{"start":"MM-DD","end":"MM-DD"}]; NULL 또는 빈 배열 = 연중 적용',
  ADD COLUMN menuRequiredPeoplePerItem INT NULL
    COMMENT 'N명당 메뉴 1개 강제; NULL = 제한 없음';
