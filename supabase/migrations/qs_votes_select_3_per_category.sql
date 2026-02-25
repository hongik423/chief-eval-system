-- ================================================================
-- qs_votes 정책 변경: 코치 1인당 영역별 3문제 선택(총 9문제)
-- 기존 INTEGER 컬럼을 INTEGER[] 컬럼으로 변환
-- ================================================================

-- 1) 기존 체크 제약 제거 (중요: 타입 변경 전에 먼저 제거해야 함)
ALTER TABLE qs_votes DROP CONSTRAINT IF EXISTS qs_votes_stock_transfer_check;
ALTER TABLE qs_votes DROP CONSTRAINT IF EXISTS qs_votes_nominee_stock_check;
ALTER TABLE qs_votes DROP CONSTRAINT IF EXISTS qs_votes_temporary_payment_check;

-- 2) 기존 단일 선택값을 배열(1개)로 변환
ALTER TABLE qs_votes
  ALTER COLUMN stock_transfer TYPE INTEGER[] USING ARRAY[stock_transfer],
  ALTER COLUMN nominee_stock TYPE INTEGER[] USING ARRAY[nominee_stock],
  ALTER COLUMN temporary_payment TYPE INTEGER[] USING ARRAY[temporary_payment];

-- 3) 기존 데이터 정규화
--    - 허용 번호만 유지
--    - 중복 제거
--    - 3개 미만이면 허용 목록에서 부족분을 채워 정확히 3개로 보정
UPDATE qs_votes
SET stock_transfer = CASE
  WHEN stock_transfer IS NULL OR cardinality(stock_transfer) = 0 THEN ARRAY[4, 5, 7]
  ELSE (
    WITH cleaned AS (
      SELECT ARRAY(
        SELECT DISTINCT x
        FROM unnest(stock_transfer) AS x
        WHERE x = ANY (ARRAY[4, 5, 7, 9, 12, 16, 19])
        ORDER BY x
      ) AS arr
    )
    SELECT CASE
      WHEN cardinality(arr) >= 3 THEN arr[1:3]
      WHEN cardinality(arr) = 2 THEN arr || ARRAY(
        SELECT v
        FROM unnest(ARRAY[4, 5, 7, 9, 12, 16, 19]) AS v
        WHERE NOT (v = ANY(arr))
        ORDER BY v
        LIMIT 1
      )
      WHEN cardinality(arr) = 1 THEN arr || ARRAY(
        SELECT v
        FROM unnest(ARRAY[4, 5, 7, 9, 12, 16, 19]) AS v
        WHERE NOT (v = ANY(arr))
        ORDER BY v
        LIMIT 2
      )
      ELSE ARRAY[4, 5, 7]
    END
    FROM cleaned
  )
END;

UPDATE qs_votes
SET nominee_stock = CASE
  WHEN nominee_stock IS NULL OR cardinality(nominee_stock) = 0 THEN ARRAY[1, 3, 8]
  ELSE (
    WITH cleaned AS (
      SELECT ARRAY(
        SELECT DISTINCT x
        FROM unnest(nominee_stock) AS x
        WHERE x = ANY (ARRAY[1, 3, 8, 10, 13, 17, 20])
        ORDER BY x
      ) AS arr
    )
    SELECT CASE
      WHEN cardinality(arr) >= 3 THEN arr[1:3]
      WHEN cardinality(arr) = 2 THEN arr || ARRAY(
        SELECT v
        FROM unnest(ARRAY[1, 3, 8, 10, 13, 17, 20]) AS v
        WHERE NOT (v = ANY(arr))
        ORDER BY v
        LIMIT 1
      )
      WHEN cardinality(arr) = 1 THEN arr || ARRAY(
        SELECT v
        FROM unnest(ARRAY[1, 3, 8, 10, 13, 17, 20]) AS v
        WHERE NOT (v = ANY(arr))
        ORDER BY v
        LIMIT 2
      )
      ELSE ARRAY[1, 3, 8]
    END
    FROM cleaned
  )
END;

UPDATE qs_votes
SET temporary_payment = CASE
  WHEN temporary_payment IS NULL OR cardinality(temporary_payment) = 0 THEN ARRAY[2, 6, 11]
  ELSE (
    WITH cleaned AS (
      SELECT ARRAY(
        SELECT DISTINCT x
        FROM unnest(temporary_payment) AS x
        WHERE x = ANY (ARRAY[2, 6, 11, 14, 15, 18, 21])
        ORDER BY x
      ) AS arr
    )
    SELECT CASE
      WHEN cardinality(arr) >= 3 THEN arr[1:3]
      WHEN cardinality(arr) = 2 THEN arr || ARRAY(
        SELECT v
        FROM unnest(ARRAY[2, 6, 11, 14, 15, 18, 21]) AS v
        WHERE NOT (v = ANY(arr))
        ORDER BY v
        LIMIT 1
      )
      WHEN cardinality(arr) = 1 THEN arr || ARRAY(
        SELECT v
        FROM unnest(ARRAY[2, 6, 11, 14, 15, 18, 21]) AS v
        WHERE NOT (v = ANY(arr))
        ORDER BY v
        LIMIT 2
      )
      ELSE ARRAY[2, 6, 11]
    END
    FROM cleaned
  )
END;

-- 4) 새 정책 체크 제약 추가 (각 영역 정확히 3문제, 중복 없이, 허용 번호만 선택)
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
