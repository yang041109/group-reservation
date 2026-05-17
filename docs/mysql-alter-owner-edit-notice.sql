-- 사장님이 예약을 직접 수정한 경우 사용자에게 보여줄 안내 메시지 컬럼 추가
-- (한 번만 실행)
ALTER TABLE reservation
  ADD COLUMN ownerEditNotice VARCHAR(500) NULL
  COMMENT '사장님이 시간/인원을 변경한 경우 사용자 예약 조회 화면에 보여줄 안내'
  AFTER ownerRejectReason;
