# Cursor AI 프롬프트 - 문제 선정 투표 시스템 통합

아래 내용을 Cursor AI에 복사하여 기존 프로젝트에 통합하세요.

---

## 프롬프트

```
기존 chief-eval-system Next.js 프로젝트에 "TEST 케이스 문제 선정 투표 시스템"을 추가 개발해주세요.

## 핵심 요구사항

1. **별도 경로**: `/question-selection` 경로에 기존 치프인증과 완전히 분리된 메뉴로 개발
2. **평가위원 로그인**: 7명(평가위원장, 권영도, 권오경, 김홍, 박성현, 윤덕상, 하상현)이 비밀번호(chief2026)로 로그인
3. **21문제 투표**: 문제은행 21문제를 3개 분야로 분류하여 표시
   - 주식 이동 (1~7번)
   - 차명 주식 해소 (8~14번)
   - 가지급금 정리 (15~21번)
4. **투표 방식**: 각 평가위원이 분야별 1문제씩 총 3문제 선택
5. **결과 집계**: 7명 최다득표 순으로 분야별 상위 3문제, 총 9문제 자동 선정
6. **문제은행 PDF 링크 제공**: https://drive.google.com/file/d/1e3xqEpIarKz3KuGKLm5yTwQt3nmybhpM/view?usp=sharing

## 파일 구조 (아래 파일들을 생성해주세요)

### 1. src/data/questions.ts
21문제 데이터. 각 문제에 id(1~21), category(stock_transfer/nominee_stock/temporary_payment), submitter(출제위원명), title(제목), issue(핵심이슈), difficulty(난이도1~5) 포함.

### 2. src/data/evaluators.ts
7명 평가위원 데이터. id, name, role, password 포함.

### 3. src/lib/voteStore.ts
In-Memory 투표 저장소. submitVote(), getVoteStatus(), getResults(), getEvaluatorVotes() 함수.

### 4. src/app/question-selection/layout.tsx
공통 레이아웃 (헤더: "기업의별 치프인증 | TEST 케이스 문제 선정 시스템")

### 5. src/app/question-selection/page.tsx
로그인 페이지:
- 7명 평가위원 선택 버튼 UI
- 비밀번호 입력
- 문제은행 PDF Google Drive 링크
- 투표 안내 (분야별 1문제 선택 → 최다득표 순 3문제 확정)

### 6. src/app/question-selection/vote/page.tsx
투표 페이지:
- 3개 분야별 7문제 리스트 (카드 형태)
- 분야별 색상 구분 (주식이동: 파랑, 차명주식: 보라, 가지급금: 초록)
- 문제번호, 제목, 출제위원, 난이도별 별점 표시
- 라디오 선택 방식 (분야당 1개만 선택)
- 상세보기 토글
- 하단 고정 제출 바 (3개 분야 모두 선택 시 활성화)
- 투표 완료 확인 화면

### 7. src/app/question-selection/results/page.tsx
결과 페이지:
- 투표 현황 (7명 중 N명 완료, 프로그레스 바)
- 평가위원별 투표 상태 표시 (✅/⏳)
- 분야별 최다득표 순 결과 (바 차트)
- 상위 3문제 "⭐ 선정" 뱃지
- 투표자 이름 표시
- 10초 자동 갱신 옵션
- 최종 선정 9문제 요약 카드 (과반수 투표 완료 시)

### 8. API 라우트
- POST /api/question-selection/login - 평가위원 인증
- POST /api/question-selection/vote - 투표 제출 (중복 시 수정 허용)
- GET /api/question-selection/results - 결과 조회

## UI/UX 디자인
- Tailwind CSS 사용
- 그라데이션 배경, 카드 기반 레이아웃
- 분야별 색상 코딩 (파랑/보라/초록)
- 반응형 디자인
- 부드러운 트랜지션

## 기존 프로젝트 네비게이션에 추가
메인 페이지에 "🗳️ TEST 문제 선정" 메뉴 링크를 추가해주세요.
경로: /question-selection
```
