import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QS_EVALUATORS, findQsEvaluator } from '@/data/qsEvaluators';
import { QS_PDF_URL } from '@/data/qsQuestions';

export default function QSLoginPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    const evaluator = QS_EVALUATORS.find((ev) => ev.id === selectedId);
    if (!evaluator) {
      setError('평가위원을 선택해주세요.');
      return;
    }
    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);
    setTimeout(() => {
      const found = findQsEvaluator(evaluator.name, password);
      if (found) {
        sessionStorage.setItem(
          'qs_evaluator',
          JSON.stringify({ id: found.id, name: found.name, role: found.role })
        );
        navigate('/question-selection/vote');
      } else {
        setError('비밀번호가 올바르지 않습니다.');
      }
      setLoading(false);
    }, 400);
  };

  return (
    <div className="max-w-lg mx-auto mt-4">
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">

        {/* 상단 배너 */}
        <div
          className="px-8 py-8 text-white text-center"
          style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}
        >
          <div className="text-5xl mb-3">📋</div>
          <h2 className="text-2xl font-bold mb-2">TEST 케이스 문제 선정</h2>
          <p className="text-blue-100 text-sm">2026년 ASSO 치프인증 1차 출제</p>
          <p className="text-blue-200 text-xs mt-1">
            각 분야별 1문제 선택 → 최다득표 순 3문제 확정
          </p>
        </div>

        {/* 투표 안내 */}
        <div className="px-8 py-4 bg-amber-50 border-b border-amber-100">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5 text-base">ℹ️</span>
            <div className="text-xs text-amber-800">
              <p className="font-semibold mb-1">투표 안내</p>
              <ul className="space-y-0.5">
                <li>• 문제은행 21문제 중 분야별 1문제를 선택합니다</li>
                <li>• 3개 분야: 주식 이동 / 차명 주식 해소 / 가지급금 정리</li>
                <li>• 7명 평가위원의 최다득표 순 각 3문제 (총 9문제) 확정</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="px-8 py-6 space-y-5">

          {/* 문제은행 PDF 링크 */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-500 mb-2 font-medium">📎 문제은행 PDF 확인</p>
            <a
              href={QS_PDF_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium underline"
            >
              📄 치프문제은행 21문제 보기 (Google Drive)
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* 평가위원 선택 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              평가위원 선택
            </label>
            <div className="grid grid-cols-2 gap-2">
              {QS_EVALUATORS.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedId(ev.id)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                    selectedId === ev.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-bold">{ev.name}</div>
                  <div className="text-xs opacity-70">{ev.role}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-900 bg-white"
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full text-white py-4 rounded-lg font-bold text-base transition-all shadow-lg disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}
          >
            {loading ? '확인 중...' : '🗳️ 문제 선정 투표 시작'}
          </button>
        </form>

        {/* 결과 보기 링크 */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={() => navigate('/question-selection/results')}
            className="text-sm text-slate-500 hover:text-blue-600 transition-colors underline"
          >
            📊 투표 현황 및 결과 보기
          </button>
        </div>
      </div>
    </div>
  );
}
