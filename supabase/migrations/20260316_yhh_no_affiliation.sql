-- ═══════════════════════════════════════════════════════════════
-- 변경일: 2026-03-16
-- 변경내용: 양현호(yhh) 피평가자 소속 C팀 → 무소속 전환
--   - 무소속 피평가자는 모든 평가위원(권오경 포함)이 평가 가능
-- 적용 대상: Supabase 운영 DB
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- 1. 양현호 피평가자 소속: C팀 → 무소속
UPDATE chief_candidates
SET team = '무소속'
WHERE id = 'yhh'
  AND period_id = 'a0000000-0000-0000-0000-000000000001';

-- 2. 권오경(kok) × 양현호(yhh) 평가 세션 is_excluded 해제
UPDATE chief_evaluation_sessions
SET is_excluded = false
WHERE period_id = 'a0000000-0000-0000-0000-000000000001'
  AND evaluator_id = 'kok'
  AND candidate_id = 'yhh';

-- 3. qs_candidate_tracker 테이블 존재 시 양현호 팀 동기화
UPDATE qs_candidate_tracker
SET team = '무소속'
WHERE candidate_id = 'yhh'
  AND period_id = 'a0000000-0000-0000-0000-000000000001'
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qs_candidate_tracker');

COMMIT;
