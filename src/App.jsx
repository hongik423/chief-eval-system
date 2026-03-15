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

  useEffect(() => {
    initialize();
  }, []);

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
      <AppNav />
      <EvaluatorDashboard onSelectCandidate={setSelectedCandidate} />
    </div>
  );
}
