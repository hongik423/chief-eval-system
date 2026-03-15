import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QS_CATEGORIES, QS_QUESTIONS } from '@/data/qsQuestions';
import {
  getVoteStatus,
  getResults,
  getVotingConfig,
  closeVoting,
  reopenVoting,
  updateFinalQuestions,
  setScheduledClose,
  clearScheduledClose,
  resetAllVotes,
} from '@/lib/qsVoteStore';
import {
  ROUND2_CANDIDATES,
  ROUND2_QUESTION_POOL,
  generateRandomAssignments,
  encodeToken,
  loadAssignmentsLocal,
  saveAssignmentsLocal,
  clearAssignmentsLocal,
  EXAM_DATE_STR,
  SCHEDULE_MILESTONES,
  getCurrentStep,
  ROUND2_DATE_STR,
  MENTORING_START,
  MENTORING_END,
  // 피평가자 추적 시스템
  loadCandidateTracker,
  initializeCandidateTracker,
  getCandidateTrackerSummary,
  executeFinalDraw,
  updateCandidateTracker,
  getCategoryLabel,
  loadAssignmentsHybrid,
  loadTrackerHybrid,
  loadFinalDrawFromSupabase,
} from '@/lib/qsAssignmentStore';

const ALL_EVALUATORS = ['나동환', '권영도', '권오경', '김홍', '박성현', '윤덕상', '하상현'];
const CATEGORY_KEYS = Object.keys(QS_CATEGORIES);
const RESET_KEYWORD = '초기화하라';

// 관리자 계정
const ADMINS = [
  { name: '강선애', password: 'ksa2026' },
  { name: '이후경', password: 'lhk2026' },
];

export default function QSResultsPage() {
  const navigate = useNavigate();

  // 투표 데이터
  const [status, setStatus] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [fetchError, setFetchError] = useState('');

  // 투표 설정 (종료/잠금)
  const [votingConfig, setVotingConfig] = useState({
    closed: false,
    finalQuestions: null,
    closedAt: null,
    scheduledCloseAt: null,
  });

  // 관리자 모달
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminName, setAdminName] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');
  const [adminMode, setAdminMode] = useState(false); // 관리자 인증 완료 여부

  // 편집 모드
  const [editMode, setEditMode] = useState(false);
  const [editSelections, setEditSelections] = useState({}); // { categoryKey: [qId, qId, qId] }

  // 투표 종료 확인 모달
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  // 투표 재개 확인 모달
  const [showReopenConfirm, setShowReopenConfirm] = useState(false);

  // 예약 종료
  const [scheduleInput, setScheduleInput] = useState('');
  const [showSchedulePanel, setShowSchedulePanel] = useState(false);
  const [countdown, setCountdown] = useState('');
  const countdownRef = useRef(null);

  // 초기화
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [resetTexts, setResetTexts] = useState(['', '', '']);
  const [resetError, setResetError] = useState('');

  // ── 2차 출제 랜덤 배정
  const [assignments, setAssignments] = useState([]); // 현재 배정 목록
  const [assignSavedAt, setAssignSavedAt] = useState(null);
  const [copiedToken, setCopiedToken] = useState(''); // 복사된 토큰 키
  const [testMode, setTestMode] = useState(false); // 테스트 시뮬레이션 모드
  const [testAssignments, setTestAssignments] = useState([]); // 테스트 배정 결과
  const [isSpinning, setIsSpinning] = useState(false); // 랜덤 배정 애니메이션
  const [spinStep, setSpinStep] = useState(0); // 애니메이션 단계 (0~3)

  // ── 피평가자 단계 추적
  const [trackerSummary, setTrackerSummary] = useState([]);
  const [showTracker, setShowTracker] = useState(false);
  const [drawSpinning, setDrawSpinning] = useState(null); // 4단계 추첨 중인 candidateId
  const [drawResults, setDrawResults] = useState({}); // { candidateId: { category, questionId } }

  // 최신 results를 interval 내부에서 안전하게 참조하기 위한 ref
  const resultsRef = useRef([]);

  const fetchData = useCallback(async () => {
    try {
      setFetchError('');
      const [st, rs] = await Promise.all([getVoteStatus(), getResults()]);
      setStatus(st);
      setResults(rs);
      resultsRef.current = rs; // 최신 results를 ref에 동기화
      setLastUpdated(new Date());
    } catch (err) {
      setFetchError('데이터를 불러올 수 없습니다: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    setVotingConfig(getVotingConfig());

    // 하이브리드 로드: localStorage 우선 → Supabase 폴백
    (async () => {
      try {
        // 2차 배정 로드
        const saved = await loadAssignmentsHybrid();
        if (saved) {
          setAssignments(saved.assignments || []);
          setAssignSavedAt(saved.savedAt);
        }

        // 피평가자 추적 데이터 로드
        const tracker = await loadTrackerHybrid();
        if (!tracker || Object.keys(tracker).length === 0) {
          initializeCandidateTracker();
        }
        setTrackerSummary(getCandidateTrackerSummary());

        // 기존 4단계 추첨 결과 복원 (localStorage + Supabase 모두 확인)
        const restoredDraws = {};
        const tr = loadCandidateTracker();
        Object.entries(tr).forEach(([cid, rec]) => {
          if (rec.stage4?.selectedQuestionId) {
            restoredDraws[cid] = {
              category: rec.stage4.selectedCategory,
              questionId: rec.stage4.selectedQuestionId,
            };
          }
        });

        // Supabase에서 추가 추첨 결과 보충
        const supabaseDraws = await loadFinalDrawFromSupabase();
        Object.entries(supabaseDraws).forEach(([cid, draw]) => {
          if (!restoredDraws[cid]) {
            restoredDraws[cid] = draw;
          }
        });

        setDrawResults(restoredDraws);
      } catch (err) {
        console.warn('[Init] 하이브리드 로드 오류:', err);
        // 폴백: localStorage만 사용
        const saved = loadAssignmentsLocal();
        if (saved) {
          setAssignments(saved.assignments || []);
          setAssignSavedAt(saved.savedAt);
        }
        setTrackerSummary(getCandidateTrackerSummary());
      }
    })();
  }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh || votingConfig.closed) return;
    const id = setInterval(async () => {
      // fetchData를 await하여 resultsRef가 최신 데이터로 업데이트된 후 예약 종료 체크
      await fetchData();
      const cfg = getVotingConfig();
      setVotingConfig(cfg);
      // 예약 종료 자동 실행 - setResults 사이드이펙트 안티패턴 대신 resultsRef 사용
      if (cfg.scheduledCloseAt && !cfg.closed && new Date() >= new Date(cfg.scheduledCloseAt)) {
        const final = {};
        resultsRef.current.forEach((catResult) => {
          final[catResult.category] = catResult.allVotes.slice(0, 3).map((v) => v.questionId);
        });
        closeVoting(final);
        setVotingConfig(getVotingConfig());
        setAutoRefresh(false);
      }
    }, 5000);
    return () => clearInterval(id);
    // votingConfig.closed는 내부에서 cfg로 직접 읽으므로 dependency 불필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, fetchData]);

  // 카운트다운 타이머 - cleanup에 로컬 intervalId 사용(ref 경쟁조건 방지)
  useEffect(() => {
    if (!votingConfig.scheduledCloseAt || votingConfig.closed) {
      setCountdown('');
      return;
    }
    const targetTime = new Date(votingConfig.scheduledCloseAt);
    const tick = () => {
      const diff = targetTime - new Date();
      if (diff <= 0) {
        setCountdown('종료 시간 도달');
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCountdown(
        h > 0
          ? `${h}시간 ${String(m).padStart(2, '0')}분 ${String(s).padStart(2, '0')}초`
          : `${m}분 ${String(s).padStart(2, '0')}초`
      );
    };
    tick();
    const intervalId = setInterval(tick, 1000);
    countdownRef.current = intervalId;
    return () => {
      clearInterval(intervalId);
      countdownRef.current = null;
    };
  }, [votingConfig.scheduledCloseAt, votingConfig.closed]);

  // 관리자 인증
  const handleAdminLogin = () => {
    setAdminError('');
    const admin = ADMINS.find((a) => a.name === adminName && a.password === adminPassword);
    if (!admin) {
      setAdminError('관리자 정보가 올바르지 않습니다.');
      return;
    }
    setAdminMode(true);
    setShowAdminModal(false);
    setAdminPassword('');
  };

  // 관리자 로그아웃
  const handleAdminLogout = () => {
    setAdminMode(false);
    setEditMode(false);
    setAdminName('');
    setAdminPassword('');
  };

  // 투표 종료 실행
  const handleCloseVoting = () => {
    const finalQuestions = buildFinalQuestionsFromResults();
    closeVoting(finalQuestions);
    setVotingConfig(getVotingConfig());
    setShowCloseConfirm(false);
    setAutoRefresh(false);
  };

  // 투표 재개 실행
  const handleReopenVoting = () => {
    reopenVoting();
    setVotingConfig(getVotingConfig());
    setShowReopenConfirm(false);
    setAutoRefresh(true);
  };

  // 현재 투표 결과로 최종 문제 구성
  const buildFinalQuestionsFromResults = () => {
    const final = {};
    results.forEach((catResult) => {
      final[catResult.category] = catResult.allVotes.slice(0, 3).map((v) => v.questionId);
    });
    return final;
  };


  // 초기화 모달 닫기 (입력값 초기화)
  const closeResetModal = () => {
    setShowResetConfirm(false);
    setResetPassword('');
    setResetTexts(['', '', '']);
    setResetError('');
  };

  // 전체 초기화
  const handleResetAll = async () => {
    setResetError('');
    const isPasswordValid = ADMINS.some((a) => a.password === resetPassword);
    if (!isPasswordValid) {
      setResetError('관리자 비밀번호가 올바르지 않습니다.');
      return;
    }
    const allConfirmed = resetTexts.every((t) => t === RESET_KEYWORD);
    if (!allConfirmed) {
      setResetError(`"${RESET_KEYWORD}"를 3회 모두 정확히 입력해주세요.`);
      return;
    }
    setResetting(true);
    try {
      await resetAllVotes();
      setVotingConfig(getVotingConfig());
      setStatus(null);
      setResults([]);
      setAutoRefresh(true);
      setEditMode(false);
      closeResetModal();
      await fetchData();
    } catch (err) {
      setResetError('초기화 중 오류: ' + (err.message || ''));
    } finally {
      setResetting(false);
    }
  };

  // 예약 종료 설정
  const handleSetSchedule = () => {
    if (!scheduleInput) return;
    const d = new Date(scheduleInput);
    if (isNaN(d.getTime()) || d <= new Date()) {
      alert('미래 시간을 선택해주세요.');
      return;
    }
    setScheduledClose(d.toISOString());
    setVotingConfig(getVotingConfig());
    setShowSchedulePanel(false);
  };

  // 예약 종료 취소
  const handleCancelSchedule = () => {
    clearScheduledClose();
    setVotingConfig(getVotingConfig());
    setScheduleInput('');
  };

  // ── 2차 출제 랜덤 배정 실행 (슬롯머신 애니메이션 포함)
  const runSpinAnimation = (callback) => {
    setIsSpinning(true);
    setSpinStep(0);
    // 3단계 애니메이션: 분야1 → 분야2 → 분야3 → 완료
    const steps = [1, 2, 3];
    steps.forEach((step, idx) => {
      setTimeout(() => {
        setSpinStep(step);
        if (idx === steps.length - 1) {
          setTimeout(() => {
            setIsSpinning(false);
            setSpinStep(0);
            callback();
          }, 600);
        }
      }, (idx + 1) * 500);
    });
  };

  const handleRunAssignment = () => {
    runSpinAnimation(() => {
      const result = generateRandomAssignments(true);
      saveAssignmentsLocal(result);
      setAssignments(result);
      setAssignSavedAt(new Date().toISOString());
      setTestMode(false);
      setTestAssignments([]);
    });
  };

  // ── 테스트 시뮬레이션 실행 (저장하지 않음)
  const handleTestAssignment = () => {
    runSpinAnimation(() => {
      const result = generateRandomAssignments(true);
      setTestAssignments(result);
    });
  };

  // ── 2차 배정 초기화
  const handleClearAssignment = () => {
    clearAssignmentsLocal();
    setAssignments([]);
    setAssignSavedAt(null);
  };

  // ── 4단계 최종 1문제 추첨 실행
  const handleFinalDraw = (candidateId) => {
    setDrawSpinning(candidateId);
    // 슬롯머신 스타일 애니메이션 (1.5초 후 결과)
    setTimeout(() => {
      try {
        const result = executeFinalDraw(candidateId, adminName || '평가위원회');
        setDrawResults((prev) => ({
          ...prev,
          [candidateId]: result,
        }));
        setTrackerSummary(getCandidateTrackerSummary());
      } catch (err) {
        alert(err.message);
      } finally {
        setDrawSpinning(null);
      }
    }, 1500);
  };

  // ── 추적 데이터 리프레시
  const refreshTracker = () => {
    setTrackerSummary(getCandidateTrackerSummary());
  };

  // ── URL 복사
  const handleCopyUrl = async (token) => {
    const url = `${window.location.origin}/question-selection/exam/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedToken(token);
      setTimeout(() => setCopiedToken(''), 2500);
    } catch { /* ignore */ }
  };

  // 편집 모드 시작
  const handleStartEdit = () => {
    const current = votingConfig.finalQuestions || buildFinalQuestionsFromResults();
    const initial = {};
    CATEGORY_KEYS.forEach((key) => {
      initial[key] = current[key] ? [...current[key]] : [];
    });
    setEditSelections(initial);
    setEditMode(true);
  };

  // 편집 중 문제 토글
  const handleEditToggle = (categoryKey, qId) => {
    setEditSelections((prev) => {
      const current = prev[categoryKey] || [];
      if (current.includes(qId)) {
        return { ...prev, [categoryKey]: current.filter((id) => id !== qId) };
      }
      if (current.length >= 3) {
        // 3개 이상이면 첫 번째 제거 후 추가
        return { ...prev, [categoryKey]: [...current.slice(1), qId] };
      }
      return { ...prev, [categoryKey]: [...current, qId] };
    });
  };

  // 편집 저장
  const handleSaveEdit = () => {
    updateFinalQuestions(editSelections);
    setVotingConfig(getVotingConfig());
    setEditMode(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto mt-16 text-center">
        <div className="text-5xl mb-4 animate-spin inline-block">⏳</div>
        <p className="text-slate-400">투표 결과를 불러오는 중...</p>
      </div>
    );
  }

  const progressPct = ((status?.votedCount || 0) / 7) * 100;
  const isMajority = (status?.votedCount || 0) >= 4;
  const hasAnyVotes = results.some((r) => r.allVotes.length > 0);

  // 최종 확정 문제 (투표 결과 or 관리자 수정값)
  const getFinalQuestions = (categoryKey) => {
    const overrides = votingConfig.finalQuestions;
    if (overrides && overrides[categoryKey]) return overrides[categoryKey];
    const catResult = results.find((r) => r.category === categoryKey);
    return catResult ? catResult.allVotes.slice(0, 3).map((v) => v.questionId) : [];
  };

  return (
    <div className="max-w-5xl mx-auto">

      {/* ═══ 예약 종료 공개 카운트다운 배너 (관리자 아닌 사람도 확인 가능) ═══ */}
      {!votingConfig.closed && votingConfig.scheduledCloseAt && (
        <div
          className="rounded-xl mb-6 px-5 py-3.5 border border-amber-700/60 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #1c1004 0%, #292110 100%)' }}
        >
          <span className="text-2xl">⏰</span>
          <div className="flex-1">
            <p className="text-amber-200 font-bold text-sm">투표 종료 예약됨</p>
            <p className="text-amber-500 text-xs mt-0.5">
              {new Date(votingConfig.scheduledCloseAt).toLocaleString('ko-KR', {
                year: 'numeric', month: 'long', day: 'numeric',
                hour: '2-digit', minute: '2-digit',
              })} 에 자동 종료
            </p>
          </div>
          {countdown && (
            <div className="text-right">
              <p className="text-xs text-amber-600 mb-0.5">남은 시간</p>
              <p className="text-lg font-bold text-amber-300 tabular-nums">{countdown}</p>
            </div>
          )}
        </div>
      )}

      {/* ═══ 관리자 제어판 ═══ */}
      {adminMode && (
        <div
          className="rounded-2xl mb-6 border overflow-hidden shadow-xl"
          style={{ borderColor: '#92400e', background: 'linear-gradient(135deg, #1c1008 0%, #292418 100%)' }}
        >
          {/* 제어판 헤더 */}
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">👑</span>
              <div>
                <h3 className="text-base font-bold text-amber-200">관리자 제어판</h3>
                <p className="text-xs text-amber-500/80">{adminName} · 투표 종료 및 결과 관리</p>
              </div>
            </div>
            <button
              onClick={handleAdminLogout}
              className="text-xs text-amber-600 hover:text-amber-400 transition border border-amber-800/60 px-2 py-1 rounded-lg"
            >
              로그아웃
            </button>
          </div>

          <div className="px-6 py-5">
            {!votingConfig.closed ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* ─── 즉시 종료 ─── */}
                <div className="bg-slate-900/60 rounded-xl border border-red-900/50 p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔒</span>
                    <div>
                      <p className="text-sm font-bold text-red-300">즉시 종료</p>
                      <p className="text-xs text-slate-500">지금 바로 투표를 마감합니다</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    현재까지 투표된 결과를 기준으로 최종 9문제를 확정합니다.
                    종료 후에도 최종 문제 수정이 가능합니다.
                  </p>
                  <button
                    onClick={() => setShowCloseConfirm(true)}
                    className="mt-auto w-full py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 active:scale-95"
                    style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}
                  >
                    🔒 지금 즉시 종료
                  </button>
                </div>

                {/* ─── 예약 종료 ─── */}
                <div className="bg-slate-900/60 rounded-xl border border-amber-900/50 p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⏰</span>
                    <div>
                      <p className="text-sm font-bold text-amber-300">예약 종료</p>
                      <p className="text-xs text-slate-500">지정 시간에 자동으로 마감합니다</p>
                    </div>
                  </div>

                  {votingConfig.scheduledCloseAt ? (
                    /* 예약 설정됨 */
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="bg-amber-900/30 border border-amber-700/50 rounded-lg px-4 py-3">
                        <p className="text-xs text-amber-500 mb-1">예약 시간</p>
                        <p className="text-sm font-bold text-amber-300">
                          {new Date(votingConfig.scheduledCloseAt).toLocaleString('ko-KR', {
                            month: 'long', day: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>
                      {countdown && (
                        <div className="bg-slate-800/80 border border-slate-600 rounded-lg px-4 py-2 text-center">
                          <p className="text-xs text-slate-500 mb-0.5">남은 시간</p>
                          <p className="text-lg font-bold text-emerald-400 tabular-nums">{countdown}</p>
                        </div>
                      )}
                      <button
                        onClick={handleCancelSchedule}
                        className="mt-auto w-full py-2 rounded-xl text-xs font-bold text-red-400 border border-red-800/60 hover:bg-red-900/30 transition"
                      >
                        예약 취소
                      </button>
                    </div>
                  ) : showSchedulePanel ? (
                    /* 예약 입력 폼 */
                    <div className="flex-1 flex flex-col gap-2">
                      <label className="text-xs text-slate-400">종료 일시 선택</label>
                      <input
                        type="datetime-local"
                        value={scheduleInput}
                        onChange={(e) => setScheduleInput(e.target.value)}
                        min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                        className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-slate-200 text-sm focus:border-amber-500 outline-none transition"
                      />
                      <div className="flex gap-2 mt-auto">
                        <button
                          onClick={handleSetSchedule}
                          className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                          style={{ background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)' }}
                        >
                          예약 확정
                        </button>
                        <button
                          onClick={() => setShowSchedulePanel(false)}
                          className="px-3 py-2 rounded-xl text-xs text-slate-400 border border-slate-600 hover:bg-slate-700 transition"
                        >
                          취소
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* 예약 버튼 */
                    <>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        특정 날짜·시간을 설정하면 해당 시간에 자동으로 투표가 마감됩니다.
                        (5초 주기 체크)
                      </p>
                      <button
                        onClick={() => setShowSchedulePanel(true)}
                        className="mt-auto w-full py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90 active:scale-95"
                        style={{ background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)' }}
                      >
                        ⏰ 종료 시간 예약
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* 투표 종료 후 관리자 액션 */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 rounded-xl border border-amber-900/50 p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">✏️</span>
                    <div>
                      <p className="text-sm font-bold text-amber-300">최종 문제 수정</p>
                      <p className="text-xs text-slate-500">확정된 9문제를 직접 변경합니다</p>
                    </div>
                  </div>
                  <button
                    onClick={handleStartEdit}
                    className="mt-auto w-full py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)' }}
                  >
                    ✏️ 문제 수정 시작
                  </button>
                </div>
                <div className="bg-slate-900/60 rounded-xl border border-blue-900/50 p-5 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🔓</span>
                    <div>
                      <p className="text-sm font-bold text-blue-300">투표 재개</p>
                      <p className="text-xs text-slate-500">투표를 다시 열고 재진행합니다</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    투표를 재개하면 확정된 최종 문제가 해제되고 다시 투표를 받을 수 있습니다.
                  </p>
                  <button
                    onClick={() => setShowReopenConfirm(true)}
                    className="mt-auto w-full py-2.5 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #2563eb 0%, #1e40af 100%)' }}
                  >
                    🔓 투표 재개
                  </button>
                </div>
              </div>
            )}

            {/* 편집 모드 액션바 */}
            {editMode && (
              <div className="mt-4 flex gap-3 justify-end">
                <button
                  onClick={handleSaveEdit}
                  className="px-5 py-2 rounded-xl text-sm font-bold text-white transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #059669 0%, #065f46 100%)' }}
                >
                  💾 수정 저장
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-300 border border-slate-600 hover:bg-slate-700 transition"
                >
                  취소
                </button>
              </div>
            )}

            {/* ─── 위험 구역: 전체 초기화 ─── */}
            <div className="mt-5 pt-5 border-t border-red-900/40">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚠️</span>
                  <div>
                    <p className="text-xs font-bold text-red-400">위험 구역 · 전체 초기화</p>
                    <p className="text-xs text-slate-500">모든 투표 데이터와 설정을 완전히 삭제합니다</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowResetConfirm(true)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-red-400 border border-red-800/60 hover:bg-red-900/30 transition"
                >
                  🗑️ 전체 초기화
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 투표 종료 배너 ═══ */}
      {votingConfig.closed && (
        <div
          className="rounded-xl mb-6 px-6 py-4 border border-red-700/60 flex items-center gap-4"
          style={{ background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)' }}
        >
          <span className="text-3xl">🔒</span>
          <div className="flex-1">
            <p className="text-red-200 font-bold text-base">투표가 종료되었습니다</p>
            <p className="text-red-400 text-xs mt-0.5">
              최종 9문제가 확정되었습니다.
              {votingConfig.closedAt && ` · 종료: ${new Date(votingConfig.closedAt).toLocaleString('ko-KR')}`}
            </p>
          </div>
        </div>
      )}

      {/* ═══ 편집 모드 안내 ═══ */}
      {editMode && (
        <div className="bg-amber-900/30 border border-amber-600/50 rounded-xl px-6 py-3 mb-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl">✏️</span>
            <p className="text-amber-300 text-sm font-medium">
              편집 모드: 각 분야에서 최종 3문제를 직접 선택하세요. (문제 클릭으로 선택/해제)
            </p>
          </div>
        </div>
      )}

      {/* ═══ 상단 컨트롤 ═══ */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <button
          onClick={() => navigate('/question-selection')}
          className="text-sm text-slate-500 hover:text-blue-400 flex items-center gap-1 transition-colors"
        >
          ← 로그인 페이지로
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          {lastUpdated && (
            <span className="text-xs text-slate-500">
              갱신: {lastUpdated.toLocaleTimeString('ko-KR')}
            </span>
          )}
          {!votingConfig.closed && (
            <label className="flex items-center gap-2 text-xs text-slate-500 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded accent-blue-500"
              />
              자동 갱신 (10초)
            </label>
          )}
          <button
            onClick={() => { fetchData(); setVotingConfig(getVotingConfig()); }}
            className="text-sm bg-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-600 transition text-slate-300"
          >
            🔄 새로고침
          </button>

          {/* 관리자 버튼 */}
          {!adminMode ? (
            <button
              onClick={() => setShowAdminModal(true)}
              className="text-sm bg-slate-700/80 text-slate-400 px-3 py-1.5 rounded-lg hover:bg-slate-600 transition border border-slate-600 flex items-center gap-1.5"
            >
              🔑 <span>관리자</span>
            </button>
          ) : (
            <span className="text-xs bg-amber-900/40 text-amber-400 px-2 py-1 rounded-lg border border-amber-700/50 flex items-center gap-1">
              👑 {adminName}
            </span>
          )}
        </div>
      </div>

      {fetchError && (
        <div className="bg-red-900/30 border border-red-700 rounded-xl px-6 py-4 text-sm text-red-400 mb-6">
          ⚠️ {fetchError}
        </div>
      )}

      {/* ═══ 투표 현황 카드 ═══ */}
      <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 px-6 py-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-100">🗳️ 투표 현황</h2>
          <div className={`text-2xl font-bold ${votingConfig.closed ? 'text-red-400' : 'text-blue-400'}`}>
            {votingConfig.closed ? (
              <span className="flex items-center gap-2 text-base">
                <span>🔒 투표 종료</span>
                <span className="text-slate-400 text-sm font-normal">({status?.votedCount || 0}/7명 완료)</span>
              </span>
            ) : (
              <>{status?.votedCount || 0} / 7명 완료</>
            )}
          </div>
        </div>

        {/* 진행률 바 */}
        <div className="w-full bg-slate-700 rounded-full h-3 mb-5 overflow-hidden">
          <div
            className="h-3 rounded-full transition-all duration-700"
            style={{
              width: `${progressPct}%`,
              background: votingConfig.closed
                ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                : 'linear-gradient(90deg, #3b82f6, #6366f1)',
            }}
          />
        </div>

        {/* 평가위원별 상태 */}
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {ALL_EVALUATORS.map((name) => {
            const voted = status?.votedEvaluators?.includes(name);
            return (
              <div
                key={name}
                className={`text-center p-2 rounded-lg border ${
                  voted
                    ? 'bg-green-900/40 border-green-700/60'
                    : 'bg-slate-700/50 border-slate-600'
                }`}
              >
                <div className="text-xl mb-1">{voted ? '✅' : '⏳'}</div>
                <div className={`text-xs font-medium leading-tight ${
                  voted ? 'text-green-400' : 'text-slate-500'
                }`}>
                  {name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══ 최종 확정 9문제 요약 (투표 종료 시) ═══ */}
      {votingConfig.closed && (
        <div
          className="rounded-xl p-6 mb-6 border-2"
          style={{
            background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
            borderColor: '#fbbf24',
          }}
        >
          <h3 className="text-xl font-bold text-amber-400 mb-1 flex items-center gap-2">
            🏆 최종 확정 문제 (총 9문제)
          </h3>
          <p className="text-xs text-amber-600/80 mb-5">
            {editMode ? '편집 모드: 문제를 클릭하여 선택/해제' : '투표 종료 후 확정된 최종 출제 문제입니다'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {CATEGORY_KEYS.map((key) => {
              const cat = QS_CATEGORIES[key];
              const finalIds = editMode ? (editSelections[key] || []) : getFinalQuestions(key);
              const catResult = results.find((r) => r.category === key);

              return (
                <div
                  key={key}
                  className="rounded-xl overflow-hidden border border-slate-600"
                >
                  {/* 분야 헤더 */}
                  <div
                    className="px-4 py-3"
                    style={{
                      background: `linear-gradient(135deg, ${
                        key === 'stock_transfer' ? '#1d4ed8, #1e3a8a' :
                        key === 'nominee_stock' ? '#6d28d9, #4c1d95' :
                        '#047857, #064e3b'
                      })`
                    }}
                  >
                    <div className={`text-sm font-bold text-white flex items-center gap-2`}>
                      {cat.icon} {cat.label.replace(' 프로젝트 설계', '')}
                    </div>
                  </div>

                  <div className="bg-slate-800/80 p-3 space-y-2">
                    {editMode ? (
                      // 편집 모드: 해당 카테고리 전체 문제 표시
                      cat.questionIds.map((qId) => {
                        const q = QS_QUESTIONS[qId];
                        const isSelected = editSelections[key]?.includes(qId);
                        const rank = editSelections[key]?.indexOf(qId);
                        return (
                          <button
                            key={qId}
                            onClick={() => handleEditToggle(key, qId)}
                            className={`w-full text-left px-3 py-2 rounded-lg border transition-all ${
                              isSelected
                                ? `${cat.lightBg} ${cat.borderColor} border`
                                : 'bg-slate-700/50 border-slate-600 hover:bg-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {isSelected ? (
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                  rank === 0 ? 'bg-amber-400 text-slate-900' :
                                  rank === 1 ? 'bg-slate-400 text-slate-900' :
                                  'bg-amber-700 text-white'
                                }`}>{rank + 1}</span>
                              ) : (
                                <span className="w-5 h-5 rounded-full border border-slate-500 flex-shrink-0" />
                              )}
                              <div className="min-w-0">
                                <span className={`text-xs font-bold ${isSelected ? cat.textColor : 'text-slate-400'}`}>
                                  #{qId}
                                </span>
                                <p className={`text-xs leading-tight truncate ${isSelected ? 'text-slate-200' : 'text-slate-500'}`}>
                                  {q?.title}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      // 일반 모드: 최종 3문제만 표시
                      finalIds.length === 0 ? (
                        <p className="text-xs text-slate-500 text-center py-2">미확정</p>
                      ) : (
                        finalIds.map((qId, i) => {
                          const qData = QS_QUESTIONS[qId];
                          return (
                            <div key={qId} className={`flex items-start gap-2 p-2 rounded-lg ${cat.lightBg} border ${cat.borderColor}`}>
                              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                                i === 0 ? 'bg-amber-400 text-slate-900' :
                                i === 1 ? 'bg-slate-400 text-slate-900' :
                                'bg-amber-700 text-white'
                              }`}>{i + 1}</span>
                              <div>
                                <span className={`text-xs font-extrabold ${cat.textColor}`}>
                                  #{qId}
                                </span>
                                {qData && (
                                  <p className="text-xs text-slate-300 mt-0.5 leading-tight">
                                    {qData.title}
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ 분야별 투표 결과 ═══ */}
      {hasAnyVotes ? (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-slate-100">
            📊 분야별 투표 결과 (최다득표 순)
          </h2>

          {results.map((catResult) => {
            const cat = QS_CATEGORIES[catResult.category];
            if (!cat) return null;
            const totalVotes = catResult.allVotes.reduce((s, v) => s + v.voteCount, 0);
            const finalIds = getFinalQuestions(catResult.category);

            return (
              <div
                key={catResult.category}
                className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 overflow-hidden"
              >
                {/* 분야 헤더 */}
                <div
                  className="px-6 py-4 text-white"
                  style={{
                    background: `linear-gradient(135deg, ${
                      catResult.category === 'stock_transfer' ? '#1d4ed8, #1e3a8a' :
                      catResult.category === 'nominee_stock' ? '#6d28d9, #4c1d95' :
                      '#047857, #064e3b'
                    })`
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <h3 className="font-bold text-lg">{catResult.categoryLabel}</h3>
                        <p className="text-sm opacity-80">
                          상위 3문제 선정 (총 {totalVotes}표 / 최대 21표)
                        </p>
                      </div>
                    </div>
                    {votingConfig.closed && (
                      <div className="bg-white/15 backdrop-blur rounded-lg px-3 py-1 text-xs font-bold">
                        🔒 확정
                      </div>
                    )}
                  </div>
                </div>

                {/* 투표 결과 목록 */}
                {catResult.allVotes.length === 0 ? (
                  <div className="px-6 py-8 text-center text-slate-500">
                    아직 투표가 없습니다
                  </div>
                ) : (
                  <div className="divide-y divide-slate-700">
                    {catResult.allVotes.map((vote, idx) => {
                      const isTop3 = votingConfig.closed
                        ? finalIds.includes(vote.questionId)
                        : idx < 3;
                      const finalRank = finalIds.indexOf(vote.questionId);
                      const maxVotes = catResult.allVotes[0]?.voteCount || 1;
                      const pct = (vote.voteCount / 7) * 100;
                      const q = QS_QUESTIONS[vote.questionId];

                      return (
                        <div
                          key={vote.questionId}
                          className={`px-6 py-4 ${isTop3 ? cat.lightBg : ''}`}
                        >
                          <div className="flex items-center gap-4">
                            {/* 순위 원 */}
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 ${
                              isTop3
                                ? (finalRank === 0 || idx === 0) ? 'bg-amber-400 text-slate-900'
                                : (finalRank === 1 || idx === 1) ? 'bg-slate-400 text-slate-900'
                                : 'bg-amber-700 text-white'
                                : 'bg-slate-700 text-slate-500'
                            }`}>
                              {isTop3 ? (votingConfig.closed ? finalRank + 1 : idx + 1) : idx + 1}
                            </div>

                            {/* 문제 정보 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <span className={`text-sm font-extrabold px-2 py-0.5 rounded border ${
                                  isTop3
                                    ? `${cat.lightBg} ${cat.textColor} border-current`
                                    : 'bg-slate-700 text-slate-400 border-slate-600'
                                }`}>
                                  #{vote.questionId}
                                </span>
                                {isTop3 && (
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                    votingConfig.closed
                                      ? 'bg-amber-900/50 text-amber-400 border border-amber-700/50'
                                      : 'bg-amber-900/40 text-amber-400'
                                  }`}>
                                    {votingConfig.closed ? '🏆 확정' : '⭐ 선정'}
                                  </span>
                                )}
                              </div>
                              <h4 className={`font-bold text-sm mb-1 ${isTop3 ? cat.textColor : 'text-slate-300'}`}>
                                {q?.title || `문제 ${vote.questionId}번`}
                              </h4>
                              {q?.issue && (
                                <p className="text-xs text-slate-500 mb-1">{q.issue}</p>
                              )}
                              <div className="text-xs text-slate-500">
                                투표: {vote.voters.join(', ')}
                              </div>
                            </div>

                            {/* 득표 바 */}
                            <div className="w-40 flex-shrink-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-300">
                                  {vote.voteCount}표
                                </span>
                                <span className="text-xs text-slate-500">
                                  {pct.toFixed(0)}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden">
                                <div
                                  className="h-2.5 rounded-full transition-all duration-700"
                                  style={{
                                    width: `${(vote.voteCount / maxVotes) * 100}%`,
                                    background: isTop3
                                      ? (catResult.category === 'stock_transfer'
                                          ? 'linear-gradient(90deg,#3b82f6,#1d4ed8)'
                                          : catResult.category === 'nominee_stock'
                                          ? 'linear-gradient(90deg,#8b5cf6,#6d28d9)'
                                          : 'linear-gradient(90deg,#10b981,#047857)')
                                      : '#334155',
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}

          {/* 최종 선정 9문제 요약 (투표 진행 중 과반수 이상 완료 시) */}
          {!votingConfig.closed && isMajority && (
            <div
              className="rounded-xl p-6 border-2 border-amber-700/60"
              style={{ background: 'linear-gradient(135deg, #1c1917 0%, #292524 100%)' }}
            >
              <h3 className="text-lg font-bold text-amber-400 mb-1 flex items-center gap-2">
                🏆 현재 선정 예상 문제 (총 9문제)
              </h3>
              <p className="text-xs text-amber-600/80 mb-4">
                과반수({status?.votedCount}명) 투표 기준 · 투표 종료 전까지 변동될 수 있습니다
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {results.map((catResult) => {
                  const cat = QS_CATEGORIES[catResult.category];
                  return (
                    <div key={catResult.category} className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <div className={`text-sm font-bold ${cat?.textColor} mb-3 flex items-center gap-1`}>
                        {cat?.icon} {catResult.categoryLabel.replace(' 프로젝트 설계', '')}
                      </div>
                      <div className="space-y-2">
                        {catResult.selectedQuestions.length === 0 ? (
                          <div className="text-xs text-slate-500">투표 진행 중</div>
                        ) : (
                          catResult.selectedQuestions.map((q, i) => {
                            const qData = QS_QUESTIONS[q.questionId];
                            return (
                              <div key={q.questionId} className="flex items-start gap-2">
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                                  i === 0 ? 'bg-amber-400 text-slate-900' :
                                  i === 1 ? 'bg-slate-400 text-slate-900' :
                                  'bg-amber-700 text-white'
                                }`}>{i + 1}</span>
                                <div>
                                  <span className="text-xs font-extrabold text-slate-300">
                                    #{q.questionId}
                                  </span>
                                  <span className="text-xs text-slate-500 ml-1">
                                    ({q.voteCount}표)
                                  </span>
                                  {qData && (
                                    <p className="text-xs text-slate-500 mt-0.5 leading-tight">
                                      {qData.title}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-800 rounded-xl shadow-sm border border-slate-700 px-6 py-16 text-center">
          <div className="text-5xl mb-4">🗳️</div>
          <p className="text-slate-400 font-medium">아직 투표 결과가 없습니다.</p>
          <p className="text-sm text-slate-500 mt-2">
            평가위원이 투표를 시작하면 결과가 표시됩니다.
          </p>
          <button
            onClick={() => navigate('/question-selection')}
            className="mt-6 text-sm text-blue-400 hover:text-blue-300 underline transition-colors"
          >
            투표 페이지로 이동 →
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          2차 출제 랜덤 배정 섹션
      ════════════════════════════════════════════════════════ */}
      {votingConfig.closed && (
        <div className="mt-8">
          {/* 섹션 헤더 */}
          <div
            className="rounded-2xl overflow-hidden border-2 shadow-2xl"
            style={{ borderColor: 'rgb(214,173,101)', background: 'linear-gradient(135deg, #1a1207 0%, #292010 100%)' }}
          >
            {/* 골드 타이틀 바 */}
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎲</span>
                <div>
                  <h2 className="text-lg font-black text-stone-900">2차 출제 랜덤 배정기</h2>
                  <p className="text-xs text-stone-700 font-medium">
                    인증 후보자 3명 × 분야별 1문제 = 총 3문제 랜덤 배정 · 개인 URL 발급
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-stone-700 font-medium">시험일</p>
                <p className="text-sm font-black text-stone-900">{EXAM_DATE_STR}</p>
              </div>
            </div>

            {/* 문제 풀 요약 */}
            <div className="px-6 py-4 border-b border-amber-900/30">
              <p className="text-xs font-bold text-amber-500 mb-3">
                🎯 배정 문제 풀 (1차 최종 확정 9문제)
              </p>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: 'stock_transfer',    icon: '📊', label: '주식이동',  color: 'text-blue-400',    bg: 'bg-blue-900/20',    border: 'border-blue-800/50' },
                  { key: 'nominee_stock',     icon: '🔐', label: '차명주식',  color: 'text-purple-400',  bg: 'bg-purple-900/20',  border: 'border-purple-800/50' },
                  { key: 'temporary_payment', icon: '💰', label: '가지급금',  color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-800/50' },
                ].map(({ key, icon, label, color, bg, border }) => (
                  <div key={key} className={`rounded-xl p-3 border ${border} ${bg}`}>
                    <p className={`text-xs font-bold ${color} mb-2`}>{icon} {label}</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {ROUND2_QUESTION_POOL[key].map(qId => {
                        const q = QS_QUESTIONS[qId];
                        return (
                          <div key={qId} className="bg-slate-700/60 rounded-lg px-2 py-1 text-center">
                            <span className={`text-xs font-black ${color}`}>#{qId}</span>
                            <p className="text-[9px] text-slate-500 leading-tight mt-0.5 max-w-[70px] truncate">
                              {q?.title?.split(' - ')[0] || ''}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 배정 실행 / 결과 영역 */}
            <div className="px-6 py-5">

              {/* ── 슬롯머신 애니메이션 ── */}
              {isSpinning && (
                <div className="mb-5">
                  <div className="rounded-2xl border border-amber-700/50 overflow-hidden" style={{ background: 'rgba(30,20,5,0.8)' }}>
                    <div className="px-5 py-4 text-center">
                      <p className="text-sm font-bold text-amber-400 mb-4 animate-pulse">🎰 랜덤 배정 추첨 진행중...</p>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: '주식이동', color: '#3b82f6', icon: '📊' },
                          { label: '차명주식', color: '#8b5cf6', icon: '🔐' },
                          { label: '가지급금', color: '#10b981', icon: '💰' },
                        ].map(({ label, color, icon }, idx) => (
                          <div
                            key={label}
                            className="rounded-xl p-4 border-2 text-center transition-all duration-300"
                            style={{
                              borderColor: spinStep > idx ? color : '#374151',
                              background: spinStep > idx ? `${color}15` : 'rgba(15,23,42,0.6)',
                              transform: spinStep === idx + 1 ? 'scale(1.05)' : 'scale(1)',
                            }}
                          >
                            <span className="text-2xl block mb-1">{icon}</span>
                            <p className="text-xs font-bold mb-2" style={{ color: spinStep > idx ? color : '#64748b' }}>{label}</p>
                            <div
                              className="text-2xl font-black transition-all duration-300"
                              style={{ color: spinStep > idx ? color : '#475569' }}
                            >
                              {spinStep > idx ? '✓' : spinStep === idx + 1 ? (
                                <span className="animate-bounce inline-block">?</span>
                              ) : '—'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 실행 버튼 영역 ── */}
              <div className="flex items-center gap-3 mb-5 flex-wrap">
                {/* 테스트 시뮬레이션 버튼 (항상 표시) */}
                <button
                  onClick={handleTestAssignment}
                  disabled={isSpinning}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition hover:opacity-90 shadow-lg active:scale-95 border-2 disabled:opacity-50"
                  style={{
                    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
                    borderColor: '#d97706',
                    color: '#fbbf24',
                  }}
                >
                  🧪 테스트 시뮬레이션
                  {testAssignments.length > 0 ? ' (재실행)' : ''}
                </button>

                {/* 관리자 확정 배정 버튼 */}
                {adminMode && (
                  <button
                    onClick={handleRunAssignment}
                    disabled={isSpinning}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-stone-900 transition hover:opacity-90 shadow-lg active:scale-95 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
                  >
                    🎲 확정 배정 실행{assignments.length > 0 ? ' (재배정)' : ''}
                  </button>
                )}

                {adminMode && assignments.length > 0 && (
                  <button
                    onClick={handleClearAssignment}
                    className="px-4 py-3 rounded-xl text-xs font-bold text-red-400 border border-red-800/60 hover:bg-red-900/30 transition"
                  >
                    배정 초기화
                  </button>
                )}

                {assignSavedAt && (
                  <span className="text-xs text-slate-500">
                    마지막 확정: {new Date(assignSavedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              {/* ── 테스트 시뮬레이션 결과 ── */}
              {testAssignments.length > 0 && (
                <div className="mb-6">
                  <div className="rounded-2xl border-2 border-dashed border-amber-600/60 overflow-hidden" style={{ background: 'rgba(120,80,20,0.08)' }}>
                    <div className="px-5 py-3 border-b border-amber-800/30 flex items-center justify-between" style={{ background: 'rgba(217,119,6,0.1)' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">🧪</span>
                        <p className="text-sm font-bold text-amber-400">테스트 시뮬레이션 결과</p>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/40 text-amber-500 border border-amber-700/50 font-bold">미저장</span>
                      </div>
                      <button
                        onClick={() => setTestAssignments([])}
                        className="text-xs text-slate-500 hover:text-slate-300 transition"
                      >
                        ✕ 닫기
                      </button>
                    </div>
                    <div className="px-5 py-4">
                      <div className="space-y-3">
                        {testAssignments.map((asgn) => {
                          const token = encodeToken(asgn);
                          return (
                            <div
                              key={asgn.candidateId}
                              className="rounded-xl border border-amber-800/20 overflow-hidden"
                              style={{ background: 'rgba(20,15,5,0.5)' }}
                            >
                              <div className="px-4 py-3 flex items-center gap-3">
                                {/* 이니셜 */}
                                <div
                                  className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-black flex-shrink-0"
                                  style={{ background: 'linear-gradient(135deg, #d97706 0%, #92400e 100%)', color: '#1a1207' }}
                                >
                                  {asgn.candidateName.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm text-slate-200">{asgn.candidateName}</p>
                                  <p className="text-[10px] text-slate-500">{asgn.candidateTeam}</p>
                                </div>
                                {/* 배정된 문제 미니 뱃지 */}
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-black text-blue-400 bg-blue-900/30 px-2 py-1 rounded border border-blue-800/50">#{asgn.stock_transfer}</span>
                                  <span className="text-xs font-black text-purple-400 bg-purple-900/30 px-2 py-1 rounded border border-purple-800/50">#{asgn.nominee_stock}</span>
                                  <span className="text-xs font-black text-emerald-400 bg-emerald-900/30 px-2 py-1 rounded border border-emerald-800/50">#{asgn.temporary_payment}</span>
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono">{token}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-3 text-center">
                        ⚠️ 테스트 결과는 저장되지 않습니다. 확정하려면 관리자 모드에서 "확정 배정 실행"을 클릭하세요.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── 확정 배정 결과 ── */}
              {assignments.length === 0 && testAssignments.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-amber-800/40 rounded-2xl">
                  <div className="text-4xl mb-3">🎲</div>
                  <p className="text-slate-400 text-sm font-medium">아직 배정이 실행되지 않았습니다</p>
                  <p className="text-slate-500 text-xs mt-1">
                    "🧪 테스트 시뮬레이션"으로 미리 확인하거나, 관리자 모드에서 확정 배정을 실행하세요
                  </p>
                </div>
              ) : assignments.length > 0 && (
                /* 확정 배정 결과 카드 목록 */
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                      ✅ 확정 배정 완료
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/30 text-emerald-500 border border-emerald-700/40 font-bold">저장됨</span>
                    <span className="text-xs text-slate-500 ml-auto">아래 URL을 각 피평가자에게 전달하세요</span>
                  </div>
                  {assignments.map((asgn) => {
                    const token   = encodeToken(asgn);
                    const examUrl = `${window.location.origin}/question-selection/exam/${token}`;
                    const isCopied = copiedToken === token;

                    return (
                      <div
                        key={asgn.candidateId}
                        className="rounded-2xl border border-amber-800/30 overflow-hidden"
                        style={{ background: 'rgba(30,20,5,0.6)' }}
                      >
                        {/* 후보자 헤더 */}
                        <div className="px-5 py-3.5 flex items-center gap-3 border-b border-amber-900/20">
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
                          <div className="text-xs text-slate-500 font-mono bg-slate-800 px-2 py-1 rounded">
                            토큰: {token}
                          </div>
                        </div>

                        <div className="px-5 py-4">
                          {/* 배정 문제 3개 */}
                          <div className="grid grid-cols-3 gap-2 mb-4">
                            {[
                              { key: 'stock_transfer',    icon: '📊', label: '주식이동',  color: 'text-blue-400',    border: 'border-blue-800/50',    bg: 'bg-blue-900/15' },
                              { key: 'nominee_stock',     icon: '🔐', label: '차명주식',  color: 'text-purple-400',  border: 'border-purple-800/50',  bg: 'bg-purple-900/15' },
                              { key: 'temporary_payment', icon: '💰', label: '가지급금',  color: 'text-emerald-400', border: 'border-emerald-800/50', bg: 'bg-emerald-900/15' },
                            ].map(({ key, icon, label, color, border, bg }) => {
                              const qId  = asgn[key];
                              const qData = QS_QUESTIONS[qId];
                              return (
                                <div key={key} className={`rounded-xl p-3 border ${border} ${bg}`}>
                                  <div className="flex items-center gap-1 mb-1.5">
                                    <span className="text-xs">{icon}</span>
                                    <span className="text-[10px] text-slate-500 font-medium">{label}</span>
                                  </div>
                                  <p className={`text-xl font-black ${color}`}>#{qId}</p>
                                  <p className="text-[10px] text-slate-400 mt-0.5 leading-tight line-clamp-2">
                                    {qData?.title?.split(' - ').slice(-1)[0] || qData?.title || ''}
                                  </p>
                                </div>
                              );
                            })}
                          </div>

                          {/* URL 공유 + 문제 페이지 직접 이동 */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0 bg-slate-900 rounded-lg px-3 py-2 border border-slate-700 overflow-hidden">
                              <p className="text-[10px] text-slate-500 mb-0.5">출제 확인 URL</p>
                              <p className="text-xs font-mono text-slate-300 truncate">{examUrl}</p>
                            </div>
                            <button
                              onClick={() => handleCopyUrl(token)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold flex-shrink-0 transition border ${
                                isCopied
                                  ? 'bg-emerald-900/40 text-emerald-400 border-emerald-700/60'
                                  : 'text-stone-900 border-transparent hover:opacity-90'
                              }`}
                              style={!isCopied ? {
                                background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)',
                              } : {}}
                            >
                              {isCopied ? '✅ 복사됨' : '🔗 URL 복사'}
                            </button>
                            <button
                              onClick={() => navigate(`/question-selection/exam/${token}`)}
                              className="px-4 py-2.5 rounded-xl text-xs font-bold flex-shrink-0 border border-blue-600 text-blue-400 hover:bg-blue-900/30 transition flex items-center gap-1.5"
                            >
                              📋 문제 확인 →
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* 전체 URL 일괄 복사 */}
                  <button
                    onClick={() => {
                      const text = assignments.map(a => {
                        const t = encodeToken(a);
                        return `${a.candidateName}: ${window.location.origin}/question-selection/exam/${t}`;
                      }).join('\n');
                      navigator.clipboard.writeText(text).then(() => {
                        setCopiedToken('ALL');
                        setTimeout(() => setCopiedToken(''), 3000);
                      });
                    }}
                    className="w-full py-3 rounded-xl text-sm font-bold border transition"
                    style={copiedToken === 'ALL'
                      ? { background: 'rgba(5,150,105,0.15)', borderColor: '#065f46', color: '#6ee7b7' }
                      : { background: 'rgba(214,173,101,0.08)', borderColor: 'rgb(120,80,20)', color: 'rgb(214,173,101)' }
                    }
                  >
                    {copiedToken === 'ALL' ? '✅ 3명 URL 모두 복사됨' : '📋 3명 URL 전체 복사'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          피평가자 단계별 추적 대시보드 + 4단계 최종 추첨
      ════════════════════════════════════════════════════════ */}
      {votingConfig.closed && assignments.length > 0 && (
        <div className="mt-8">
          <div
            className="rounded-2xl overflow-hidden border-2 shadow-2xl"
            style={{ borderColor: '#ef4444', background: 'linear-gradient(135deg, #1a0505 0%, #200a0a 100%)' }}
          >
            {/* 헤더 */}
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #991b1b 0%, #7f1d1d 100%)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🎯</span>
                <div>
                  <h2 className="text-lg font-black text-red-100">피평가자 단계별 추적</h2>
                  <p className="text-xs text-red-300/70 font-medium">
                    배정 → 추첨 → 평가 → 결과 · 전 단계 데이터 추적 및 보관
                  </p>
                </div>
              </div>
              <button
                onClick={() => { refreshTracker(); setShowTracker(!showTracker); }}
                className="text-xs px-4 py-2 rounded-lg font-bold border transition"
                style={{ borderColor: '#fca5a5', color: '#fca5a5', background: showTracker ? 'rgba(239,68,68,0.2)' : 'transparent' }}
              >
                {showTracker ? '△ 접기' : '▽ 상세 보기'}
              </button>
            </div>

            {/* 피평가자 카드 — 항상 요약 표시 */}
            <div className="px-6 py-5">
              <div className="space-y-4">
                {trackerSummary.map((cs) => {
                  const draw = drawResults[cs.candidateId];
                  const isDraw = drawSpinning === cs.candidateId;
                  const hasAssignment = cs.stage2Questions !== '미배정';

                  return (
                    <div
                      key={cs.candidateId}
                      className="rounded-2xl border overflow-hidden"
                      style={{ borderColor: draw ? '#166534' : '#374151', background: 'rgba(15,23,42,0.6)' }}
                    >
                      {/* 후보자 헤더 */}
                      <div className="px-5 py-3.5 flex items-center gap-3 border-b" style={{ borderColor: '#1e293b' }}>
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-black flex-shrink-0"
                          style={{ background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)', color: '#fff' }}
                        >
                          {cs.name.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-slate-100">{cs.name}</p>
                          <p className="text-xs text-slate-500">{cs.team}</p>
                        </div>

                        {/* 단계 진행 미니 뱃지 */}
                        <div className="flex items-center gap-1">
                          {['1차', '2차', '추첨', '평가', '결과'].map((label, idx) => {
                            const stageKeys = ['stage1', 'stage2', 'stage4', 'stage5', 'stage6'];
                            const stageData = cs.record?.[stageKeys[idx]];
                            const done = stageData?.status === 'completed';
                            const active = stageData?.status === 'in_progress';
                            return (
                              <span
                                key={label}
                                className="text-[9px] px-1.5 py-0.5 rounded font-bold"
                                style={{
                                  background: done ? '#166534' : active ? '#92400e' : '#1e293b',
                                  color: done ? '#4ade80' : active ? '#fbbf24' : '#475569',
                                  border: `1px solid ${done ? '#16653480' : active ? '#92400e80' : '#33415580'}`,
                                }}
                              >
                                {done ? '✓' : active ? '►' : '·'} {label}
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* 데이터 요약 행 */}
                      <div className="px-5 py-3 grid grid-cols-3 gap-3">
                        {/* 2차 배정 문제 */}
                        <div className="text-center">
                          <p className="text-[10px] text-slate-500 mb-1">2차 배정 문제</p>
                          <p className="text-sm font-black text-slate-300">{cs.stage2Questions}</p>
                        </div>

                        {/* 4단계 최종 추첨 */}
                        <div className="text-center">
                          <p className="text-[10px] text-slate-500 mb-1">최종 추첨 결과</p>
                          {isDraw ? (
                            <div className="flex items-center justify-center gap-1">
                              <span className="text-lg animate-spin">🎰</span>
                              <span className="text-xs text-amber-400 animate-pulse">추첨중...</span>
                            </div>
                          ) : draw ? (
                            <div>
                              <span className="text-lg font-black text-red-400">#{draw.questionId}</span>
                              <p className="text-[10px] text-red-500/80">{getCategoryLabel(draw.category)}</p>
                            </div>
                          ) : (
                            <div>
                              <span className="text-sm text-slate-500">미추첨</span>
                              {adminMode && hasAssignment && (
                                <button
                                  onClick={() => handleFinalDraw(cs.candidateId)}
                                  className="block mx-auto mt-1 text-[10px] px-3 py-1 rounded-lg font-bold transition"
                                  style={{ background: '#991b1b', color: '#fca5a5' }}
                                >
                                  🎰 추첨 실행
                                </button>
                              )}
                            </div>
                          )}
                        </div>

                        {/* 최종 결과 */}
                        <div className="text-center">
                          <p className="text-[10px] text-slate-500 mb-1">평가 결과</p>
                          <p className={`text-sm font-black ${
                            cs.stage6Result.includes('합격') ? 'text-emerald-400' :
                            cs.stage6Result.includes('불합격') ? 'text-red-400' : 'text-slate-500'
                          }`}>
                            {cs.stage6Result}
                          </p>
                        </div>
                      </div>

                      {/* 상세 보기 (접기/펼치기) */}
                      {showTracker && (
                        <div className="px-5 py-3 border-t border-slate-700/50 space-y-2">
                          <p className="text-[10px] text-slate-500 font-bold">변경 이력 ({cs.historyCount}건)</p>
                          {cs.record?.history?.slice(-5).reverse().map((h, i) => (
                            <div key={i} className="flex items-start gap-2 text-[10px]">
                              <span className="text-slate-600 w-32 flex-shrink-0 font-mono">
                                {new Date(h.timestamp).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                              </span>
                              <span className="text-slate-400">{h.action}</span>
                            </div>
                          ))}
                          {(!cs.record?.history || cs.record.history.length === 0) && (
                            <p className="text-[10px] text-slate-600">아직 변경 이력이 없습니다</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* 4단계 전체 추첨 버튼 (관리자 전용) */}
              {adminMode && assignments.length > 0 && Object.keys(drawResults).length < 3 && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => {
                      const undrawn = ROUND2_CANDIDATES.filter(c => !drawResults[c.id]);
                      undrawn.forEach((c, idx) => {
                        setTimeout(() => handleFinalDraw(c.id), idx * 2000);
                      });
                    }}
                    disabled={drawSpinning !== null}
                    className="px-6 py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 active:scale-95 disabled:opacity-50 shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)' }}
                  >
                    🎰 전체 피평가자 최종 추첨 실행 ({3 - Object.keys(drawResults).length}명 남음)
                  </button>
                </div>
              )}

              {/* 추첨 완료 배너 */}
              {Object.keys(drawResults).length === 3 && (
                <div
                  className="mt-4 rounded-xl px-5 py-3 border flex items-center gap-3"
                  style={{ borderColor: '#166534', background: 'rgba(22,101,52,0.1)' }}
                >
                  <span className="text-xl">✅</span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-emerald-400">4단계 최종 추첨 완료</p>
                    <p className="text-xs text-emerald-600">3명 모두 최종 1문제가 확정되었습니다 · 추첨 결과가 저장됨</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══ 치프인증 진행 일정 타임라인 ═══ */}
      {votingConfig.closed && (
        <div className="mt-8">
          <div
            className="rounded-2xl overflow-hidden border shadow-xl"
            style={{ borderColor: '#374151', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
          >
            {/* 타이틀 */}
            <div className="px-6 py-4 border-b border-slate-700" style={{ background: 'rgba(30,41,59,0.8)' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📅</span>
                  <div>
                    <h2 className="text-base font-bold text-slate-200">치프인증 진행 일정</h2>
                    <p className="text-xs text-slate-500">2-2단계 ~ 8단계 · 3월 18일부터 순차 진행</p>
                  </div>
                </div>
                {(() => {
                  const now = new Date();
                  const isMentoring = now >= MENTORING_START && now <= MENTORING_END;
                  return isMentoring ? (
                    <span className="text-xs px-3 py-1.5 rounded-full font-bold border"
                      style={{ background: '#1c2f1c', borderColor: '#166534', color: '#4ade80' }}>
                      📚 멘토링 기간 진행중
                    </span>
                  ) : null;
                })()}
              </div>
            </div>

            {/* 타임라인 */}
            <div className="px-6 py-5">
              <div className="relative">
                {/* 세로 연결선 */}
                <div className="absolute left-[18px] top-3 bottom-3 w-0.5 bg-slate-700" />

                <div className="space-y-1">
                  {SCHEDULE_MILESTONES.map((ms, idx) => {
                    const currentStep = getCurrentStep();
                    const isPast = currentStep && SCHEDULE_MILESTONES.findIndex(m => m.step === currentStep) > idx;
                    const isCurrent = currentStep === ms.step;
                    const isFuture = !isPast && !isCurrent;

                    return (
                      <div key={ms.step} className="relative flex items-start gap-4 py-2.5">
                        {/* 도트 */}
                        <div
                          className="w-[38px] h-[38px] rounded-full flex items-center justify-center text-base flex-shrink-0 relative z-10 border-2 shadow-lg"
                          style={{
                            background: isPast ? '#1e293b' : isCurrent ? ms.color : '#0f172a',
                            borderColor: isPast ? '#475569' : ms.color,
                            opacity: isFuture ? 0.4 : 1,
                          }}
                        >
                          {isPast ? '✅' : ms.icon}
                        </div>

                        {/* 내용 */}
                        <div className={`flex-1 min-w-0 ${isFuture ? 'opacity-40' : ''}`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className="text-[10px] font-black px-2 py-0.5 rounded"
                              style={{ background: `${ms.color}30`, color: ms.color }}
                            >
                              {ms.step}단계
                            </span>
                            <span className="text-sm font-bold text-slate-200">{ms.title}</span>
                            {isCurrent && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold animate-pulse"
                                style={{ background: `${ms.color}25`, color: ms.color, border: `1px solid ${ms.color}50` }}>
                                진행중
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mb-1.5">{ms.date}</p>
                          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                            {ms.items.map((item, i) => (
                              <span key={i} className="text-[11px] text-slate-400 leading-relaxed">
                                • {item}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 관리자 인증 모달 ═══ */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl border border-slate-600 shadow-2xl w-full max-w-sm overflow-hidden">
            <div
              className="px-6 py-5 text-white"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)' }}
            >
              <h3 className="text-lg font-bold">🔑 관리자 인증</h3>
              <p className="text-blue-200 text-xs mt-1">관리자만 투표 종료 및 결과 수정이 가능합니다</p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* 관리자 선택 */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">관리자 선택</label>
                <div className="grid grid-cols-2 gap-2">
                  {ADMINS.map((a) => (
                    <button
                      key={a.name}
                      type="button"
                      onClick={() => setAdminName(a.name)}
                      className={`py-3 rounded-lg border-2 text-sm font-bold transition-all ${
                        adminName === a.name
                          ? 'border-blue-500 bg-blue-900/40 text-blue-300'
                          : 'border-slate-600 bg-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {a.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 비밀번호 */}
              <div>
                <label className="block text-sm font-semibold text-slate-300 mb-2">관리자 비밀번호</label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminLogin()}
                  placeholder="비밀번호 입력"
                  className="w-full px-4 py-3 border-2 border-slate-600 rounded-lg bg-slate-700 text-slate-100 placeholder-slate-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {adminError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-2 text-sm text-red-400">
                  ⚠️ {adminError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleAdminLogin}
                  className="flex-1 text-white py-3 rounded-lg font-bold transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}
                >
                  인증하기
                </button>
                <button
                  onClick={() => {
                    setShowAdminModal(false);
                    setAdminPassword('');
                    setAdminError('');
                    setAdminName('');
                  }}
                  className="px-4 py-3 rounded-lg bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 투표 종료 확인 모달 ═══ */}
      {showCloseConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl border border-red-700/60 shadow-2xl w-full max-w-sm overflow-hidden">
            <div
              className="px-6 py-5 text-white"
              style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)' }}
            >
              <h3 className="text-lg font-bold">🔒 투표 종료</h3>
              <p className="text-red-200 text-xs mt-1">이 작업은 모든 투표를 마감합니다</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-slate-300 text-sm mb-2">
                현재까지의 투표 결과로 최종 9문제를 확정합니다.
              </p>
              <p className="text-slate-400 text-xs mb-5">
                • {status?.votedCount || 0}명 투표 완료 기준으로 집계됩니다<br />
                • 종료 후에도 관리자가 최종 문제를 수정할 수 있습니다
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleCloseVoting}
                  className="flex-1 text-white py-3 rounded-lg font-bold transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)' }}
                >
                  🔒 투표 종료 확정
                </button>
                <button
                  onClick={() => setShowCloseConfirm(false)}
                  className="px-4 py-3 rounded-lg bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 전체 초기화 확인 모달 ═══ */}
      {showResetConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl border border-red-800/70 shadow-2xl w-full max-w-md overflow-hidden my-auto">

            {/* 헤더 */}
            <div className="px-6 py-5 text-white"
              style={{ background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)' }}>
              <h3 className="text-lg font-bold flex items-center gap-2">⚠️ 전체 초기화 보안 확인</h3>
              <p className="text-red-200 text-xs mt-1">이 작업은 되돌릴 수 없습니다 · 3단계 인증 필요</p>
            </div>

            <div className="px-6 py-5 space-y-5">

              {/* 삭제 데이터 안내 */}
              <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3">
                <p className="text-red-300 text-xs font-bold mb-1.5">삭제되는 데이터</p>
                <ul className="text-xs text-red-400/90 space-y-0.5">
                  <li>• 7명 평가위원의 모든 투표 기록 (Supabase DB)</li>
                  <li>• 투표 종료 / 예약 설정 (localStorage)</li>
                  <li>• 최종 확정 문제 목록</li>
                </ul>
              </div>

              {/* STEP 1: 관리자 비밀번호 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-2">
                  <span className="w-5 h-5 rounded-full bg-red-900/60 border border-red-700 flex items-center justify-center text-xs text-red-300 font-black">1</span>
                  관리자 비밀번호 입력
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="관리자 비밀번호"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm focus:border-red-500 outline-none transition"
                />
                {resetPassword && (
                  <p className={`text-xs mt-1 ${ADMINS.some((a) => a.password === resetPassword) ? 'text-emerald-400' : 'text-red-500'}`}>
                    {ADMINS.some((a) => a.password === resetPassword) ? '✓ 비밀번호 확인됨' : '✗ 비밀번호 불일치'}
                  </p>
                )}
              </div>

              {/* STEP 2: "초기화하라" 3회 입력 */}
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-2">
                  <span className="w-5 h-5 rounded-full bg-red-900/60 border border-red-700 flex items-center justify-center text-xs text-red-300 font-black">2</span>
                  <span>
                    아래 텍스트를 3회 입력하세요
                    <span className="ml-2 px-2 py-0.5 rounded bg-slate-700 text-amber-300 font-mono text-xs border border-slate-600">
                      {RESET_KEYWORD}
                    </span>
                  </span>
                </label>
                <div className="space-y-2">
                  {[0, 1, 2].map((i) => {
                    const ok = resetTexts[i] === RESET_KEYWORD;
                    return (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 w-8 flex-shrink-0">{i + 1}회</span>
                        <input
                          type="text"
                          value={resetTexts[i]}
                          onChange={(e) => {
                            const next = [...resetTexts];
                            next[i] = e.target.value;
                            setResetTexts(next);
                          }}
                          placeholder={`"${RESET_KEYWORD}" 입력`}
                          className={`flex-1 px-3 py-2 rounded-lg bg-slate-800 border text-sm text-slate-100 placeholder-slate-600 outline-none transition ${
                            resetTexts[i] === ''
                              ? 'border-slate-600 focus:border-red-500'
                              : ok
                              ? 'border-emerald-600 bg-emerald-950/30'
                              : 'border-red-700 bg-red-950/20'
                          }`}
                        />
                        <span className="w-5 flex-shrink-0 text-center">
                          {resetTexts[i] !== '' && (ok ? '✅' : '❌')}
                        </span>
                      </div>
                    );
                  })}
                </div>
                {/* 진행 상태 */}
                <div className="mt-2 flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`flex-1 h-1.5 rounded-full transition-all ${
                      resetTexts[i] === RESET_KEYWORD ? 'bg-emerald-500' : 'bg-slate-700'
                    }`} />
                  ))}
                  <span className="text-xs text-slate-500 ml-1">
                    {resetTexts.filter((t) => t === RESET_KEYWORD).length}/3
                  </span>
                </div>
              </div>

              {/* 오류 메시지 */}
              {resetError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-2.5 text-xs text-red-400">
                  ⚠️ {resetError}
                </div>
              )}

              {/* 실행 버튼 */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleResetAll}
                  disabled={resetting}
                  className="flex-1 text-white py-3 rounded-xl font-bold transition hover:opacity-90 disabled:opacity-40"
                  style={{ background: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)' }}
                >
                  {resetting ? '초기화 중...' : '🗑️ 완전 초기화 실행'}
                </button>
                <button
                  onClick={closeResetModal}
                  disabled={resetting}
                  className="px-4 py-3 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ 투표 재개 확인 모달 ═══ */}
      {showReopenConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-slate-800 rounded-2xl border border-blue-700/60 shadow-2xl w-full max-w-sm overflow-hidden">
            <div
              className="px-6 py-5 text-white"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e1b4b 100%)' }}
            >
              <h3 className="text-lg font-bold">🔓 투표 재개</h3>
              <p className="text-blue-200 text-xs mt-1">투표를 다시 열겠습니까?</p>
            </div>
            <div className="px-6 py-5">
              <p className="text-slate-300 text-sm mb-5">
                투표를 재개하면 확정된 최종 문제가 해제되고 다시 투표를 받을 수 있습니다.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={handleReopenVoting}
                  className="flex-1 text-white py-3 rounded-lg font-bold transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)' }}
                >
                  🔓 투표 재개
                </button>
                <button
                  onClick={() => setShowReopenConfirm(false)}
                  className="px-4 py-3 rounded-lg bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
