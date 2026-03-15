-- ═══════════════════════════════════════════════════════════════
-- 변경일: 2026-03-15
-- 변경내용:
--   1) 강지훈(kjh) 평가위원 소속: '미정' → '임원실'
--   2) 양현호(yhh) 피평가자 소속: '월드클래스코리아' → 'C팀' (권오경과 동일, 평가 제외)
-- 적용 대상: Supabase 운영 DB
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- 1. 강지훈 평가위원 소속 업데이트
UPDATE chief_evaluators
SET team = '임원실'
WHERE id = 'kjh';

-- 2. 양현호 피평가자 소속 업데이트 (권오경 C팀과 동일 → 동일팀 제외 적용)
UPDATE chief_candidates
SET team = 'C팀'
WHERE id = 'yhh'
  AND period_id = 'a0000000-0000-0000-0000-000000000001';

-- 3. 권오경(kok) × 양현호(yhh) 평가 세션 is_excluded 설정
UPDATE chief_evaluation_sessions
SET is_excluded = true
WHERE period_id = 'a0000000-0000-0000-0000-000000000001'
  AND evaluator_id = 'kok'
  AND candidate_id = 'yhh';

-- 4. qs_candidate_tracker 테이블 존재 시 양현호 팀 동기화
UPDATE qs_candidate_tracker
SET team = 'C팀'
WHERE candidate_id = 'yhh'
  AND period_id = 'a0000000-0000-0000-0000-000000000001'
  AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qs_candidate_tracker');

COMMIT;
