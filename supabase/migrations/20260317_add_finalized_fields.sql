-- 최종평가결과 마감 기능: chief_eval_periods에 마감 상태 컬럼 추가
-- finalized_at : 마감 시각 (NULL이면 미마감)
-- finalized_by : 마감한 관리자 식별자

ALTER TABLE chief_eval_periods
  ADD COLUMN IF NOT EXISTS finalized_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS finalized_by TEXT DEFAULT NULL;
