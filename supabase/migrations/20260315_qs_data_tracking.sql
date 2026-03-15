-- ============================================================
-- 2026-03-15  치프인증 평가 데이터 추적 테이블 확장
-- 목적: localStorage에만 존재하던 2차 출제 배정, 피평가자 단계 추적,
--       4단계 최종 추첨 결과 등을 Supabase에 영구 보관
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. qs_round2_assignments  (2차 출제 – 피평가자별 3문제 배정)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qs_round2_assignments (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id       UUID REFERENCES chief_eval_periods(id) ON DELETE CASCADE,
  candidate_id    TEXT NOT NULL REFERENCES chief_candidates(id),

  -- 분야별 배정 문제 번호 (1~21)
  stock_transfer    INTEGER NOT NULL CHECK (stock_transfer BETWEEN 1 AND 21),
  nominee_stock     INTEGER NOT NULL CHECK (nominee_stock BETWEEN 1 AND 21),
  temporary_payment INTEGER NOT NULL CHECK (temporary_payment BETWEEN 1 AND 21),

  -- 배정 메타데이터
  seed            BIGINT,                -- 랜덤 시드 (재현 가능)
  assigned_by     TEXT DEFAULT 'system',  -- 배정 주체
  assigned_at     TIMESTAMPTZ DEFAULT now(),

  -- 유니크: 기간 + 피평가자 조합당 하나
  UNIQUE (period_id, candidate_id)
);

COMMENT ON TABLE qs_round2_assignments IS '2차 출제: 1차 투표 결과로 확정된 9문제 중 피평가자별 3문제(분야별 1개) 랜덤 배정';

-- ────────────────────────────────────────────────────────────
-- 2. qs_final_draw  (4단계 – 최종 1문제 추첨 결과)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qs_final_draw (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id           UUID REFERENCES chief_eval_periods(id) ON DELETE CASCADE,
  candidate_id        TEXT NOT NULL REFERENCES chief_candidates(id),

  -- 추첨 결과
  selected_category   TEXT NOT NULL CHECK (selected_category IN ('stock_transfer', 'nominee_stock', 'temporary_payment')),
  selected_question_id INTEGER NOT NULL CHECK (selected_question_id BETWEEN 1 AND 21),

  -- 추첨 메타데이터
  seed                BIGINT,                 -- 랜덤 시드 (재현 가능)
  selected_by         TEXT DEFAULT '평가위원회',
  selected_at         TIMESTAMPTZ DEFAULT now(),

  -- 배정된 3문제 전체 (JSONB로 보관)
  all_assigned        JSONB,  -- [{"category":"stock_transfer","questionId":5}, ...]

  UNIQUE (period_id, candidate_id)
);

COMMENT ON TABLE qs_final_draw IS '4단계 최종추첨: 배정된 3문제 중 1문제 랜덤 선정';

-- ────────────────────────────────────────────────────────────
-- 3. qs_candidate_tracker  (피평가자 단계별 진행 상태 추적)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qs_candidate_tracker (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id       UUID REFERENCES chief_eval_periods(id) ON DELETE CASCADE,
  candidate_id    TEXT NOT NULL REFERENCES chief_candidates(id),
  candidate_name  TEXT NOT NULL,
  team            TEXT,

  -- 현재 스테이지 (1~8)
  current_stage   INTEGER DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 8),

  -- 각 단계별 상태 (JSONB)
  stage1_data     JSONB DEFAULT '{"status":"pending"}'::jsonb,  -- 1차 출제
  stage2_data     JSONB DEFAULT '{"status":"pending"}'::jsonb,  -- 2차 출제 배정
  stage3_data     JSONB DEFAULT '{"status":"pending"}'::jsonb,  -- 멘토링
  stage4_data     JSONB DEFAULT '{"status":"pending"}'::jsonb,  -- 최종 추첨
  stage5_data     JSONB DEFAULT '{"status":"pending"}'::jsonb,  -- 인증평가 실시
  stage6_data     JSONB DEFAULT '{"status":"pending"}'::jsonb,  -- 평가위원 협의
  stage7_data     JSONB DEFAULT '{"status":"pending"}'::jsonb,  -- 결과 발표
  stage8_data     JSONB DEFAULT '{"status":"pending"}'::jsonb,  -- 인증서 수여

  -- 감사 추적
  history         JSONB DEFAULT '[]'::jsonb,   -- [{timestamp, action, data}, ...]

  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (period_id, candidate_id)
);

COMMENT ON TABLE qs_candidate_tracker IS '피평가자 단계별 진행 상태 추적 (8단계 워크플로우 전체)';

-- ────────────────────────────────────────────────────────────
-- 4. qs_mentoring_sessions  (3단계 – 멘토링 세션 기록)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qs_mentoring_sessions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id       UUID REFERENCES chief_eval_periods(id) ON DELETE CASCADE,
  candidate_id    TEXT NOT NULL REFERENCES chief_candidates(id),

  mentor_id       TEXT REFERENCES chief_evaluators(id),
  mentor_name     TEXT,
  session_date    DATE,
  duration_min    INTEGER,
  notes           TEXT,

  created_at      TIMESTAMPTZ DEFAULT now()
);

COMMENT ON TABLE qs_mentoring_sessions IS '3단계 멘토링: 피평가자별 멘토링 세션 이력';

-- ────────────────────────────────────────────────────────────
-- 5. qs_certification_results  (7~8단계 – 최종 결과 및 인증서)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS qs_certification_results (
  id                  UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  period_id           UUID REFERENCES chief_eval_periods(id) ON DELETE CASCADE,
  candidate_id        TEXT NOT NULL REFERENCES chief_candidates(id),

  -- 최종 점수
  final_avg_score     NUMERIC(5,2),
  bonus_score         NUMERIC(5,2) DEFAULT 0,
  total_score         NUMERIC(5,2),

  -- 합격 여부
  pass_status         TEXT CHECK (pass_status IN ('pass', 'fail', 'pending')) DEFAULT 'pending',
  pass_score          NUMERIC(5,2),  -- 기준 점수 (시점 기록)

  -- 평가위원 협의 (6단계)
  consensus_notes     TEXT,
  decided_at          TIMESTAMPTZ,
  decided_by          TEXT,

  -- 결과 발표 (7단계)
  announced_at        TIMESTAMPTZ,
  feedback            TEXT,

  -- 인증서 (8단계)
  certificate_number  TEXT,
  certificate_issued_at TIMESTAMPTZ,
  ceremony_date       DATE,

  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now(),

  UNIQUE (period_id, candidate_id)
);

COMMENT ON TABLE qs_certification_results IS '최종 인증 결과: 합격/불합격, 인증서 발급 정보';


-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_qs_round2_period      ON qs_round2_assignments(period_id);
CREATE INDEX IF NOT EXISTS idx_qs_round2_candidate    ON qs_round2_assignments(candidate_id);
CREATE INDEX IF NOT EXISTS idx_qs_draw_period         ON qs_final_draw(period_id);
CREATE INDEX IF NOT EXISTS idx_qs_draw_candidate      ON qs_final_draw(candidate_id);
CREATE INDEX IF NOT EXISTS idx_qs_tracker_period      ON qs_candidate_tracker(period_id);
CREATE INDEX IF NOT EXISTS idx_qs_tracker_candidate   ON qs_candidate_tracker(candidate_id);
CREATE INDEX IF NOT EXISTS idx_qs_tracker_stage       ON qs_candidate_tracker(current_stage);
CREATE INDEX IF NOT EXISTS idx_qs_mentoring_candidate ON qs_mentoring_sessions(candidate_id);
CREATE INDEX IF NOT EXISTS idx_qs_cert_period         ON qs_certification_results(period_id);
CREATE INDEX IF NOT EXISTS idx_qs_cert_candidate      ON qs_certification_results(candidate_id);
CREATE INDEX IF NOT EXISTS idx_qs_cert_status         ON qs_certification_results(pass_status);


-- ============================================================
-- RLS (Row Level Security) – 기존 패턴과 동일하게 anon 허용
-- ============================================================
ALTER TABLE qs_round2_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE qs_final_draw           ENABLE ROW LEVEL SECURITY;
ALTER TABLE qs_candidate_tracker    ENABLE ROW LEVEL SECURITY;
ALTER TABLE qs_mentoring_sessions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE qs_certification_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon full access" ON qs_round2_assignments   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON qs_final_draw           FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON qs_candidate_tracker    FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON qs_mentoring_sessions   FOR ALL TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon full access" ON qs_certification_results FOR ALL TO anon USING (true) WITH CHECK (true);


-- ============================================================
-- updated_at 트리거 함수 생성
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON qs_candidate_tracker
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();

CREATE TRIGGER set_updated_at BEFORE UPDATE ON qs_certification_results
  FOR EACH ROW EXECUTE FUNCTION trigger_set_timestamp();


-- ============================================================
-- 감사 로그 트리거: qs_final_draw 변경 추적
-- ============================================================
CREATE OR REPLACE FUNCTION log_qs_final_draw_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO chief_audit_log (table_name, record_id, action, new_data, performed_at)
    VALUES ('qs_final_draw', NEW.id::text, 'INSERT', row_to_json(NEW)::jsonb, now());
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO chief_audit_log (table_name, record_id, action, old_data, new_data, performed_at)
    VALUES ('qs_final_draw', NEW.id::text, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb, now());
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO chief_audit_log (table_name, record_id, action, old_data, performed_at)
    VALUES ('qs_final_draw', OLD.id::text, 'DELETE', row_to_json(OLD)::jsonb, now());
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_qs_final_draw
  AFTER INSERT OR UPDATE OR DELETE ON qs_final_draw
  FOR EACH ROW EXECUTE FUNCTION log_qs_final_draw_changes();


-- ============================================================
-- 뷰: 피평가자 전체 현황 요약
-- ============================================================
CREATE OR REPLACE VIEW qs_v_candidate_progress AS
SELECT
  ct.candidate_id,
  ct.candidate_name,
  ct.team,
  ct.current_stage,
  ct.period_id,
  -- 2차 출제 배정 정보
  r2.stock_transfer   AS r2_stock_transfer,
  r2.nominee_stock    AS r2_nominee_stock,
  r2.temporary_payment AS r2_temporary_payment,
  r2.assigned_at      AS r2_assigned_at,
  -- 최종 추첨 결과
  fd.selected_category,
  fd.selected_question_id,
  fd.selected_at      AS draw_at,
  -- 인증 결과
  cr.final_avg_score,
  cr.total_score,
  cr.pass_status,
  cr.certificate_number,
  -- 타임스탬프
  ct.created_at,
  ct.updated_at
FROM qs_candidate_tracker ct
LEFT JOIN qs_round2_assignments r2
  ON ct.period_id = r2.period_id AND ct.candidate_id = r2.candidate_id
LEFT JOIN qs_final_draw fd
  ON ct.period_id = fd.period_id AND ct.candidate_id = fd.candidate_id
LEFT JOIN qs_certification_results cr
  ON ct.period_id = cr.period_id AND ct.candidate_id = cr.candidate_id;

COMMENT ON VIEW qs_v_candidate_progress IS '피평가자 전체 진행 현황 요약 뷰 (추적 + 배정 + 추첨 + 인증결과 조인)';


-- ============================================================
-- 초기 데이터 삽입 (현재 3명 피평가자)
-- ============================================================
INSERT INTO qs_candidate_tracker (period_id, candidate_id, candidate_name, team, current_stage, stage1_data, stage2_data)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'kcg', '김창곤', '컨설팅6본부', 2,
   '{"status":"completed","completedAt":"2026-02-26T00:00:00Z"}'::jsonb,
   '{"status":"pending"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000001', 'bjy', '백진영', '미정', 2,
   '{"status":"completed","completedAt":"2026-02-26T00:00:00Z"}'::jsonb,
   '{"status":"pending"}'::jsonb),
  ('a0000000-0000-0000-0000-000000000001', 'yhh', '양현호', '월드클래스코리아', 2,
   '{"status":"completed","completedAt":"2026-02-26T00:00:00Z"}'::jsonb,
   '{"status":"pending"}'::jsonb)
ON CONFLICT (period_id, candidate_id) DO NOTHING;
