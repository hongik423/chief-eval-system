-- ================================================================
-- qs_votes 정책 변경: 코치 1인당 영역별 3문제 선택(총 9문제)
-- 기존 INTEGER 컬럼을 INTEGER[] 컬럼으로 변환
-- ================================================================

-- 1) 기존 단일 선택값을 배열(1개)로 변환
ALTER TABLE qs_votes
  ALTER COLUMN stock_transfer TYPE INTEGER[] USING ARRAY[stock_transfer],
  ALTER COLUMN nominee_stock TYPE INTEGER[] USING ARRAY[nominee_stock],
  ALTER COLUMN temporary_payment TYPE INTEGER[] USING ARRAY[temporary_payment];

-- 2) 기존 체크 제약 제거
ALTER TABLE qs_votes DROP CONSTRAINT IF EXISTS qs_votes_stock_transfer_check;
ALTER TABLE qs_votes DROP CONSTRAINT IF EXISTS qs_votes_nominee_stock_check;
ALTER TABLE qs_votes DROP CONSTRAINT IF EXISTS qs_votes_temporary_payment_check;

-- 3) 기존 데이터가 길이 1 배열인 경우, 운영 정책(길이 3)을 위해 임시로 첫값을 3개 복제
--    이후 코치 재선택(재투표) 시 정상 3개 서로 다른 값으로 갱신 가능
UPDATE qs_votes
SET
  stock_transfer = ARRAY[stock_transfer[1], stock_transfer[1], stock_transfer[1]],
  nominee_stock = ARRAY[nominee_stock[1], nominee_stock[1], nominee_stock[1]],
  temporary_payment = ARRAY[temporary_payment[1], temporary_payment[1], temporary_payment[1]]
WHERE
  cardinality(stock_transfer) = 1
  OR cardinality(nominee_stock) = 1
  OR cardinality(temporary_payment) = 1;

-- 4) 새 정책 체크 제약 추가 (각 영역 정확히 3문제, 허용 번호만 선택)
ALTER TABLE qs_votes
  ADD CONSTRAINT qs_votes_stock_transfer_check
  CHECK (
    cardinality(stock_transfer) = 3
    AND stock_transfer[1] <> stock_transfer[2]
    AND stock_transfer[1] <> stock_transfer[3]
    AND stock_transfer[2] <> stock_transfer[3]
    AND stock_transfer <@ ARRAY[4, 5, 7, 9, 12, 16, 19]::INTEGER[]
  );

ALTER TABLE qs_votes
  ADD CONSTRAINT qs_votes_nominee_stock_check
  CHECK (
    cardinality(nominee_stock) = 3
    AND nominee_stock[1] <> nominee_stock[2]
    AND nominee_stock[1] <> nominee_stock[3]
    AND nominee_stock[2] <> nominee_stock[3]
    AND nominee_stock <@ ARRAY[1, 3, 8, 10, 13, 17, 20]::INTEGER[]
  );

ALTER TABLE qs_votes
  ADD CONSTRAINT qs_votes_temporary_payment_check
  CHECK (
    cardinality(temporary_payment) = 3
    AND temporary_payment[1] <> temporary_payment[2]
    AND temporary_payment[1] <> temporary_payment[3]
    AND temporary_payment[2] <> temporary_payment[3]
    AND temporary_payment <@ ARRAY[2, 6, 11, 14, 15, 18, 21]::INTEGER[]
  );
