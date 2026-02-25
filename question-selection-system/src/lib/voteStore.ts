// ============================================================
// 투표 저장소 (In-Memory + API 연동)
// 실제 운영 시 Vercel KV, Supabase, Firebase 등으로 교체
// ============================================================

import { CategoryType } from '@/data/questions';

export interface Vote {
  evaluatorId: string;
  evaluatorName: string;
  category: CategoryType;
  questionId: number;
  votedAt: string; // ISO datetime
}

export interface VoteSubmission {
  evaluatorId: string;
  evaluatorName: string;
  votes: {
    stock_transfer: number;      // 주식이동 분야 선택 문제 ID
    nominee_stock: number;       // 차명주식 분야 선택 문제 ID
    temporary_payment: number;   // 가지급금 분야 선택 문제 ID
  };
}

export interface VoteResult {
  questionId: number;
  category: CategoryType;
  voteCount: number;
  voters: string[];
}

export interface CategoryResult {
  category: CategoryType;
  categoryLabel: string;
  selectedQuestions: VoteResult[]; // 상위 3문제
  allVotes: VoteResult[];         // 전체 투표 결과
}

// In-Memory Store (서버 재시작 시 초기화됨 - 실제 운영 시 DB 사용)
const votes: Vote[] = [];

// 투표 제출
export function submitVote(submission: VoteSubmission): { success: boolean; message: string } {
  // 기존 투표 확인 (중복 투표 방지)
  const existingVotes = votes.filter((v) => v.evaluatorId === submission.evaluatorId);
  if (existingVotes.length > 0) {
    // 기존 투표 삭제 후 재투표 허용
    const indices = votes
      .map((v, i) => (v.evaluatorId === submission.evaluatorId ? i : -1))
      .filter((i) => i !== -1)
      .reverse();
    indices.forEach((i) => votes.splice(i, 1));
  }

  const now = new Date().toISOString();

  // 3개 분야 투표 저장
  const categories: CategoryType[] = ['stock_transfer', 'nominee_stock', 'temporary_payment'];
  categories.forEach((cat) => {
    votes.push({
      evaluatorId: submission.evaluatorId,
      evaluatorName: submission.evaluatorName,
      category: cat,
      questionId: submission.votes[cat],
      votedAt: now,
    });
  });

  return {
    success: true,
    message: existingVotes.length > 0 ? '투표가 수정되었습니다.' : '투표가 완료되었습니다.',
  };
}

// 투표 현황 조회
export function getVoteStatus(): {
  totalEvaluators: number;
  votedEvaluators: string[];
  votedCount: number;
} {
  const votedEvaluators = [...new Set(votes.map((v) => v.evaluatorName))];
  return {
    totalEvaluators: 7,
    votedEvaluators,
    votedCount: votedEvaluators.length,
  };
}

// 특정 평가위원의 투표 조회
export function getEvaluatorVotes(evaluatorId: string): Vote[] {
  return votes.filter((v) => v.evaluatorId === evaluatorId);
}

// 카테고리별 결과 집계
export function getResults(): CategoryResult[] {
  const categories: { type: CategoryType; label: string }[] = [
    { type: 'stock_transfer', label: '주식 이동 프로젝트 설계' },
    { type: 'nominee_stock', label: '차명 주식 해소 프로젝트 설계' },
    { type: 'temporary_payment', label: '가지급금 정리 프로젝트 설계' },
  ];

  return categories.map(({ type, label }) => {
    const categoryVotes = votes.filter((v) => v.category === type);

    // 문제별 투표 수 집계
    const voteMap = new Map<number, { count: number; voters: string[] }>();
    categoryVotes.forEach((v) => {
      const existing = voteMap.get(v.questionId) || { count: 0, voters: [] };
      existing.count += 1;
      existing.voters.push(v.evaluatorName);
      voteMap.set(v.questionId, existing);
    });

    // 득표순 정렬
    const allVotes: VoteResult[] = Array.from(voteMap.entries())
      .map(([questionId, data]) => ({
        questionId,
        category: type,
        voteCount: data.count,
        voters: data.voters,
      }))
      .sort((a, b) => b.voteCount - a.voteCount);

    // 상위 3문제 선정
    const selectedQuestions = allVotes.slice(0, 3);

    return {
      category: type,
      categoryLabel: label,
      selectedQuestions,
      allVotes,
    };
  });
}

// 전체 투표 데이터 조회 (관리자용)
export function getAllVotes(): Vote[] {
  return [...votes];
}

// 투표 초기화 (관리자용)
export function resetVotes(): void {
  votes.length = 0;
}
