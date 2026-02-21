-- 기존 DB에 password_hash 컬럼 추가 (스키마 재실행 없이 마이그레이션용)
-- Supabase SQL Editor에서 실행
-- 아이디·초기비밀번호: 영어 2~3자리 (ndh, kyd, kok, kh, psh, yds, hsh)
ALTER TABLE chief_evaluators ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE chief_evaluators ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

UPDATE chief_evaluators SET password_hash = '$2b$10$CuQCTE315bDkM0ap2guZye2YDlko/GffYm03.xRh0ki62LtxMZEsO' WHERE id = 'ndh';
UPDATE chief_evaluators SET password_hash = '$2b$10$TX4twY0qvnO0EbxldUtBs.6py5DcZfu8uUryJgQ/uIIq1.nQNKQBK' WHERE id = 'kyd';
UPDATE chief_evaluators SET password_hash = '$2b$10$MNjDFxfSrthV7uLzKqmVeext7irpBZq8j.ZBiD8Q2wWILiPMG8Jxi' WHERE id = 'kok';
UPDATE chief_evaluators SET password_hash = '$2b$10$5kt6hqrlA4luDsr3K4z5b.pQAMLU8PLV67HO6O2KNUYrPVITTZ8Ly' WHERE id = 'kh';
UPDATE chief_evaluators SET password_hash = '$2b$10$s1ZwNngGrlAESKskmVdHme2YF1KvtadNXYkfM1JcpX5tj/KhXEXhW' WHERE id = 'psh';
UPDATE chief_evaluators SET password_hash = '$2b$10$gJaSoFg0udNY1jjbBVnfy.kBjYnTi7LbzJM9iaf/GWnxCRfOF3SQi' WHERE id = 'yds';
UPDATE chief_evaluators SET password_hash = '$2b$10$gLmdtAacJMH.7InirA8AfeLAR5XsEnnWoL71Xg.7pqiwquJiQohPW' WHERE id = 'hsh';
