-- ================================================================
-- 문제 선정 투표 테이블 - qs_votes
-- 치프인증 TEST 케이스 문제 선정 시스템
-- ================================================================

CREATE TABLE IF NOT EXISTS qs_votes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluator_id     TEXT NOT NULL UNIQUE,       -- 평가위원 고유 ID (1인 1투표)
  evaluator_name   TEXT NOT NULL,              -- 평가위원 이름
  stock_transfer   INTEGER NOT NULL            -- 주식 이동 분야 선택 문제 번호 (1~7)
    CHECK (stock_transfer BETWEEN 1 AND 7),
  nominee_stock    INTEGER NOT NULL            -- 차명 주식 분야 선택 문제 번호 (8~14)
    CHECK (nominee_stock BETWEEN 8 AND 14),
  temporary_payment INTEGER NOT NULL           -- 가지급금 분야 선택 문제 번호 (15~21)
    CHECK (temporary_payment BETWEEN 15 AND 21),
  voted_at         TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_qs_votes_evaluator ON qs_votes(evaluator_id);

-- RLS 활성화 및 익명 접근 허용 (기존 chief_ 테이블과 동일한 정책)
ALTER TABLE qs_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "qs_anon_votes" ON qs_votes FOR ALL USING (true) WITH CHECK (true);
