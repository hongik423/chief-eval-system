-- ============================================================
-- 2026-03-15  랜덤 배정 실행 로그 테이블
-- 목적: 2차 출제 랜덤 배정 실행 이력 추적 (단계별 실행 데이터)
-- ============================================================

CREATE TABLE IF NOT EXISTS qs_assignment_execution_log (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id       UUID NOT NULL,
  step            TEXT NOT NULL,  -- 'assign', 'confirm', etc.
  executed_by     TEXT DEFAULT 'system',
  executed_at     TIMESTAMPTZ DEFAULT now(),
  assignments_snapshot JSONB,     -- 피평가자별 출제 문제 번호
  metadata        JSONB DEFAULT '{}'::jsonb
);

COMMENT ON TABLE qs_assignment_execution_log IS '2차 출제 랜덤 배정 실행 이력 추적';

CREATE INDEX IF NOT EXISTS idx_qs_exec_log_period ON qs_assignment_execution_log(period_id);
CREATE INDEX IF NOT EXISTS idx_qs_exec_log_time ON qs_assignment_execution_log(executed_at DESC);

ALTER TABLE qs_assignment_execution_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow anon full access" ON qs_assignment_execution_log
  FOR ALL TO anon USING (true) WITH CHECK (true);
