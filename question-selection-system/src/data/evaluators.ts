// ============================================================
// 코치 평가위원 데이터 (7명)
// ============================================================

export interface Evaluator {
  id: string;
  name: string;
  role: string;
  password: string; // 실제 운영 시 해시 처리 필요
}

export const evaluators: Evaluator[] = [
  {
    id: 'chairman',
    name: '평가위원장',
    role: '위원장',
    password: 'chief2026',
  },
  {
    id: 'kwon_yd',
    name: '권영도',
    role: '평가위원',
    password: 'chief2026',
  },
  {
    id: 'kwon_ok',
    name: '권오경',
    role: '평가위원',
    password: 'chief2026',
  },
  {
    id: 'kim_h',
    name: '김홍',
    role: '평가위원',
    password: 'chief2026',
  },
  {
    id: 'park_sh',
    name: '박성현',
    role: '평가위원',
    password: 'chief2026',
  },
  {
    id: 'yoon_ds',
    name: '윤덕상',
    role: '평가위원',
    password: 'chief2026',
  },
  {
    id: 'ha_sh',
    name: '하상현',
    role: '평가위원',
    password: 'chief2026',
  },
];

export function findEvaluator(name: string, password: string): Evaluator | undefined {
  return evaluators.find((e) => e.name === name && e.password === password);
}

export function getEvaluatorById(id: string): Evaluator | undefined {
  return evaluators.find((e) => e.id === id);
}
