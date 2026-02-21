-- ═══════════════════════════════════════════════════════════════
-- 아카이브 테이블 - 초기화 전 해당 기간 데이터 보관
-- 초기화 시 현재 기간 데이터를 아카이브에 복사 후 삭제
-- ═══════════════════════════════════════════════════════════════

-- 1) 아카이브 메타 (보관 시점 정보)
CREATE TABLE IF NOT EXISTS chief_archive_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES chief_eval_periods(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);
CREATE INDEX IF NOT EXISTS idx_chief_archive_meta_period ON chief_archive_meta(period_id);
CREATE INDEX IF NOT EXISTS idx_chief_archive_meta_at ON chief_archive_meta(archived_at DESC);

-- 2) 세션 아카이브 (평가위원×응시자별 세션 스냅샷)
CREATE TABLE IF NOT EXISTS chief_evaluation_sessions_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id UUID NOT NULL REFERENCES chief_archive_meta(id) ON DELETE CASCADE,
  original_session_id UUID,
  period_id UUID NOT NULL,
  evaluator_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  is_excluded BOOLEAN DEFAULT false,
  total_score INTEGER,
  comments TEXT,
  comments_section JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_chief_sessions_archive_archive ON chief_evaluation_sessions_archive(archive_id);
CREATE INDEX IF NOT EXISTS idx_chief_sessions_archive_session ON chief_evaluation_sessions_archive(original_session_id);

-- 3) 점수 아카이브 (항목별 점수)
CREATE TABLE IF NOT EXISTS chief_evaluation_scores_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id UUID NOT NULL REFERENCES chief_archive_meta(id) ON DELETE CASCADE,
  session_archive_id UUID NOT NULL REFERENCES chief_evaluation_sessions_archive(id) ON DELETE CASCADE,
  criteria_item_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0)
);
CREATE INDEX IF NOT EXISTS idx_chief_scores_archive_session ON chief_evaluation_scores_archive(session_archive_id);

-- 4) 가점 아카이브
CREATE TABLE IF NOT EXISTS chief_bonus_scores_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id UUID NOT NULL REFERENCES chief_archive_meta(id) ON DELETE CASCADE,
  period_id UUID NOT NULL,
  candidate_id TEXT NOT NULL,
  score NUMERIC(4,1) NOT NULL DEFAULT 0,
  coach_id TEXT
);
CREATE INDEX IF NOT EXISTS idx_chief_bonus_archive_archive ON chief_bonus_scores_archive(archive_id);

-- RLS
ALTER TABLE chief_archive_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_evaluation_sessions_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_evaluation_scores_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_bonus_scores_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chief_anon_archive_meta" ON chief_archive_meta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_sessions_archive" ON chief_evaluation_sessions_archive FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_scores_archive" ON chief_evaluation_scores_archive FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_bonus_archive" ON chief_bonus_scores_archive FOR ALL USING (true) WITH CHECK (true);
