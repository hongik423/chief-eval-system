/**
 * 랜덤 배정 출제 확정 페이지
 * - Supabase에서 확정된 배정 데이터 로드
 * - 피평가자별 출제 문제·URL 표시
 * - CSV 다운로드 (피평가자, 주식이동, 차명주식, 가지급금, 출제확인URL)
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QS_QUESTIONS } from '@/data/qsQuestions';
import {
  loadAssignmentsHybrid,
  encodeToken,
} from '@/lib/qsAssignmentStore';

export default function QSAssignmentConfirmPage() {
  const navigate = useNavigate();
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAssignmentsHybrid().then((res) => {
      setLoading(false);
      if (res?.assignments?.length > 0) {
        setAssignments(res.assignments);
        setSavedAt(res.savedAt);
      } else {
        setAssignments([]);
      }
    }).catch((err) => {
      setLoading(false);
      setError(err?.message || '배정 데이터를 불러올 수 없습니다.');
    });
  }, []);

  const handleDownloadCsv = () => {
    const header = '피평가자,팀,주식이동(#),차명주식(#),가지급금(#),출제확인URL\n';
    const rows = assignments.map((a) => {
      const token = encodeToken(a);
      const url = `${window.location.origin}/question-selection/exam/${token}`;
      return [
        a.candidateName,
        a.candidateTeam || '',
        `#${a.stock_transfer}`,
        `#${a.nominee_stock}`,
        `#${a.temporary_payment}`,
        url,
      ].join(',');
    });
    const csv = '\uFEFF' + header + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `2차출제_랜덤배정_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  if (loading) {
    return (
      <div className="text-center py-20">
        <div className="text-4xl mb-4">🎲</div>
        <p className="text-slate-400">배정 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-400 mb-4">{error}</p>
        <button
          onClick={() => navigate('/question-selection/results')}
          className="text-amber-400 hover:text-amber-300 underline"
        >
          결과보기로 돌아가기
        </button>
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="rounded-2xl border-2 border-dashed border-amber-700/50 p-10 bg-amber-950/20">
          <div className="text-5xl mb-4">🎲</div>
          <h2 className="text-xl font-bold text-slate-200 mb-2">아직 배정이 실행되지 않았습니다</h2>
          <p className="text-slate-400 text-sm mb-6">
            결과보기 페이지에서 관리자 모드로 로그인한 후,<br />
            &quot;랜덤배정출제&quot; 버튼으로 배정을 실행해 주세요.
          </p>
          <button
            onClick={() => navigate('/question-selection/results')}
            className="px-6 py-3 rounded-xl font-bold text-stone-900 transition hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
          >
            결과보기로 이동
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div
        className="rounded-2xl overflow-hidden border-2 shadow-2xl mb-8"
        style={{ borderColor: 'rgb(214,173,101)', background: 'linear-gradient(135deg, #1a1207 0%, #292010 100%)' }}
      >
        <div
          className="px-6 py-5 flex flex-wrap items-center justify-between gap-4"
          style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
        >
          <div>
            <h1 className="text-xl font-black text-stone-900">랜덤 배정 출제 확정</h1>
            <p className="text-xs text-stone-700 mt-0.5">
              인증대상 피평가자별 출제 문제 · 다운로드
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-xs text-stone-700">
                확정일시: {new Date(savedAt).toLocaleString('ko-KR')}
              </span>
            )}
            <button
              onClick={handleDownloadCsv}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-stone-900 transition hover:opacity-90 flex items-center gap-2"
              style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}
            >
              📥 CSV 다운로드
            </button>
            <button
              onClick={() => navigate('/question-selection/results')}
              className="px-4 py-2 rounded-xl text-sm font-medium text-stone-800 border border-stone-700/60 hover:bg-stone-200/80 transition"
            >
              결과보기
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {assignments.map((asgn) => {
            const token = encodeToken(asgn);
            const examUrl = `${window.location.origin}/question-selection/exam/${token}`;
            return (
              <div
                key={asgn.candidateId}
                className="rounded-2xl border border-amber-800/30 overflow-hidden"
                style={{ background: 'rgba(30,20,5,0.6)' }}
              >
                <div className="px-5 py-3.5 flex flex-wrap items-center gap-3 border-b border-amber-900/20">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
                    style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)', color: '#1a1207' }}
                  >
                    {asgn.candidateName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-100">{asgn.candidateName}</p>
                    <p className="text-xs text-slate-500">{asgn.candidateTeam}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-black text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-800/50">
                      #{asgn.stock_transfer} 주식이동
                    </span>
                    <span className="text-xs font-black text-purple-400 bg-purple-900/30 px-2 py-1 rounded border border-purple-800/50">
                      #{asgn.nominee_stock} 차명주식
                    </span>
                    <span className="text-xs font-black text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded border border-emerald-800/50">
                      #{asgn.temporary_payment} 가지급금
                    </span>
                  </div>
                </div>
                <div className="px-5 py-4">
                  <div className="grid grid-cols-3 gap-2 mb-4">
                    {[
                      { key: 'stock_transfer', icon: '📊', label: '주식이동', color: 'text-blue-400' },
                      { key: 'nominee_stock', icon: '🔐', label: '차명주식', color: 'text-purple-400' },
                      { key: 'temporary_payment', icon: '💰', label: '가지급금', color: 'text-emerald-400' },
                    ].map(({ key, icon, label, color }) => {
                      const qId = asgn[key];
                      const q = QS_QUESTIONS[qId];
                      return (
                        <div key={key} className="rounded-xl p-3 border border-slate-700/60 bg-slate-900/30">
                          <div className="flex items-center gap-1 mb-1">
                            <span className="text-xs">{icon}</span>
                            <span className="text-[10px] text-slate-500">{label}</span>
                          </div>
                          <p className={`text-xl font-black ${color}`}>#{qId}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-2">
                            {q?.title?.split(' - ').slice(-1)[0] || q?.title || ''}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0 bg-slate-900 rounded-lg px-3 py-2 border border-slate-700 overflow-hidden">
                      <p className="text-[10px] text-slate-500 mb-0.5">출제 확인 URL</p>
                      <p className="text-xs font-mono text-slate-300 truncate">{examUrl}</p>
                    </div>
                    <button
                      onClick={() => window.open(`/question-selection/exam/${token}`, '_blank')}
                      className="px-4 py-2.5 rounded-xl text-xs font-bold flex-shrink-0 border border-blue-600 text-blue-400 hover:bg-blue-900/30 transition"
                    >
                      📋 문제 확인 →
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
