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

- `VITE_SUPABASE_URL` (필수: 투표·배정·추적 데이터)
- `VITE_SUPABASE_ANON_KEY` (필수)
- `VITE_ADMIN_ID` (선택)
- `VITE_ADMIN_PASSWORD` (선택)

### 배포 미반영 시 점검 (룰렛 UI 등)

1. **Root Directory 확인**
   - Settings > General > Root Directory
   - 비어 있거나 `.` 여야 함. `question-selection-system` 등으로 설정되어 있으면 삭제 (루트 Vite 앱이 배포되어야 함)

2. **캐시 제거 재배포**
   - Deployments > 최신 배포 선택 > Redeploy
   - **"Redeploy with existing Build Cache" 체크 해제** 후 재배포

3. **배포 검증**
   - 배포 후 https://chief-eval-system.vercel.app/question-selection/results 접속
   - 페이지 하단에 `빌드: 2026-03-15-roulette` 문구가 보이면 최신 빌드 적용됨
   - 없으면 캐시 제거 후 재배포 또는 Root Directory 재확인

4. **룰렛 버튼 노출 경로**
   - 결과 페이지에서 관리자 로그인 (강선애/이후경)
   - 2차 출제 랜덤 배정 실행 후 저장
   - 피평가자 단계 추적 테이블에서 각 인증대상자 옆 **"4단계 최종 문제 선정"** 클릭 → 룰렛 모달 표시
