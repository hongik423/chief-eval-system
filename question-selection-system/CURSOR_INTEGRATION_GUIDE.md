# 🗳️ 치프인증 TEST 케이스 문제 선정 시스템 - Cursor 통합 가이드

## 📋 개요

기존 치프인증 평가 시스템(`chief-eval-system`)에 **TEST 케이스 문제 선정 투표 시스템**을 추가합니다.
기존 치프인증과 **별도 경로(`/question-selection`)** 로 운영됩니다.

---

## 🏗 시스템 구조

```
기존 프로젝트/
├── src/
│   ├── app/
│   │   ├── (기존 치프인증 라우트들)
│   │   │
│   │   ├── question-selection/          ← 🆕 새 경로
│   │   │   ├── layout.tsx               ← 공통 레이아웃
│   │   │   ├── page.tsx                 ← 로그인 페이지
│   │   │   ├── vote/
│   │   │   │   └── page.tsx             ← 투표 페이지
│   │   │   └── results/
│   │   │       └── page.tsx             ← 결과 페이지
│   │   │
│   │   └── api/
│   │       └── question-selection/      ← 🆕 API 라우트
│   │           ├── login/route.ts
│   │           ├── vote/route.ts
│   │           └── results/route.ts
│   │
│   ├── data/                            ← 🆕 데이터 파일
│   │   ├── questions.ts                 ← 21문제 데이터
│   │   └── evaluators.ts               ← 7명 평가위원 데이터
│   │
│   └── lib/                             ← 🆕 유틸리티
│       └── voteStore.ts                 ← 투표 저장소
```

---

## 🚀 Cursor에서 통합하는 방법

### 1단계: 파일 복사

Cursor 터미널에서 아래 명령어를 실행하세요:

```bash
# 1. 데이터 파일 복사
cp src/data/questions.ts  [기존프로젝트]/src/data/questions.ts
cp src/data/evaluators.ts [기존프로젝트]/src/data/evaluators.ts

# 2. 유틸리티 파일 복사
cp src/lib/voteStore.ts [기존프로젝트]/src/lib/voteStore.ts

# 3. 페이지 파일 복사
cp -r src/app/question-selection [기존프로젝트]/src/app/question-selection

# 4. API 라우트 복사
cp -r src/app/api/question-selection [기존프로젝트]/src/app/api/question-selection
```

### 2단계: 기존 메인 페이지에 네비게이션 추가

기존 프로젝트의 메인 페이지 또는 네비게이션 컴포넌트에 아래 링크를 추가하세요:

```tsx
// 기존 네비게이션에 추가
<a href="/question-selection" className="...">
  🗳️ TEST 문제 선정
</a>
```

### 3단계: 의존성 확인

이 시스템은 Next.js App Router의 기본 기능만 사용합니다:
- Next.js 13+ (App Router)
- React 18+
- Tailwind CSS

별도의 추가 패키지 설치가 필요하지 않습니다.

### 4단계: 배포

```bash
# Vercel 배포
vercel --prod
```

---

## 📊 기능 설명

### 1. 로그인 페이지 (`/question-selection`)
- 7명 평가위원 선택 UI
- 비밀번호 인증 (기본: `chief2026`)
- 문제은행 PDF Google Drive 링크 제공

### 2. 투표 페이지 (`/question-selection/vote`)
- 3개 분야별 7문제 표시 (총 21문제)
- 분야별 1문제 선택 (라디오 선택 방식)
- 문제 상세 보기 토글
- 문제은행 PDF 링크 제공
- 하단 고정 제출 바

### 3. 결과 페이지 (`/question-selection/results`)
- 실시간 투표 현황 (10초 자동 갱신)
- 평가위원별 투표 완료 상태
- 분야별 최다득표 순 결과
- 상위 3문제 자동 선정 표시
- 최종 9문제 요약 카드

---

## 🔧 커스터마이징

### 문제 데이터 수정
`src/data/questions.ts` 파일에서 21문제의 상세 내용을 수정할 수 있습니다.

### 비밀번호 변경
`src/data/evaluators.ts` 파일에서 각 평가위원의 비밀번호를 변경할 수 있습니다.

### 영구 저장소 적용
현재 In-Memory 저장 방식입니다. 영구 저장이 필요한 경우:
- **Vercel KV**: `@vercel/kv` 패키지 사용
- **Supabase**: PostgreSQL 기반 저장
- **Firebase**: Realtime Database 연동

`src/lib/voteStore.ts`의 함수들을 DB 연동으로 교체하면 됩니다.

---

## 🔐 보안 고려사항

- 현재 비밀번호는 평문 저장 (실제 운영 시 bcrypt 해시 권장)
- 세션은 브라우저 sessionStorage 사용
- 프로덕션 배포 시 환경변수로 비밀번호 관리 권장

---

## 📱 주요 URL

| 경로 | 설명 |
|------|------|
| `/question-selection` | 로그인 + 안내 페이지 |
| `/question-selection/vote` | 투표 페이지 |
| `/question-selection/results` | 결과 + 현황 페이지 |
| `/api/question-selection/login` | 로그인 API |
| `/api/question-selection/vote` | 투표 API |
| `/api/question-selection/results` | 결과 API |

---

## 📌 Cursor에 전달할 프롬프트 (복사하여 사용)

```
기존 chief-eval-system Next.js 프로젝트에 문제 선정 투표 시스템을 추가해주세요.

요구사항:
1. /question-selection 경로에 별도 메뉴로 개발
2. 7명 평가위원(평가위원장, 권영도, 권오경, 김홍, 박성현, 윤덕상, 하상현)이 로그인하여 투표
3. 21문제를 3개 분야(주식이동 7문제, 차명주식 7문제, 가지급금 7문제)로 분류
4. 각 평가위원이 분야별 1문제씩 선택하여 투표
5. 최다득표 순으로 분야별 3문제(총 9문제) 자동 선정
6. 실시간 투표 현황 및 결과 조회 페이지

제공된 파일들:
- src/data/questions.ts (21문제 데이터)
- src/data/evaluators.ts (7명 평가위원 데이터)
- src/lib/voteStore.ts (투표 저장소)
- src/app/question-selection/ (페이지 컴포넌트)
- src/app/api/question-selection/ (API 라우트)

문제은행 PDF Google Drive 링크:
https://drive.google.com/file/d/1e3xqEpIarKz3KuGKLm5yTwQt3nmybhpM/view?usp=sharing

이 파일들을 기존 프로젝트에 통합하고, 기존 메인 네비게이션에
"🗳️ TEST 문제 선정" 메뉴를 추가해주세요.
```
