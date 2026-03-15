// ================================================================
// 문제 선정 투표 저장소 - Supabase 연동
// qs_votes 테이블 사용 (upsert 방식으로 재투표 허용)
// qs_voting_config (localStorage) - 투표 종료/최종 문제 설정
// ================================================================

import { supabase } from '@/lib/supabase';

const CONFIG_KEY = 'qs_voting_config';

// ──────────────────────────────────────────────────────────────
// 1차 출제 마감 설정 (2026-02-26 출제 마감 확정)
// 최종 9문제 확정 결과를 하드코딩하여 모든 브라우저에서 동일하게 적용
// ──────────────────────────────────────────────────────────────
const ROUND_1_CLOSED = true;
const ROUND_1_CLOSED_AT = '2026-02-26T12:00:00.000+09:00';
const ROUND_1_FINAL_QUESTIONS = {
  stock_transfer:    [4, 5, 12], // 주식 이동: #4(4표) #5(4표) #12(3표)
  nominee_stock:     [3, 1, 10], // 차명 주식: #3(5표) #1(3표) #10(3표)
  temporary_payment: [6, 11, 2], // 가지급금:  #6(4표) #11(4표) #2(3표)
};

// 투표 설정 조회 (localStorage)
// ※ ROUND_1_CLOSED=true 이면 localStorage 무시하고 확정값 반환
export function getVotingConfig() {
  if (ROUND_1_CLOSED) {
    return {
      closed: true,
      finalQuestions: ROUND_1_FINAL_QUESTIONS,
      closedAt: ROUND_1_CLOSED_AT,
      scheduledCloseAt: null,
    };
  }
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw
      ? JSON.parse(raw)
      : { closed: false, finalQuestions: null, closedAt: null, scheduledCloseAt: null };
  } catch {
    return { closed: false, finalQuestions: null, closedAt: null, scheduledCloseAt: null };
  }
}

// 투표 설정 저장 (localStorage)
export function saveVotingConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

// 투표 종료 처리
export function closeVoting(finalQuestions) {
  saveVotingConfig({ closed: true, finalQuestions, closedAt: new Date().toISOString() });
}

// 투표 재개
export function reopenVoting() {
  saveVotingConfig({ closed: false, finalQuestions: null, closedAt: null });
}

// 최종 문제 수정 (관리자 전용)
export function updateFinalQuestions(finalQuestions) {
  const current = getVotingConfig();
  saveVotingConfig({ ...current, finalQuestions });
}

// 예약 종료 설정 (관리자 전용)
export function setScheduledClose(scheduledAt) {
  const current = getVotingConfig();
  saveVotingConfig({ ...current, scheduledCloseAt: scheduledAt });
}

// 예약 종료 취소 (관리자 전용)
export function clearScheduledClose() {
  const current = getVotingConfig();
  saveVotingConfig({ ...current, scheduledCloseAt: null });
}

// 투표 설정만 초기화 (closed/schedule/finalQuestions 리셋)
export function resetVotingConfig() {
  saveVotingConfig({ closed: false, finalQuestions: null, closedAt: null, scheduledCloseAt: null });
}

// 투표 전체 초기화 - Supabase 데이터 + 설정 모두 삭제 (관리자 전용)
export async function resetAllVotes() {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');
  const { error } = await supabase.from('qs_votes').delete().neq('evaluator_id', '');
  if (error) throw error;
  resetVotingConfig();
}

// 투표 제출 (재투표 시 덮어쓰기)
// 정책: 코치 1명당 영역별 3문제 선택 (총 9문제)
export async function submitVote(evaluatorId, evaluatorName, votes) {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');

  const requiredFields = ['stock_transfer', 'nominee_stock', 'temporary_payment'];
  requiredFields.forEach((field) => {
    const selected = votes[field];
    if (!Array.isArray(selected) || selected.length !== 3) {
      throw new Error(`"${field}"는 3문제를 선택해야 합니다.`);
    }
    const unique = new Set(selected);
    if (unique.size !== 3) {
      throw new Error(`"${field}"는 서로 다른 3문제를 선택해야 합니다.`);
    }
  });

  const { error } = await supabase
    .from('qs_votes')
    .upsert(
      {
        evaluator_id: evaluatorId,
        evaluator_name: evaluatorName,
        stock_transfer: votes.stock_transfer,
        nominee_stock: votes.nominee_stock,
        temporary_payment: votes.temporary_payment,
        voted_at: new Date().toISOString(),
      },
      { onConflict: 'evaluator_id' }
    );

  if (error) throw error;
}

// 투표 현황 조회 (Supabase 미설정/테이블 없음 시 기본값 반환)
export async function getVoteStatus() {
  if (!supabase) {
    return { totalEvaluators: 7, votedEvaluators: [], votedCount: 0 };
  }
  try {
    const { data, error } = await supabase
      .from('qs_votes')
      .select('evaluator_name');
    if (error) {
      console.warn('[qsVoteStore] 투표 현황 조회 실패:', error);
      return { totalEvaluators: 7, votedEvaluators: [], votedCount: 0 };
    }
    return {
      totalEvaluators: 7,
      votedEvaluators: (data || []).map((v) => v.evaluator_name),
      votedCount: (data || []).length,
    };
  } catch (err) {
    console.warn('[qsVoteStore] getVoteStatus 오류:', err);
    return { totalEvaluators: 7, votedEvaluators: [], votedCount: 0 };
  }
}

// 특정 평가위원의 투표 조회
export async function getEvaluatorVote(evaluatorId) {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');

  const { data, error } = await supabase
    .from('qs_votes')
    .select('*')
    .eq('evaluator_id', evaluatorId)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data || null;
}

// 카테고리별 결과 집계 (Supabase 미설정/테이블 없음 시 빈 결과 반환)
// 정책: 각 평가위원이 카테고리별 3문제를 선택하므로 배열을 순회해 집계
export async function getResults() {
  const categories = [
    { type: 'stock_transfer', label: '주식 이동 프로젝트 설계', field: 'stock_transfer' },
    { type: 'nominee_stock', label: '차명 주식 해소 프로젝트 설계', field: 'nominee_stock' },
    { type: 'temporary_payment', label: '가지급금 정리 프로젝트 설계', field: 'temporary_payment' },
  ];

  if (!supabase) {
    return categories.map(({ type, label }) => ({
      category: type,
      categoryLabel: label,
      selectedQuestions: [],
      allVotes: [],
    }));
  }
  try {
    const { data: votesData, error } = await supabase
      .from('qs_votes')
      .select('*');
    if (error) {
      console.warn('[qsVoteStore] 결과 조회 실패:', error);
      return categories.map(({ type, label }) => ({
        category: type,
        categoryLabel: label,
        selectedQuestions: [],
        allVotes: [],
      }));
    }
    const votes = votesData || [];

    return categories.map(({ type, label, field }) => {
    const voteMap = new Map();

    votes.forEach((v) => {
      const picked = Array.isArray(v[field]) ? v[field] : [v[field]].filter(Boolean);
      // 중복 선택 방어: 한 평가위원이 같은 문제를 여러 번 넣어도 1표만 인정
      const uniquePicked = Array.from(new Set(picked));
      uniquePicked.forEach((qId) => {
        const existing = voteMap.get(qId) || { count: 0, voters: [] };
        existing.count += 1;
        existing.voters.push(v.evaluator_name);
        voteMap.set(qId, existing);
      });
    });

    const allVotes = Array.from(voteMap.entries())
      .map(([questionId, data]) => ({
        questionId,
        category: type,
        voteCount: data.count,
        voters: data.voters,
      }))
      // 동점 정렬 안정화: 득표수 내림차순, 동점 시 문제번호 오름차순
      .sort((a, b) => (b.voteCount - a.voteCount) || (a.questionId - b.questionId));

    return {
      category: type,
      categoryLabel: label,
      selectedQuestions: allVotes.slice(0, 3),
      allVotes,
    };
  });
  } catch (err) {
    console.warn('[qsVoteStore] getResults 오류:', err);
    return categories.map(({ type, label }) => ({
      category: type,
      categoryLabel: label,
      selectedQuestions: [],
      allVotes: [],
    }));
  }
}
