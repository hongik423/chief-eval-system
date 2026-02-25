// 코치 평가위원 데이터 (7명)
// 초기 비밀번호: 이름 영어 두문자 규칙 (예: 나동환 → ndh)
// 변경된 비밀번호는 localStorage(qs_custom_passwords)에 저장됩니다

const CUSTOM_PW_KEY = 'qs_custom_passwords';

export const QS_EVALUATORS = [
  { id: 'ndh', name: '나동환', role: '평가위원장', defaultPassword: 'ndh' },
  { id: 'kyd', name: '권영도', role: '평가위원',   defaultPassword: 'kyd' },
  { id: 'kok', name: '권오경', role: '평가위원',   defaultPassword: 'kok' },
  { id: 'kh',  name: '김홍',   role: '평가위원',   defaultPassword: 'kh'  },
  { id: 'psh', name: '박성현', role: '평가위원',   defaultPassword: 'psh' },
  { id: 'yds', name: '윤덕상', role: '평가위원',   defaultPassword: 'yds' },
  { id: 'hsh', name: '하상현', role: '평가위원',   defaultPassword: 'hsh' },
];

// 커스텀 비밀번호 맵 조회 (id → password)
export function getCustomPasswords() {
  try {
    const raw = localStorage.getItem(CUSTOM_PW_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

// 특정 평가위원의 실제 비밀번호 (커스텀 > 기본값)
export function getEvaluatorPassword(id) {
  const custom = getCustomPasswords();
  const ev = QS_EVALUATORS.find((e) => e.id === id);
  if (!ev) return null;
  return custom[id] || ev.defaultPassword;
}

// 비밀번호 변경 저장
export function changeEvaluatorPassword(id, newPassword) {
  const custom = getCustomPasswords();
  custom[id] = newPassword;
  localStorage.setItem(CUSTOM_PW_KEY, JSON.stringify(custom));
}

// 비밀번호 초기화 (기본값으로 되돌리기)
export function resetEvaluatorPassword(id) {
  const custom = getCustomPasswords();
  delete custom[id];
  localStorage.setItem(CUSTOM_PW_KEY, JSON.stringify(custom));
}

// 커스텀 비밀번호 여부 확인
export function hasCustomPassword(id) {
  const custom = getCustomPasswords();
  return !!custom[id];
}

// 로그인 검증 (커스텀 비밀번호 우선 적용)
export function findQsEvaluator(name, password) {
  const ev = QS_EVALUATORS.find((e) => e.name === name);
  if (!ev) return null;
  const actual = getEvaluatorPassword(ev.id);
  return actual === password ? ev : null;
}

export function getQsEvaluatorById(id) {
  return QS_EVALUATORS.find((e) => e.id === id) || null;
}
