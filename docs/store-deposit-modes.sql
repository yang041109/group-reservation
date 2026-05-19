-- 예약금 방식 (depositUseTiers 컬럼 값)
-- 0 = 단순 고정 (depositAmount)
-- 1 = 구간별 (depositTiersJson, 구간마다 calcType: fixed | per_person)
-- 2 = 인당 (depositAmount × 예약 인원)

-- 기존 컬럼 그대로 사용. depositUseTiers 가 BOOLEAN 이면 0/1만 쓰이므로 TINYINT 로 두는 것을 권장합니다.
