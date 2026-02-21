-- 기간별 평가위원 매핑 테이블 (기간마다 평가위원 추가/삭제 가능)
CREATE TABLE IF NOT EXISTS chief_period_evaluators (
  period_id UUID NOT NULL REFERENCES chief_eval_periods(id) ON DELETE CASCADE,
  evaluator_id TEXT NOT NULL REFERENCES chief_evaluators(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (period_id, evaluator_id)
);

CREATE INDEX IF NOT EXISTS idx_chief_period_evaluators_period ON chief_period_evaluators(period_id);
CREATE INDEX IF NOT EXISTS idx_chief_period_evaluators_evaluator ON chief_period_evaluators(evaluator_id);

COMMENT ON TABLE chief_period_evaluators IS '기간별 평가위원 배정. 비어있으면 해당 기간은 전체 평가위원 사용(하위호환)';
