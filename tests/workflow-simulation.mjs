#!/usr/bin/env node
// ================================================================
// 워크플로우 시뮬레이션 테스트 (Node.js 독립 실행)
// - qsAssignmentStore.js의 순수 로직을 Node 환경에서 검증
// - localStorage/Supabase 의존성 없이 핵심 데이터 정합성 테스트
// ================================================================

// ─── 테스트 유틸 ────────────────────────────────────────────────
let passed = 0;
let failed = 0;
function assert(condition, msg) {
  if (condition) { passed++; console.log(`  ✅ ${msg}`); }
  else { failed++; console.error(`  ❌ FAIL: ${msg}`); }
}

// ─── 시드 랜덤 (qsAssignmentStore.js와 동일) ──────────────────
function seededRandom(seed) {
  let s = seed;
  const next = function () {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
  // 워밍업: 첫 10회 결과 버림 (연속 시드 편향 해소)
  for (let i = 0; i < 10; i++) next();
  return next;
}

// ─── 상수 재현 ─────────────────────────────────────────────────
const ROUND2_CANDIDATES = [
  { id: 'kcg', name: '김창곤', team: '컨설팅6본부' },
  { id: 'bjy', name: '백진영', team: '미정' },
  { id: 'yhh', name: '양현호', team: '월드클래스코리아' },
];

const ROUND2_QUESTION_POOL = {
  stock_transfer:    [4, 5, 12],
  nominee_stock:     [3, 1, 10],
  temporary_payment: [6, 11, 2],
};

// ─── 테스트 1: 2차 출제 배정 정합성 ────────────────────────────
console.log('\n🔬 테스트 1: 2차 출제 랜덤 배정 정합성');

function generateRandomAssignments(useTimeSeed = true) {
  const seed = useTimeSeed ? Date.now() : 20260318;
  const rand = seededRandom(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  return ROUND2_CANDIDATES.map((c) => ({
    candidateId: c.id,
    candidateName: c.name,
    candidateTeam: c.team,
    stock_transfer:    pick(ROUND2_QUESTION_POOL.stock_transfer),
    nominee_stock:     pick(ROUND2_QUESTION_POOL.nominee_stock),
    temporary_payment: pick(ROUND2_QUESTION_POOL.temporary_payment),
    assignedAt: new Date().toISOString(),
    seed,
  }));
}

// 고정 시드 결과 재현성 테스트
const a1 = generateRandomAssignments(false);
const a2 = generateRandomAssignments(false);
// 타임스탬프 제외하고 배정 데이터만 비교
const stripTs = (arr) => arr.map(({assignedAt, ...rest}) => rest);
assert(JSON.stringify(stripTs(a1)) === JSON.stringify(stripTs(a2)), '고정 시드(20260318)로 동일한 배정 재현됨');
assert(a1.length === 3, '피평가자 3명 모두 배정됨');

a1.forEach((a) => {
  assert(ROUND2_QUESTION_POOL.stock_transfer.includes(a.stock_transfer),
    `${a.candidateName}: 주식이동 #${a.stock_transfer} ∈ [4,5,12]`);
  assert(ROUND2_QUESTION_POOL.nominee_stock.includes(a.nominee_stock),
    `${a.candidateName}: 차명주식 #${a.nominee_stock} ∈ [3,1,10]`);
  assert(ROUND2_QUESTION_POOL.temporary_payment.includes(a.temporary_payment),
    `${a.candidateName}: 가지급금 #${a.temporary_payment} ∈ [6,11,2]`);
});

// ─── 테스트 2: URL 토큰 인코딩/디코딩 정합성 ──────────────────
console.log('\n🔬 테스트 2: URL 토큰 인코딩/디코딩');

function encodeToken(assignment) {
  return `${assignment.candidateId}-${assignment.stock_transfer}-${assignment.nominee_stock}-${assignment.temporary_payment}`;
}

function decodeToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('-');
  if (parts.length !== 4) return null;
  const [candidateId, stRaw, nsRaw, tpRaw] = parts;
  const candidate = ROUND2_CANDIDATES.find((c) => c.id === candidateId);
  if (!candidate) return null;
  const stQ = parseInt(stRaw, 10);
  const nsQ = parseInt(nsRaw, 10);
  const tpQ = parseInt(tpRaw, 10);
  if (!ROUND2_QUESTION_POOL.stock_transfer.includes(stQ)) return null;
  if (!ROUND2_QUESTION_POOL.nominee_stock.includes(nsQ)) return null;
  if (!ROUND2_QUESTION_POOL.temporary_payment.includes(tpQ)) return null;
  return { candidate, questions: { stock_transfer: stQ, nominee_stock: nsQ, temporary_payment: tpQ } };
}

a1.forEach((a) => {
  const token = encodeToken(a);
  const decoded = decodeToken(token);
  assert(decoded !== null, `${a.candidateName}: 토큰 "${token}" 디코딩 성공`);
  assert(decoded.questions.stock_transfer === a.stock_transfer, `  주식이동 문제번호 일치`);
  assert(decoded.questions.nominee_stock === a.nominee_stock, `  차명주식 문제번호 일치`);
  assert(decoded.questions.temporary_payment === a.temporary_payment, `  가지급금 문제번호 일치`);
});

// 잘못된 토큰 테스트
assert(decodeToken(null) === null, 'null 토큰 → null');
assert(decodeToken('') === null, '빈 토큰 → null');
assert(decodeToken('invalid') === null, '잘못된 형식 → null');
assert(decodeToken('xxx-1-1-1') === null, '존재하지 않는 후보자 → null');
assert(decodeToken('kcg-99-1-2') === null, '풀에 없는 문제번호 → null');

// ─── 테스트 3: 4단계 최종 추첨 정합성 ─────────────────────────
console.log('\n🔬 테스트 3: 4단계 최종 1문제 추첨 정합성');

function executeFinalDraw(assignment) {
  const assignedQuestions = [
    { category: 'stock_transfer', questionId: assignment.stock_transfer },
    { category: 'nominee_stock', questionId: assignment.nominee_stock },
    { category: 'temporary_payment', questionId: assignment.temporary_payment },
  ];
  const seed = Date.now();
  const rand = seededRandom(seed);
  const selectedIdx = Math.floor(rand() * assignedQuestions.length);
  const selected = assignedQuestions[selectedIdx];
  return { ...selected, seed, allAssigned: assignedQuestions, selectedIdx };
}

// 추첨 100회 반복하여 결과 분포 확인
const draws = {};
for (let i = 0; i < 300; i++) {
  const draw = executeFinalDraw(a1[0]); // 김창곤
  draws[draw.category] = (draws[draw.category] || 0) + 1;
  // 추첨 결과가 배정된 3문제 중 하나인지 확인
  const validCategories = ['stock_transfer', 'nominee_stock', 'temporary_payment'];
  if (i < 3) { // 처음 3회만 상세 검증
    assert(validCategories.includes(draw.category),
      `추첨 #${i+1}: ${draw.category} #${draw.questionId} (유효한 분야)`);
    assert(draw.questionId === a1[0][draw.category],
      `추첨 #${i+1}: 문제번호 ${draw.questionId} == 배정번호 ${a1[0][draw.category]}`);
  }
}

console.log(`  📊 추첨 분포 (300회): 주식이동=${draws.stock_transfer || 0}, 차명주식=${draws.nominee_stock || 0}, 가지급금=${draws.temporary_payment || 0}`);
assert(Object.keys(draws).length >= 2, '추첨이 2개 이상 분야에 분산됨 (편향 없음)');

// ─── 테스트 4: 시드 재현성 ─────────────────────────────────────
console.log('\n🔬 테스트 4: 시드 기반 재현성');

const fixedSeed = 1234567890;
const rand1 = seededRandom(fixedSeed);
const rand2 = seededRandom(fixedSeed);
const seq1 = [rand1(), rand1(), rand1(), rand1(), rand1()];
const seq2 = [rand2(), rand2(), rand2(), rand2(), rand2()];
assert(JSON.stringify(seq1) === JSON.stringify(seq2), '동일 시드 → 동일 난수 시퀀스');

// 다른 시드는 다른 결과
const rand3 = seededRandom(fixedSeed + 1);
const seq3 = [rand3(), rand3(), rand3()];
assert(JSON.stringify(seq1.slice(0,3)) !== JSON.stringify(seq3), '다른 시드 → 다른 난수 시퀀스');

// ─── 테스트 5: Candidate Tracker 데이터 구조 정합성 ────────────
console.log('\n🔬 테스트 5: Candidate Tracker 데이터 구조');

function createEmptyRecord(candidateId, name, team) {
  return {
    candidateId, name, team,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    stage1: { status: 'completed', finalQuestions: { stock_transfer: [4,5,12], nominee_stock: [3,1,10], temporary_payment: [6,11,2] }, completedAt: '2026-02-26' },
    stage2: { status: 'pending', stock_transfer: null, nominee_stock: null, temporary_payment: null, assignedAt: null, seed: null },
    stage3: { status: 'pending', sessions: [] },
    stage4: { status: 'pending', selectedCategory: null, selectedQuestionId: null, selectedAt: null, selectedBy: null },
    stage5: { status: 'pending', evaluationStarted: null, evaluationCompleted: null },
    stage6: { status: 'pending', finalAverage: null, bonusScore: null, passStatus: null, decidedAt: null, consensusNotes: null },
    stage7: { status: 'pending', announcedAt: null, feedback: null },
    stage8: { status: 'pending', certificateNumber: null, issuedAt: null, ceremonyDate: null },
    history: [],
  };
}

const record = createEmptyRecord('kcg', '김창곤', '컨설팅6본부');
assert(record.candidateId === 'kcg', '레코드 ID 일치');
assert(record.stage1.status === 'completed', 'stage1 완료 상태');
assert(record.stage2.status === 'pending', 'stage2 대기 상태');
assert(Array.isArray(record.history), 'history 배열 초기화됨');

// 단계별 업데이트 시뮬레이션
const assignment = a1.find(a => a.candidateId === 'kcg');
record.stage2 = {
  status: 'completed',
  stock_transfer: assignment.stock_transfer,
  nominee_stock: assignment.nominee_stock,
  temporary_payment: assignment.temporary_payment,
  assignedAt: new Date().toISOString(),
  seed: assignment.seed,
};
record.history.push({ timestamp: new Date().toISOString(), action: 'stage2', data: { ...record.stage2 } });

assert(record.stage2.status === 'completed', '2차 배정 후 stage2 완료');
assert(record.stage2.stock_transfer !== null, '2차 배정 문제번호 기록됨');
assert(record.history.length === 1, '히스토리 1건 기록됨');

// 4단계 추첨 시뮬레이션
const drawResult = executeFinalDraw(assignment);
record.stage4 = {
  status: 'completed',
  selectedCategory: drawResult.category,
  selectedQuestionId: drawResult.questionId,
  selectedAt: new Date().toISOString(),
  selectedBy: '평가위원회',
  seed: drawResult.seed,
  allAssigned: drawResult.allAssigned,
};
record.history.push({ timestamp: new Date().toISOString(), action: 'stage4', data: { ...record.stage4 } });

assert(record.stage4.status === 'completed', '4단계 추첨 완료');
assert(record.stage4.selectedQuestionId === assignment[drawResult.category], '추첨 문제가 배정 문제와 일치');
assert(record.history.length === 2, '히스토리 2건 기록됨');

// ─── 테스트 6: Supabase 스키마 매핑 정합성 ─────────────────────
console.log('\n🔬 테스트 6: Supabase 스키마 매핑 검증');

// qs_round2_assignments 매핑
const supabaseRow = {
  period_id: 'a0000000-0000-0000-0000-000000000001',
  candidate_id: assignment.candidateId,
  stock_transfer: assignment.stock_transfer,
  nominee_stock: assignment.nominee_stock,
  temporary_payment: assignment.temporary_payment,
  seed: assignment.seed,
  assigned_by: 'system',
  assigned_at: assignment.assignedAt,
};
assert(supabaseRow.candidate_id === 'kcg', 'Supabase row: candidate_id 매핑 정확');
assert(typeof supabaseRow.stock_transfer === 'number', 'Supabase row: stock_transfer 타입 number');
assert(supabaseRow.period_id.length === 36, 'Supabase row: period_id UUID 형식');

// qs_final_draw 매핑
const drawRow = {
  period_id: 'a0000000-0000-0000-0000-000000000001',
  candidate_id: 'kcg',
  selected_category: drawResult.category,
  selected_question_id: drawResult.questionId,
  seed: drawResult.seed,
  selected_by: '평가위원회',
  selected_at: record.stage4.selectedAt,
  all_assigned: drawResult.allAssigned,
};
assert(['stock_transfer', 'nominee_stock', 'temporary_payment'].includes(drawRow.selected_category),
  'Supabase draw: selected_category CHECK 통과');
assert(drawRow.selected_question_id >= 1 && drawRow.selected_question_id <= 21,
  'Supabase draw: selected_question_id CHECK 통과 (1~21)');
assert(Array.isArray(drawRow.all_assigned) && drawRow.all_assigned.length === 3,
  'Supabase draw: all_assigned JSONB 3건');

// qs_candidate_tracker 매핑
function calculateCurrentStageNum(rec) {
  const stages = ['stage8', 'stage7', 'stage6', 'stage5', 'stage4', 'stage3', 'stage2', 'stage1'];
  const nums = [8, 7, 6, 5, 4, 3, 2, 1];
  for (let i = 0; i < stages.length; i++) {
    if (rec[stages[i]]?.status === 'completed' || rec[stages[i]]?.status === 'in_progress') return nums[i];
  }
  return 1;
}

const trackerRow = {
  period_id: 'a0000000-0000-0000-0000-000000000001',
  candidate_id: record.candidateId,
  candidate_name: record.name,
  team: record.team,
  current_stage: calculateCurrentStageNum(record),
  stage1_data: record.stage1,
  stage2_data: record.stage2,
  stage4_data: record.stage4,
  history: record.history,
};
assert(trackerRow.current_stage === 4, 'Tracker: current_stage = 4 (최종추첨 완료)');
assert(trackerRow.stage2_data.status === 'completed', 'Tracker: stage2_data 완료');
assert(trackerRow.stage4_data.status === 'completed', 'Tracker: stage4_data 완료');
assert(trackerRow.history.length === 2, 'Tracker: history 2건');

// ─── 테스트 7: 전체 8단계 시뮬레이션 ──────────────────────────
console.log('\n🔬 테스트 7: 전체 8단계 워크플로우 시뮬레이션');

// 5단계: 인증평가 실시
record.stage5 = { status: 'completed', evaluationStarted: '2026-03-28T10:00:00Z', evaluationCompleted: '2026-03-28T17:00:00Z' };
record.history.push({ timestamp: new Date().toISOString(), action: 'stage5', data: { ...record.stage5 } });
assert(calculateCurrentStageNum(record) === 5, '5단계 완료 후 current_stage = 5');

// 6단계: 평가위원 협의
record.stage6 = { status: 'completed', finalAverage: 82.5, bonusScore: 5, passStatus: 'passed', decidedAt: '2026-03-28T18:00:00Z', consensusNotes: '우수 통과' };
record.history.push({ timestamp: new Date().toISOString(), action: 'stage6', data: { ...record.stage6 } });
assert(calculateCurrentStageNum(record) === 6, '6단계 완료 후 current_stage = 6');
assert(record.stage6.finalAverage >= 70, '합격 기준(70점) 이상');

// 7단계: 결과 발표
record.stage7 = { status: 'completed', announcedAt: '2026-03-31T09:00:00Z', feedback: '축하합니다!' };
record.history.push({ timestamp: new Date().toISOString(), action: 'stage7', data: { ...record.stage7 } });
assert(calculateCurrentStageNum(record) === 7, '7단계 완료 후 current_stage = 7');

// 8단계: 인증서 수여
record.stage8 = { status: 'completed', certificateNumber: 'CHIEF-2026-001', issuedAt: '2026-04-15T10:00:00Z', ceremonyDate: '2026-04-15' };
record.history.push({ timestamp: new Date().toISOString(), action: 'stage8', data: { ...record.stage8 } });
assert(calculateCurrentStageNum(record) === 8, '8단계 완료 후 current_stage = 8');
assert(record.history.length === 6, '전체 히스토리 6건 (stage2~8, stage3 제외)');

// 인증서 결과 테이블 매핑
const certRow = {
  period_id: 'a0000000-0000-0000-0000-000000000001',
  candidate_id: 'kcg',
  final_avg_score: record.stage6.finalAverage,
  bonus_score: record.stage6.bonusScore,
  total_score: record.stage6.finalAverage + record.stage6.bonusScore,
  pass_status: record.stage6.passStatus === 'passed' ? 'pass' : 'fail',
  pass_score: 70,
  consensus_notes: record.stage6.consensusNotes,
  decided_at: record.stage6.decidedAt,
  announced_at: record.stage7.announcedAt,
  feedback: record.stage7.feedback,
  certificate_number: record.stage8.certificateNumber,
  certificate_issued_at: record.stage8.issuedAt,
  ceremony_date: record.stage8.ceremonyDate,
};
assert(certRow.total_score === 87.5, 'qs_certification_results: total_score = 82.5 + 5 = 87.5');
assert(certRow.pass_status === 'pass', 'qs_certification_results: pass_status = pass');
assert(certRow.certificate_number === 'CHIEF-2026-001', 'qs_certification_results: certificate_number 매핑 정확');

// ═══════════════════════════════════════════════════════════════
// 결과 요약
// ═══════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(60));
console.log(`📋 테스트 결과: ${passed} 통과 / ${failed} 실패 / 총 ${passed + failed}건`);
if (failed === 0) {
  console.log('🎉 모든 테스트 통과! 워크플로우 정합성 확인 완료.');
} else {
  console.log('⚠️  실패한 테스트가 있습니다. 위 로그를 확인하세요.');
  process.exit(1);
}
console.log('═'.repeat(60));
