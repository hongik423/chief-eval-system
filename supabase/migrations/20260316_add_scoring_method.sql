-- 합격·불합격 확정 시 어떤 점수 산정 방식을 사용했는지 이력 관리
-- 'default'  : 소속 평가위원 제외 후 전체 평균
-- 'trimmed'  : 소속 평가위원 제외 → 최고점·최저점 추가 제외 → 나머지 평균

ALTER TABLE chief_candidates
  ADD COLUMN IF NOT EXISTS scoring_method TEXT DEFAULT 'default'
    CHECK (scoring_method IN ('default', 'trimmed'));
