// ─── 평가 기간 ID (Supabase seed와 동일) ───
export const CURRENT_PERIOD_ID = 'a0000000-0000-0000-0000-000000000001';

// ─── 기본 평가위원 데이터 ───
export const DEFAULT_EVALUATORS = [
  { id: 'ndh', name: '나동환', role: '평가위원장', team: '대표' },
  { id: 'kyd', name: '권영도', role: '평가위원', team: 'B팀' },
  { id: 'kok', name: '권오경', role: '평가위원', team: 'C팀' },
  { id: 'kh',  name: '김홍',   role: '평가위원', team: '컨설팅6본부' },
  { id: 'kjh', name: '강지훈', role: '평가위원', team: '임원실' },
  { id: 'psh', name: '박성현', role: '평가위원', team: 'D팀' },
  { id: 'yds', name: '윤덕상', role: '평가위원', team: 'E팀' },
  { id: 'hsh', name: '하상현', role: '평가위원', team: 'F팀' },
];

// ─── 기본 응시자 데이터 ───
export const DEFAULT_CANDIDATES = [
  { id: 'kcg', name: '김창곤', team: '컨설팅6본부',     phone: '010-9845-9183', email: 'kcg@stellain.com', status: 'registered' },
  { id: 'bjy', name: '백진영', team: '미정',           phone: null, email: null, status: 'registered' },
  { id: 'yhh', name: '양현호', team: '무소속', phone: '010-3794-0404', email: 'yhh@stellain.com', status: 'registered' },
];

// ─── 최종확정 평가 기준 (2026년 치프인증 — 2026-03-16 확정) ───
export const DEFAULT_CRITERIA = {
  sections: [
    {
      id: 'A',
      label: '커뮤니케이션(인터뷰) 역량',
      maxScore: 50,
      evalMethod: '인터뷰 (1:1 롤플레이) · 별첨자료 활용 점검: RFN, NDA',
      sortOrder: 1,
    },
    {
      id: 'B',
      label: '결과보기 제안능력',
      maxScore: 40,
      evalMethod: 'PT (프레젠테이션 / 결과보기 롤플레이)',
      sortOrder: 2,
    },
    {
      id: 'C',
      label: '실행설계와 위험고지',
      maxScore: 10,
      evalMethod: 'PT (실무 설계 기반)',
      sortOrder: 3,
    },
  ],
  items: [
    // ── A 영역 (50점) ──────────────────────────────────────────
    {
      id: 'A1',
      sectionId: 'A',
      label: '고객과의 관계 정립 + 브랜드 소개',
      maxScore: 20,
      description: '고객과의 첫 만남에서 신뢰를 형성하고, 기업의별 브랜드와 치프의 역할·차별점을 명확히 소개하는 역량',
      sortOrder: 1,
    },
    {
      id: 'A2',
      sectionId: 'A',
      label: '이슈 인터뷰 (Hidden Interest 찾기)',
      maxScore: 20,
      description: '구조화된 인터뷰를 통해 고객의 표면적 발언 이면에 있는 숨겨진 관심사(Hidden Interest)를 발굴하는 역량',
      sortOrder: 2,
    },
    {
      id: 'A3',
      sectionId: 'A',
      label: '거절처리와 차별화 포인트',
      maxScore: 10,
      description: '고객의 가격·기간·필요성 거절에 능숙하게 대응하고, 기업의별 치프 서비스의 차별화 포인트를 설득력 있게 제시하는 역량',
      sortOrder: 3,
    },

    // ── B 영역 (40점) ──────────────────────────────────────────
    {
      id: 'B1',
      sectionId: 'B',
      label: '문제정의 및 설명 능력',
      maxScore: 10,
      description: '고객의 핵심 이슈를 구조화하여 명확히 정의하고, 문제의 위험성과 긴박성을 수치 기반으로 설명하는 역량',
      sortOrder: 1,
    },
    {
      id: 'B2',
      sectionId: 'B',
      label: '솔루션(스토리) 전달 및 설득력',
      maxScore: 10,
      description: '고객이 이해하고 공감할 수 있는 솔루션 스토리를 구성하고, 반론에 설득력 있게 응대하는 역량',
      sortOrder: 2,
    },
    {
      id: 'B3',
      sectionId: 'B',
      label: '스마트빌 명분과 솔루션 연계',
      maxScore: 20,
      description: '스마트빌의 명분(통합 전문가 팀, 계약 기반 책임 컨설팅, 사후관리 체계)을 고객 문제 상황과 정확히 연계하여 설득하는 역량',
      sortOrder: 3,
    },

    // ── C 영역 (10점) ──────────────────────────────────────────
    {
      id: 'C1',
      sectionId: 'C',
      label: '업무요약서 작성 및 설명',
      maxScore: 5,
      description: '인터뷰 내용을 바탕으로 고객 상황·이슈·제안 방향이 정리된 업무요약서를 작성하고, 고객이 이해하기 쉽게 설명하는 역량',
      sortOrder: 1,
    },
    {
      id: 'C2',
      sectionId: 'C',
      label: '리스크 관리(위험고지) 및 대응 고지',
      maxScore: 5,
      description: '프로젝트 진행 시 발생 가능한 리스크를 고객에게 명확히 고지하고, 각 리스크에 대한 대응 방안과 책임 범위를 투명하게 설명하는 역량',
      sortOrder: 2,
    },
  ],
};

// ─── 일정 데이터 ───
export const SCHEDULE = [
  { date: '2/12(목)', label: '공고 발표', status: 'done' },
  { date: '2/12~2/20', label: '지원서 접수 및 자격 검증', status: 'done' },
  { date: '2/23(월)', label: '평가제도 안내 / 역량강화코칭', status: 'active' },
  { date: '2/26(목)', label: '1차 출제 - TEST RED 9문제 배포', status: 'upcoming' },
  { date: '3/18(수)', label: '2차 출제 - 최종 3문제 선정 배포', status: 'upcoming' },
  { date: '3/28(토)', label: 'TEST RED 평가 실시 (PT + 인터뷰)', status: 'upcoming' },
  { date: '3/31(화)', label: '평가위원 협의 및 결과 발표', status: 'upcoming' },
  { date: '4월 TAG일', label: '인증서 수여식', status: 'upcoming' },
];

// ─── 관리자 (강선애 | 이후경) 아이디·비밀번호 (.env.local에서 설정) ───
export const ADMIN_ID = import.meta.env.VITE_ADMIN_ID || 'ksa';
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'ksa';

// ─── 평가 관련 상수 ───
export const PASS_SCORE = 70;
export const TOTAL_MAX_SCORE = 110;
export const BONUS_MAX = 10;
