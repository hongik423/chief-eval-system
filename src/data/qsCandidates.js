/**
 * 2차 출제 인증대상 피평가자 정의
 * 로그인 ID: 각자 고유 토큰 기반 초기 비밀번호
 */

export const QS_CANDIDATES = [
  {
    id: 'kcg',
    name: '김창곤',
    team: '컨설팅6본부',
    defaultPassword: 'kcg2026',
  },
  {
    id: 'bjy',
    name: '백진영',
    team: '권영도 코치',
    defaultPassword: 'bjy2026',
  },
  {
    id: 'yhh',
    name: '양현호',
    team: '무소속',
    defaultPassword: 'yhh2026',
  },
];

// 피평가자 비밀번호 저장 키
const CANDIDATE_PW_KEY = 'qs_candidate_passwords';

function loadCandidatePasswords() {
  try {
    return JSON.parse(localStorage.getItem(CANDIDATE_PW_KEY) || '{}');
  } catch {
    return {};
  }
}

export function getCandidatePassword(candidateId) {
  const stored = loadCandidatePasswords();
  if (stored[candidateId]) return stored[candidateId];
  return QS_CANDIDATES.find((c) => c.id === candidateId)?.defaultPassword || '';
}

export function findQsCandidate(id, password) {
  const candidate = QS_CANDIDATES.find((c) => c.id === id);
  if (!candidate) return null;
  const actual = getCandidatePassword(id);
  return password === actual ? candidate : null;
}

// sessionStorage 세션 키
export const QS_CANDIDATE_SESSION_KEY = 'qs_candidate_user';

export function getQsCandidateSession() {
  try {
    const raw = sessionStorage.getItem(QS_CANDIDATE_SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setQsCandidateSession(candidate) {
  sessionStorage.setItem(QS_CANDIDATE_SESSION_KEY, JSON.stringify(candidate));
}

export function clearQsCandidateSession() {
  sessionStorage.removeItem(QS_CANDIDATE_SESSION_KEY);
}
