# 배포 가이드

## GitHub

- 저장소: https://github.com/hongik423/chief-eval-system
- 커밋 메시지 한글 인코딩: `git commit -F 메시지파일.txt` 사용 권장

### About 섹션 설정 (수동)

1. https://github.com/hongik423/chief-eval-system 접속
2. 오른쪽 **About** 영역의 톱니바퀴(⚙️) 클릭
3. 입력:
   - **Description**: `기업의별 치프인증 평가 시스템`
   - **Website**: `https://chief-eval-system.vercel.app` (또는 Vercel 배포 URL)
   - **Topics**: `react`, `vite`, `supabase`, `tailwindcss`

## Vercel

- **배포 URL**: https://chief-eval-system-einbq57lt-hongik423-3087s-projects.vercel.app
- **프로덕션**: https://chief-eval-system.vercel.app (Vercel이 자동 할당)

### 환경 변수 (프로덕션 연동 시)

Vercel Dashboard > chief-eval-system > Settings > Environment Variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_ID` (선택)
- `VITE_ADMIN_PASSWORD` (선택)
