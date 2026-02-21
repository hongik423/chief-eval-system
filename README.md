# ★ 기업의별 치프인증 평가 시스템

2026년 2기 ASSO → 치프(PM) 인증 TEST RED 평가 웹 애플리케이션

## 🏗 아키텍처

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│            Vite + React + Tailwind               │
│            Zustand (State Mgmt)                  │
│               ↕  ↕  ↕                            │
│         Supabase JS Client                       │
│         (localStorage fallback)                  │
└──────────────────┬──────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Supabase (Backend)                   │
│  ┌─────────────────────────────────────────┐     │
│  │ eval_periods         평가 기간          │     │
│  │ chief_evaluators     평가위원           │     │
│  │ chief_candidates     응시자             │     │
│  │ chief_eval_criteria_* 평가 기준 (수정가능)│   │
│  │ chief_evaluation_sessions 평가↔응시자 매핑│   │
│  │ chief_evaluation_scores 항목별 점수     │     │
│  │ chief_bonus_scores   가점              │     │
│  │ chief_audit_log      변경 추적 로그     │     │
│  └─────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────┐     │
│  │ v_candidate_results  응시자별 결과 뷰   │     │
│  │ v_evaluator_progress 위원별 진행률 뷰   │     │
│  └─────────────────────────────────────────┘     │
│  ┌─────────────────────────────────────────┐     │
│  │ Triggers: 자동 updated_at              │     │
│  │ Triggers: chief_audit_log 자동 기록      │     │
│  │ RLS: Row Level Security               │     │
│  └─────────────────────────────────────────┘     │
└──────────────────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────┐
│              Vercel (Hosting)                     │
│         자동 빌드 + 글로벌 CDN 배포             │
└──────────────────────────────────────────────────┘
```

## 📋 주요 기능

### 평가위원 모드
- 7명 평가위원 각각의 로그인
- 4명 응시자별 9개 항목 점수 입력 (100점 만점)
- 동일팀 소속 자동 평가 제외 처리
- 종합 코멘트 작성
- 실시간 점수 계산 및 시각화

### 관리자 모드 (이후경 PM)
- **현황 요약**: 전체 합격/불합격 대시보드
- **응시자별 상세**: 평가위원별 점수 테이블, 최종 평균 산출
- **합격 판정**: 가점 입력 → 최종점수 계산 → 합격/불합격 판정 버튼
- **평가위원별 현황**: 개별 위원 진행률 및 점수 추적
- **평가표 관리**: 평가 항목 수정/추가 (고도화 대비)
- **데이터 추적**: Supabase chief_audit_log 기반 변경 이력 조회

### 데이터 관리
- Supabase 연결 시: PostgreSQL에 영구 저장 + audit trail
- 미연결 시: localStorage 자동 fallback

## 🚀 설정 및 실행

### 1. 프로젝트 설치

```bash
cd chief-eval-system
npm install
```

### 2. Supabase 설정

1. [Supabase 대시보드](https://supabase.com/dashboard) 에서 프로젝트 선택 (예: aicamp-prod)
2. **SQL Editor** 에서 `supabase/schema.sql` 전체 실행
   - 기존 프로젝트와 공존을 위해 `chief_` 접두어가 적용되어 있음
3. **Settings > API** 에서 URL과 anon key 복사

```bash
cp .env.example .env.local
```

`.env.local` 편집:
```
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

### 3. 로컬 실행

```bash
npm run dev
```

브라우저에서 `http://localhost:5173` 접속

### 4. Vercel 배포

```bash
# Vercel CLI 설치 (최초 1회)
npm i -g vercel

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

**Vercel 환경변수 설정:**
- Vercel Dashboard > Settings > Environment Variables
- `VITE_SUPABASE_URL` 추가
- `VITE_SUPABASE_ANON_KEY` 추가

또는 Vercel CLI:
```bash
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY
```

## 🗃 데이터베이스 테이블

| 테이블 | 용도 | 비고 |
|--------|------|------|
| `chief_eval_periods` | 평가 회차 관리 | 2026년 2기 |
| `chief_evaluators` | 평가위원 7명 | 나동환(위원장) + 6명 |
| `chief_candidates` | 응시자 4명 | 김민경, 김창곤, 백진영, 양현호 |
| `chief_eval_criteria_sections` | 평가 영역 A/B/C | **수정 가능** |
| `chief_eval_criteria_items` | 세부 항목 9개 | **수정/추가 가능** |
| `chief_evaluation_sessions` | 위원↔응시자 매핑 | 동일팀 자동 제외 |
| `chief_evaluation_scores` | 항목별 점수 | trigger로 audit 자동 기록 |
| `chief_bonus_scores` | 가점 (최대 10점) | 담당코치: 하상현 |
| `chief_audit_log` | 변경 추적 로그 | INSERT/UPDATE/DELETE 자동 기록 |

## 📐 점수 산정 공식

```
최종 평균 = (Σ PM역량점수 + 가점) ÷ 유효 평가위원 수

- PM역량평가: 100점 만점 (A:50 + B:30 + C:20)
- 가점: 최대 10점 (역량강화교육 이수)
- 합격 기준: 평균 70점 이상 (110점 만점 기준)
- 소속 팀 평가위원 점수는 제외
```

## 🔄 평가표 수정 방법

### UI에서 수정 (관리자 > 평가표 관리 탭)
1. 관리자로 로그인
2. "평가표 관리" 탭 선택
3. 항목 옆 "수정" 버튼 → 항목명, 배점, 설명 변경
4. "+ 항목 추가" → 새 평가 항목 추가

### DB에서 직접 수정
```sql
-- 항목 배점 변경
UPDATE chief_eval_criteria_items SET max_score = 25 WHERE id = 'A1';

-- 새 섹션 추가
INSERT INTO chief_eval_criteria_sections (id, period_id, label, max_score, eval_method, sort_order)
VALUES ('D', 'a0000000-0000-0000-0000-000000000001', '리더십 역량', 20, '면접', 4);

-- 새 항목 추가
INSERT INTO chief_eval_criteria_items (id, section_id, label, max_score, sort_order)
VALUES ('D1', 'D', '팀 관리 역량', 10, 1);
```

## 📞 문의

- HRD: 이후경 실장 (lhk@stellain.com)
- 전화: 010-9251-9743
- 카카오톡: '2026 기업의별 치프인증과정'
