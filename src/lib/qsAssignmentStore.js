// ================================================================
// 2차 출제 랜덤 배정 스토어
// - 1차 최종 확정 9문제 풀에서 피평가자별 3문제(분야별 1문제) 랜덤 배정
// - URL 토큰 방식: {candidateId}-{stQ}-{nsQ}-{tpQ}
// - 배정 결과는 localStorage + Supabase 이중 저장 (데이터 영속성 보장)
// ================================================================

import { supabase } from '@/lib/supabase';

// ─── 현재 활성 평가 기간 ID ──────────────────────────────────────
const ACTIVE_PERIOD_ID = 'a0000000-0000-0000-0000-000000000001';

// ─── 2차 출제 피평가자 목록 ───────────────────────────────────────
export const ROUND2_CANDIDATES = [
  { id: 'kcg', name: '김창곤', team: '컨설팅6본부' },
  { id: 'bjy', name: '백진영', team: '권영도 코치' },
  { id: 'yhh', name: '양현호', team: '무소속' },
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
    dateNote: '평가일 10일 전',
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
    dateNote: '평가 당일',
    dateObj: new Date('2026-03-28'),
    icon: '🎰',
    color: '#ef4444',
    items: [
      '평가 문제 추첨',
      '2차 출제 3문제 중 1문제 Random 선택 (평가위원회에서 평가당일 선정)',
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
      '[평가위원 사전교육] 9:00~10:00 평가 기준 통일',
      '[오전 세션: 인터뷰] 10:00~13:00',
      '평가위원대상 사전교육: 평가 척도 및 기준 통일 교육',
      '오전 (인터뷰): 1:1 롤플레이 인터뷰, 평가위원이 기업대표 역할 수행',
      '점심시간 1시간',
      '[오후 세션: 결과보기+발제안] 15:00~17:00',
      '기업대표 질문에 대응 커뮤니케이션 역량 평가',
      '오후 (결과보기+발제안): 케이스 프레젠테이션, 고객 솔루션 제안 역량 평가, 프로젝트 설계 역량 평가',
      '평가위원 전원 참석',
      '[FEEDBACK] 17:00~18:00',
    ],
  },
  {
    step: '6',
    title: '평가위원 협의',
    date: '3월 28일(토)',
    dateNote: '평가 당일',
    dateObj: new Date('2026-03-28'),
    icon: '🤝',
    color: '#8b5cf6',
    items: [
      '평가 결과 협의',
      '합격/불합격 결정',
      '평가위원 협의',
      '합격 기준: PM 역량평가 100점 + 가점 10점에서 평균 70점 이상 합격 (=평가총점 ÷ 평가위원수)',
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
  // LCG 난수 (재현 가능) + 워밍업으로 연속 시드 편향 제거
  let s = seed;
  const next = function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  // 워밍업: 첫 10회 결과 버림 (연속 시드 편향 해소)
  for (let i = 0; i < 10; i++) next();
  return next;
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
  // 2차 배정 확정 시 → 피평가자 추적 데이터에도 자동 동기화
  assignments.forEach((a) => {
    updateCandidateTracker(a.candidateId, {
      stage2: {
        status: 'completed',
        stock_transfer: a.stock_transfer,
        nominee_stock: a.nominee_stock,
        temporary_payment: a.temporary_payment,
        assignedAt: a.assignedAt,
        seed: a.seed,
      },
    });
  });
  // Supabase에도 비동기 동기화 (실패해도 localStorage는 유지) + 실행 로그 기록
  syncAssignmentsToSupabase(assignments).catch((err) =>
    console.warn('[Supabase Sync] 2차 배정 동기화 실패:', err)
  );
}

/** 2차 출제 랜덤 배정 실행 로그 기록 (qs_assignment_execution_log) */
export async function logAssignmentExecution(assignments, step = 'assign', executedBy = 'system') {
  if (!supabase) return;
  try {
    const { error } = await supabase.from('qs_assignment_execution_log').insert({
      period_id: ACTIVE_PERIOD_ID,
      step,
      executed_by: executedBy,
      executed_at: new Date().toISOString(),
      assignments_snapshot: assignments?.map((a) => ({
        candidateId: a.candidateId,
        candidateName: a.candidateName,
        stock_transfer: a.stock_transfer,
        nominee_stock: a.nominee_stock,
        temporary_payment: a.temporary_payment,
        seed: a.seed,
      })),
      metadata: { source: 'qs_assignment_store' },
    });
    if (error) throw error;
  } catch (err) {
    console.warn('[Supabase] 실행 로그 기록 실패:', err);
  }
}

// ─── Supabase 동기화: 2차 배정 ─────────────────────────────────
async function syncAssignmentsToSupabase(assignments) {
  if (!supabase) return;
  const rows = assignments.map((a) => ({
    period_id: ACTIVE_PERIOD_ID,
    candidate_id: a.candidateId,
    stock_transfer: a.stock_transfer,
    nominee_stock: a.nominee_stock,
    temporary_payment: a.temporary_payment,
    seed: a.seed,
    assigned_by: 'system',
    assigned_at: a.assignedAt,
  }));
  const { error } = await supabase
    .from('qs_round2_assignments')
    .upsert(rows, { onConflict: 'period_id,candidate_id' });
  if (error) throw error;
  console.log('[Supabase Sync] 2차 배정 동기화 완료:', rows.length, '건');
  // 실행 로그 기록 (테이블 없으면 무시)
  logAssignmentExecution(assignments, 'assign').catch(() => {});
}

// ─── Supabase에서 2차 배정 로드 (localStorage 유실 시 복구용) ───
export async function loadAssignmentsFromSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('qs_round2_assignments')
    .select('*')
    .eq('period_id', ACTIVE_PERIOD_ID);
  if (error) { console.warn('[Supabase] 2차 배정 로드 실패:', error); return null; }
  if (!data || data.length === 0) return null;
  const assignments = data.map((d) => ({
    candidateId: d.candidate_id,
    candidateName: ROUND2_CANDIDATES.find((c) => c.id === d.candidate_id)?.name || d.candidate_id,
    candidateTeam: ROUND2_CANDIDATES.find((c) => c.id === d.candidate_id)?.team || '',
    stock_transfer: d.stock_transfer,
    nominee_stock: d.nominee_stock,
    temporary_payment: d.temporary_payment,
    assignedAt: d.assigned_at,
    seed: d.seed,
  }));
  return { assignments, savedAt: data[0].assigned_at, source: 'supabase' };
}

// ─── 하이브리드 로드: localStorage 우선 → Supabase 폴백 ────────
export async function loadAssignmentsHybrid() {
  const local = loadAssignmentsLocal();
  if (local && local.assignments && local.assignments.length > 0) return local;
  // localStorage 없으면 Supabase에서 복구
  const remote = await loadAssignmentsFromSupabase();
  if (remote) {
    // 복구 데이터를 localStorage에도 캐시
    localStorage.setItem(STORE_KEY, JSON.stringify({
      assignments: remote.assignments,
      savedAt: remote.savedAt,
      recoveredFrom: 'supabase',
    }));
    console.log('[Supabase Recovery] 2차 배정 데이터 복구 완료');
  }
  return remote;
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

// ================================================================
// 피평가자별 단계 추적 시스템 (Candidate Tracker)
// - 전 단계 데이터를 중앙 집중식으로 추적·저장·보관
// - localStorage 키: qs_candidate_tracker
// - 구조: { [candidateId]: { stage1, stage2, stage4, stage5, stage6, stage7, stage8, history[] } }
// ================================================================
const TRACKER_KEY = 'qs_candidate_tracker';

/**
 * 피평가자 추적 데이터 전체 로드
 * @returns {{ [candidateId: string]: CandidateRecord }} 전체 추적 데이터
 */
export function loadCandidateTracker() {
  try {
    const raw = localStorage.getItem(TRACKER_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/**
 * 피평가자 추적 데이터 전체 저장 (localStorage + Supabase 이중)
 */
export function saveCandidateTracker(tracker) {
  localStorage.setItem(TRACKER_KEY, JSON.stringify(tracker));
  // Supabase 비동기 동기화
  syncTrackerToSupabase(tracker).catch((err) =>
    console.warn('[Supabase Sync] 피평가자 추적 동기화 실패:', err)
  );
}

// ─── Supabase 동기화: 피평가자 추적 ────────────────────────────
async function syncTrackerToSupabase(tracker) {
  if (!supabase) return;
  const rows = Object.values(tracker).map((r) => ({
    period_id: ACTIVE_PERIOD_ID,
    candidate_id: r.candidateId,
    candidate_name: r.name,
    team: r.team,
    current_stage: calculateCurrentStageNum(r),
    stage1_data: r.stage1 || { status: 'pending' },
    stage2_data: r.stage2 || { status: 'pending' },
    stage3_data: r.stage3 || { status: 'pending' },
    stage4_data: r.stage4 || { status: 'pending' },
    stage5_data: r.stage5 || { status: 'pending' },
    stage6_data: r.stage6 || { status: 'pending' },
    stage7_data: r.stage7 || { status: 'pending' },
    stage8_data: r.stage8 || { status: 'pending' },
    history: r.history || [],
  }));
  const { error } = await supabase
    .from('qs_candidate_tracker')
    .upsert(rows, { onConflict: 'period_id,candidate_id' });
  if (error) throw error;
}

/** 레코드에서 현재 진행 단계 번호 계산 (1~8) */
function calculateCurrentStageNum(record) {
  const stages = ['stage8', 'stage7', 'stage6', 'stage5', 'stage4', 'stage3', 'stage2', 'stage1'];
  const nums   = [8, 7, 6, 5, 4, 3, 2, 1];
  for (let i = 0; i < stages.length; i++) {
    const s = record[stages[i]];
    if (s && (s.status === 'completed' || s.status === 'in_progress')) {
      return nums[i];
    }
  }
  return 1;
}

// ─── Supabase에서 피평가자 추적 로드 (복구용) ──────────────────
export async function loadTrackerFromSupabase() {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('qs_candidate_tracker')
    .select('*')
    .eq('period_id', ACTIVE_PERIOD_ID);
  if (error) { console.warn('[Supabase] 추적 데이터 로드 실패:', error); return null; }
  if (!data || data.length === 0) return null;
  const tracker = {};
  data.forEach((d) => {
    tracker[d.candidate_id] = {
      candidateId: d.candidate_id,
      name: d.candidate_name,
      team: d.team,
      createdAt: d.created_at,
      lastUpdated: d.updated_at,
      stage1: d.stage1_data,
      stage2: d.stage2_data,
      stage3: d.stage3_data,
      stage4: d.stage4_data,
      stage5: d.stage5_data,
      stage6: d.stage6_data,
      stage7: d.stage7_data,
      stage8: d.stage8_data,
      history: d.history || [],
    };
  });
  return tracker;
}

// ─── 하이브리드 추적 로드: localStorage → Supabase 폴백 ────────
export async function loadTrackerHybrid() {
  const local = loadCandidateTracker();
  if (local && Object.keys(local).length > 0) return local;
  const remote = await loadTrackerFromSupabase();
  if (remote) {
    localStorage.setItem(TRACKER_KEY, JSON.stringify(remote));
    console.log('[Supabase Recovery] 피평가자 추적 데이터 복구 완료');
  }
  return remote || {};
}

/**
 * 특정 피평가자의 추적 데이터 업데이트
 * @param {string} candidateId - 피평가자 ID (kcg, bjy, yhh)
 * @param {object} update - 업데이트할 단계 데이터 (deep merge)
 */
export function updateCandidateTracker(candidateId, update) {
  const tracker = loadCandidateTracker();
  const candidate = ROUND2_CANDIDATES.find((c) => c.id === candidateId);
  if (!candidate) return;

  // 기존 데이터 가져오기 (없으면 초기화)
  const existing = tracker[candidateId] || createEmptyRecord(candidateId, candidate.name, candidate.team);

  // 히스토리에 변경 이력 추가
  const historyEntry = {
    timestamp: new Date().toISOString(),
    action: Object.keys(update).join(', '),
    data: JSON.parse(JSON.stringify(update)),
  };
  existing.history = existing.history || [];
  existing.history.push(historyEntry);
  existing.lastUpdated = new Date().toISOString();

  // 단계별 데이터 deep merge
  Object.keys(update).forEach((key) => {
    if (key === 'history') return; // history는 별도 관리
    existing[key] = { ...(existing[key] || {}), ...update[key] };
  });

  tracker[candidateId] = existing;
  saveCandidateTracker(tracker);
  return tracker;
}

/**
 * 빈 피평가자 레코드 생성
 */
function createEmptyRecord(candidateId, name, team) {
  return {
    candidateId,
    name,
    team,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),

    // ─── 1단계: 1차 출제 (문제 선정) ───
    stage1: {
      status: 'completed',       // 이미 완료
      finalQuestions: {
        stock_transfer: [4, 5, 12],
        nominee_stock: [3, 1, 10],
        temporary_payment: [6, 11, 2],
      },
      completedAt: '2026-02-26T00:00:00.000Z',
    },

    // ─── 2단계: 2차 출제 (랜덤 배정) ───
    stage2: {
      status: 'pending',
      stock_transfer: null,      // 배정된 문제 번호
      nominee_stock: null,
      temporary_payment: null,
      assignedAt: null,
      seed: null,
    },

    // ─── 3단계: 멘토링 ───
    stage3: {
      status: 'pending',
      sessions: [],              // [{ date, mentorId, mentorName, topics, notes }]
    },

    // ─── 4단계: 최종 1문제 추첨 ───
    stage4: {
      status: 'pending',
      selectedCategory: null,    // 추첨된 분야 (stock_transfer / nominee_stock / temporary_payment)
      selectedQuestionId: null,  // 추첨된 문제 번호
      selectedAt: null,          // 추첨 시각
      selectedBy: null,          // 추첨 실행자
    },

    // ─── 5단계: 인증평가 실시 ───
    stage5: {
      status: 'pending',
      evaluationStarted: null,
      evaluationCompleted: null,
    },

    // ─── 6단계: 평가위원 협의 ───
    stage6: {
      status: 'pending',
      finalAverage: null,        // 최종 평균 점수
      bonusScore: null,          // 가점
      passStatus: null,          // 'passed' | 'failed' | null
      decidedAt: null,
      consensusNotes: null,
    },

    // ─── 7단계: 최종 결과 발표 ───
    stage7: {
      status: 'pending',
      announcedAt: null,
      feedback: null,
    },

    // ─── 8단계: 인증서 수여식 ───
    stage8: {
      status: 'pending',
      certificateNumber: null,
      issuedAt: null,
      ceremonyDate: null,
    },

    // ─── 변경 이력 ───
    history: [],
  };
}

/**
 * 전체 피평가자 추적 데이터 초기화 (3명 모두)
 */
export function initializeCandidateTracker() {
  const tracker = {};
  ROUND2_CANDIDATES.forEach((c) => {
    tracker[c.id] = createEmptyRecord(c.id, c.name, c.team);
  });

  // 기존 2차 배정 데이터가 있으면 동기화
  const saved = loadAssignmentsLocal();
  if (saved && saved.assignments) {
    saved.assignments.forEach((a) => {
      if (tracker[a.candidateId]) {
        tracker[a.candidateId].stage2 = {
          status: 'completed',
          stock_transfer: a.stock_transfer,
          nominee_stock: a.nominee_stock,
          temporary_payment: a.temporary_payment,
          assignedAt: a.assignedAt,
          seed: a.seed,
        };
      }
    });
  }

  saveCandidateTracker(tracker);
  return tracker;
}

/**
 * 특정 피평가자의 현재 진행 단계 계산
 */
export function getCandidateCurrentStage(candidateId) {
  const tracker = loadCandidateTracker();
  const record = tracker[candidateId];
  if (!record) return null;

  // 역순으로 완료된 가장 높은 단계 찾기
  const stages = [
    { key: 'stage8', label: '인증서 수여' },
    { key: 'stage7', label: '결과 발표' },
    { key: 'stage6', label: '평가위원 협의' },
    { key: 'stage5', label: '인증평가 실시' },
    { key: 'stage4', label: '최종 추첨' },
    { key: 'stage3', label: '멘토링' },
    { key: 'stage2', label: '2차 출제' },
    { key: 'stage1', label: '1차 출제' },
  ];

  for (const s of stages) {
    if (record[s.key]?.status === 'completed' || record[s.key]?.status === 'in_progress') {
      return { ...s, status: record[s.key].status };
    }
  }
  return { key: 'stage1', label: '1차 출제', status: 'pending' };
}

/**
 * 4단계 최종 1문제 추첨 실행 및 저장
 * @param {string} candidateId - 피평가자 ID
 * @param {string} selectedBy - 추첨 실행자 이름
 * @returns {{ category: string, questionId: number }} 추첨 결과
 */
export function executeFinalDraw(candidateId, selectedBy = '평가위원회') {
  const tracker = loadCandidateTracker();
  const record = tracker[candidateId];
  if (!record || !record.stage2?.stock_transfer) {
    throw new Error('2차 출제 배정이 먼저 완료되어야 합니다.');
  }

  // 배정된 3문제에서 랜덤 1문제 추첨
  const assignedQuestions = [
    { category: 'stock_transfer', questionId: record.stage2.stock_transfer },
    { category: 'nominee_stock', questionId: record.stage2.nominee_stock },
    { category: 'temporary_payment', questionId: record.stage2.temporary_payment },
  ];

  const seed = Date.now();
  const rand = seededRandom(seed);
  const selectedIdx = Math.floor(rand() * assignedQuestions.length);
  const selected = assignedQuestions[selectedIdx];

  const selectedAt = new Date().toISOString();

  // localStorage 추적 저장
  updateCandidateTracker(candidateId, {
    stage4: {
      status: 'completed',
      selectedCategory: selected.category,
      selectedQuestionId: selected.questionId,
      selectedAt,
      selectedBy,
      seed,
      allAssigned: assignedQuestions, // 참고용: 배정된 3문제 기록
    },
  });

  // Supabase에도 비동기 동기화
  syncFinalDrawToSupabase(candidateId, selected, seed, selectedBy, selectedAt, assignedQuestions)
    .catch((err) => console.warn('[Supabase Sync] 4단계 추첨 동기화 실패:', err));

  return selected;
}

// ─── Supabase 동기화: 4단계 추첨 ───────────────────────────────
async function syncFinalDrawToSupabase(candidateId, selected, seed, selectedBy, selectedAt, allAssigned) {
  if (!supabase) return;
  const { error } = await supabase
    .from('qs_final_draw')
    .upsert({
      period_id: ACTIVE_PERIOD_ID,
      candidate_id: candidateId,
      selected_category: selected.category,
      selected_question_id: selected.questionId,
      seed,
      selected_by: selectedBy,
      selected_at: selectedAt,
      all_assigned: allAssigned,
    }, { onConflict: 'period_id,candidate_id' });
  if (error) throw error;
  console.log('[Supabase Sync] 4단계 추첨 동기화 완료:', candidateId);
}

// ─── Supabase에서 4단계 추첨 결과 로드 ─────────────────────────
export async function loadFinalDrawFromSupabase() {
  if (!supabase) return {};
  const { data, error } = await supabase
    .from('qs_final_draw')
    .select('*')
    .eq('period_id', ACTIVE_PERIOD_ID);
  if (error) { console.warn('[Supabase] 추첨 결과 로드 실패:', error); return {}; }
  const results = {};
  (data || []).forEach((d) => {
    results[d.candidate_id] = {
      category: d.selected_category,
      questionId: d.selected_question_id,
      selectedAt: d.selected_at,
      selectedBy: d.selected_by,
      seed: d.seed,
      confirmed: !!d.confirmed_at,
      confirmedAt: d.confirmed_at || null,
    };
  });
  return results;
}

// ─── 4단계 최종 선정 확정 (관리자 확정 버튼 클릭) ─────────────
/**
 * 4단계 최종 1문제 확정 저장
 * - qs_final_draw.confirmed_at 업데이트
 * - qs_candidate_tracker.stage4 → confirmed: true
 * - qs_candidate_tracker.stage5 → in_progress (인증평가 단계 진입)
 * @param {string} candidateId - 피평가자 ID
 * @param {string} category - 선정된 분야 키
 * @param {number} questionId - 선정된 문제 번호
 * @returns {Promise<{ confirmedAt: string }>}
 */
export async function confirmFinalSelection(candidateId, category, questionId) {
  const confirmedAt = new Date().toISOString();

  // 1. localStorage 추적 데이터 업데이트
  updateCandidateTracker(candidateId, {
    stage4: {
      status: 'completed',
      confirmed: true,
      confirmedAt,
      selectedCategory: category,
      selectedQuestionId: questionId,
    },
    stage5: {
      status: 'in_progress',
      startedAt: confirmedAt,
    },
  });

  // 2. Supabase qs_final_draw - confirmed_at 업데이트
  if (supabase) {
    // UPDATE 먼저 시도
    const { error: updateErr } = await supabase
      .from('qs_final_draw')
      .update({ confirmed_at: confirmedAt })
      .eq('period_id', ACTIVE_PERIOD_ID)
      .eq('candidate_id', candidateId);

    if (updateErr) {
      // UPDATE 실패 시 UPSERT 시도 (행 없는 경우)
      const { error: upsertErr } = await supabase
        .from('qs_final_draw')
        .upsert({
          period_id: ACTIVE_PERIOD_ID,
          candidate_id: candidateId,
          selected_category: category,
          selected_question_id: questionId,
          confirmed_at: confirmedAt,
        }, { onConflict: 'period_id,candidate_id' });
      if (upsertErr) {
        console.warn('[Supabase] 최종 확정 저장 실패:', upsertErr);
        throw upsertErr;
      }
    }
    console.log('[Supabase Sync] 최종 선정 확정 저장 완료:', candidateId, `#${questionId}`);
  }

  return { confirmedAt };
}

// ─── Supabase 전체 진행 현황 조회 (뷰 사용) ───────────────────
/**
 * qs_v_candidate_progress 뷰에서 전체 피평가자 진행 현황 로드
 */
export async function loadCandidateProgressFromSupabase() {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('qs_v_candidate_progress')
    .select('*')
    .eq('period_id', ACTIVE_PERIOD_ID);
  if (error) {
    console.warn('[Supabase] 진행 현황 로드 실패:', error);
    return [];
  }
  return data || [];
}

/**
 * 피평가자별 전체 추적 데이터 요약 (관리자 대시보드용)
 */
export function getCandidateTrackerSummary() {
  const tracker = loadCandidateTracker();
  return ROUND2_CANDIDATES.map((c) => {
    const record = tracker[c.id] || createEmptyRecord(c.id, c.name, c.team);
    const stageStatus = getCandidateCurrentStage(c.id);

    return {
      candidateId: c.id,
      name: c.name,
      team: c.team,
      currentStage: stageStatus,
      stage2Questions: record.stage2?.stock_transfer
        ? `#${record.stage2.stock_transfer}, #${record.stage2.nominee_stock}, #${record.stage2.temporary_payment}`
        : '미배정',
      stage4Selected: record.stage4?.selectedQuestionId
        ? `#${record.stage4.selectedQuestionId} (${getCategoryLabel(record.stage4.selectedCategory)})`
        : '미추첨',
      stage6Result: record.stage6?.passStatus
        ? `${record.stage6.passStatus === 'passed' ? '합격' : '불합격'} (${record.stage6.finalAverage}점)`
        : '미결정',
      historyCount: (record.history || []).length,
      lastUpdated: record.lastUpdated,
      record, // 원본 데이터 (상세 보기용)
    };
  });
}

// ================================================================
// 5단계: 인증평가 실시
// ================================================================

/**
 * 5단계 인증평가 시작
 * @param {string} candidateId - 피평가자 ID
 */
export function startEvaluation(candidateId) {
  const startedAt = new Date().toISOString();
  updateCandidateTracker(candidateId, {
    stage5: {
      status: 'in_progress',
      evaluationStarted: startedAt,
    },
  });
  return { startedAt };
}

/**
 * 5단계 인증평가 완료
 * @param {string} candidateId - 피평가자 ID
 */
export function completeEvaluation(candidateId) {
  const completedAt = new Date().toISOString();
  updateCandidateTracker(candidateId, {
    stage5: {
      status: 'completed',
      evaluationCompleted: completedAt,
    },
  });
  return { completedAt };
}

// ================================================================
// 6단계: 평가위원 협의 — 점수 입력, 합격/불합격 결정
// PM 역량평가 100점 + 가점 10점, 평균 70점 이상 합격
// 평균 = 평가총점수 ÷ 평가위원수
// ================================================================

/** 7명 평가위원 목록 */
export const EVALUATORS = ['나동환', '권영도', '권오경', '김홍', '박성현', '윤덕상', '하상현'];

/**
 * 6단계 평가위원 점수 제출 및 합격/불합격 결정
 * @param {string} candidateId - 피평가자 ID
 * @param {Array<{evaluator: string, pmScore: number, bonusScore: number}>} scores
 *   - evaluator: 평가위원 이름
 *   - pmScore: PM 역량평가 점수 (0~100)
 *   - bonusScore: 가점 (0~10)
 * @param {string} [consensusNotes] - 평가위원 협의 메모
 * @returns {{ finalAverage: number, passStatus: string, scores: Array }}
 */
export function submitEvaluatorScores(candidateId, scores, consensusNotes = '') {
  if (!scores || scores.length === 0) {
    throw new Error('최소 1명 이상의 평가위원 점수가 필요합니다.');
  }

  // 각 평가위원별 총점 = pmScore + bonusScore
  const evaluatorTotals = scores.map((s) => ({
    evaluator: s.evaluator,
    pmScore: Math.min(100, Math.max(0, Number(s.pmScore) || 0)),
    bonusScore: Math.min(10, Math.max(0, Number(s.bonusScore) || 0)),
    total: Math.min(100, Math.max(0, Number(s.pmScore) || 0)) + Math.min(10, Math.max(0, Number(s.bonusScore) || 0)),
  }));

  // 평균 = 평가총점수 ÷ 평가위원수
  const totalSum = evaluatorTotals.reduce((sum, s) => sum + s.total, 0);
  const finalAverage = Math.round((totalSum / evaluatorTotals.length) * 100) / 100;

  // 70점 이상 합격
  const passStatus = finalAverage >= 70 ? 'passed' : 'failed';
  const decidedAt = new Date().toISOString();

  // localStorage 추적 저장
  updateCandidateTracker(candidateId, {
    stage5: { status: 'completed' },
    stage6: {
      status: 'completed',
      scores: evaluatorTotals,
      totalSum,
      evaluatorCount: evaluatorTotals.length,
      finalAverage,
      passStatus,
      decidedAt,
      consensusNotes,
    },
  });

  // Supabase 비동기 동기화
  syncCertificationToSupabase(candidateId, {
    finalAverage,
    passStatus,
    scores: evaluatorTotals,
    consensusNotes,
    decidedAt,
  }).catch((err) => console.warn('[Supabase Sync] 6단계 점수 동기화 실패:', err));

  return { finalAverage, passStatus, scores: evaluatorTotals, decidedAt };
}

// ================================================================
// 7단계: 최종 결과 발표
// ================================================================

/**
 * 7단계 결과 발표 (합격/불합격만 공개, 점수 비공개, 개별 피드백)
 * @param {string} candidateId - 피평가자 ID
 * @param {string} feedback - 개별 피드백 내용
 */
export function announceResult(candidateId, feedback = '') {
  const announcedAt = new Date().toISOString();
  updateCandidateTracker(candidateId, {
    stage7: {
      status: 'completed',
      announcedAt,
      feedback,
    },
  });

  // Supabase 동기화 (announced_at 업데이트)
  syncAnnouncementToSupabase(candidateId, announcedAt, feedback)
    .catch((err) => console.warn('[Supabase Sync] 7단계 발표 동기화 실패:', err));

  return { announcedAt };
}

// ================================================================
// 8단계: 인증서 수여식
// ================================================================

/**
 * 8단계 인증서 발급
 * @param {string} candidateId - 피평가자 ID
 * @param {string} certificateNumber - 인증서 번호
 * @param {string} ceremonyDate - 수여식 일자
 */
export function issueCertificate(candidateId, certificateNumber, ceremonyDate = CERT_DATE_STR) {
  const issuedAt = new Date().toISOString();
  updateCandidateTracker(candidateId, {
    stage8: {
      status: 'completed',
      certificateNumber,
      issuedAt,
      ceremonyDate,
    },
  });

  // Supabase 동기화
  syncCertificateToSupabase(candidateId, certificateNumber, issuedAt, ceremonyDate)
    .catch((err) => console.warn('[Supabase Sync] 8단계 인증서 동기화 실패:', err));

  return { certificateNumber, issuedAt, ceremonyDate };
}

/**
 * 인증서 번호 자동 생성
 * 형식: CHIEF-2026-001 (연도-일련번호)
 */
export function generateCertificateNumber(candidateId) {
  const year = new Date().getFullYear();
  const candidateIndex = ROUND2_CANDIDATES.findIndex((c) => c.id === candidateId);
  const seq = String(candidateIndex + 1).padStart(3, '0');
  return `CHIEF-${year}-${seq}`;
}

// ─── Supabase 동기화: 6단계 인증 결과 ────────────────────────────
async function syncCertificationToSupabase(candidateId, data) {
  if (!supabase) return;
  const { error } = await supabase
    .from('qs_certification_results')
    .upsert({
      period_id: ACTIVE_PERIOD_ID,
      candidate_id: candidateId,
      total_score: data.finalAverage,
      pass_status: data.passStatus === 'passed' ? 'pass' : 'fail',
      evaluator_scores: data.scores,
      consensus_notes: data.consensusNotes || null,
      decided_at: data.decidedAt,
    }, { onConflict: 'period_id,candidate_id' });
  if (error) throw error;
  console.log('[Supabase Sync] 인증 결과 동기화 완료:', candidateId, data.passStatus);
}

// ─── Supabase 동기화: 7단계 발표 ────────────────────────────────
async function syncAnnouncementToSupabase(candidateId, announcedAt, feedback) {
  if (!supabase) return;
  const { error } = await supabase
    .from('qs_certification_results')
    .update({
      announced_at: announcedAt,
      feedback: feedback || null,
    })
    .eq('period_id', ACTIVE_PERIOD_ID)
    .eq('candidate_id', candidateId);
  if (error) {
    console.warn('[Supabase] 7단계 발표 UPDATE 실패, UPSERT 시도:', error);
    // UPDATE 실패 시 row가 없을 수 있으므로 무시
  }
}

// ─── Supabase 동기화: 8단계 인증서 ──────────────────────────────
async function syncCertificateToSupabase(candidateId, certificateNumber, issuedAt, ceremonyDate) {
  if (!supabase) return;
  const { error } = await supabase
    .from('qs_certification_results')
    .update({
      certificate_number: certificateNumber,
      issued_at: issuedAt,
      ceremony_date: ceremonyDate,
    })
    .eq('period_id', ACTIVE_PERIOD_ID)
    .eq('candidate_id', candidateId);
  if (error) {
    console.warn('[Supabase] 8단계 인증서 UPDATE 실패:', error);
  }
}

/** 분야 키 → 한글 라벨 변환 */
function getCategoryLabel(catKey) {
  const labels = {
    stock_transfer: '주식 이동',
    nominee_stock: '차명 주식',
    temporary_payment: '가지급금',
  };
  return labels[catKey] || catKey;
}
export { getCategoryLabel };
