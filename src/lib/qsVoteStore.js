// ================================================================
// 문제 선정 투표 저장소 - Supabase 연동
// qs_votes 테이블 사용 (upsert 방식으로 재투표 허용)
// qs_voting_config (localStorage) - 투표 종료/최종 문제 설정
// ================================================================

import { supabase } from '@/lib/supabase';

const CONFIG_KEY = 'qs_voting_config';

// 투표 설정 조회 (localStorage)
export function getVotingConfig() {
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
export async function submitVote(evaluatorId, evaluatorName, votes) {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');

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

// 투표 현황 조회
export async function getVoteStatus() {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');

  const { data, error } = await supabase
    .from('qs_votes')
    .select('evaluator_name');

  if (error) throw error;

  return {
    totalEvaluators: 7,
    votedEvaluators: data.map((v) => v.evaluator_name),
    votedCount: data.length,
  };
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

// 카테고리별 결과 집계
export async function getResults() {
  if (!supabase) throw new Error('Supabase가 설정되지 않았습니다.');

  const { data: votes, error } = await supabase
    .from('qs_votes')
    .select('*');

  if (error) throw error;

  const categories = [
    { type: 'stock_transfer', label: '주식 이동 프로젝트 설계', field: 'stock_transfer' },
    { type: 'nominee_stock', label: '차명 주식 해소 프로젝트 설계', field: 'nominee_stock' },
    { type: 'temporary_payment', label: '가지급금 정리 프로젝트 설계', field: 'temporary_payment' },
  ];

  return categories.map(({ type, label, field }) => {
    const voteMap = new Map();

    votes.forEach((v) => {
      const qId = v[field];
      if (!qId) return;
      const existing = voteMap.get(qId) || { count: 0, voters: [] };
      existing.count += 1;
      existing.voters.push(v.evaluator_name);
      voteMap.set(qId, existing);
    });

    const allVotes = Array.from(voteMap.entries())
      .map(([questionId, data]) => ({
        questionId,
        category: type,
        voteCount: data.count,
        voters: data.voters,
      }))
      .sort((a, b) => b.voteCount - a.voteCount);

    return {
      category: type,
      categoryLabel: label,
      selectedQuestions: allVotes.slice(0, 3),
      allVotes,
    };
  });
}
