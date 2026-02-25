// 코치 평가위원 데이터 (7명)
// 비밀번호: 본인 이름의 앞 두 글자

export const QS_EVALUATORS = [
  { id: 'chairman', name: '평가위원장', role: '위원장',  password: '평가' },
  { id: 'kwon_yd',  name: '권영도',    role: '평가위원', password: '권영' },
  { id: 'kwon_ok',  name: '권오경',    role: '평가위원', password: '권오' },
  { id: 'kim_h',    name: '김홍',      role: '평가위원', password: '김홍' },
  { id: 'park_sh',  name: '박성현',    role: '평가위원', password: '박성' },
  { id: 'yoon_ds',  name: '윤덕상',    role: '평가위원', password: '윤덕' },
  { id: 'ha_sh',    name: '하상현',    role: '평가위원', password: '하상' },
];

export function findQsEvaluator(name, password) {
  return QS_EVALUATORS.find((e) => e.name === name && e.password === password) || null;
}

export function getQsEvaluatorById(id) {
  return QS_EVALUATORS.find((e) => e.id === id) || null;
}
