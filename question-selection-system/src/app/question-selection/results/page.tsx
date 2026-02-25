'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface VoteResult {
  questionId: number;
  category: string;
  voteCount: number;
  voters: string[];
}

interface CategoryResult {
  category: string;
  categoryLabel: string;
  selectedQuestions: VoteResult[];
  allVotes: VoteResult[];
}

interface VoteStatus {
  totalEvaluators: number;
  votedEvaluators: string[];
  votedCount: number;
}

const CATEGORY_STYLES: Record<string, { icon: string; color: string; bgGradient: string; lightBg: string; textColor: string }> = {
  stock_transfer: { icon: '📊', color: 'blue', bgGradient: 'from-blue-500 to-blue-700', lightBg: 'bg-blue-50', textColor: 'text-blue-700' },
  nominee_stock: { icon: '🔐', color: 'purple', bgGradient: 'from-purple-500 to-purple-700', lightBg: 'bg-purple-50', textColor: 'text-purple-700' },
  temporary_payment: { icon: '💰', color: 'green', bgGradient: 'from-emerald-500 to-emerald-700', lightBg: 'bg-emerald-50', textColor: 'text-emerald-700' },
};

const QUESTION_TITLES: Record<number, string> = {
  1: 'Cloud A사 - 가업승계 전략',
  2: '제조 B사 - 지분 분산 및 경영권 강화',
  3: 'IT서비스 C사 - 스톡옵션 연계 승계',
  4: '유통 D사 - 가족 법인 활용 승계',
  5: '건설 E사 - 합병을 통한 지분 구조조정',
  6: '식품 F사 - 물적분할 후 지분 이전',
  7: '바이오 G사 - IPO 전 긴급 승계',
  8: '화학 D사 - 긴급 차명주식 회수',
  9: '물류 H사 - 전직 임원 차명주식',
  10: '섬유 I사 - 친인척 차명 다수 분산',
  11: '전자부품 J사 - 해외법인 차명',
  12: '의료기기 K사 - 상속 발생 후 차명',
  13: '건축자재 L사 - 위장분산 차명',
  14: '반도체소재 M사 - 복합 차명 구조',
  15: '건재 M사 - 특허권 활용 정리',
  16: '인쇄 N사 - 부동산 현물변제',
  17: '소프트웨어 O사 - 급여체계 개편 정리',
  18: '기계설비 P사 - 배당 활용 정리',
  19: '화장품 Q사 - 매출채권 활용 정리',
  20: '물류 R사 - 복합 가지급금 긴급 정리',
  21: '종합상사 S사 - 해외법인 가지급금',
};

export default function ResultsPage() {
  const router = useRouter();
  const [status, setStatus] = useState<VoteStatus | null>(null);
  const [results, setResults] = useState<CategoryResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchResults = useCallback(async () => {
    try {
      const res = await fetch('/api/question-selection/results');
      const data = await res.json();
      if (data.success) {
        setStatus(data.status);
        setResults(data.results);
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults();
  }, [fetchResults]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchResults, 10000); // 10초마다 갱신
    return () => clearInterval(interval);
  }, [autoRefresh, fetchResults]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-12 text-center">
        <div className="animate-spin text-4xl mb-4">⏳</div>
        <p className="text-slate-500">투표 결과를 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 상단 컨트롤 */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => router.push('/question-selection')}
          className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1"
        >
          ← 투표 페이지로 돌아가기
        </button>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
            자동 갱신 (10초)
          </label>
          <button
            onClick={fetchResults}
            className="text-sm bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition"
          >
            🔄 새로고침
          </button>
        </div>
      </div>

      {/* 투표 현황 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">🗳️ 투표 현황</h2>
          <div className="text-2xl font-bold text-blue-600">
            {status?.votedCount || 0} / {status?.totalEvaluators || 7}명 완료
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="w-full bg-slate-100 rounded-full h-3 mb-4">
          <div
            className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full h-3 transition-all duration-500"
            style={{ width: `${((status?.votedCount || 0) / (status?.totalEvaluators || 7)) * 100}%` }}
          />
        </div>

        {/* 평가위원별 상태 */}
        <div className="grid grid-cols-7 gap-2">
          {['평가위원장', '권영도', '권오경', '김홍', '박성현', '윤덕상', '하상현'].map((name) => {
            const hasVoted = status?.votedEvaluators.includes(name);
            return (
              <div
                key={name}
                className={`text-center p-2 rounded-lg ${
                  hasVoted ? 'bg-green-50 border border-green-200' : 'bg-slate-50 border border-slate-200'
                }`}
              >
                <div className="text-lg mb-1">{hasVoted ? '✅' : '⏳'}</div>
                <div className={`text-xs font-medium ${hasVoted ? 'text-green-700' : 'text-slate-400'}`}>
                  {name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 카테고리별 결과 */}
      {results.length > 0 ? (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900">📊 분야별 투표 결과 (최다득표 순)</h2>

          {results.map((catResult) => {
            const style = CATEGORY_STYLES[catResult.category];
            if (!style) return null;

            return (
              <div key={catResult.category} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* 분야 헤더 */}
                <div className={`bg-gradient-to-r ${style.bgGradient} px-6 py-4 text-white`}>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{style.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg">{catResult.categoryLabel}</h3>
                      <p className="text-sm opacity-80">
                        상위 3문제 선정 (총 {catResult.allVotes.reduce((s, v) => s + v.voteCount, 0)}표)
                      </p>
                    </div>
                  </div>
                </div>

                {/* 투표 결과 */}
                {catResult.allVotes.length === 0 ? (
                  <div className="px-6 py-8 text-center text-slate-400">
                    아직 투표가 없습니다
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {catResult.allVotes.map((vote, idx) => {
                      const isSelected = idx < 3;
                      const maxVotes = catResult.allVotes[0]?.voteCount || 1;
                      const percentage = (vote.voteCount / 7) * 100;

                      return (
                        <div
                          key={vote.questionId}
                          className={`px-6 py-4 ${isSelected ? style.lightBg : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            {/* 순위 */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                              isSelected
                                ? idx === 0
                                  ? 'bg-amber-400 text-white'
                                  : idx === 1
                                  ? 'bg-slate-300 text-white'
                                  : 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-400'
                            }`}>
                              {idx + 1}
                            </div>

                            {/* 문제 정보 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                                  isSelected ? `${style.lightBg} ${style.textColor}` : 'bg-slate-100 text-slate-500'
                                }`}>
                                  {vote.questionId}번
                                </span>
                                {isSelected && (
                                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                    ⭐ 선정
                                  </span>
                                )}
                              </div>
                              <h4 className={`font-bold text-sm ${isSelected ? style.textColor : 'text-slate-700'}`}>
                                {QUESTION_TITLES[vote.questionId] || `문제 ${vote.questionId}`}
                              </h4>
                              <div className="text-xs text-slate-400 mt-1">
                                투표: {vote.voters.join(', ')}
                              </div>
                            </div>

                            {/* 득표 수 및 바 */}
                            <div className="w-48 flex-shrink-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-slate-500">{vote.voteCount}표</span>
                                <span className="text-xs text-slate-400">{percentage.toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2.5">
                                <div
                                  className={`rounded-full h-2.5 transition-all duration-700 ${
                                    isSelected
                                      ? `bg-gradient-to-r ${style.bgGradient}`
                                      : 'bg-slate-300'
                                  }`}
                                  style={{ width: `${(vote.voteCount / maxVotes) * 100}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 최종 선정 결과 요약 */}
          {status && status.votedCount >= 4 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2">
                🏆 최종 선정 문제 (총 9문제)
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {results.map((catResult) => {
                  const style = CATEGORY_STYLES[catResult.category];
                  return (
                    <div key={catResult.category} className="bg-white rounded-lg p-4 shadow-sm">
                      <div className={`text-sm font-bold ${style?.textColor} mb-3 flex items-center gap-1`}>
                        {style?.icon} {catResult.categoryLabel.replace(' 프로젝트 설계', '')}
                      </div>
                      <div className="space-y-2">
                        {catResult.selectedQuestions.map((q, i) => (
                          <div key={q.questionId} className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                              i === 0 ? 'bg-amber-400 text-white' :
                              i === 1 ? 'bg-slate-300 text-white' :
                              'bg-amber-600 text-white'
                            }`}>
                              {i + 1}
                            </span>
                            <span className="text-xs text-slate-700">
                              <strong>{q.questionId}번</strong> ({q.voteCount}표)
                            </span>
                          </div>
                        ))}
                        {catResult.selectedQuestions.length === 0 && (
                          <div className="text-xs text-slate-400">투표 진행 중</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-12 text-center">
          <div className="text-4xl mb-3">🗳️</div>
          <p className="text-slate-500">아직 투표 결과가 없습니다.</p>
          <p className="text-sm text-slate-400 mt-1">평가위원이 투표를 시작하면 결과가 표시됩니다.</p>
        </div>
      )}
    </div>
  );
}
