import { useState, useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import { useStore } from '@/lib/store';
import { Spinner } from '@/components/ui';
import AppNav from '@/components/AppNav';
import LoginPage from '@/pages/LoginPage';
import EvaluatorDashboard from '@/pages/EvaluatorDashboard';
import EvalFormPage from '@/pages/EvalFormPage';
import AdminDashboard from '@/pages/AdminDashboard';

export default function App() {
  const { currentUser, isAdmin, loading, error, initialize } = useStore();
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [showTestSelectionBanner, setShowTestSelectionBanner] = useState(false);

  useEffect(() => {
    initialize();
  }, []);

  useEffect(() => {
    if (currentUser && !isAdmin) {
      // 세션당 1회만 표시: "닫기" 클릭 시 sessionStorage에 기록
      const dismissed = sessionStorage.getItem('test_selection_banner_dismissed');
      setShowTestSelectionBanner(!dismissed);
    } else {
      setShowTestSelectionBanner(false);
    }
  }, [currentUser, isAdmin]);

  const testSelectionPhaseBanner = showTestSelectionBanner ? (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="w-full max-w-[620px] rounded-2xl border border-amber-700/40 overflow-hidden shadow-2xl bg-surface-100">
        <div
          className="px-6 py-6 text-center"
          style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
        >
          <div className="text-3xl mb-2">📢</div>
          <h2 className="text-2xl font-extrabold text-surface-0">TEST 케이스 문제 선정 공지</h2>
          <p className="text-sm text-surface-0/80 mt-1">
            현재는 TEST 문제선정 단계입니다. 먼저 진행해 주세요.
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-3">
          <div className="rounded-xl border border-blue-700/40 bg-blue-950/30 px-4 py-3">
            <p className="text-xs text-blue-300 font-semibold">진행 안내</p>
            <p className="text-sm text-blue-200/90 mt-1">
              상단 네비바 중간 <span className="font-bold">[🗳️ TEST 문제 선정]</span> 버튼을 클릭해
              문제 선정을 먼저 완료해 주세요.
            </p>
          </div>

          <div className="rounded-xl border border-surface-500/40 bg-surface-200/30 px-4 py-3">
            <p className="text-xs text-slate-300 font-semibold mb-2">문제 선정 진행 순서</p>
            <ol className="text-sm text-slate-200 space-y-1 list-decimal pl-4">
              <li>상단 네비바 중간 [TEST 문제 선정] 클릭</li>
              <li>3개 분야 각 3문제(총 9문제) 선택 후 제출</li>
              <li>결과 대시보드 확인</li>
            </ol>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => { window.location.href = '/question-selection'; }}
              className="w-full py-3 rounded-xl font-bold text-surface-0 hover:opacity-90 transition"
              style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
            >
              TEST 문제 선정 바로가기 →
            </button>
            <button
              type="button"
              onClick={() => setShowTestSelectionBanner(false)}
              className="w-full py-3 rounded-xl font-semibold text-slate-300 bg-surface-200 hover:bg-surface-300 transition"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  ) : null;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="text-sm text-slate-500 mt-4">시스템을 초기화하고 있습니다...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-0 px-4">
        <div className="max-w-md w-full text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-white mb-2">Supabase 연결 필요</h1>
          <p className="text-sm text-slate-400 mb-6 whitespace-pre-wrap">{error}</p>
          <p className="text-xs text-slate-500 mb-4">
            Vercel 배포 시: 프로젝트 Settings → Environment Variables 에서<br />
            VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY 설정 후 재배포해 주세요.
          </p>
          <button
            onClick={() => initialize()}
            className="px-4 py-2 rounded-lg bg-brand-500 text-white text-sm font-medium hover:bg-brand-600"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return (
      <>
        <Toaster position="top-center" toastOptions={{
          className: 'toast-custom',
          style: { background: '#1C2536', color: '#E8ECF4', border: '1px solid #243044' },
        }} />
        <LoginPage />
      </>
    );
  }

  // Admin
  if (isAdmin) {
    return (
      <div className="min-h-screen bg-surface-0">
        <Toaster position="top-center" toastOptions={{
          className: 'toast-custom',
          style: { background: '#1C2536', color: '#E8ECF4', border: '1px solid #243044' },
        }} />
        {testSelectionPhaseBanner}
        <AppNav />
        <AdminDashboard />
      </div>
    );
  }

  // Evaluator - Scoring Form
  if (selectedCandidate) {
    return (
      <div className="min-h-screen bg-surface-0">
        <Toaster position="top-center" toastOptions={{
          className: 'toast-custom',
          style: { background: '#1C2536', color: '#E8ECF4', border: '1px solid #243044' },
        }} />
        {testSelectionPhaseBanner}
        <AppNav />
        <EvalFormPage
          candidateId={selectedCandidate}
          onBack={() => setSelectedCandidate(null)}
        />
      </div>
    );
  }

  // Evaluator - Dashboard
  return (
    <div className="min-h-screen bg-surface-0">
      <Toaster position="top-center" toastOptions={{
        className: 'toast-custom',
        style: { background: '#1C2536', color: '#E8ECF4', border: '1px solid #243044' },
      }} />
      {testSelectionPhaseBanner}
      <AppNav />
      <EvaluatorDashboard onSelectCandidate={setSelectedCandidate} />
    </div>
  );
}
