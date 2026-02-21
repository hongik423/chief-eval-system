import { useState } from 'react';
import { useStore } from '@/lib/store';
import { ADMIN_ID } from '@/lib/constants';
import { Card, Button, ConnectionStatus } from '@/components/ui';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const { evaluators, allEvaluators, loginWithPassword } = useStore();
  const loginEvaluators = evaluators?.length > 0 ? evaluators : (allEvaluators || []);
  const [selectedId, setSelectedId] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminId, setAdminId] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const selectedEv = loginEvaluators.find(e => e.id === selectedId && !isAdmin);

  const handleLogin = async () => {
    if (!selectedId) return;
    if (isAdmin) {
      if (!adminId.trim()) {
        toast.error('아이디를 입력해 주세요.');
        return;
      }
    }
    if (!password.trim()) {
      toast.error('비밀번호를 입력해 주세요.');
      return;
    }
    setLoading(true);
    try {
      await loginWithPassword(selectedId, password.trim(), isAdmin, adminId.trim());
    } catch (err) {
      toast.error(err.message || '로그인 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEvaluator = (id) => {
    setSelectedId(id);
    setIsAdmin(false);
    setAdminId('');
    setPassword('');
  };

  const handleSelectAdmin = () => {
    setSelectedId('admin');
    setIsAdmin(true);
    setAdminId('');
    setPassword('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-surface-0 via-[#0D1520] to-[#0F1A2C]">
      <div className="w-full max-w-[520px] px-6">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 bg-surface-200/80 border border-surface-500/30 p-2 overflow-hidden">
            <img src="/bi.png" alt="기업의별" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-[26px] font-extrabold text-white tracking-tight">
            기업의별 치프인증 평가
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            2026년 2기 · TEST RED 평가 시스템
          </p>
          <div className="mt-3">
            <ConnectionStatus />
          </div>
        </div>

        {/* Evaluator Selection */}
        <Card className="mb-4">
          <div className="text-xs font-semibold text-slate-500 mb-3 tracking-widest">평가위원 로그인 (아이디·비밀번호: 영어 2~3자)</div>
          <div className="space-y-1.5">
            {loginEvaluators.map((ev) => (
              <div
                key={ev.id}
                data-testid={`evaluator-${ev.id}`}
                role="button"
                tabIndex={0}
                onClick={() => handleSelectEvaluator(ev.id)}
                onKeyDown={(e) => e.key === 'Enter' && handleSelectEvaluator(ev.id)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150
                  ${selectedId === ev.id && !isAdmin
                    ? 'bg-brand-500/10 border border-brand-500/30'
                    : 'border border-transparent hover:bg-surface-300/50'
                  }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-colors
                  ${selectedId === ev.id && !isAdmin
                    ? 'bg-brand-500 text-white'
                    : 'bg-surface-300 text-slate-400'
                  }`}>
                  {ev.name[0]}
                </div>
            <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">{ev.name} <span className="text-slate-500 font-normal">({ev.id})</span></div>
                <div className="text-[11px] text-slate-500">{ev.role} · {ev.team}</div>
              </div>
                {selectedId === ev.id && !isAdmin && (
                  <span className="text-brand-400 text-base">✓</span>
                )}
              </div>
            ))}
          </div>

          <div className="h-px bg-surface-500/40 my-4" />

          {/* Admin - 강조된 별도 섹션 */}
          <div className="text-xs font-semibold text-slate-500 mb-3 tracking-widest">관리자 로그인</div>
          <div
            data-testid="admin-login"
            role="button"
            tabIndex={0}
            onClick={handleSelectAdmin}
            onKeyDown={(e) => e.key === 'Enter' && handleSelectAdmin()}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-150
              ${isAdmin
                ? 'bg-yellow-500/10 border border-yellow-500/30'
                : 'border border-transparent hover:bg-surface-300/50'
              }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold
              ${isAdmin ? 'bg-yellow-500 text-surface-0' : 'bg-surface-300 text-slate-400'}`}>
              ⚙
            </div>
            <div>
              <div className="text-sm font-semibold text-white">관리자 (이후경 PM) <span className="text-slate-500 font-normal">({ADMIN_ID})</span></div>
              <div className="text-[11px] text-slate-500">HRD 실장 · 전체 현황 관리</div>
            </div>
            {isAdmin && <span className="text-yellow-400 text-base ml-auto">✓</span>}
          </div>
        </Card>

        {/* ID + Password Input */}
        {(selectedId && (selectedEv || isAdmin)) && (
          <Card className="mb-4 !p-4 space-y-3">
            {isAdmin && (
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-1">아이디 (초기: {ADMIN_ID})</div>
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && document.getElementById('admin-pw')?.focus()}
                  placeholder={ADMIN_ID}
                  className="w-full px-4 py-3 rounded-xl border border-surface-500 bg-surface-100 text-white placeholder-slate-600 outline-none focus:border-brand-500 transition-colors"
                  autoFocus
                />
              </div>
            )}
            <div>
              <div className="text-xs font-semibold text-slate-500 mb-1">
                {isAdmin ? '비밀번호 (.env.local 참조)' : `비밀번호 (초기: ${selectedEv?.id})`}
              </div>
              <input
                id={isAdmin ? 'admin-pw' : undefined}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="비밀번호 입력"
                className="w-full px-4 py-3 rounded-xl border border-surface-500 bg-surface-100 text-white placeholder-slate-600 outline-none focus:border-brand-500 transition-colors"
                autoFocus={!isAdmin}
              />
            </div>
          </Card>
        )}

        <Button
          size="lg"
          disabled={!selectedId || !password.trim() || (isAdmin && !adminId.trim()) || loading}
          onClick={handleLogin}
          className="w-full rounded-xl"
        >
          {loading ? '로그인 중...' : isAdmin ? '관리자로 입장' : '평가 시작'}
        </Button>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          평가일: 2026년 3월 28일(토) · 문의: 010-9251-9743
        </p>
      </div>
    </div>
  );
}
