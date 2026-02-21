-- ═══════════════════════════════════════════════════════════════
-- 기업의별 치프인증 평가 시스템 - Supabase 데이터베이스 스키마
-- 2026년 2기 TEST RED 평가
-- 접두어 chief_ 적용 (aicamp-prod 등 기존 프로젝트와 공존)
-- ═══════════════════════════════════════════════════════════════
--
-- [치프인증 평가 워크플로우]
-- 1. 평가 기간(chief_eval_periods) 생성 → 평가위원/응시자/기준 등록
-- 2. chief_evaluation_sessions: 평가위원×응시자 조합 자동 생성, 동일팀 is_excluded
-- 3. 평가위원 로그인 → chief_evaluation_scores에 항목별 점수 저장
-- 4. 점수 변경 시 chief_audit_log에 자동 기록 (트리거)
-- 5. 평가 완료 시 session.status=completed, total_score 계산
-- 6. 최종점수 = (Σ PM역량 + 가점) ÷ 유효평가위원수, 70점 이상 합격
--
-- [실행 방법]
-- 1. Supabase Dashboard > SQL Editor 에서 이 파일 전체를 복사하여 실행
-- 2. https://supabase.com/dashboard/project/sbdjnrkttrupsqraqndl/sql/new
--
-- [기존 DB에 비밀번호 컬럼만 추가하는 경우]
-- supabase/migrations/add_evaluator_password.sql 실행
-- ═══════════════════════════════════════════════════════════════

-- ─── 기존 테이블 정리 (재실행 시) ───
DROP TABLE IF EXISTS chief_evaluation_scores CASCADE;
DROP TABLE IF EXISTS chief_evaluation_sessions CASCADE;
DROP TABLE IF EXISTS chief_bonus_scores CASCADE;
DROP TABLE IF EXISTS chief_eval_criteria_items CASCADE;
DROP TABLE IF EXISTS chief_eval_criteria_sections CASCADE;
DROP TABLE IF EXISTS chief_period_evaluators CASCADE;
DROP TABLE IF EXISTS chief_candidates CASCADE;
DROP TABLE IF EXISTS chief_eval_periods CASCADE;
DROP TABLE IF EXISTS chief_evaluators CASCADE;
DROP TABLE IF EXISTS chief_audit_log CASCADE;
DROP TABLE IF EXISTS chief_evaluation_scores_archive CASCADE;
DROP TABLE IF EXISTS chief_evaluation_sessions_archive CASCADE;
DROP TABLE IF EXISTS chief_bonus_scores_archive CASCADE;
DROP TABLE IF EXISTS chief_archive_meta CASCADE;

-- ═══════════════════════════════════════════════════════════════
-- 1. 평가 기간 (chief_eval_periods) - 평가 회차 관리
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE chief_eval_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                          -- '2026년 2기'
  year INTEGER NOT NULL,
  term INTEGER NOT NULL,                       -- 1기, 2기...
  status TEXT NOT NULL DEFAULT 'draft'         -- draft | active | closed
    CHECK (status IN ('draft', 'active', 'closed')),
  eval_date DATE,                              -- 평가일
  pass_score NUMERIC(5,2) NOT NULL DEFAULT 70, -- 합격 기준 점수
  total_max_score INTEGER NOT NULL DEFAULT 110,-- 총 만점
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. 평가위원 (chief_evaluators) - 전역 풀
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE chief_evaluators (
  id TEXT PRIMARY KEY,                         -- 'ndh', 'kyd' 등
  name TEXT NOT NULL,                          -- 로그인 아이디 (평가위원 이름)
  role TEXT NOT NULL DEFAULT '평가위원',        -- 평가위원장 | 평가위원
  team TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  password_hash TEXT,                          -- bcrypt 해시, 초기값: 평가위원 이름
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 2-1. 기간별 평가위원 매핑 (기간마다 추가/삭제 가능)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE chief_period_evaluators (
  period_id UUID NOT NULL REFERENCES chief_eval_periods(id) ON DELETE CASCADE,
  evaluator_id TEXT NOT NULL REFERENCES chief_evaluators(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (period_id, evaluator_id)
);
CREATE INDEX idx_chief_period_evaluators_period ON chief_period_evaluators(period_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. 응시자 (chief_candidates)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE chief_candidates (
  id TEXT PRIMARY KEY,                         -- 'kcg', 'yhh' 등
  name TEXT NOT NULL,
  team TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  period_id UUID REFERENCES chief_eval_periods(id),
  status TEXT DEFAULT 'registered'             -- registered | evaluated | passed | failed
    CHECK (status IN ('registered', 'evaluated', 'passed', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 4. 평가 기준 섹션 (chief_eval_criteria_sections) - 수정 가능 설계
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE chief_eval_criteria_sections (
  id TEXT PRIMARY KEY,                         -- 'A', 'B', 'C'
  period_id UUID REFERENCES chief_eval_periods(id),
  label TEXT NOT NULL,
  max_score INTEGER NOT NULL,
  eval_method TEXT NOT NULL,                   -- '인터뷰', 'PT' 등
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 5. 평가 기준 항목 (chief_eval_criteria_items) - 수정 가능 설계
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE chief_eval_criteria_items (
  id TEXT PRIMARY KEY,                         -- 'A1', 'A2', 'B1' 등
  section_id TEXT REFERENCES chief_eval_criteria_sections(id),
  label TEXT NOT NULL,
  max_score INTEGER NOT NULL,
  description TEXT,                            -- 상세 평가 기준 설명
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 6. 평가 세션 (chief_evaluation_sessions) - 평가위원↔응시자 매핑
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE chief_evaluation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES chief_eval_periods(id),
  evaluator_id TEXT REFERENCES chief_evaluators(id),
  candidate_id TEXT REFERENCES chief_candidates(id),
  status TEXT DEFAULT 'pending'                -- pending | in_progress | completed
    CHECK (status IN ('pending', 'in_progress', 'completed')),
  is_excluded BOOLEAN DEFAULT false,           -- 동일팀 제외 여부
  total_score INTEGER,                         -- 자동 계산된 총점
  comments TEXT,                               -- 종합 코멘트 (레거시)
  comments_section JSONB DEFAULT '{}',         -- 섹션별 코멘트 {A, B, C}
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period_id, evaluator_id, candidate_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 7. 개별 점수 (chief_evaluation_scores) - 항목별 점수 추적
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE chief_evaluation_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chief_evaluation_sessions(id) ON DELETE CASCADE,
  criteria_item_id TEXT REFERENCES chief_eval_criteria_items(id),
  score INTEGER NOT NULL CHECK (score >= 0),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(session_id, criteria_item_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 8. 가점 (chief_bonus_scores) - 역량강화 교육 이수 가점
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE chief_bonus_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID REFERENCES chief_eval_periods(id),
  candidate_id TEXT REFERENCES chief_candidates(id),
  score NUMERIC(4,1) NOT NULL DEFAULT 0 CHECK (score >= 0 AND score <= 10),
  coach_id TEXT REFERENCES chief_evaluators(id),     -- 담당코치
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(period_id, candidate_id)
);

-- ═══════════════════════════════════════════════════════════════
-- 9. 감사 로그 (chief_audit_log) - 데이터 추적 관리
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE chief_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  performed_by TEXT,                           -- 수행자 ID
  performed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT
);

-- ═══════════════════════════════════════════════════════════════
-- INDEXES
-- ═══════════════════════════════════════════════════════════════
CREATE INDEX idx_chief_eval_sessions_period ON chief_evaluation_sessions(period_id);
CREATE INDEX idx_chief_eval_sessions_evaluator ON chief_evaluation_sessions(evaluator_id);
CREATE INDEX idx_chief_eval_sessions_candidate ON chief_evaluation_sessions(candidate_id);
CREATE INDEX idx_chief_eval_scores_session ON chief_evaluation_scores(session_id);
CREATE INDEX idx_chief_audit_log_table ON chief_audit_log(table_name, record_id);
CREATE INDEX idx_chief_audit_log_time ON chief_audit_log(performed_at DESC);
CREATE INDEX idx_chief_candidates_period ON chief_candidates(period_id);

-- ═══════════════════════════════════════════════════════════════
-- TRIGGERS - 자동 updated_at 갱신
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION chief_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chief_eval_periods_updated
  BEFORE UPDATE ON chief_eval_periods FOR EACH ROW EXECUTE FUNCTION chief_update_updated_at();

CREATE TRIGGER trg_chief_evaluators_updated
  BEFORE UPDATE ON chief_evaluators FOR EACH ROW EXECUTE FUNCTION chief_update_updated_at();

CREATE TRIGGER trg_chief_candidates_updated
  BEFORE UPDATE ON chief_candidates FOR EACH ROW EXECUTE FUNCTION chief_update_updated_at();

CREATE TRIGGER trg_chief_eval_sessions_updated
  BEFORE UPDATE ON chief_evaluation_sessions FOR EACH ROW EXECUTE FUNCTION chief_update_updated_at();

CREATE TRIGGER trg_chief_eval_scores_updated
  BEFORE UPDATE ON chief_evaluation_scores FOR EACH ROW EXECUTE FUNCTION chief_update_updated_at();

CREATE TRIGGER trg_chief_bonus_scores_updated
  BEFORE UPDATE ON chief_bonus_scores FOR EACH ROW EXECUTE FUNCTION chief_update_updated_at();

CREATE TRIGGER trg_chief_criteria_sections_updated
  BEFORE UPDATE ON chief_eval_criteria_sections FOR EACH ROW EXECUTE FUNCTION chief_update_updated_at();

CREATE TRIGGER trg_chief_criteria_items_updated
  BEFORE UPDATE ON chief_eval_criteria_items FOR EACH ROW EXECUTE FUNCTION chief_update_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- AUDIT TRIGGER - chief_evaluation_scores 변경 추적
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION chief_audit_score_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO chief_audit_log (table_name, record_id, action, new_data)
    VALUES ('chief_evaluation_scores', NEW.id::TEXT, 'INSERT', to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO chief_audit_log (table_name, record_id, action, old_data, new_data)
    VALUES ('chief_evaluation_scores', NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO chief_audit_log (table_name, record_id, action, old_data)
    VALUES ('chief_evaluation_scores', OLD.id::TEXT, 'DELETE', to_jsonb(OLD));
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chief_audit_eval_scores
  AFTER INSERT OR UPDATE OR DELETE ON chief_evaluation_scores
  FOR EACH ROW EXECUTE FUNCTION chief_audit_score_changes();

-- ═══════════════════════════════════════════════════════════════
-- AUDIT TRIGGER - chief_evaluation_sessions 변경 추적
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION chief_audit_session_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO chief_audit_log (table_name, record_id, action, old_data, new_data)
    VALUES ('chief_evaluation_sessions', NEW.id::TEXT, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_chief_audit_eval_sessions
  AFTER UPDATE ON chief_evaluation_sessions
  FOR EACH ROW EXECUTE FUNCTION chief_audit_session_changes();

-- ═══════════════════════════════════════════════════════════════
-- VIEW: 응시자별 최종 결과 집계
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW chief_v_candidate_results AS
SELECT
  c.id AS candidate_id,
  c.name AS candidate_name,
  c.team AS candidate_team,
  c.period_id,
  COUNT(CASE WHEN es.status = 'completed' AND NOT es.is_excluded THEN 1 END) AS completed_evaluators,
  COUNT(CASE WHEN NOT es.is_excluded THEN 1 END) AS total_eligible_evaluators,
  SUM(CASE WHEN es.status = 'completed' AND NOT es.is_excluded THEN es.total_score ELSE 0 END) AS sum_pm_scores,
  COALESCE(bs.score, 0) AS bonus_score,
  CASE
    WHEN COUNT(CASE WHEN es.status = 'completed' AND NOT es.is_excluded THEN 1 END) > 0
    THEN (
      SUM(CASE WHEN es.status = 'completed' AND NOT es.is_excluded THEN es.total_score ELSE 0 END)::NUMERIC
      + COALESCE(bs.score, 0)
    ) / COUNT(CASE WHEN es.status = 'completed' AND NOT es.is_excluded THEN 1 END)::NUMERIC
    ELSE NULL
  END AS final_avg_score,
  ep.pass_score
FROM chief_candidates c
LEFT JOIN chief_evaluation_sessions es ON c.id = es.candidate_id AND c.period_id = es.period_id
LEFT JOIN chief_bonus_scores bs ON c.id = bs.candidate_id AND c.period_id = bs.period_id
LEFT JOIN chief_eval_periods ep ON c.period_id = ep.id
GROUP BY c.id, c.name, c.team, c.period_id, bs.score, ep.pass_score;

-- ═══════════════════════════════════════════════════════════════
-- VIEW: 평가위원별 평가 현황
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW chief_v_evaluator_progress AS
SELECT
  ev.id AS evaluator_id,
  ev.name AS evaluator_name,
  ev.team AS evaluator_team,
  es.period_id,
  COUNT(CASE WHEN NOT es.is_excluded THEN 1 END) AS assigned_count,
  COUNT(CASE WHEN es.status = 'completed' AND NOT es.is_excluded THEN 1 END) AS completed_count,
  COUNT(CASE WHEN es.is_excluded THEN 1 END) AS excluded_count
FROM chief_evaluators ev
LEFT JOIN chief_evaluation_sessions es ON ev.id = es.evaluator_id
GROUP BY ev.id, ev.name, ev.team, es.period_id;

-- ═══════════════════════════════════════════════════════════════
-- RLS (Row Level Security) - 보안 정책
-- ═══════════════════════════════════════════════════════════════
ALTER TABLE chief_eval_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_evaluators ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_eval_criteria_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_eval_criteria_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_evaluation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_evaluation_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_bonus_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_period_evaluators ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "chief_anon_period_evaluators" ON chief_period_evaluators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_periods" ON chief_eval_periods FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_evaluators" ON chief_evaluators FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_candidates" ON chief_candidates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_sections" ON chief_eval_criteria_sections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_items" ON chief_eval_criteria_items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_sessions" ON chief_evaluation_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_scores" ON chief_evaluation_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_bonus" ON chief_bonus_scores FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_audit" ON chief_audit_log FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- 아카이브 테이블 (초기화 전 데이터 보관)
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE chief_archive_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_id UUID NOT NULL REFERENCES chief_eval_periods(id) ON DELETE CASCADE,
  archived_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);
CREATE INDEX idx_chief_archive_meta_period ON chief_archive_meta(period_id);
CREATE INDEX idx_chief_archive_meta_at ON chief_archive_meta(archived_at DESC);

CREATE TABLE chief_evaluation_sessions_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id UUID NOT NULL REFERENCES chief_archive_meta(id) ON DELETE CASCADE,
  original_session_id UUID,
  period_id UUID NOT NULL,
  evaluator_id TEXT NOT NULL,
  candidate_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  is_excluded BOOLEAN DEFAULT false,
  total_score INTEGER,
  comments TEXT,
  comments_section JSONB DEFAULT '{}',
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_chief_sessions_archive_archive ON chief_evaluation_sessions_archive(archive_id);

CREATE TABLE chief_evaluation_scores_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id UUID NOT NULL REFERENCES chief_archive_meta(id) ON DELETE CASCADE,
  session_archive_id UUID NOT NULL REFERENCES chief_evaluation_sessions_archive(id) ON DELETE CASCADE,
  criteria_item_id TEXT NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 0)
);
CREATE INDEX idx_chief_scores_archive_session ON chief_evaluation_scores_archive(session_archive_id);

CREATE TABLE chief_bonus_scores_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archive_id UUID NOT NULL REFERENCES chief_archive_meta(id) ON DELETE CASCADE,
  period_id UUID NOT NULL,
  candidate_id TEXT NOT NULL,
  score NUMERIC(4,1) NOT NULL DEFAULT 0,
  coach_id TEXT
);
CREATE INDEX idx_chief_bonus_archive_archive ON chief_bonus_scores_archive(archive_id);

ALTER TABLE chief_archive_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_evaluation_sessions_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_evaluation_scores_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE chief_bonus_scores_archive ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chief_anon_archive_meta" ON chief_archive_meta FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_sessions_archive" ON chief_evaluation_sessions_archive FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_scores_archive" ON chief_evaluation_scores_archive FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "chief_anon_bonus_archive" ON chief_bonus_scores_archive FOR ALL USING (true) WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════════
-- SEED DATA - 초기 데이터 입력
-- ═══════════════════════════════════════════════════════════════

-- 1) 평가 기간
INSERT INTO chief_eval_periods (id, name, year, term, status, eval_date, pass_score, total_max_score)
VALUES (
  'a0000000-0000-0000-0000-000000000001',
  '2026년 2기', 2026, 2, 'active', '2026-03-28', 70, 110
);

-- 2) 평가위원 (아이디·초기비밀번호: 영어 2~3자리 ndh, kyd, kok, kh, psh, yds, hsh)
INSERT INTO chief_evaluators (id, name, role, team, email, password_hash) VALUES
  ('ndh', '나동환', '평가위원장', '대표', null, '$2b$10$CuQCTE315bDkM0ap2guZye2YDlko/GffYm03.xRh0ki62LtxMZEsO'),
  ('kyd', '권영도', '평가위원', 'B팀', null, '$2b$10$TX4twY0qvnO0EbxldUtBs.6py5DcZfu8uUryJgQ/uIIq1.nQNKQBK'),
  ('kok', '권오경', '평가위원', 'C팀', null, '$2b$10$MNjDFxfSrthV7uLzKqmVeext7irpBZq8j.ZBiD8Q2wWILiPMG8Jxi'),
  ('kh',  '김홍',   '평가위원', '컨설팅6본부', null, '$2b$10$5kt6hqrlA4luDsr3K4z5b.pQAMLU8PLV67HO6O2KNUYrPVITTZ8Ly'),
  ('psh', '박성현', '평가위원', 'D팀', null, '$2b$10$s1ZwNngGrlAESKskmVdHme2YF1KvtadNXYkfM1JcpX5tj/KhXEXhW'),
  ('yds', '윤덕상', '평가위원', 'E팀', null, '$2b$10$gJaSoFg0udNY1jjbBVnfy.kBjYnTi7LbzJM9iaf/GWnxCRfOF3SQi'),
  ('hsh', '하상현', '평가위원', 'F팀', null, '$2b$10$gLmdtAacJMH.7InirA8AfeLAR5XsEnnWoL71Xg.7pqiwquJiQohPW');

-- 3) 응시자
INSERT INTO chief_candidates (id, name, team, phone, email, period_id, status) VALUES
  ('kmk', '김민경', '미정',           null,             null,                'a0000000-0000-0000-0000-000000000001', 'registered'),
  ('kcg', '김창곤', '컨설팅6본부',     '010-9845-9183', 'kcg@stellain.com', 'a0000000-0000-0000-0000-000000000001', 'registered'),
  ('bjy', '백진영', '미정',           null,             null,                'a0000000-0000-0000-0000-000000000001', 'registered'),
  ('yhh', '양현호', '월드클래스코리아', '010-3794-0404', 'yhh@stellain.com', 'a0000000-0000-0000-0000-000000000001', 'registered');

-- 4) 평가 기준 섹션
INSERT INTO chief_eval_criteria_sections (id, period_id, label, max_score, eval_method, sort_order) VALUES
  ('A', 'a0000000-0000-0000-0000-000000000001', '세무사 협력 커뮤니케이션 역량', 50, '인터뷰 (1:1 롤플레이)', 1),
  ('B', 'a0000000-0000-0000-0000-000000000001', '고객 솔루션 제안 커뮤니케이션 역량', 30, 'PT (프레젠테이션)', 2),
  ('C', 'a0000000-0000-0000-0000-000000000001', '프로젝트 설계 및 실무 역량', 20, 'PT (프레젠테이션)', 3);

-- 5) 평가 기준 항목
INSERT INTO chief_eval_criteria_items (id, section_id, label, max_score, description, sort_order) VALUES
  ('A1', 'A', '세무사 응대 및 관계 구축 능력',           20, '세무사와의 초기 접점 형성, 신뢰 구축, 전문성 인지 등', 1),
  ('A2', 'A', '프로젝트 협의 커뮤니케이션 스킬',         20, '프로젝트 범위·일정·역할 협의 시 커뮤니케이션 역량', 2),
  ('A3', 'A', '치프-세무사-고객 간 인터페이스 조율 역량', 10, '삼자 간 이해관계 조율 및 정보 중개 역량', 3),
  ('B1', 'B', '고객 문제 진단 및 설명 능력',             10, '고객의 핵심 이슈를 구조화하여 설명하는 능력', 1),
  ('B2', 'B', '솔루션 제안 전달력 및 설득력',            10, '솔루션을 명확하고 설득력 있게 전달하는 역량', 2),
  ('B3', 'B', '금융/법률 연계 방안 제시 능력',           10, '세무 외 금융·법률 등 연계 솔루션 제안 역량', 3),
  ('C1', 'C', '프로젝트 목표 및 범위 정의',              10, '프로젝트의 목표·범위·산출물을 명확히 정의', 1),
  ('C2', 'C', '단계별 실행 계획 수립',                    5, '타임라인, 마일스톤, 담당자 배정 등 실행 계획', 2),
  ('C3', 'C', '리스크 관리 및 대응 전략',                  5, '잠재 리스크 식별 및 대응 방안 수립', 3);

-- 6) 평가 세션 자동 생성 (모든 평가위원 × 응시자 조합)
INSERT INTO chief_evaluation_sessions (period_id, evaluator_id, candidate_id, is_excluded)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  ev.id,
  ca.id,
  CASE WHEN ev.team = ca.team AND ev.team != '대표' THEN true ELSE false END
FROM chief_evaluators ev
CROSS JOIN chief_candidates ca
WHERE ca.period_id = 'a0000000-0000-0000-0000-000000000001';

-- 7) 가점 초기 레코드 생성
INSERT INTO chief_bonus_scores (period_id, candidate_id, score, coach_id)
SELECT
  'a0000000-0000-0000-0000-000000000001',
  ca.id,
  0,
  'hsh'
FROM chief_candidates ca
WHERE ca.period_id = 'a0000000-0000-0000-0000-000000000001';


-- ═══════════════════════════════════════════════════════════════
-- 완료 메시지
-- ═══════════════════════════════════════════════════════════════
-- 스키마 및 초기 데이터 설정 완료! (chief_ 접두어 적용)
-- 테이블: 9개, 뷰: 2개, 트리거: 9개, 인덱스: 7개
