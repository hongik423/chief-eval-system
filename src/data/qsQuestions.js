// 치프인증 TEST 케이스 문제은행 - 21문제 데이터

export const QS_CATEGORIES = {
  stock_transfer: {
    label: '주식 이동 프로젝트 설계',
    color: '#2563EB',
    icon: '📊',
    bgGradient: 'from-blue-500 to-blue-700',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-700',
    ringColor: 'ring-blue-200',
    questionIds: [1, 2, 3, 4, 5, 6, 7],
  },
  nominee_stock: {
    label: '차명 주식 해소 프로젝트 설계',
    color: '#7C3AED',
    icon: '🔐',
    bgGradient: 'from-purple-500 to-purple-700',
    lightBg: 'bg-purple-50',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-700',
    ringColor: 'ring-purple-200',
    questionIds: [8, 9, 10, 11, 12, 13, 14],
  },
  temporary_payment: {
    label: '가지급금 정리 프로젝트 설계',
    color: '#059669',
    icon: '💰',
    bgGradient: 'from-emerald-500 to-emerald-700',
    lightBg: 'bg-emerald-50',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-700',
    ringColor: 'ring-emerald-200',
    questionIds: [15, 16, 17, 18, 19, 20, 21],
  },
};

export const QS_QUESTIONS = {
  // 분야 1: 주식 이동 프로젝트 설계
  1:  { title: 'Cloud A사 - 가업승계 전략',           submitter: '김홍',    issue: '가업승계 증여세 과세특례 및 기업가치 관리',               difficulty: 3, category: 'stock_transfer' },
  2:  { title: '제조 B사 - 지분 분산 및 경영권 강화',  submitter: '권영도',  issue: '형제간 지분 분쟁 예방 및 경영권 안정화',                  difficulty: 3, category: 'stock_transfer' },
  3:  { title: 'IT서비스 C사 - 스톡옵션 연계 승계',    submitter: '권오경',  issue: '핵심인재 유지와 연계한 단계적 지분 이전',                  difficulty: 3, category: 'stock_transfer' },
  4:  { title: '유통 D사 - 가족 법인 활용 승계',       submitter: '박성현',  issue: '개인 지분의 가족법인 이전을 통한 절세 승계',               difficulty: 4, category: 'stock_transfer' },
  5:  { title: '건설 E사 - 합병을 통한 지분 구조조정', submitter: '윤덕상',  issue: '계열사 합병을 활용한 지배구조 개편',                       difficulty: 4, category: 'stock_transfer' },
  6:  { title: '식품 F사 - 물적분할 후 지분 이전',     submitter: '하상현',  issue: '사업부 물적분할을 통한 승계 대상 기업가치 축소',           difficulty: 4, category: 'stock_transfer' },
  7:  { title: '바이오 G사 - IPO 전 긴급 승계',        submitter: '평가위원장', issue: 'IPO 추진 중 급격한 기업가치 상승 전 선제적 승계',      difficulty: 5, category: 'stock_transfer' },

  // 분야 2: 차명 주식 해소 프로젝트 설계
  8:  { title: '화학 D사 - 긴급 차명주식 회수',        submitter: '김홍',    issue: '명의신탁주식 실제소유자 확인 및 상속 리스크 관리',         difficulty: 3, category: 'nominee_stock' },
  9:  { title: '물류 H사 - 전직 임원 차명주식',        submitter: '권영도',  issue: '퇴직 임원 명의 차명주식 회수 및 소송 리스크 관리',         difficulty: 3, category: 'nominee_stock' },
  10: { title: '섬유 I사 - 친인척 차명 다수 분산',     submitter: '권오경',  issue: '친인척 다수에 분산된 차명주식의 체계적 정리',              difficulty: 3, category: 'nominee_stock' },
  11: { title: '전자부품 J사 - 해외법인 차명',         submitter: '박성현',  issue: '해외법인 경유 차명주식의 국제세무 리스크 관리',            difficulty: 4, category: 'nominee_stock' },
  12: { title: '의료기기 K사 - 상속 발생 후 차명',     submitter: '윤덕상',  issue: '피상속인 사망 후 발견된 차명주식 처리',                   difficulty: 4, category: 'nominee_stock' },
  13: { title: '건축자재 L사 - 위장분산 차명',         submitter: '하상현',  issue: '과점주주 회피 목적 위장분산 차명의 긴급 정상화',           difficulty: 4, category: 'nominee_stock' },
  14: { title: '반도체소재 M사 - 복합 차명 구조',      submitter: '평가위원장', issue: '차명+교차소유+순환출자 복합구조 일괄 정리',            difficulty: 5, category: 'nominee_stock' },

  // 분야 3: 가지급금 정리 프로젝트 설계
  15: { title: '건재 M사 - 특허권 활용 정리',          submitter: '김홍',    issue: '특허권 활용 및 이익소각을 통한 SP(가지급금) 정리',         difficulty: 3, category: 'temporary_payment' },
  16: { title: '인쇄 N사 - 부동산 현물변제',           submitter: '권영도',  issue: '대표이사 부동산 현물변제를 통한 대규모 가지급금 해소',     difficulty: 3, category: 'temporary_payment' },
  17: { title: '소프트웨어 O사 - 급여체계 개편 정리',  submitter: '권오경',  issue: '임원 급여체계 재설계를 통한 가지급금 단계적 해소',         difficulty: 3, category: 'temporary_payment' },
  18: { title: '기계설비 P사 - 배당 활용 정리',        submitter: '박성현',  issue: '특별배당 및 중간배당을 활용한 가지급금 상쇄',              difficulty: 4, category: 'temporary_payment' },
  19: { title: '화장품 Q사 - 매출채권 활용 정리',      submitter: '윤덕상',  issue: '대표이사 관계사 매출채권 상계를 통한 가지급금 해소',       difficulty: 4, category: 'temporary_payment' },
  20: { title: '물류 R사 - 복합 가지급금 긴급 정리',   submitter: '하상현',  issue: '세무조사 사전통지 후 복합 가지급금 긴급 대응',             difficulty: 4, category: 'temporary_payment' },
  21: { title: '종합상사 S사 - 해외법인 가지급금',     submitter: '평가위원장', issue: '해외법인 경유 가지급금의 국제세무 복합 리스크 해소',   difficulty: 5, category: 'temporary_payment' },
};

export const QS_PDF_URL =
  'https://drive.google.com/file/d/1e3xqEpIarKz3KuGKLm5yTwQt3nmybhpM/view?usp=sharing';
