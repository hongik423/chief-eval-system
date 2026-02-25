import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QS_CATEGORIES, QS_QUESTIONS, QS_PDF_URL } from '@/data/qsQuestions';
import { submitVote, getEvaluatorVote } from '@/lib/qsVoteStore';

const CATEGORY_KEYS = Object.keys(QS_CATEGORIES);

export default function QSVotePage() {
  const navigate = useNavigate();
  const [evaluator, setEvaluator] = useState(null);
  const [selections, setSelections] = useState({
    stock_transfer: 0,
    nominee_stock: 0,
    temporary_payment: 0,
  });
  const [expandedId, setExpandedId] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [error, setError] = useState('');
  const [loadingPrev, setLoadingPrev] = useState(false);

  // 로그인 확인 + 이전 투표 불러오기
  useEffect(() => {
    const stored = sessionStorage.getItem('qs_evaluator');
    if (!stored) {
      navigate('/question-selection');
      return;
    }
    const ev = JSON.parse(stored);
    setEvaluator(ev);

    // 이전 투표가 있으면 불러오기
    setLoadingPrev(true);
    getEvaluatorVote(ev.id)
      .then((prev) => {
        if (prev) {
          setSelections({
            stock_transfer: prev.stock_transfer || 0,
            nominee_stock: prev.nominee_stock || 0,
            temporary_payment: prev.temporary_payment || 0,
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrev(false));
  }, [navigate]);

  const handleSelect = (categoryKey, qId) => {
    setSelections((prev) => ({
      ...prev,
      [categoryKey]: prev[categoryKey] === qId ? 0 : qId,
    }));
  };

  const allSelected = CATEGORY_KEYS.every((k) => selections[k] > 0);

  const handleSubmit = async () => {
    if (!evaluator || !allSelected) return;
    setSubmitting(true);
    setError('');
    try {
      await submitVote(evaluator.id, evaluator.name, selections);
      setSubmitMessage('투표가 완료되었습니다.');
      setSubmitted(true);
    } catch (err) {
      setError('투표 제출 중 오류가 발생했습니다: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  if (!evaluator) return null;

  // 투표 완료 화면
  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-4">
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden text-center">
          <div
            className="px-8 py-10 text-white"
            style={{ background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)' }}
          >
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold mb-2">투표 완료</h2>
            <p className="text-green-100 text-sm">
              {evaluator.name}님의 투표가 성공적으로 제출되었습니다.
            </p>
            <p className="text-green-200 text-xs mt-1">{submitMessage}</p>
          </div>

          <div className="px-8 py-6 space-y-3">
            {CATEGORY_KEYS.map((key) => {
              const cat = QS_CATEGORIES[key];
              const qId = selections[key];
              const q = QS_QUESTIONS[qId];
              return (
                <div key={key} className={`${cat.lightBg} rounded-lg p-4 text-left border ${cat.borderColor}`}>
                  <div className="text-xs text-slate-500 mb-1">
                    {cat.icon} {cat.label}
                  </div>
                  <div className={`font-bold text-sm ${cat.textColor}`}>
                    {qId}번 - {q?.title}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="px-8 py-6 border-t border-slate-100 space-y-3">
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
              className="w-full bg-slate-100 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-200 transition"
            >
              🔄 투표 수정하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  const selectedCount = CATEGORY_KEYS.filter((k) => selections[k] > 0).length;

  return (
    <div className="max-w-5xl mx-auto">

      {/* 상단 정보 바 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-blue-600 font-bold text-lg">
              {evaluator.name.charAt(0)}
            </span>
          </div>
          <div>
            <div className="font-bold text-slate-900">{evaluator.name}</div>
            <div className="text-xs text-slate-500">{evaluator.role}</div>
          </div>
          {loadingPrev && (
            <span className="text-xs text-blue-500 animate-pulse">이전 투표 불러오는 중...</span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <a
            href={QS_PDF_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-600 hover:text-blue-700 underline flex items-center gap-1"
          >
            📄 문제은행 PDF
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <div className="text-sm text-slate-600">
            선택:{' '}
            <span className="font-bold text-blue-600">{selectedCount}</span>/3 분야
          </div>
        </div>
      </div>

      {/* 3개 분야 투표 */}
      <div className="space-y-8">
        {CATEGORY_KEYS.map((key) => {
          const cat = QS_CATEGORIES[key];
          return (
            <div key={key} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">

              {/* 분야 헤더 */}
              <div
                className="px-6 py-4 text-white"
                style={{ background: `linear-gradient(135deg, ${
                  key === 'stock_transfer' ? '#3b82f6, #1d4ed8' :
                  key === 'nominee_stock'  ? '#8b5cf6, #6d28d9' :
                  '#10b981, #047857'
                })` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{cat.icon}</span>
                    <div>
                      <h3 className="font-bold text-lg">{cat.label}</h3>
                      <p className="text-sm opacity-80">7문제 중 1문제를 선택하세요</p>
                    </div>
                  </div>
                  {selections[key] > 0 && (
                    <div className="bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-sm font-medium">
                      ✓ {selections[key]}번 선택됨
                    </div>
                  )}
                </div>
              </div>

              {/* 문제 목록 */}
              <div className="divide-y divide-slate-100">
                {cat.questionIds.map((qId) => {
                  const q = QS_QUESTIONS[qId];
                  const isSelected = selections[key] === qId;
                  const isExpanded = expandedId === qId;

                  return (
                    <div
                      key={qId}
                      className={`transition-all ${
                        isSelected
                          ? `${cat.lightBg} border-l-4 ${cat.borderColor}`
                          : 'border-l-4 border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <div className="px-6 py-4 flex items-start gap-4">

                        {/* 라디오 버튼 */}
                        <button
                          onClick={() => handleSelect(key, qId)}
                          className={`mt-1 w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                            isSelected
                              ? `${cat.borderColor} ${cat.lightBg} ${cat.textColor}`
                              : 'border-slate-300 bg-white hover:border-slate-400'
                          }`}
                        >
                          {isSelected ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd" />
                            </svg>
                          ) : (
                            <span className="text-xs text-slate-400 font-bold">{qId}</span>
                          )}
                        </button>

                        {/* 문제 정보 */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                              isSelected ? `${cat.lightBg} ${cat.textColor}` : 'bg-slate-100 text-slate-500'
                            }`}>
                              {qId}번
                            </span>
                            <span className="text-xs text-slate-400">출제: {q.submitter}</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }, (_, i) => (
                                <span key={i} className={`text-xs ${i < q.difficulty ? 'text-amber-400' : 'text-slate-200'}`}>
                                  ★
                                </span>
                              ))}
                            </div>
                          </div>
                          <h4 className={`font-bold text-sm mb-1 ${isSelected ? cat.textColor : 'text-slate-900'}`}>
                            {q.title}
                          </h4>
                          <p className="text-xs text-slate-500 mb-2">{q.issue}</p>

                          {/* 상세 보기 토글 */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : qId)}
                            className="text-xs text-blue-500 hover:text-blue-600 flex items-center gap-1 transition-colors"
                          >
                            {isExpanded ? '접기 ▲' : '상세보기 ▼'}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 bg-slate-50 rounded-lg p-4 text-xs text-slate-600 space-y-2 border border-slate-100">
                              <p className="font-medium text-slate-700">
                                📎 문제은행 PDF에서 상세 내용을 확인하세요
                              </p>
                              <a
                                href={QS_PDF_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-700"
                              >
                                문제은행 PDF 보기 →
                              </a>
                            </div>
                          )}
                        </div>

                        {/* 선택 버튼 */}
                        <button
                          onClick={() => handleSelect(key, qId)}
                          className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                            isSelected
                              ? 'text-white shadow-md hover:opacity-90'
                              : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                          style={isSelected ? {
                            background: `linear-gradient(135deg, ${
                              key === 'stock_transfer' ? '#3b82f6, #1d4ed8' :
                              key === 'nominee_stock'  ? '#8b5cf6, #6d28d9' :
                              '#10b981, #047857'
                            })`
                          } : {}}
                        >
                          {isSelected ? '✓ 선택됨' : '선택'}
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

      {/* 오류 메시지 */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-6 py-4 text-sm text-red-600">
          ⚠️ {error}
        </div>
      )}

      {/* 하단 고정 제출 바 */}
      <div className="sticky bottom-0 mt-8 bg-white/95 backdrop-blur border border-slate-200 rounded-xl shadow-lg px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">{evaluator.name}님의 투표</div>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
              {CATEGORY_KEYS.map((key) => {
                const cat = QS_CATEGORIES[key];
                return (
                  <span key={key}>
                    {cat.icon}{' '}
                    {selections[key] > 0 ? (
                      <span className={cat.textColor}>{selections[key]}번</span>
                    ) : (
                      <span className="text-slate-300">미선택</span>
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
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            }`}
            style={allSelected && !submitting ? {
              background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)'
            } : {}}
          >
            {submitting
              ? '제출 중...'
              : allSelected
              ? '🗳️ 투표 제출'
              : `${3 - selectedCount}개 분야 선택 필요`}
          </button>
        </div>
      </div>
    </div>
  );
}
