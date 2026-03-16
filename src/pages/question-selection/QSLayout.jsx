import { Outlet, useNavigate } from 'react-router-dom';

export default function QSLayout() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: '#0f172a' }}>
      {/* 상단 헤더 - 모바일: 세로 스택 + 가로 스크롤 네비 */}
      <header className="bg-slate-900 border-b border-slate-700 shadow-sm">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <button
            onClick={() => navigate('/question-selection')}
            className="flex items-center gap-2 sm:gap-3 hover:opacity-80 transition-opacity min-h-[44px] shrink-0"
          >
            <img
              src="/bi.png"
              alt="기업의별 로고"
              className="h-9 sm:h-10 w-auto max-w-[100px] sm:max-w-[120px] object-contain rounded-lg shadow"
            />
            <div className="text-left">
              <h1 className="text-sm sm:text-base font-bold text-slate-100 leading-tight">
                기업의별 치프인증
              </h1>
              <p className="text-[11px] sm:text-xs text-slate-400 leading-tight">
                TEST 케이스 문제 선정 시스템
              </p>
            </div>
          </button>

          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none -mx-3 px-3 sm:mx-0 sm:px-0 pb-1 sm:pb-0 flex-shrink-0 min-h-[44px] sm:min-h-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <a
              href="/"
              className="text-[11px] sm:text-xs bg-amber-900/40 text-amber-400 px-2.5 sm:px-3 py-2 sm:py-1 rounded-full font-medium hover:bg-amber-800/50 transition border border-amber-700/50 whitespace-nowrap flex-shrink-0"
            >
              📋 평가표 로그인
            </a>
            <button
              onClick={() => navigate('/question-selection/assignment-confirm')}
              className="text-[11px] sm:text-xs bg-amber-900/40 text-amber-400 px-2.5 sm:px-3 py-2 sm:py-1 rounded-full font-medium hover:bg-amber-800/50 transition border border-amber-700/50 whitespace-nowrap flex-shrink-0"
            >
              📋 랜덤 배정 출제 확정
            </button>
            <span className="text-[11px] sm:text-xs bg-emerald-900/40 text-emerald-400 px-2.5 sm:px-3 py-2 sm:py-1 rounded-full font-medium border border-emerald-700/50 whitespace-nowrap flex-shrink-0">
              ✅ 1차 출제 마감
            </span>
            <button
              onClick={() => navigate('/question-selection/results')}
              className="text-[11px] sm:text-xs bg-blue-900/40 text-blue-400 px-2.5 sm:px-3 py-2 sm:py-1 rounded-full font-medium hover:bg-blue-800/50 transition border border-blue-700/50 whitespace-nowrap flex-shrink-0"
            >
              📊 결과보기
            </button>
          </div>
        </div>
      </header>

      {/* 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-8 pb-6 sm:pb-8">
        <Outlet />
      </main>

      {/* 푸터 */}
      <footer className="bg-slate-900 border-t border-slate-700 mt-auto">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-3 sm:py-4 text-center text-[11px] sm:text-xs text-slate-500">
          © 2026 기업의별 ASSO 치프인증제도 | 1차 출제 마감 완료 (2026.02.26)
          <span className="block mt-1">빌드: 2026-03-15-v3-eval-linked</span>
        </div>
      </footer>
    </div>
  );
}
