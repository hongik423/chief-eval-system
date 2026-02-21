-- A/B/C 섹션별 평가 코멘트 컬럼 추가
ALTER TABLE chief_evaluation_sessions
ADD COLUMN IF NOT EXISTS comments_section JSONB DEFAULT '{}';

COMMENT ON COLUMN chief_evaluation_sessions.comments_section IS '섹션별 코멘트 {A, B, C}';
