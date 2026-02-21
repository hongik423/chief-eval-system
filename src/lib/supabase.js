import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '⚠️ Supabase 환경변수가 설정되지 않았습니다.\n' +
    '.env.local 파일에 VITE_SUPABASE_URL 과 VITE_SUPABASE_ANON_KEY 를 설정해 주세요.\n' +
    '로컬 스토리지 모드로 동작합니다.'
  );
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseConfigured = () => !!supabase;
