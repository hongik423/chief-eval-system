-- ═══════════════════════════════════════════════════════════════
-- 변경일: 2026-03-15
-- 변경내용:
--   1) 평가위원 추가  : 강지훈 (id = 'kjh', 초기 비밀번호 = 'kjh')
--   2) 응시자(피평가자) 제거 : 김민경 (id = 'kmk') — 이번 인증 대상 제외
-- 적용 대상: Supabase 운영 DB (이미 schema.sql로 초기화된 환경)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- ────────────────────────────────────────────────────────────────
-- 1. 평가위원 추가: 강지훈
--    초기 비밀번호 'kjh' bcrypt 해시 (cost=10)
-- ────────────────────────────────────────────────────────────────
INSERT INTO chief_evaluators (id, name, role, team, email, password_hash)
VALUES (
  'kjh',
  '강지훈',
  '평가위원',
  '미정',
  null,
  '$2b$10$0VYQbiEu9SIoe6NSk483aO23AkV3ZASRZ4DSaM3huOMo1DVi9Ygz.'
)
ON CONFLICT (id) DO NOTHING;  -- 이미 존재하면 skip


-- ────────────────────────────────────────────────────────────────
-- 2. 강지훈 × 기존 응시자 3명 평가 세션 자동 생성
--    (소속팀이 응시자와 동일하면 is_excluded = true)
-- ────────────────────────────────────────────────────────────────
INSERT INTO chief_evaluation_sessions (period_id, evaluator_id, candidate_id, is_excluded)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  'kjh',
  ca.id,
  CASE WHEN '미정' = ca.team AND ca.team != '대표' THEN true ELSE false END
FROM chief_candidates ca
WHERE ca.period_id = 'a0000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;


-- ────────────────────────────────────────────────────────────────
-- 3. 응시자(피평가자) 제거: 김민경 (kmk)
--
--    chief_evaluation_scores  → session_id ON DELETE CASCADE
--                                (세션 삭제 시 자동 삭제됨)
--    chief_evaluation_sessions → 직접 삭제
--    chief_bonus_scores        → 직접 삭제
--    chief_candidates          → 본체 삭제
-- ────────────────────────────────────────────────────────────────

-- 3-1. 평가 세션 삭제 (chief_evaluation_scores는 CASCADE로 자동 삭제)
DELETE FROM chief_evaluation_sessions
WHERE candidate_id = 'kmk'
  AND period_id = 'a0000000-0000-0000-0000-000000000001';

-- 3-2. 가점 레코드 삭제
DELETE FROM chief_bonus_scores
WHERE candidate_id = 'kmk'
  AND period_id = 'a0000000-0000-0000-0000-000000000001';

-- 3-3. 응시자 본체 삭제
DELETE FROM chief_candidates
WHERE id = 'kmk'
  AND period_id = 'a0000000-0000-0000-0000-000000000001';


COMMIT;

-- ────────────────────────────────────────────────────────────────
-- 실행 후 확인 쿼리 (주석 해제하여 사용)
-- ────────────────────────────────────────────────────────────────
-- SELECT id, name, role, team FROM chief_evaluators ORDER BY name;
-- SELECT id, name, team FROM chief_candidates WHERE period_id = 'a0000000-0000-0000-0000-000000000001';
-- SELECT evaluator_id, candidate_id, is_excluded
--   FROM chief_evaluation_sessions
--   WHERE period_id = 'a0000000-0000-0000-0000-000000000001'
--     AND evaluator_id = 'kjh';
