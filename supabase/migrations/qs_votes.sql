-- ================================================================
-- 문제 선정 투표 테이블 - qs_votes
-- 치프인증 TEST 케이스 문제 선정 시스템
-- ================================================================

CREATE TABLE IF NOT EXISTS qs_votes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluator_id     TEXT NOT NULL UNIQUE,        -- 평가위원 고유 ID (1인 1투표)
  evaluator_name   TEXT NOT NULL,               -- 평가위원 이름
  stock_transfer   INTEGER NOT NULL,            -- 주식 이동 분야 선택 문제 번호
  nominee_stock    INTEGER NOT NULL,            -- 차명 주식 분야 선택 문제 번호
  temporary_payment INTEGER NOT NULL,           -- 가지급금 분야 선택 문제 번호
  voted_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qs_votes_evaluator ON qs_votes(evaluator_id);

-- ================================================================
-- CHECK 제약 조건 수정
-- 문제 번호가 분야별 1~7 고정이 아닌 PDF 고유번호(1~21) 체계로 변경됨
--   stock_transfer   : questionIds [4,5,7,9,12,16,19]
--   nominee_stock    : questionIds [1,3,8,10,13,17,20]
--   temporary_payment: questionIds [2,6,11,14,15,18,21]
-- 전체 문제 번호 범위 1~21 을 허용하도록 수정
-- ================================================================

-- 기존 잘못된 CHECK 제약 조건 제거
ALTER TABLE qs_votes DROP CONSTRAINT IF EXISTS qs_votes_stock_transfer_check;
ALTER TABLE qs_votes DROP CONSTRAINT IF EXISTS qs_votes_nominee_stock_check;
ALTER TABLE qs_votes DROP CONSTRAINT IF EXISTS qs_votes_temporary_payment_check;

-- 올바른 CHECK 제약 조건 추가 (PDF 고유번호 1~21 허용)
ALTER TABLE qs_votes
  ADD CONSTRAINT qs_votes_stock_transfer_check
  CHECK (stock_transfer BETWEEN 1 AND 21);

ALTER TABLE qs_votes
  ADD CONSTRAINT qs_votes_nominee_stock_check
  CHECK (nominee_stock BETWEEN 1 AND 21);

ALTER TABLE qs_votes
  ADD CONSTRAINT qs_votes_temporary_payment_check
  CHECK (temporary_payment BETWEEN 1 AND 21);

-- RLS 활성화 및 익명 접근 허용
ALTER TABLE qs_votes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "qs_anon_votes" ON qs_votes;
CREATE POLICY "qs_anon_votes" ON qs_votes FOR ALL USING (true) WITH CHECK (true);
