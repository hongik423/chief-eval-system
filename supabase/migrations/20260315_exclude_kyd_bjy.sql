-- ═══════════════════════════════════════════════════════════════
-- 변경일: 2026-03-15
-- 변경내용: 권영도(kyd) 평가위원 → 백진영(bjy) 피평가자 평가 제외 (동일 소속)
-- 적용 대상: Supabase 운영 DB
-- ═══════════════════════════════════════════════════════════════

BEGIN;

UPDATE chief_evaluation_sessions
SET is_excluded = true
WHERE period_id = 'a0000000-0000-0000-0000-000000000001'
  AND evaluator_id = 'kyd'
  AND candidate_id = 'bjy';

COMMIT;
