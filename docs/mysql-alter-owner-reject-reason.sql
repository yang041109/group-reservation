-- 기존 DB에 사장님 거절 사유 컬럼 추가 (한 번만 실행)
ALTER TABLE reservation
  ADD COLUMN ownerRejectReason VARCHAR(500) NULL
  COMMENT '사장님 거절 시 예약자에게 전달되는 사유'
  AFTER depositAmount;
