// ─── 평가 기간 ID (Supabase seed와 동일) ───
export const CURRENT_PERIOD_ID = 'a0000000-0000-0000-0000-000000000001';

// ─── 기본 평가위원 데이터 ───
export const DEFAULT_EVALUATORS = [
  { id: 'ndh', name: '나동환', role: '평가위원장', team: '대표' },
  { id: 'kyd', name: '권영도', role: '평가위원', team: 'B팀' },
  { id: 'kok', name: '권오경', role: '평가위원', team: 'C팀' },
  { id: 'kh',  name: '김홍',   role: '평가위원', team: '컨설팅6본부' },
  { id: 'psh', name: '박성현', role: '평가위원', team: 'D팀' },
  { id: 'yds', name: '윤덕상', role: '평가위원', team: 'E팀' },
  { id: 'hsh', name: '하상현', role: '평가위원', team: 'F팀' },
];

// ─── 기본 응시자 데이터 ───
export const DEFAULT_CANDIDATES = [
  { id: 'kmk', name: '김민경', team: '미정',           phone: null, email: null, status: 'registered' },
  { id: 'kcg', name: '김창곤', team: '컨설팅6본부',     phone: '010-9845-9183', email: 'kcg@stellain.com', status: 'registered' },
  { id: 'bjy', name: '백진영', team: '미정',           phone: null, email: null, status: 'registered' },
  { id: 'yhh', name: '양현호', team: '월드클래스코리아', phone: '010-3794-0404', email: 'yhh@stellain.com', status: 'registered' },
];

// ─── 기본 평가 기준 (수정 가능 구조) ───
export const DEFAULT_CRITERIA = {
  sections: [
    { id: 'A', label: '세무사 협력 커뮤니케이션 역량', maxScore: 50, evalMethod: '인터뷰 (1:1 롤플레이)', sortOrder: 1 },
    { id: 'B', label: '고객 솔루션 제안 커뮤니케이션 역량', maxScore: 30, evalMethod: 'PT (프레젠테이션)', sortOrder: 2 },
    { id: 'C', label: '프로젝트 설계 및 실무 역량', maxScore: 20, evalMethod: 'PT (프레젠테이션)', sortOrder: 3 },
  ],
  items: [
    { id: 'A1', sectionId: 'A', label: '세무사 응대 및 관계 구축 능력', maxScore: 20, description: '세무사와의 초기 접점 형성, 신뢰 구축, 전문성 인지 등', sortOrder: 1 },
    { id: 'A2', sectionId: 'A', label: '프로젝트 협의 커뮤니케이션 스킬', maxScore: 20, description: '프로젝트 범위·일정·역할 협의 시 커뮤니케이션 역량', sortOrder: 2 },
    { id: 'A3', sectionId: 'A', label: '치프-세무사-고객 간 인터페이스 조율 역량', maxScore: 10, description: '삼자 간 이해관계 조율 및 정보 중개 역량', sortOrder: 3 },
    { id: 'B1', sectionId: 'B', label: '고객 문제 진단 및 설명 능력', maxScore: 10, description: '고객의 핵심 이슈를 구조화하여 설명하는 능력', sortOrder: 1 },
    { id: 'B2', sectionId: 'B', label: '솔루션 제안 전달력 및 설득력', maxScore: 10, description: '솔루션을 명확하고 설득력 있게 전달하는 역량', sortOrder: 2 },
    { id: 'B3', sectionId: 'B', label: '금융/법률 연계 방안 제시 능력', maxScore: 10, description: '세무 외 금융·법률 등 연계 솔루션 제안 역량', sortOrder: 3 },
    { id: 'C1', sectionId: 'C', label: '프로젝트 목표 및 범위 정의', maxScore: 10, description: '프로젝트의 목표·범위·산출물을 명확히 정의', sortOrder: 1 },
    { id: 'C2', sectionId: 'C', label: '단계별 실행 계획 수립', maxScore: 5, description: '타임라인, 마일스톤, 담당자 배정 등 실행 계획', sortOrder: 2 },
    { id: 'C3', sectionId: 'C', label: '리스크 관리 및 대응 전략', maxScore: 5, description: '잠재 리스크 식별 및 대응 방안 수립', sortOrder: 3 },
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

// ─── 관리자 (이후경) 아이디·비밀번호 (.env.local에서 설정) ───
export const ADMIN_ID = import.meta.env.VITE_ADMIN_ID || 'lhk';
export const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'lhk';

// ─── 평가 관련 상수 ───
export const PASS_SCORE = 70;
export const TOTAL_MAX_SCORE = 110;
export const BONUS_MAX = 10;
