import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { QS_CATEGORIES, QS_QUESTIONS } from '@/data/qsQuestions';
import { getVoteStatus, getResults } from '@/lib/qsVoteStore';

const ALL_EVALUATORS = ['나동환', '권영도', '권오경', '김홍', '박성현', '윤덕상', '하상현'];
const CATEGORY_KEYS = Object.keys(QS_CATEGORIES);

export default function QSResultsPage() {
  const navigate = useNavigate();
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchError, setFetchError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      setFetchError('');
      const [st, rs] = await Promise.all([getVoteStatus(), getResults()]);
      setStatus(st);
      setResults(rs);
      setLastUpdated(new Date());
    } catch (err) {
      setFetchError('데이터를 불러올 수 없습니다: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(fetchData, 10000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-16 text-center">
        <div className="text-5xl mb-4 animate-spin">⏳</div>
        <p className="text-slate-500">투표 결과를 불러오는 중...</p>
      </div>
    );
  }

  const progressPct = ((status?.votedCount || 0) / 7) * 100;
  const isMajority = (status?.votedCount || 0) >= 4;
  // results는 항상 3개 카테고리 배열이므로 실제 투표 존재 여부로 판단
  const hasAnyVotes = results.some((r) => r.allVotes.length > 0);

  return (
    <div className="max-w-5xl mx-auto">

      {/* 상단 컨트롤 */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button
          onClick={() => navigate('/question-selection')}
          className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
        >
          ← 로그인 페이지로
        </button>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-xs text-slate-400">
              갱신: {lastUpdated.toLocaleTimeString('ko-KR')}
            </span>
          )}
          <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded accent-blue-600"
            />
            자동 갱신 (10초)
          </label>
          <button
            onClick={fetchData}
            className="text-sm bg-slate-100 px-3 py-1.5 rounded-lg hover:bg-slate-200 transition text-slate-600"
          >
            🔄 새로고침
          </button>
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-sm text-red-600 mb-6">
          ⚠️ {fetchError}
        </div>
      )}

      {/* 투표 현황 카드 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">🗳️ 투표 현황</h2>
          <div className="text-2xl font-bold text-blue-600">
            {status?.votedCount || 0} / 7명 완료
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="w-full bg-slate-100 rounded-full h-3 mb-5 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-700"
            style={{
              width: `${progressPct}%`,
              background: 'linear-gradient(90deg, #3b82f6, #6366f1)',
            }}
          />
        </div>

        {/* 평가위원별 상태 */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {ALL_EVALUATORS.map((name) => {
            const voted = status?.votedEvaluators?.includes(name);
            return (
              <div
                key={name}
                className={`text-center p-2 rounded-lg border ${
                  voted
                    ? 'bg-green-50 border-green-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xl mb-1">{voted ? '✅' : '⏳'}</div>
                <div className={`text-xs font-medium leading-tight ${
                  voted ? 'text-green-700' : 'text-slate-400'
                }`}>
                  {name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 분야별 결과 */}
      {hasAnyVotes ? (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-900">
            📊 분야별 투표 결과 (최다득표 순)
          </h2>

          {results.map((catResult) => {
            const cat = QS_CATEGORIES[catResult.category];
            if (!cat) return null;

            const totalVotes = catResult.allVotes.reduce((s, v) => s + v.voteCount, 0);

            return (
              <div
                key={catResult.category}
                className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden"
              >
                {/* 분야 헤더 */}
                <div
                  className="px-6 py-4 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${
                      catResult.category === 'stock_transfer' ? '#3b82f6, #1d4ed8' :
                      catResult.category === 'nominee_stock'  ? '#8b5cf6, #6d28d9' :
                      '#10b981, #047857'
                    })`
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg">{catResult.categoryLabel}</h3>
                      <p className="text-sm opacity-80">
                        상위 3문제 선정 (총 {totalVotes}표 / 7명)
                      </p>
                    </div>
                  </div>
                </div>

                {/* 투표 결과 목록 */}
                {catResult.allVotes.length === 0 ? (
                  <div className="px-6 py-8 text-center text-slate-400">
                    아직 투표가 없습니다
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {catResult.allVotes.map((vote, idx) => {
                      const isTop3 = idx < 3;
                      const maxVotes = catResult.allVotes[0]?.voteCount || 1;
                      const pct = (vote.voteCount / 7) * 100;
                      const q = QS_QUESTIONS[vote.questionId];

                      return (
                        <div
                          key={vote.questionId}
                          className={`px-6 py-4 ${isTop3 ? cat.lightBg : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            {/* 순위 원 */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                              isTop3
                                ? idx === 0 ? 'bg-amber-400 text-white'
                                : idx === 1 ? 'bg-slate-400 text-white'
                                : 'bg-amber-600 text-white'
                                : 'bg-slate-100 text-slate-400'
                            }`}>
                              {idx + 1}
                            </div>

                            {/* 문제 정보 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-sm font-extrabold px-2 py-0.5 rounded border ${
                                  isTop3 ? `${cat.lightBg} ${cat.textColor} border-current` : 'bg-slate-100 text-slate-600 border-slate-300'
                                }`}>
                                  #{vote.questionId}
                                </span>
                                {isTop3 && (
                                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
                                    ⭐ 선정
                                  </span>
                                )}
                              </div>
                              <h4 className={`font-bold text-sm mb-1 ${isTop3 ? cat.textColor : 'text-slate-700'}`}>
                                {q?.title || `문제 ${vote.questionId}번`}
                              </h4>
                              {q?.issue && (
                                <p className="text-xs text-slate-400 mb-1">{q.issue}</p>
                              )}
                              <div className="text-xs text-slate-400">
                                투표: {vote.voters.join(', ')}
                              </div>
                            </div>

                            {/* 득표 바 */}
                            <div className="w-40 flex-shrink-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-700">
                                  {vote.voteCount}표
                                </span>
                                <span className="text-xs text-slate-400">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="h-2.5 rounded-full transition-all duration-700"
                                  style={{
                                    width: `${(vote.voteCount / maxVotes) * 100}%`,
                                    background: isTop3
                                      ? (catResult.category === 'stock_transfer' ? 'linear-gradient(90deg,#3b82f6,#1d4ed8)' :
                                         catResult.category === 'nominee_stock'  ? 'linear-gradient(90deg,#8b5cf6,#6d28d9)' :
                                         'linear-gradient(90deg,#10b981,#047857)')
                                      : '#cbd5e1',
                                  }}
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

          {/* 최종 선정 9문제 요약 (과반수 이상 투표 완료 시) */}
          {isMajority && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-amber-800 mb-1 flex items-center gap-2">
                🏆 최종 선정 문제 (총 9문제)
              </h3>
              <p className="text-xs text-amber-600 mb-4">
                과반수({status?.votedCount}명) 투표 기준 현재 선정 결과입니다
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {results.map((catResult) => {
                  const cat = QS_CATEGORIES[catResult.category];
                  return (
                    <div key={catResult.category} className="bg-white rounded-lg p-4 shadow-sm border border-amber-100">
                      <div className={`text-sm font-bold ${cat?.textColor} mb-3 flex items-center gap-1`}>
                        {cat?.icon} {catResult.categoryLabel.replace(' 프로젝트 설계', '')}
                      </div>
                      <div className="space-y-2">
                        {catResult.selectedQuestions.length === 0 ? (
                          <div className="text-xs text-slate-400">투표 진행 중</div>
                        ) : (
                          catResult.selectedQuestions.map((q, i) => {
                            const qData = QS_QUESTIONS[q.questionId];
                            return (
                              <div key={q.questionId} className="flex items-start gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                                  i === 0 ? 'bg-amber-400 text-white' :
                                  i === 1 ? 'bg-slate-400 text-white' :
                                  'bg-amber-600 text-white'
                                }`}>
                                  {i + 1}
                                </span>
                                <div>
                                  <span className="text-xs font-extrabold text-slate-800">
                                    #{q.questionId}
                                  </span>
                                  <span className="text-xs text-slate-500 ml-1">
                                    ({q.voteCount}표)
                                  </span>
                                  {qData && (
                                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                                      {qData.title}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-16 text-center">
          <div className="text-5xl mb-4">🗳️</div>
          <p className="text-slate-500 font-medium">아직 투표 결과가 없습니다.</p>
          <p className="text-sm text-slate-400 mt-2">
            평가위원이 투표를 시작하면 결과가 표시됩니다.
          </p>
          <button
            onClick={() => navigate('/question-selection')}
            className="mt-6 text-sm text-blue-600 hover:text-blue-700 underline transition-colors"
          >
            투표 페이지로 이동 →
          </button>
        </div>
      )}
    </div>
  );
}
