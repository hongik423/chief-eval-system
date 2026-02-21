import { useState } from 'react';
import { useStore } from '@/lib/store';
import { SCHEDULE } from '@/lib/constants';
import { Card, Badge, Button, SectionHeader } from '@/components/ui';
import toast from 'react-hot-toast';

export default function EvaluatorDashboard({ onSelectCandidate }) {
  const { currentUser, evaluators, allEvaluators, candidates, logout, isExcluded, getSessionStatus, getSessionScores, criteriaItems, changePassword, periodInfo } = useStore();
  const evaluator = (evaluators || []).find(e => e.id === currentUser) || (allEvaluators || []).find(e => e.id === currentUser);
  const hasPermission = (evaluators || []).some(e => e.id === currentUser);
  const [showChangePw, setShowChangePw] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [newPwConfirm, setNewPwConfirm] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  const getEvalTotal = (candidateId) => {
    const scores = getSessionScores(currentUser, candidateId);
    return criteriaItems.reduce((sum, item) => sum + (scores[item.id] || 0), 0);
  };

  const isComplete = (candidateId) => {
    const scores = getSessionScores(currentUser, candidateId);
    return criteriaItems.every(item => scores[item.id] != null);
  };

  const handleChangePassword = async () => {
    if (!newPw || newPw !== newPwConfirm) {
      toast.error('새 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (newPw.length < 2) {
      toast.error('비밀번호는 2자 이상 입력해 주세요.');
      return;
    }
    setPwLoading(true);
    try {
      await changePassword(currentUser, currentPw, newPw);
      toast.success('비밀번호가 변경되었습니다.');
      setShowChangePw(false);
      setCurrentPw('');
      setNewPw('');
      setNewPwConfirm('');
    } catch (err) {
      toast.error(err.message || '비밀번호 변경 실패');
    } finally {
      setPwLoading(false);
    }
  };

  if (!hasPermission && evaluator) {
    return (
      <div className="max-w-[900px] mx-auto px-4 py-20">
        <Card className="text-center !p-12">
          <div className="text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold text-white mb-2">이 평가 기간에 참여 권한이 없습니다</h2>
          <p className="text-sm text-slate-400 mb-6">
            {evaluator.name} 위원님은 {periodInfo?.name || '현재 기간'} 평가위원으로 배정되지 않았습니다.<br />
            관리자에게 문의해 주세요.
          </p>
          <Button variant="secondary" onClick={logout}>로그아웃</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[900px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-[22px] font-extrabold text-white tracking-tight">치프인증 평가</h1>
          <p className="text-sm text-slate-400">
            {evaluator?.name} {evaluator?.role} · {evaluator?.team}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setShowChangePw(true)}>
            비밀번호 변경
          </Button>
          <Button variant="secondary" size="sm" onClick={logout}>로그아웃</Button>
        </div>
      </div>

      {/* 비밀번호 변경 모달 */}
      {showChangePw && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-[400px] !p-6">
            <h3 className="text-lg font-bold text-white mb-4">비밀번호 변경</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">현재 비밀번호</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="현재 비밀번호"
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-500 bg-surface-100 text-white placeholder-slate-600 outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">새 비밀번호</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="새 비밀번호"
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-500 bg-surface-100 text-white placeholder-slate-600 outline-none focus:border-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">새 비밀번호 확인</label>
                <input
                  type="password"
                  value={newPwConfirm}
                  onChange={(e) => setNewPwConfirm(e.target.value)}
                  placeholder="새 비밀번호 확인"
                  className="w-full px-4 py-2.5 rounded-lg border border-surface-500 bg-surface-100 text-white placeholder-slate-600 outline-none focus:border-brand-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5 justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowChangePw(false)} disabled={pwLoading}>
                취소
              </Button>
              <Button variant="primary" size="sm" onClick={handleChangePassword} disabled={pwLoading}>
                {pwLoading ? '변경 중...' : '변경'}
              </Button>
            </div>
          </Card>
        </div>
      )}

      {/* Progress Summary */}
      <Card className="mb-6 !p-4">
        <div className="flex items-center gap-4">
          <div className="text-2xl">📊</div>
          <div className="flex-1">
            <div className="text-sm font-semibold text-white">나의 평가 진행률</div>
            <div className="text-xs text-slate-500 mt-0.5">
              {candidates.filter(c => !isExcluded(currentUser, c.id) && isComplete(c.id)).length}
              /{candidates.filter(c => !isExcluded(currentUser, c.id)).length}명 완료
            </div>
          </div>
          <div className="h-2 flex-1 max-w-[200px] bg-surface-500/40 rounded-full overflow-hidden">
            {(() => {
              const eligible = candidates.filter(c => !isExcluded(currentUser, c.id));
              const done = eligible.filter(c => isComplete(c.id));
              const pct = eligible.length > 0 ? (done.length / eligible.length) * 100 : 0;
              return <div className="h-full bg-brand-500 rounded-full transition-all" style={{ width: `${pct}%` }} />;
            })()}
          </div>
        </div>
      </Card>

      {/* Candidate Cards */}
      <SectionHeader>응시자 목록</SectionHeader>
      <div className="space-y-3 mb-8">
        {candidates.map((cand) => {
          const excluded = isExcluded(currentUser, cand.id);
          const complete = !excluded && isComplete(cand.id);
          const status = getSessionStatus(currentUser, cand.id);
          const total = getEvalTotal(cand.id);

          return (
            <Card
              key={cand.id}
              data-testid={`candidate-${cand.id}`}
              role="button"
              tabIndex={excluded ? -1 : 0}
              aria-label={`${cand.name} 평가하기`}
              hover={!excluded}
              onClick={() => !excluded && onSelectCandidate(cand.id)}
              onKeyDown={(e) => !excluded && (e.key === 'Enter' || e.key === ' ') && onSelectCandidate(cand.id)}
              className={`flex items-center gap-5 !py-5
                ${excluded ? 'opacity-40 !cursor-not-allowed' : ''}
                ${complete ? '!border-emerald-500/30' : ''}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold shrink-0
                ${excluded ? 'bg-surface-300 text-slate-600'
                  : complete ? 'bg-emerald-500/10 text-emerald-400'
                  : 'bg-brand-500/10 text-brand-400'}`}>
                {excluded ? '—' : cand.name[0]}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-base font-bold text-white">{cand.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{cand.team}</div>
              </div>
              <div className="flex items-center gap-3">
                {excluded ? (
                  <Badge variant="muted">동일팀 제외</Badge>
                ) : complete ? (
                  <>
                    <Badge variant="green">평가 완료</Badge>
                    <span className="text-lg font-extrabold text-emerald-400 font-mono">{total}점</span>
                  </>
                ) : status === 'in_progress' ? (
                  <Badge variant="amber">작성 중</Badge>
                ) : (
                  <Badge variant="muted">미평가</Badge>
                )}
                {!excluded && (
                  <span className="text-slate-600 text-lg">›</span>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Schedule */}
      <SectionHeader>평가 일정</SectionHeader>
      <Card>
        {SCHEDULE.map((s, i) => (
          <div key={i} className={`flex items-start gap-4 py-3
            ${i < SCHEDULE.length - 1 ? 'border-b border-surface-500/20' : ''}`}>
            <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0
              ${s.status === 'done' ? 'bg-emerald-400'
                : s.status === 'active' ? 'bg-brand-500 shadow-[0_0_8px_rgba(74,124,255,0.4)]'
                : 'bg-slate-600'}`}
            />
            <div className="min-w-[100px]">
              <span className={`text-xs font-semibold
                ${s.status === 'active' ? 'text-brand-400' : 'text-slate-500'}`}>
                {s.date}
              </span>
            </div>
            <span className={`text-sm font-medium
              ${s.status === 'done' ? 'text-slate-500' : 'text-white'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </Card>
    </div>
  );
}
