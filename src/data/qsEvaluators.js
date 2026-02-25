// 코치 평가위원 데이터 (7명)
// 비밀번호: 기존 치프인증 로그인 ID와 동일

export const QS_EVALUATORS = [
  { id: 'ndh',  name: '나동환', role: '평가위원장', password: 'ndh' },
  { id: 'kyd',  name: '권영도', role: '평가위원',   password: 'kyd' },
  { id: 'kok',  name: '권오경', role: '평가위원',   password: 'kok' },
  { id: 'kh',   name: '김홍',   role: '평가위원',   password: 'kh'  },
  { id: 'psh',  name: '박성현', role: '평가위원',   password: 'psh' },
  { id: 'yds',  name: '윤덕상', role: '평가위원',   password: 'yds' },
  { id: 'hsh',  name: '하상현', role: '평가위원',   password: 'hsh' },
];

export function findQsEvaluator(name, password) {
  return QS_EVALUATORS.find((e) => e.name === name && e.password === password) || null;
}

export function getQsEvaluatorById(id) {
  return QS_EVALUATORS.find((e) => e.id === id) || null;
}
