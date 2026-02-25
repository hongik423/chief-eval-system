import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QS_CATEGORIES, QS_QUESTIONS, QS_PDF_URL } from '@/data/qsQuestions';
import { submitVote, getEvaluatorVote } from '@/lib/qsVoteStore';

const CATEGORY_KEYS = Object.keys(QS_CATEGORIES);
const REQUIRED_PER_CATEGORY = 3;
const TOTAL_REQUIRED = CATEGORY_KEYS.length * REQUIRED_PER_CATEGORY;

export default function QSVotePage() {
  const navigate = useNavigate();
  const [evaluator, setEvaluator] = useState(null);
  const [selections, setSelections] = useState({
    stock_transfer: [],
    nominee_stock: [],
    temporary_payment: [],
  });
  const [expandedId, setExpandedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingPrev, setLoadingPrev] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem('qs_evaluator');
    if (!stored) {
      navigate('/question-selection');
      return;
    }
    const ev = JSON.parse(stored);
    setEvaluator(ev);

    setLoadingPrev(true);
    getEvaluatorVote(ev.id)
      .then((prev) => {
        if (prev) {
          const validated = {};
          CATEGORY_KEYS.forEach((key) => {
            const saved = prev[key];
            const savedIds = Array.isArray(saved) ? saved : saved ? [saved] : [];
            const validIds = Array.from(
              new Set(savedIds.filter((id) => QS_CATEGORIES[key].questionIds.includes(id)))
            )
              .slice(0, REQUIRED_PER_CATEGORY);
            validated[key] = validIds;
          });
          setSelections(validated);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrev(false));
  }, [navigate]);

  const handleSelect = (categoryKey, qId) => {
    setError('');
    setSelections((prev) => {
      const current = prev[categoryKey] || [];
      if (current.includes(qId)) {
        return { ...prev, [categoryKey]: current.filter((id) => id !== qId) };
      }
      if (current.length >= REQUIRED_PER_CATEGORY) {
        setError(`각 분야는 ${REQUIRED_PER_CATEGORY}문제까지만 선택할 수 있습니다.`);
        return prev;
      }
      return { ...prev, [categoryKey]: [...current, qId] };
    });
  };

  const allSelected = CATEGORY_KEYS.every((k) => (selections[k] || []).length === REQUIRED_PER_CATEGORY);

  const handleSubmit = async () => {
    if (!evaluator || !allSelected) return;
    setSubmitting(true);
    setError('');
    try {
      await submitVote(evaluator.id, evaluator.name, selections);
      setSubmitMessage('영역별 3문제, 총 9문제 투표가 완료되었습니다.');
      setSubmitted(true);
    } catch (err) {
      setError('투표 제출 중 오류가 발생했습니다: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  if (!evaluator) return null;

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-4">
        <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700 overflow-hidden text-center">
          <div
            className="px-8 py-10 text-white"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
          >
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">투표 완료</h2>
            <p className="text-green-100 text-sm">{evaluator.name}님의 투표가 성공적으로 제출되었습니다.</p>
            <p className="text-green-200 text-xs mt-1">{submitMessage}</p>
          </div>

          <div className="px-8 py-6 space-y-3">
            {CATEGORY_KEYS.map((key) => {
              const cat = QS_CATEGORIES[key];
              const picked = selections[key] || [];
              return (
                <div key={key} className={`${cat.lightBg} rounded-lg p-4 text-left border ${cat.borderColor}`}>
                  <div className="text-xs text-slate-400 mb-1">{cat.icon} {cat.label}</div>
                  <div className="space-y-1">
                    {picked.map((qId, idx) => {
                      const q = QS_QUESTIONS[qId];
                      return (
                        <div key={qId} className={`font-bold text-sm ${cat.textColor}`}>
                          {idx + 1}. <span className="font-extrabold">#{qId}번</span>{q ? ` — ${q.title}` : ''}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-8 py-6 border-t border-slate-700 space-y-3">
            <button
              onClick={() => navigate('/question-selection/results')}
              className="w-full text-white py-3 rounded-lg font-bold hover:opacity-90 transition"
              style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}
            >
              📊 투표 현황 보기
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setSubmitMessage('');
              }}
              className="w-full bg-slate-700 text-slate-300 py-3 rounded-lg font-medium hover:bg-slate-600 transition"
            >
              🔄 투표 수정하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCount = CATEGORY_KEYS.reduce((sum, k) => sum + (selections[k]?.length || 0), 0);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 px-6 py-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-900/50 rounded-full flex items-center justify-center border border-blue-700/50">
            <span className="text-blue-400 font-bold text-lg">{evaluator.name.charAt(0)}</span>
          </div>
          <div>
            <div className="font-bold text-slate-100">{evaluator.name}</div>
            <div className="text-xs text-slate-400">{evaluator.role}</div>
          </div>
          {loadingPrev && (
            <span className="text-xs text-blue-400 animate-pulse">이전 투표 불러오는 중...</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <a
            href={QS_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
          >
            📄 문제은행 PDF
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
          <div className="text-sm text-slate-300">
            선택: <span className="font-bold text-blue-400">{selectedCount}</span>/{TOTAL_REQUIRED} 문제
          </div>
        </div>
      </div>

      <div className="space-y-8">
        {CATEGORY_KEYS.map((key) => {
          const cat = QS_CATEGORIES[key];
          const picked = selections[key] || [];
          return (
            <div key={key} className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden">
              <div
                className="px-6 py-4 text-white"
                style={{
                  background: `linear-gradient(135deg, ${
                    key === 'stock_transfer' ? '#1d4ed8, #1e3a8a' :
                    key === 'nominee_stock' ? '#6d28d9, #4c1d95' :
                    '#047857, #064e3b'
                  })`,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg">{cat.label}</h3>
                      <p className="text-sm opacity-80">7문제 중 3문제를 선택하세요</p>
                    </div>
                  </div>
                  <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-sm font-bold">
                    {picked.length}/{REQUIRED_PER_CATEGORY} 선택
                  </div>
                </div>
              </div>

              <div className="divide-y divide-slate-700">
                {cat.questionIds.map((qId) => {
                  const q = QS_QUESTIONS[qId];
                  if (!q) return null;
                  const isSelected = picked.includes(qId);
                  const isExpanded = expandedId === qId;
                  const rank = picked.indexOf(qId);

                  return (
                    <div
                      key={qId}
                      className={`transition-all ${
                        isSelected
                          ? `${cat.lightBg} border-l-4 ${cat.borderColor}`
                          : 'border-l-4 border-transparent hover:bg-slate-700/50'
                      }`}
                    >
                      <div className="px-6 py-4 flex items-start gap-4">
                        <button
                          onClick={() => handleSelect(key, qId)}
                          className={`mt-1 w-10 h-10 rounded-lg border-2 flex flex-col items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? `${cat.borderColor} ${cat.lightBg} ${cat.textColor}`
                              : 'border-slate-600 bg-slate-700 hover:border-slate-500'
                          }`}
                          title={`${qId}번 문제 선택`}
                        >
                          {isSelected ? (
                            <>
                              <span className="text-[10px] font-black leading-none">{rank + 1}순위</span>
                              <span className="text-[11px] font-black leading-none mt-0.5">#{qId}</span>
                            </>
                          ) : (
                            <span className="text-sm font-black text-slate-400">#{qId}</span>
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-sm font-extrabold px-2 py-0.5 rounded border ${
                              isSelected
                                ? `${cat.lightBg} ${cat.textColor} border-current`
                                : 'bg-slate-700 text-slate-300 border-slate-600'
                            }`}>
                              #{qId}번 문제
                            </span>
                            <span className="text-xs text-slate-500">
                              {q.year === 2025 ? '📌 기출 · 2025년 기출' : '✏️ 2026년 코치 출제'}
                            </span>
                          </div>
                          <h4 className={`font-bold text-sm mb-1 ${isSelected ? cat.textColor : 'text-slate-100'}`}>
                            {q.title}
                          </h4>
                          <p className="text-xs text-slate-400 mb-2">{q.issue}</p>
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : qId)}
                            className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                          >
                            {isExpanded ? '접기 ▲' : '상세보기 ▼'}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 bg-slate-700/60 rounded-lg p-4 text-xs text-slate-300 space-y-2 border border-slate-600">
                              <p className="font-medium text-slate-200">📎 문제은행 PDF에서 #{qId}번 문제 상세 내용을 확인하세요</p>
                              <a
                                href={QS_PDF_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-400 underline hover:text-blue-300"
                              >
                                문제은행 PDF 보기 →
                              </a>
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => handleSelect(key, qId)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                            isSelected
                              ? 'text-white shadow-md hover:opacity-90'
                              : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
                          }`}
                          style={isSelected ? {
                            background: `linear-gradient(135deg, ${
                              key === 'stock_transfer' ? '#1d4ed8, #1e3a8a' :
                              key === 'nominee_stock' ? '#6d28d9, #4c1d95' :
                              '#047857, #064e3b'
                            })`,
                          } : {}}
                        >
                          {isSelected ? `✓ 선택됨 (${rank + 1})` : `#${qId} 선택`}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="mt-4 bg-red-900/30 border border-red-700 rounded-xl px-6 py-4 text-sm text-red-400">
          ⚠️ {error}
        </div>
      )}

      <div className="sticky bottom-0 mt-8 bg-slate-900/95 backdrop-blur border border-slate-700 rounded-xl shadow-lg px-6 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-bold text-slate-100">{evaluator.name}님의 투표</div>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap gap-x-3 gap-y-1">
              {CATEGORY_KEYS.map((key) => {
                const cat = QS_CATEGORIES[key];
                const picked = selections[key] || [];
                return (
                  <span key={key}>
                    {cat.icon}{' '}
                    {picked.length > 0 ? (
                      <span className={`font-extrabold ${cat.textColor}`}>{picked.map((id) => `#${id}`).join(', ')}</span>
                    ) : (
                      <span className="text-slate-600">미선택</span>
                    )}
                  </span>
                );
              })}
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!allSelected || submitting}
            className={`px-8 py-3 rounded-lg font-bold text-sm transition-all ${
              allSelected && !submitting
                ? 'text-white shadow-lg hover:opacity-90'
                : 'bg-slate-700 text-slate-500 cursor-not-allowed'
            }`}
            style={allSelected && !submitting ? {
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)',
            } : {}}
          >
            {submitting
              ? '제출 중...'
              : allSelected
              ? '🗳️ 9문제 투표 제출'
              : `${TOTAL_REQUIRED - selectedCount}문제 추가 선택 필요`}
          </button>
        </div>
      </div>
    </div>
  );
}
