import { Outlet, useNavigate } from 'react-router-dom';

export default function QSLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      {/* 상단 헤더 */}
      <header className="bg-slate-900 border-b border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/question-selection')}
            className="flex items-center gap-3 hover:opacity-80 transition-opacity"
          >
            <img
              src="/bi.png"
              alt="기업의별 로고"
              className="h-10 w-auto max-w-[120px] object-contain rounded-lg shadow"
            />
            <div className="text-left">
              <h1 className="text-base font-bold text-slate-100 leading-tight">
                기업의별 치프인증
              </h1>
              <p className="text-xs text-slate-400 leading-tight">
                TEST 케이스 문제 선정 시스템
              </p>
            </div>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs bg-emerald-900/40 text-emerald-400 px-3 py-1 rounded-full font-medium border border-emerald-700/50">
              ✅ 1차 출제 마감
            </span>
            <button
              onClick={() => navigate('/question-selection/results')}
              className="text-xs bg-blue-900/40 text-blue-400 px-3 py-1 rounded-full font-medium hover:bg-blue-800/50 transition border border-blue-700/50"
            >
              📊 결과보기
            </button>
          </div>
        </div>
      </header>

      {/* 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Outlet />
      </main>

      {/* 푸터 */}
      <footer className="bg-slate-900 border-t border-slate-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 text-center text-xs text-slate-500">
          © 2026 기업의별 ASSO 치프인증제도 | 1차 출제 마감 완료 (2026.02.26)
          <span className="block mt-1">빌드: 2026-03-15-v3-eval-linked</span>
        </div>
      </footer>
    </div>
  );
}
