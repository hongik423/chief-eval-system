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
  const { currentUser, isAdmin, loading, initialize } = useStore();
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
