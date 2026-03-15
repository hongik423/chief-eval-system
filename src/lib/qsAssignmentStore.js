// ================================================================
// 2차 출제 랜덤 배정 스토어
// - 1차 최종 확정 9문제 풀에서 피평가자별 3문제(분야별 1문제) 랜덤 배정
// - URL 토큰 방식: {candidateId}-{stQ}-{nsQ}-{tpQ} (Supabase 불필요)
// - 배정 결과는 localStorage에 캐시 (관리자 재확인용)
// ================================================================

// ─── 2차 출제 피평가자 목록 ───────────────────────────────────────
export const ROUND2_CANDIDATES = [
  { id: 'kcg', name: '김창곤', team: '컨설팅6본부' },
  { id: 'bjy', name: '백진영', team: '미정' },
  { id: 'yhh', name: '양현호', team: '월드클래스코리아' },
];

// ─── 2차 출제 문제 풀 (1차 최종 선정 9문제) ──────────────────────
export const ROUND2_QUESTION_POOL = {
  stock_transfer:    [4, 5, 12], // 주식 이동
  nominee_stock:     [3, 1, 10], // 차명 주식
  temporary_payment: [6, 11, 2], // 가지급금
};

// ─── 주요 일정 ────────────────────────────────────────────────────
export const ROUND2_DATE       = new Date('2026-03-18T00:00:00');
export const ROUND2_DATE_STR   = '2026년 3월 18일(수)';
export const MENTORING_START   = new Date('2026-03-18T00:00:00');
export const MENTORING_END     = new Date('2026-03-27T23:59:59');
export const EXAM_DATE         = new Date('2026-03-28T09:00:00');
export const EXAM_DATE_STR     = '2026년 3월 28일(토)';
export const RESULT_DATE       = new Date('2026-03-31T00:00:00');
export const RESULT_DATE_STR   = '2026년 3월 31일(화)';
export const CERT_DATE_STR     = '4월 TAG일';

// ─── 치프인증 진행 일정표 (2-2단계~8단계) ─────────────────────────
export const SCHEDULE_MILESTONES = [
  {
    step: '2-2',
    title: '2차 출제',
    date: '3월 18일(수)',
    dateObj: new Date('2026-03-18'),
    icon: '🎲',
    color: '#d97706',
    items: [
      '최종 3문제 선정 및 배정',
      '1차 출제 9문제 중 각 분야별 1문제씩 선정',
      '총 3문제를 평가 대상자에게 배정',
      '멘토링 기간 시작 (3/18~3/27, 선택사항)',
    ],
  },
  {
    step: '4',
    title: '최종 문제 선정',
    date: '3월 28일(토) 오전',
    dateObj: new Date('2026-03-28'),
    icon: '🎰',
    color: '#ef4444',
    items: [
      '평가 문제 추첨',
      '2차 출제 3문제 중 1문제 Random 선택',
      '평가위원회에서 평가 당일 선정',
    ],
  },
  {
    step: '5',
    title: '인증평가 실시',
    date: '3월 28일(토) 10:00~18:00',
    dateObj: new Date('2026-03-28'),
    icon: '📋',
    color: '#3b82f6',
    items: [
      '09:00~10:00  평가위원 사전교육',
      '10:00~13:00  오전 인터뷰 (1:1 롤플레이)',
      '15:00~17:00  오후 결과보기 + 발제안 (PT)',
      '17:00~18:00  FEEDBACK',
    ],
  },
  {
    step: '6',
    title: '평가위원 협의',
    date: '3월 28일(토)',
    dateObj: new Date('2026-03-28'),
    icon: '🤝',
    color: '#8b5cf6',
    items: [
      '평가 결과 협의 · 합격/불합격 결정',
      'PM 역량평가 100점 + 가점 10점',
      '평균 70점 이상 합격 (평가총점 ÷ 평가위원수)',
    ],
  },
  {
    step: '7',
    title: '최종 결과 발표',
    date: '3월 31일(화)',
    dateObj: new Date('2026-03-31'),
    icon: '📢',
    color: '#10b981',
    items: [
      '합격/불합격 여부만 공개 (점수 비공개)',
      '개별 피드백 제공',
      '평가표는 응시자에게 비공개',
    ],
  },
  {
    step: '8',
    title: '인증서 수여식',
    date: '4월 TAG일',
    dateObj: new Date('2026-04-30'),
    icon: '🏆',
    color: '#f59e0b',
    items: [
      '인증서 수여 · 전사 행사로 진행',
    ],
  },
];

/** 현재 날짜 기준으로 현재 활성 단계를 반환 */
export function getCurrentStep() {
  const now = new Date();
  // 역순으로 검사하여 가장 최근 도래한 단계 반환
  for (let i = SCHEDULE_MILESTONES.length - 1; i >= 0; i--) {
    if (now >= SCHEDULE_MILESTONES[i].dateObj) {
      return SCHEDULE_MILESTONES[i].step;
    }
  }
  return null; // 아직 시작 전
}

// ─── Google Drive PDF 매핑 ────────────────────────────────────────
// 개별 문제 PDF 업로드 후 각 fileId를 입력하세요
// null = 메인 번들 PDF로 대체
const QUESTION_PDF_FILE_IDS = {
  // 주식 이동
  4:  '1itPcbMKchrl7yrNTihK2jvE6AQQev9Q_', // 제조업 J사 - 가업상속공제·상속세 재원 마련
  5:  '1_dmBdAS-1U4YBHzIat5CYT7BfyL0thGU', // 교육업 K사 - A·B법인 외감 회피 및 소액주주 은퇴 설계
  12: '1nUT0rusUwlf5MQuGpBKYDHVfhfHi0LGJ', // 甲·乙·丙 3개 법인 - 가업승계 증여특례 전략
  // 차명 주식
  1:  '1v2pzNObA4NX2lV_4MuXzgUQ3pYgvK43B', // 전문건설업 Q사 - 차명주식·가지급금 복합 해결
  3:  '1WbujnSuO5ILtjMaESmdiOF6sbgoGRZax', // 제조업 D사 - 처남 명의신탁 차명주식 및 승계
  10: '1lnwuz07_7zQBJvDdj3U6Kr_YMXtatJ43', // 기별건설 - 명의신탁 차명주식 회수 및 가업승계
  // 가지급금
  2:  '1_2FvDcYka-1H1C7T4YUSSpVmC99H5dZv', // 기별기술·별별테크 - 두 법인 가지급금 해결
  6:  '1TYNt63W7lyYjmymgsxpKqq-NZ2ZEpAJG', // DD건설 - 가지급금 18.5억 절세 해결
  11: '1_MJug_-OxssExg0iafQojhUAB0CW0h2r', // 기별이엔지 - 가지급금 8.5억 현재·미래 동시 해결
};

// 1차 출제 번들 PDF (개별 PDF 미업로드 시 대체)
const BUNDLE_PDF_URL =
  'https://drive.google.com/file/d/1e3xqEpIarKz3KuGKLm5yTwQt3nmybhpM/view?usp=sharing';

// Google Drive 2차 출제 폴더
export const ROUND2_FOLDER_URL =
  'https://drive.google.com/drive/folders/1lW0j893rPeZuDqeR9YiGPPA0JbodXhkX?usp=sharing';

/** 특정 문제의 PDF URL 반환 */
export function getQuestionPdfUrl(questionId) {
  const fileId = QUESTION_PDF_FILE_IDS[questionId];
  return fileId
    ? `https://drive.google.com/file/d/${fileId}/view?usp=sharing`
    : BUNDLE_PDF_URL;
}

// ─── 랜덤 배정 생성 ───────────────────────────────────────────────
function seededRandom(seed) {
  // 간단한 LCG 난수 (재현 가능)
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

/**
 * 피평가자별 랜덤 문제 배정
 * @param {boolean} useTimeSeed - true면 현재 시간 기반 시드(완전 랜덤), false면 고정 시드
 */
export function generateRandomAssignments(useTimeSeed = true) {
  const seed = useTimeSeed ? Date.now() : 20260318;
  const rand = seededRandom(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  return ROUND2_CANDIDATES.map((c) => ({
    candidateId:   c.id,
    candidateName: c.name,
    candidateTeam: c.team,
    stock_transfer:    pick(ROUND2_QUESTION_POOL.stock_transfer),
    nominee_stock:     pick(ROUND2_QUESTION_POOL.nominee_stock),
    temporary_payment: pick(ROUND2_QUESTION_POOL.temporary_payment),
    assignedAt: new Date().toISOString(),
    seed,
  }));
}

// ─── URL 토큰 인코딩/디코딩 ──────────────────────────────────────
/**
 * 배정 결과를 URL 토큰으로 인코딩
 * 형식: {candidateId}-{stQ}-{nsQ}-{tpQ}
 * 예시: kcg-4-3-6
 */
export function encodeToken(assignment) {
  return `${assignment.candidateId}-${assignment.stock_transfer}-${assignment.nominee_stock}-${assignment.temporary_payment}`;
}

/**
 * URL 토큰을 배정 정보로 디코딩
 * 유효하지 않으면 null 반환
 */
export function decodeToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('-');
  if (parts.length !== 4) return null;

  const [candidateId, stRaw, nsRaw, tpRaw] = parts;
  const candidate = ROUND2_CANDIDATES.find((c) => c.id === candidateId);
  if (!candidate) return null;

  const stQ = parseInt(stRaw, 10);
  const nsQ = parseInt(nsRaw, 10);
  const tpQ = parseInt(tpRaw, 10);

  if (!ROUND2_QUESTION_POOL.stock_transfer.includes(stQ))    return null;
  if (!ROUND2_QUESTION_POOL.nominee_stock.includes(nsQ))     return null;
  if (!ROUND2_QUESTION_POOL.temporary_payment.includes(tpQ)) return null;

  return {
    candidate,
    questions: {
      stock_transfer:    stQ,
      nominee_stock:     nsQ,
      temporary_payment: tpQ,
    },
  };
}

// ─── localStorage 캐시 (관리자 재확인용) ─────────────────────────
const STORE_KEY = 'qs_round2_assignments';

export function saveAssignmentsLocal(assignments) {
  localStorage.setItem(
    STORE_KEY,
    JSON.stringify({ assignments, savedAt: new Date().toISOString() })
  );
}

export function loadAssignmentsLocal() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearAssignmentsLocal() {
  localStorage.removeItem(STORE_KEY);
}
