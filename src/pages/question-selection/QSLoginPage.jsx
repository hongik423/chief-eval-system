import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  QS_EVALUATORS,
  findQsEvaluator,
  getEvaluatorPassword,
  changeEvaluatorPassword,
  hasCustomPassword,
} from '@/data/qsEvaluators';
import { QS_PDF_URL } from '@/data/qsQuestions';
import { getVotingConfig } from '@/lib/qsVoteStore';
import {
  EXAM_DATE,
  EXAM_DATE_STR,
  ROUND2_DATE_STR,
  MENTORING_START,
  MENTORING_END,
  SCHEDULE_MILESTONES,
  getCurrentStep,
} from '@/lib/qsAssignmentStore';

export default function QSLoginPage() {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 공지 모달
  const [showNotice, setShowNotice] = useState(true);
  const [examCountdown, setExamCountdown] = useState('');
  const [examDDay, setExamDDay] = useState('');

  // 비밀번호 변경 모달
  const [showPwChange, setShowPwChange] = useState(false);
  const [pwStep, setPwStep] = useState(1); // 1: 이름선택+현재PW, 2: 새PW 입력, 3: 완료
  const [pwTargetId, setPwTargetId] = useState('');
  const [pwCurrent, setPwCurrent] = useState('');
  const [pwNew, setPwNew] = useState('');
  const [pwConfirm, setPwConfirm] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwShowCurrent, setPwShowCurrent] = useState(false);
  const [pwShowNew, setPwShowNew] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = EXAM_DATE - new Date();
      if (diff <= 0) { setExamCountdown('시험 당일'); setExamDDay('D-0'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setExamDDay(`D-${d}`);
      setExamCountdown(`${d}일 ${h}시간 ${m}분 남음`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  // 로그인
  const handleLogin = (e) => {
    e.preventDefault();
    setError('');
    const evaluator = QS_EVALUATORS.find((ev) => ev.id === selectedId);
    if (!evaluator) { setError('평가위원을 선택해주세요.'); return; }
    if (!password) { setError('비밀번호를 입력해주세요.'); return; }
    setLoading(true);
    setTimeout(() => {
      const found = findQsEvaluator(evaluator.name, password);
      if (found) {
        sessionStorage.setItem('qs_evaluator', JSON.stringify({ id: found.id, name: found.name, role: found.role }));
        navigate('/question-selection/vote');
      } else {
        setError('비밀번호가 올바르지 않습니다.');
      }
      setLoading(false);
    }, 400);
  };

  // 비밀번호 변경 모달 열기
  const openPwChange = () => {
    setPwStep(1);
    setPwTargetId(selectedId || '');
    setPwCurrent('');
    setPwNew('');
    setPwConfirm('');
    setPwError('');
    setShowPwChange(true);
  };

  // 비밀번호 변경 모달 닫기
  const closePwChange = () => {
    setShowPwChange(false);
    setPwStep(1);
    setPwTargetId('');
    setPwCurrent('');
    setPwNew('');
    setPwConfirm('');
    setPwError('');
  };

  // STEP1: 현재 비밀번호 확인
  const handlePwVerify = () => {
    setPwError('');
    if (!pwTargetId) { setPwError('이름을 선택해주세요.'); return; }
    const ev = QS_EVALUATORS.find((e) => e.id === pwTargetId);
    if (!ev) { setPwError('평가위원을 선택해주세요.'); return; }
    if (!pwCurrent) { setPwError('현재 비밀번호를 입력해주세요.'); return; }
    const actual = getEvaluatorPassword(pwTargetId);
    if (pwCurrent !== actual) { setPwError('현재 비밀번호가 올바르지 않습니다.'); return; }
    setPwStep(2);
  };

  // STEP2: 새 비밀번호 저장
  const handlePwSave = () => {
    setPwError('');
    if (!pwNew) { setPwError('새 비밀번호를 입력해주세요.'); return; }
    if (pwNew.length < 3) { setPwError('비밀번호는 3자 이상이어야 합니다.'); return; }
    if (pwNew !== pwConfirm) { setPwError('새 비밀번호가 일치하지 않습니다.'); return; }
    const ev = QS_EVALUATORS.find((e) => e.id === pwTargetId);
    if (pwNew === ev.defaultPassword) { setPwError('초기 비밀번호와 동일합니다. 다른 비밀번호를 사용해주세요.'); return; }
    changeEvaluatorPassword(pwTargetId, pwNew);
    setPwStep(3);
  };

  const selectedEv = QS_EVALUATORS.find((e) => e.id === selectedId);

  return (
    <>
    {/* ════════════════════════════════════════
        공지 모달
    ════════════════════════════════════════ */}
    {showNotice && (() => {
      const now = new Date();
      const isMentoring = now >= MENTORING_START && now <= MENTORING_END;
      const currentStep = getCurrentStep();
      return (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto"
        style={{ background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(6px)' }}>
        <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl border border-stone-600/40 my-auto"
          style={{ background: 'linear-gradient(180deg, #0f172a 0%, #1e1b10 100%)' }}>

          {/* 헤더 */}
          <div className="px-6 py-5 text-center border-b border-stone-600/40"
            style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}>
            <div className="text-4xl mb-2">🏆</div>
            <h2 className="text-xl font-bold text-stone-900">2026 ASSO 치프인증 평가</h2>
            <p className="text-stone-700 text-xs mt-1 font-medium">TEST RED · 인증 평가 진행 안내</p>
          </div>

          {/* 시험일 카운트다운 */}
          <div className="mx-6 mt-5 rounded-xl border overflow-hidden"
            style={{ borderColor: 'rgb(163,120,55)', background: 'linear-gradient(135deg, #1a1207 0%, #292010 100%)' }}>
            <div className="px-5 py-4 flex items-center gap-4">
              <span className="text-3xl">📋</span>
              <div className="flex-1">
                <p className="text-xs font-bold mb-0.5" style={{ color: 'rgb(214,173,101)' }}>인증평가 시험일</p>
                <p className="text-base font-extrabold text-slate-100">{EXAM_DATE_STR}</p>
                <p className="text-xs text-slate-500 mt-0.5">오전 10:00 시작 · 인터뷰 + PT 발제안</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black tabular-nums leading-none" style={{ color: 'rgb(214,173,101)' }}>{examDDay}</p>
                <p className="text-[10px] text-slate-500 mt-1">{examCountdown}</p>
              </div>
            </div>
          </div>

          {/* 1차 출제 완료 알림 */}
          <div className="mx-6 mt-3 rounded-xl border border-emerald-700/50 px-5 py-3 flex items-center gap-3"
            style={{ background: 'rgba(5,46,22,0.5)' }}>
            <span className="text-lg">✅</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-400">1차 출제 완료 · 9문제 확정</p>
              <p className="text-[11px] text-emerald-600">2026년 2월 26일 마감 · 분야별 3문제씩 최다득표 확정</p>
            </div>
          </div>

          {/* 멘토링 기간 안내 (활성 시) */}
          {isMentoring && (
            <div className="mx-6 mt-3 rounded-xl border border-emerald-600/50 px-5 py-3 flex items-center gap-3"
              style={{ background: 'rgba(5,46,22,0.4)' }}>
              <span className="text-lg">📚</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-emerald-400">멘토링 기간 진행중</p>
                <p className="text-[11px] text-emerald-600">3월 18일(수) ~ 3월 27일(금) · 코치 자격 보유 평가위원에게 멘토링 요청 가능</p>
              </div>
              <span className="text-xs px-2 py-1 rounded-full font-bold animate-pulse"
                style={{ background: '#16653430', color: '#4ade80', border: '1px solid #16653460' }}>
                NOW
              </span>
            </div>
          )}

          {/* 치프인증 진행 일정 타임라인 */}
          <div className="px-6 mt-5">
            <p className="text-xs font-bold text-slate-400 mb-3 flex items-center gap-1.5">
              🗺️ 치프인증 진행 일정
            </p>
            <div className="space-y-1.5">
              {[
                { step: '1', icon: '🗳️', label: '1차 출제 (문제 선정)', date: '2월 26일 마감', status: 'done', color: '#10b981' },
                { step: '2-2', icon: '🎲', label: '2차 출제 (3문제 랜덤 배정)', date: ROUND2_DATE_STR?.replace('2026년 ', '') || '3월 18일(수)', status: currentStep === '2-2' ? 'current' : (currentStep && SCHEDULE_MILESTONES.findIndex(m => m.step === currentStep) > 0 ? 'done' : 'future'), color: '#d97706' },
                { step: '3', icon: '📚', label: '멘토링 기간 (선택사항)', date: '3월 18일 ~ 27일', status: isMentoring ? 'current' : (now > MENTORING_END ? 'done' : 'future'), color: '#6366f1' },
                { step: '4', icon: '🎰', label: '최종 1문제 추첨 (평가위원회)', date: '3월 28일(토) 오전', status: currentStep === '4' || currentStep === '5' || currentStep === '6' ? 'done' : 'future', color: '#ef4444' },
                { step: '5', icon: '📋', label: '인증평가 실시', date: EXAM_DATE_STR || '3월 28일(토)', status: currentStep === '5' || currentStep === '6' ? 'current' : 'future', color: '#3b82f6' },
                { step: '6', icon: '🤝', label: '평가위원 협의 · 합격/불합격 결정', date: '3월 28일(토)', status: currentStep === '6' ? 'current' : 'future', color: '#8b5cf6' },
                { step: '7', icon: '📢', label: '최종 결과 발표 (점수 비공개)', date: '3월 31일(화)', status: currentStep === '7' ? 'current' : (currentStep === '8' ? 'done' : 'future'), color: '#10b981' },
                { step: '8', icon: '🏆', label: '인증서 수여식', date: '4월 TAG일', status: currentStep === '8' ? 'current' : 'future', color: '#f59e0b' },
              ].map(({ step, icon, label, date, status, color }) => (
                <div key={step}
                  className="flex items-center gap-3 rounded-lg px-4 py-2.5 border transition-all"
                  style={{
                    borderColor: status === 'current' ? `${color}60` : status === 'done' ? '#16534050' : '#334155',
                    background: status === 'current' ? `${color}10` : status === 'done' ? 'rgba(5,46,22,0.2)' : 'rgba(30,41,59,0.4)',
                    opacity: status === 'future' ? 0.5 : 1,
                  }}
                >
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-sm flex-shrink-0"
                    style={{
                      background: status === 'done' ? '#065f46' : status === 'current' ? `${color}25` : '#1e293b',
                      border: `2px solid ${status === 'done' ? '#10b981' : color}`,
                    }}
                  >
                    {status === 'done' ? '✅' : icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold ${status === 'done' ? 'text-emerald-400' : status === 'current' ? 'text-slate-100' : 'text-slate-400'}`}>
                      {label}
                    </p>
                    <p className="text-[10px] text-slate-500">{date}</p>
                  </div>
                  {status === 'current' && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse flex-shrink-0"
                      style={{ background: `${color}20`, color: color, border: `1px solid ${color}40` }}>
                      진행중
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 주요 안내 */}
          <div className="mx-6 mt-4 rounded-xl border border-amber-800/40 px-5 py-3.5"
            style={{ background: 'rgba(120,80,20,0.15)' }}>
            <p className="text-xs font-bold mb-1.5" style={{ color: 'rgb(214,173,101)' }}>📌 핵심 안내</p>
            <div className="space-y-1 text-xs text-slate-400 leading-relaxed">
              <p>• 2차 출제에서 배정된 <span className="text-slate-200 font-bold">3문제 모두 준비</span> 필요</p>
              <p>• 시험 당일 아침 평가위원회에서 <span className="text-red-400 font-bold">1문제 랜덤 추첨</span></p>
              <p>• 합격 기준: 평가위원 평균 <span className="font-bold" style={{ color: 'rgb(214,173,101)' }}>70점 이상</span> (100점 + 가점 10점)</p>
            </div>
          </div>

          {/* 확인 버튼 */}
          <div className="px-6 py-5 mt-3">
            <button
              onClick={() => setShowNotice(false)}
              className="w-full py-3.5 rounded-xl text-base font-bold transition hover:opacity-90 active:scale-95 shadow-lg text-stone-900"
              style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
            >
              확인했습니다 · 평가자 매뉴얼 보기 →
            </button>
            <p className="text-xs text-slate-600 text-center mt-2">
              결과 대시보드를 보려면 우측 상단 [결과보기]를 이용하세요
            </p>
          </div>
        </div>
      </div>
      );
    })()}

    {/* ════════════════════════════════════════
        비밀번호 변경 모달
    ════════════════════════════════════════ */}
    {showPwChange && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6"
        style={{ background: 'rgba(0,0,0,0.80)', backdropFilter: 'blur(6px)' }}>
        <div className="w-full max-w-sm rounded-2xl overflow-hidden shadow-2xl border border-stone-600/50"
          style={{ background: '#0f172a' }}>

          {/* 헤더 */}
          <div className="px-6 py-5 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}>
            <div>
              <h3 className="text-base font-bold text-stone-900">🔑 비밀번호 변경</h3>
              <p className="text-xs text-stone-700 mt-0.5">
                {pwStep === 1 && '이름 선택 후 현재 비밀번호를 확인합니다'}
                {pwStep === 2 && '새 비밀번호를 설정합니다'}
                {pwStep === 3 && '비밀번호 변경이 완료되었습니다'}
              </p>
            </div>
            <button onClick={closePwChange}
              className="text-stone-700 hover:text-stone-900 text-xl leading-none transition">
              ✕
            </button>
          </div>

          {/* 진행 단계 바 */}
          <div className="flex gap-1 px-6 pt-4">
            {[1, 2, 3].map((s) => (
              <div key={s} className={`flex-1 h-1 rounded-full transition-all ${
                s <= pwStep
                  ? 'opacity-100'
                  : 'bg-slate-700'
              }`}
              style={s <= pwStep ? { background: 'rgb(214,173,101)' } : {}} />
            ))}
          </div>

          <div className="px-6 py-5 space-y-4">

            {/* ─── STEP 1: 이름 선택 + 현재 비밀번호 ─── */}
            {pwStep === 1 && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">평가위원 선택</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {QS_EVALUATORS.map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => setPwTargetId(ev.id)}
                        className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all text-left ${
                          pwTargetId === ev.id
                            ? 'border-stone-500 text-stone-900 font-bold'
                            : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                        }`}
                        style={pwTargetId === ev.id
                          ? { background: 'rgb(214,173,101)', borderColor: 'rgb(163,120,55)' }
                          : {}}
                      >
                        <span className="font-bold">{ev.name}</span>
                        <span className={`text-xs ml-1 ${pwTargetId === ev.id ? 'text-stone-700' : 'text-slate-500'}`}>
                          {ev.role === '평가위원장' ? '위원장' : '위원'}
                        </span>
                        {hasCustomPassword(ev.id) && (
                          <span className={`ml-1 text-xs ${pwTargetId === ev.id ? 'text-stone-700' : 'text-emerald-500'}`}>
                            ●
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  {pwTargetId && (
                    <p className="text-xs mt-1.5 text-slate-500">
                      초기 비밀번호: <span className="font-mono text-stone-300 bg-slate-700 px-1.5 py-0.5 rounded">
                        {QS_EVALUATORS.find(e => e.id === pwTargetId)?.defaultPassword}
                      </span>
                      {hasCustomPassword(pwTargetId) && (
                        <span className="ml-2 text-emerald-500">● 변경된 비밀번호 사용 중</span>
                      )}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">현재 비밀번호</label>
                  <div className="relative">
                    <input
                      type={pwShowCurrent ? 'text' : 'password'}
                      value={pwCurrent}
                      onChange={(e) => setPwCurrent(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handlePwVerify()}
                      placeholder="현재 비밀번호 입력"
                      className="w-full px-4 py-2.5 pr-10 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm focus:border-stone-400 outline-none transition"
                    />
                    <button type="button" onClick={() => setPwShowCurrent(!pwShowCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs transition">
                      {pwShowCurrent ? '숨김' : '표시'}
                    </button>
                  </div>
                </div>

                {pwError && (
                  <div className="bg-red-900/30 border border-red-700/60 rounded-lg px-3 py-2 text-xs text-red-400">
                    ⚠️ {pwError}
                  </div>
                )}

                <button
                  onClick={handlePwVerify}
                  className="w-full py-3 rounded-xl text-sm font-bold text-stone-900 transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
                >
                  현재 비밀번호 확인 →
                </button>
              </>
            )}

            {/* ─── STEP 2: 새 비밀번호 ─── */}
            {pwStep === 2 && (
              <>
                <div className="bg-slate-800 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-stone-900 font-black text-sm"
                    style={{ background: 'rgb(214,173,101)' }}>
                    {QS_EVALUATORS.find(e => e.id === pwTargetId)?.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-100">
                      {QS_EVALUATORS.find(e => e.id === pwTargetId)?.name}
                    </p>
                    <p className="text-xs text-slate-500">비밀번호 변경 중</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">새 비밀번호</label>
                  <div className="relative">
                    <input
                      type={pwShowNew ? 'text' : 'password'}
                      value={pwNew}
                      onChange={(e) => setPwNew(e.target.value)}
                      placeholder="새 비밀번호 (3자 이상)"
                      className="w-full px-4 py-2.5 pr-10 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm focus:border-stone-400 outline-none transition"
                    />
                    <button type="button" onClick={() => setPwShowNew(!pwShowNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs transition">
                      {pwShowNew ? '숨김' : '표시'}
                    </button>
                  </div>
                  {pwNew.length > 0 && (
                    <div className="mt-1.5 flex gap-1">
                      {[3, 6, 8].map((len, i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-all ${
                          pwNew.length >= len
                            ? i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-emerald-500' : 'bg-emerald-400'
                            : 'bg-slate-700'
                        }`} />
                      ))}
                      <span className="text-xs text-slate-500 ml-1">
                        {pwNew.length < 3 ? '너무 짧음' : pwNew.length < 6 ? '보통' : '강함'}
                      </span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-2">새 비밀번호 확인</label>
                  <input
                    type="password"
                    value={pwConfirm}
                    onChange={(e) => setPwConfirm(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handlePwSave()}
                    placeholder="새 비밀번호 재입력"
                    className={`w-full px-4 py-2.5 rounded-lg bg-slate-800 border text-slate-100 placeholder-slate-500 text-sm outline-none transition ${
                      pwConfirm && (pwConfirm === pwNew ? 'border-emerald-600' : 'border-red-600')
                      || 'border-slate-600 focus:border-stone-400'
                    }`}
                  />
                  {pwConfirm && (
                    <p className={`text-xs mt-1 ${pwConfirm === pwNew ? 'text-emerald-400' : 'text-red-400'}`}>
                      {pwConfirm === pwNew ? '✓ 비밀번호 일치' : '✗ 비밀번호 불일치'}
                    </p>
                  )}
                </div>

                {pwError && (
                  <div className="bg-red-900/30 border border-red-700/60 rounded-lg px-3 py-2 text-xs text-red-400">
                    ⚠️ {pwError}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => { setPwStep(1); setPwError(''); }}
                    className="px-4 py-3 rounded-xl text-xs font-bold text-slate-400 border border-slate-600 hover:bg-slate-700 transition"
                  >
                    ← 뒤로
                  </button>
                  <button
                    onClick={handlePwSave}
                    className="flex-1 py-3 rounded-xl text-sm font-bold text-stone-900 transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
                  >
                    💾 비밀번호 변경 저장
                  </button>
                </div>
              </>
            )}

            {/* ─── STEP 3: 완료 ─── */}
            {pwStep === 3 && (
              <>
                <div className="text-center py-4">
                  <div className="text-5xl mb-4">✅</div>
                  <p className="text-lg font-bold text-slate-100 mb-1">변경 완료!</p>
                  <p className="text-sm text-slate-400">
                    <span className="font-bold" style={{ color: 'rgb(214,173,101)' }}>
                      {QS_EVALUATORS.find(e => e.id === pwTargetId)?.name}
                    </span>
                    님의 비밀번호가 성공적으로 변경되었습니다.
                  </p>
                  <div className="mt-4 bg-slate-800 rounded-xl px-4 py-3 text-xs text-slate-500">
                    <p>새 비밀번호로 로그인해 주세요.</p>
                    <p className="mt-1 text-slate-600">비밀번호는 이 기기의 브라우저에 저장됩니다.</p>
                  </div>
                </div>
                <button
                  onClick={closePwChange}
                  className="w-full py-3 rounded-xl text-sm font-bold text-stone-900 transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
                >
                  확인 · 로그인 화면으로
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )}

    {/* ════════════════════════════════════════
        로그인 페이지
    ════════════════════════════════════════ */}
    <div className="max-w-lg mx-auto mt-4">
      <div className="bg-slate-800 rounded-2xl shadow-lg border border-slate-700 overflow-hidden">

        {/* 상단 배너 – 인증 평가 진행 안내 */}
        <div className="px-8 py-8 text-center"
          style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}>
          <div className="text-5xl mb-3">🏆</div>
          <h2 className="text-2xl font-bold mb-2 text-stone-900">2026 ASSO 치프인증 평가</h2>
          <p className="text-stone-800 text-sm font-medium">인증 평가 진행 안내 · 평가위원 매뉴얼</p>
          <p className="text-stone-700 text-xs mt-1">1차 출제 완료 → 2차 출제 → 멘토링 → 인증평가</p>
        </div>

        {/* D-Day 카운터 배너 */}
        <div className="px-6 py-4 flex items-center gap-3 border-b border-amber-900/40"
          style={{ background: 'linear-gradient(135deg, #422006 0%, #78350f 100%)' }}>
          <span className="text-2xl">📅</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold" style={{ color: 'rgb(214,173,101)' }}>인증평가 시험일: {EXAM_DATE_STR}</p>
            <p className="text-xs text-amber-600">오전 10:00 시작 · 인터뷰 + PT 발제안</p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xl font-black" style={{ color: 'rgb(214,173,101)' }}>{examDDay}</p>
          </div>
        </div>

        {/* 1차 출제 완료 + 결과보기 */}
        <div className="px-6 py-3 flex items-center gap-3 border-b border-emerald-900/40"
          style={{ background: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)' }}>
          <span className="text-lg">✅</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-emerald-300">1차 출제 완료 · 9문제 확정</p>
            <p className="text-xs text-emerald-600">2월 26일 마감 · 분야별 3문제씩</p>
          </div>
          <button onClick={() => navigate('/question-selection/results')}
            className="text-xs font-bold border px-3 py-1.5 rounded-lg transition flex-shrink-0 hover:bg-emerald-900/40"
            style={{ color: '#6ee7b7', borderColor: '#065f46' }}>
            📊 결과 보기
          </button>
        </div>

        {/* 비밀번호 초기 안내 배너 */}
        <div className="px-6 py-3 flex items-center gap-3 border-b border-stone-700/30"
          style={{ background: 'rgba(120,80,20,0.15)' }}>
          <span className="text-base">🔑</span>
          <p className="text-xs flex-1" style={{ color: 'rgb(214,173,101)' }}>
            초기 비밀번호:
            <span className="text-stone-300 ml-1">이름 영어 두문자</span>
            <span className="text-slate-500 ml-1">(예: 나동환 →</span>
            <span className="font-mono bg-slate-700 text-stone-300 px-1 rounded mx-1 text-xs">ndh</span>
            <span className="text-slate-500">)</span>
          </p>
          <button
            onClick={openPwChange}
            className="text-xs font-bold px-3 py-1.5 rounded-lg transition flex-shrink-0 text-stone-900"
            style={{ background: 'rgb(214,173,101)' }}
          >
            비밀번호 변경
          </button>
        </div>

        {/* 진행 안내 */}
        <div className="px-8 py-4 bg-amber-900/30 border-b border-amber-800/40">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5 text-base">📌</span>
            <div className="text-xs text-amber-300">
              <p className="font-semibold mb-1">앞으로의 진행 일정</p>
              <ul className="space-y-0.5 text-amber-400/80">
                <li>• <b>3/18(수)</b> 2차 출제 – 피평가자별 3문제 랜덤 배정</li>
                <li>• <b>3/18~27</b> 멘토링 기간 (선택사항)</li>
                <li>• <b>3/28(토)</b> 인증평가 실시 – 최종 1문제 추첨 후 평가</li>
                <li>• <b>3/31(화)</b> 최종 결과 발표 (합격/불합격)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="px-8 py-6 space-y-5">

          {/* 문제은행 PDF 링크 */}
          <div className="bg-slate-700/60 rounded-lg p-4 border border-slate-600">
            <p className="text-xs text-slate-400 mb-2 font-medium">📎 문제은행 PDF 확인</p>
            <a href={QS_PDF_URL} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 text-sm font-medium underline">
              📄 치프문제은행 21문제 보기 (Google Drive)
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* 평가위원 선택 */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">평가위원 선택</label>
            <div className="grid grid-cols-2 gap-2">
              {QS_EVALUATORS.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedId(ev.id)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                    selectedId === ev.id
                      ? 'ring-2 ring-stone-400/50'
                      : 'border-slate-600 bg-slate-700/60 text-slate-400 hover:border-slate-500 hover:bg-slate-700'
                  }`}
                  style={selectedId === ev.id ? {
                    borderColor: 'rgb(163,120,55)',
                    background: 'rgba(214,173,101,0.15)',
                    color: 'rgb(214,173,101)',
                  } : {}}
                >
                  <div className="font-bold flex items-center gap-1.5">
                    {ev.name}
                    {hasCustomPassword(ev.id) && (
                      <span className="text-emerald-500 text-xs">🔒</span>
                    )}
                  </div>
                  <div className="text-xs opacity-70">{ev.role}</div>
                </button>
              ))}
            </div>
            {selectedEv && (
              <div className="mt-2 flex items-center justify-between px-1">
                <p className="text-xs text-slate-500">
                  {hasCustomPassword(selectedId)
                    ? <span className="text-emerald-500">● 변경된 비밀번호 사용 중</span>
                    : <span>초기 비밀번호: <span className="font-mono bg-slate-700 text-stone-300 px-1 rounded">{selectedEv.defaultPassword}</span></span>
                  }
                </p>
                <button
                  type="button"
                  onClick={openPwChange}
                  className="text-xs underline transition"
                  style={{ color: 'rgb(214,173,101)' }}
                >
                  비밀번호 변경
                </button>
              </div>
            )}
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-sm font-semibold text-slate-300 mb-2">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 border-2 border-slate-600 rounded-lg bg-slate-700 text-slate-100 placeholder-slate-500 focus:border-stone-400 focus:ring-2 focus:ring-stone-400/30 outline-none transition-all"
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-sm text-red-400">
              ⚠️ {error}
            </div>
          )}

          {/* 로그인 버튼 - 마감 후 비활성화 */}
          {getVotingConfig().closed ? (
            <div className="w-full py-4 rounded-lg font-bold text-base text-center border"
              style={{ background: '#022c22', borderColor: '#065f46', color: '#6ee7b7' }}>
              ✅ 투표가 마감되었습니다
            </div>
          ) : (
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-lg font-bold text-base transition-all shadow-lg disabled:opacity-50 hover:opacity-90 text-stone-900"
              style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
            >
              {loading ? '확인 중...' : '🗳️ 문제 선정 투표 시작'}
            </button>
          )}
        </form>

        {/* 하단 링크 */}
        <div className="px-8 py-4 bg-slate-700/40 border-t border-slate-700 flex items-center justify-between">
          <button onClick={() => navigate('/question-selection/results')}
            className="text-sm text-slate-400 hover:text-blue-400 transition-colors underline">
            📊 투표 현황 및 결과 보기
          </button>
          <button onClick={openPwChange}
            className="text-xs transition"
            style={{ color: 'rgb(214,173,101)' }}>
            🔑 비밀번호 변경
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
