-- ============================================================
-- 2026-03-15  qs_final_draw에 최종 확정 시각 컬럼 추가
-- 목적: 관리자가 룰렛 추첨 후 "최종 확정" 버튼 클릭 시 확정 시각 기록
-- ============================================================

ALTER TABLE qs_final_draw
  ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

COMMENT ON COLUMN qs_final_draw.confirmed_at IS
  '최종 선정 확정 시각 — 관리자가 "이 문제로 최종 확정" 버튼 클릭 시 기록';

-- ============================================================
-- qs_v_candidate_progress 뷰 재생성
-- CREATE OR REPLACE VIEW 는 컬럼 순서 중간 삽입을 허용하지 않으므로
-- DROP → CREATE 방식으로 교체합니다.
-- ============================================================
DROP VIEW IF EXISTS qs_v_candidate_progress;

CREATE VIEW qs_v_candidate_progress AS
SELECT
  ct.candidate_id,
  ct.candidate_name,
  ct.team,
  ct.current_stage,
  ct.period_id,
  -- 2차 출제 배정 정보
  r2.stock_transfer    AS r2_stock_transfer,
  r2.nominee_stock     AS r2_nominee_stock,
  r2.temporary_payment AS r2_temporary_payment,
  r2.assigned_at       AS r2_assigned_at,
  -- 최종 추첨 결과
  fd.selected_category,
  fd.selected_question_id,
  fd.selected_at       AS draw_at,
  -- 인증 결과
  cr.final_avg_score,
  cr.total_score,
  cr.pass_status,
  cr.certificate_number,
  -- 각 단계 데이터 (JSONB)
  ct.stage1_data,
  ct.stage2_data,
  ct.stage3_data,
  ct.stage4_data,
  ct.stage5_data,
  ct.stage6_data,
  ct.stage7_data,
  ct.stage8_data,
  -- 타임스탬프
  ct.created_at,
  ct.updated_at,
  fd.confirmed_at      AS draw_confirmed_at
FROM qs_candidate_tracker ct
LEFT JOIN qs_round2_assignments r2
  ON ct.period_id = r2.period_id AND ct.candidate_id = r2.candidate_id
LEFT JOIN qs_final_draw fd
  ON ct.period_id = fd.period_id AND ct.candidate_id = fd.candidate_id
LEFT JOIN qs_certification_results cr
  ON ct.period_id = cr.period_id AND ct.candidate_id = cr.candidate_id;

COMMENT ON VIEW qs_v_candidate_progress IS
  '피평가자 전체 진행 현황 요약 뷰 (추적 + 배정 + 추첨 + 인증결과 + confirmed_at 포함)';

-- RLS: anon 접근 허용 (뷰는 베이스 테이블의 RLS를 따르므로 별도 정책 불필요)
-- 단, 뷰에 SELECT 권한이 필요한 경우 아래 주석 해제:
-- GRANT SELECT ON qs_v_candidate_progress TO anon;
