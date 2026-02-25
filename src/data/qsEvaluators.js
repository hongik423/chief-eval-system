// 코치 평가위원 데이터 (7명)

export const QS_EVALUATORS = [
  { id: 'chairman', name: '평가위원장', role: '위원장' },
  { id: 'kwon_yd',  name: '권영도',    role: '평가위원' },
  { id: 'kwon_ok',  name: '권오경',    role: '평가위원' },
  { id: 'kim_h',    name: '김홍',      role: '평가위원' },
  { id: 'park_sh',  name: '박성현',    role: '평가위원' },
  { id: 'yoon_ds',  name: '윤덕상',    role: '평가위원' },
  { id: 'ha_sh',    name: '하상현',    role: '평가위원' },
];

const QS_PASSWORD = 'chief2026';

export function findQsEvaluator(name, password) {
  if (password !== QS_PASSWORD) return null;
  return QS_EVALUATORS.find((e) => e.name === name) || null;
}

export function getQsEvaluatorById(id) {
  return QS_EVALUATORS.find((e) => e.id === id) || null;
}
