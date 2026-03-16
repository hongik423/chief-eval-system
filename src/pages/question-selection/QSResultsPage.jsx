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
  confirmFinalSelection,
  loadCandidateProgressFromSupabase,
  // 5~8단계 핸들러
  startEvaluation,
  completeEvaluation,
  submitEvaluatorScores,
  announceResult,
  issueCertificate,
  generateCertificateNumber,
  EVALUATORS,
} from '@/lib/qsAssignmentStore';

import { useStore } from '@/lib/store';
import {
  getQsCandidateSession,
  clearQsCandidateSession,
} from '@/data/qsCandidates';

const ALL_EVALUATORS = ['나동환', '권영도', '권오경', '김홍', '박성현', '윤덕상', '하상현'];
const CATEGORY_KEYS = Object.keys(QS_CATEGORIES);
const RESET_KEYWORD = '초기화하라';
const ASSIGN_RESET_KEYWORD = '배정초기화하라';

// 관리자 계정
const ADMINS = [
  { name: '강선애', password: 'ksa2026' },
  { name: '이후경', password: 'lhk2026' },
];

export default function QSResultsPage() {
  const navigate = useNavigate();

  // ─── 피평가자 세션 확인 ───
  const candidateSession = getQsCandidateSession();

  // ─── 피평가자 전용 뷰 ───
  if (candidateSession) {
    return (
      <CandidateAssignmentView
        candidate={candidateSession}
        onLogout={() => {
          clearQsCandidateSession();
          navigate('/question-selection');
        }}
      />
    );
  }

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
  const [adminMode, setAdminMode] = useState(!!localStorage.getItem('chief_eval_admin')); // 메인 앱 관리자 또는 QS 관리자 인증

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

  // ── 배정 초기화 확인 모달
  const [showClearAssignConfirm, setShowClearAssignConfirm] = useState(false);
  const [clearAssignPassword, setClearAssignPassword] = useState('');
  const [clearAssignText, setClearAssignText] = useState('');
  const [clearAssignError, setClearAssignError] = useState('');

  // ── 2차 출제 랜덤 배정
  const [assignments, setAssignments] = useState([]); // 현재 배정 목록
  const [assignSavedAt, setAssignSavedAt] = useState(null);
  const [copiedToken, setCopiedToken] = useState(''); // 복사된 토큰 키
  const [testMode, setTestMode] = useState(false); // 테스트 시뮬레이션 모드
  const [testAssignments, setTestAssignments] = useState([]); // 테스트 배정 결과
  const [isSpinning, setIsSpinning] = useState(false); // 랜덤 배정 애니메이션
  const [spinStep, setSpinStep] = useState(0); // 애니메이션 단계 (0~3)
  const assignmentsResultRef = useRef(null); // 랜덤 배정 출제 확정 결과 섹션 스크롤용

  // ── 피평가자 단계 추적
  const [trackerSummary, setTrackerSummary] = useState([]);
  const [showTracker, setShowTracker] = useState(false);
  const [drawSpinning, setDrawSpinning] = useState(null); // 4단계 추첨 중인 candidateId
  const [drawResults, setDrawResults] = useState({}); // { candidateId: { category, questionId } }

  // ── 4단계 룰렛 모달
  const [showRoulette, setShowRoulette] = useState(false);
  const [rouletteCandidateId, setRouletteCandidateId] = useState(null);
  const [rouletteQuestions, setRouletteQuestions] = useState([]); // [{key, questionId, label, color, fill, stroke}]
  const [roulettePhase, setRoulettePhase] = useState('idle'); // idle | spinning | result
  const [rouletteResult, setRouletteResult] = useState(null);
  const [rouletteAngle, setRouletteAngle] = useState(0);
  const [confirmingCandidate, setConfirmingCandidate] = useState(null); // 확정 저장 중인 candidateId

  // ── Supabase 데이터 조회 패널
  const [supabaseProgress, setSupabaseProgress] = useState([]);
  const [showSupabasePanel, setShowSupabasePanel] = useState(false);
  const [loadingSupabase, setLoadingSupabase] = useState(false);

  // 메인 앱 관리자: 로그인 없이 모든 영역 adminMode 부여
  useEffect(() => {
    if (localStorage.getItem('chief_eval_admin')) {
      setAdminMode(true);
      setAdminName('관리자');
    }
  }, []);

  // ── 5단계: 인증평가 실시
  const [showEvalPanel, setShowEvalPanel] = useState(false);

  // ── 6단계: 평가위원 점수 입력
  const [showScoringPanel, setShowScoringPanel] = useState(false);
  const [scoringCandidateId, setScoringCandidateId] = useState(null);
  const [evaluatorScores, setEvaluatorScores] = useState({}); // { evaluatorName: { pmScore, bonusScore } }
  const [consensusNotes, setConsensusNotes] = useState('');
  const [scoringResult, setScoringResult] = useState(null); // 제출 후 결과

  // ── 7단계: 결과 발표
  const [showAnnouncementPanel, setShowAnnouncementPanel] = useState(false);
  const [feedbackInputs, setFeedbackInputs] = useState({}); // { candidateId: string }

  // ── 8단계: 인증서 수여
  const [showCertPanel, setShowCertPanel] = useState(false);

  // ── 랜덤 배정 출제 확정 버튼 이중인증 모달
  const [showAssignConfirmAuth, setShowAssignConfirmAuth] = useState(false);
  const [assignConfirmPassword, setAssignConfirmPassword] = useState('');
  const [assignConfirmText, setAssignConfirmText] = useState('');
  const [assignConfirmError, setAssignConfirmError] = useState('');

  // ── 상세 평가 데이터 연동 (store.js - Supabase 평가시스템)
  const evalStoreInitialize = useStore(s => s.initialize);
  const evalStoreLoading = useStore(s => s.loading);
  const evalCandidates = useStore(s => s.candidates);
  const evalEvaluators = useStore(s => s.evaluators);
  const evalSessions = useStore(s => s.sessions);
  const evalScores = useStore(s => s.scores);
  const evalBonusScores = useStore(s => s.bonusScores);
  const evalCriteriaSections = useStore(s => s.criteriaSections);
  const evalCriteriaItems = useStore(s => s.criteriaItems);
  const evalPeriodInfo = useStore(s => s.periodInfo);
  const getCandidateResult = useStore(s => s.getCandidateResult);
  const [evalInitialized, setEvalInitialized] = useState(false);

  // 최신 results를 interval 내부에서 안전하게 참조하기 위한 ref
  const resultsRef = useRef([]);

  const fetchData = useCallback(async () => {
    try {
      setFetchError('');
      const timeout = (ms) =>
        new Promise((_, reject) => setTimeout(() => reject(new Error('데이터 로드 시간 초과')), ms));
      const [st, rs] = await Promise.race([
        Promise.all([getVoteStatus(), getResults()]),
        timeout(15000),
      ]);
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
              confirmed: rec.stage4.confirmed || false,
              confirmedAt: rec.stage4.confirmedAt || null,
            };
          }
        });

        // Supabase에서 추가 추첨 결과 보충 (confirmed 상태 우선 반영)
        const supabaseDraws = await loadFinalDrawFromSupabase();
        Object.entries(supabaseDraws).forEach(([cid, draw]) => {
          if (!restoredDraws[cid]) {
            restoredDraws[cid] = draw;
          } else if (draw.confirmed && !restoredDraws[cid].confirmed) {
            // Supabase의 confirmed 상태가 더 최신이면 반영
            restoredDraws[cid].confirmed = draw.confirmed;
            restoredDraws[cid].confirmedAt = draw.confirmedAt;
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

  // ── 상세 평가 데이터 초기화 (Supabase에서 로드)
  useEffect(() => {
    if (!evalInitialized) {
      evalStoreInitialize()
        .then(() => setEvalInitialized(true))
        .catch((err) => console.warn('[EvalStore] 초기화 실패 (무시):', err));
    }
  }, [evalInitialized, evalStoreInitialize]);

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

  // ── 랜덤배정출제: 관리자=실제 확정 저장, 비관리자=미리보기(저장 안함)
  const handleRandomAssignment = () => {
    runSpinAnimation(() => {
      const result = generateRandomAssignments(true);
      if (adminMode) {
        saveAssignmentsLocal(result);
        setAssignments(result);
        setAssignSavedAt(new Date().toISOString());
        setTestAssignments([]);
      } else {
        setTestAssignments(result);
      }
    });
  };

  // ── 2차 배정 초기화 (직접 호출, 모달 없음)
  const doClearAssignment = () => {
    clearAssignmentsLocal();
    setAssignments([]);
    setAssignSavedAt(null);
  };

  // ── 배정 초기화 모달 닫기 및 입력값 초기화
  const closeClearAssignModal = () => {
    setShowClearAssignConfirm(false);
    setClearAssignPassword('');
    setClearAssignText('');
    setClearAssignError('');
  };

  // ── 배정 초기화 실행 (관리자 비밀번호 + "배정초기화하라" 검증 후)
  const handleClearAssignmentConfirm = () => {
    setClearAssignError('');
    const pwOk = ADMINS.some((a) => a.password === clearAssignPassword);
    const textOk = clearAssignText === ASSIGN_RESET_KEYWORD;
    if (!pwOk) {
      setClearAssignError('관리자 비밀번호가 일치하지 않습니다.');
      return;
    }
    if (!textOk) {
      setClearAssignError(`"${ASSIGN_RESET_KEYWORD}"를 정확히 입력해 주세요.`);
      return;
    }
    doClearAssignment();
    closeClearAssignModal();
  };

  // ── 룰렛 분야 정의
  const ROULETTE_CATS = [
    { key: 'stock_transfer',    label: '주식이동', icon: '📊', color: '#93c5fd', fill: '#1e3a5f', stroke: '#3b82f6' },
    { key: 'nominee_stock',     label: '차명주식', icon: '🔐', color: '#d8b4fe', fill: '#3b1f5f', stroke: '#a855f7' },
    { key: 'temporary_payment', label: '가지급금', icon: '💰', color: '#6ee7b7', fill: '#1a4035', stroke: '#10b981' },
  ];

  // ── 4단계 최종 1문제 추첨 실행 (룰렛 모달 오픈)
  const handleFinalDraw = (candidateId) => {
    // 추첨 결과 미리 계산 (결정론적)
    let result;
    try {
      result = executeFinalDraw(candidateId, adminName || '평가위원회');
    } catch (err) {
      alert(err.message);
      return;
    }

    // 해당 후보자 배정 문제 조합
    const cs = trackerSummary.find((c) => c.candidateId === candidateId);
    const questions = ROULETTE_CATS.map((cat) => ({
      ...cat,
      questionId: cs?.record?.stage2?.[cat.key] ?? '?',
    }));

    // 당첨 섹터 인덱스 → 최종 회전 각도 계산
    const winIdx = ROULETTE_CATS.findIndex((c) => c.key === result.category);
    // 섹터 i 의 중심은 top 기준 (i*120 + 60)° 위치
    // 포인터(top)로 가져오려면: 360 - sectorCenter (+ 6 full spins)
    const sectorCenter = winIdx * 120 + 60;
    const finalAngle = 6 * 360 + (360 - sectorCenter);

    // 상태 세팅
    setRouletteCandidateId(candidateId);
    setRouletteQuestions(questions);
    setRouletteResult(result);
    setRouletteAngle(0);       // 애니메이션 시작 전 0으로 초기화
    setRoulettePhase('idle');
    setShowRoulette(true);
    setDrawSpinning(candidateId);

    // 짧은 지연 후 스핀 시작 (0 → finalAngle CSS transition 트리거)
    setTimeout(() => {
      setRoulettePhase('spinning');
      setRouletteAngle(finalAngle);
    }, 150);

    // 4.5초 후 결과 표시
    setTimeout(() => {
      setRoulettePhase('result');
      setDrawResults((prev) => ({ ...prev, [candidateId]: result }));
      setTrackerSummary(getCandidateTrackerSummary());
      setDrawSpinning(null);
    }, 4700);
  };

  // ── 추적 데이터 리프레시
  const refreshTracker = () => {
    setTrackerSummary(getCandidateTrackerSummary());
  };

  // ── 4단계 최종 선정 확정 (룰렛 결과 후 "이 문제로 최종 확정" 버튼)
  const handleConfirmFinalSelection = async () => {
    if (!rouletteResult || !rouletteCandidateId) return;
    setConfirmingCandidate(rouletteCandidateId);
    try {
      await confirmFinalSelection(
        rouletteCandidateId,
        rouletteResult.category,
        rouletteResult.questionId
      );
      // drawResults에 confirmed 상태 반영
      setDrawResults((prev) => ({
        ...prev,
        [rouletteCandidateId]: {
          ...prev[rouletteCandidateId],
          confirmed: true,
          confirmedAt: new Date().toISOString(),
        },
      }));
      setTrackerSummary(getCandidateTrackerSummary());
      setShowRoulette(false);
      setRoulettePhase('idle');
    } catch (err) {
      console.error('[Confirm] 최종 확정 오류:', err);
      alert('확정 저장 중 오류가 발생했습니다: ' + (err.message || ''));
    } finally {
      setConfirmingCandidate(null);
    }
  };

  // ── Supabase 전체 데이터 조회
  const handleLoadSupabaseProgress = async () => {
    setLoadingSupabase(true);
    try {
      const progress = await loadCandidateProgressFromSupabase();
      setSupabaseProgress(progress);
      setShowSupabasePanel(true);
    } catch (err) {
      console.warn('[Supabase] 진행 현황 조회 실패:', err);
      alert('Supabase 조회 실패: ' + (err.message || ''));
    } finally {
      setLoadingSupabase(false);
    }
  };

  // ── 5단계: 인증평가 시작/완료
  const handleStartEval = (candidateId) => {
    startEvaluation(candidateId);
    setTrackerSummary(getCandidateTrackerSummary());
  };
  const handleCompleteEval = (candidateId) => {
    completeEvaluation(candidateId);
    setTrackerSummary(getCandidateTrackerSummary());
  };

  // ── 6단계: 점수 입력 패널 열기
  const handleOpenScoring = (candidateId) => {
    setScoringCandidateId(candidateId);
    // 초기화: 7명 평가위원 빈 점수
    const initial = {};
    EVALUATORS.forEach((name) => {
      initial[name] = { pmScore: '', bonusScore: '' };
    });
    setEvaluatorScores(initial);
    setConsensusNotes('');
    setScoringResult(null);
    setShowScoringPanel(true);
  };

  // ── 6단계: 점수 제출
  const handleSubmitScores = () => {
    const scores = Object.entries(evaluatorScores)
      .filter(([, v]) => v.pmScore !== '' && v.pmScore !== null)
      .map(([evaluator, v]) => ({
        evaluator,
        pmScore: Number(v.pmScore),
        bonusScore: Number(v.bonusScore) || 0,
      }));
    if (scores.length === 0) {
      alert('최소 1명 이상의 평가위원 점수를 입력해주세요.');
      return;
    }
    try {
      const result = submitEvaluatorScores(scoringCandidateId, scores, consensusNotes);
      setScoringResult(result);
      setTrackerSummary(getCandidateTrackerSummary());
    } catch (err) {
      alert('점수 제출 오류: ' + err.message);
    }
  };

  // ── 7단계: 결과 발표
  const handleAnnounce = (candidateId) => {
    const feedback = feedbackInputs[candidateId] || '';
    announceResult(candidateId, feedback);
    setTrackerSummary(getCandidateTrackerSummary());
  };

  // ── 8단계: 인증서 발급
  const handleIssueCert = (candidateId) => {
    const certNumber = generateCertificateNumber(candidateId);
    issueCertificate(candidateId, certNumber);
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
        <p className="text-[10px] text-slate-600 mt-6">빌드: 2026-03-15-v3-eval-linked</p>
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

      {/* ═══════════════════════════════════════════════════════════════
          4단계 최종 문제 선정 룰렛 모달
      ════════════════════════════════════════════════════════════════ */}
      {showRoulette && (() => {
        const cs = trackerSummary.find((c) => c.candidateId === rouletteCandidateId);
        const toSvgXY = (degFromTop, r, cx = 130, cy = 130) => ({
          x: cx + r * Math.sin((degFromTop * Math.PI) / 180),
          y: cy - r * Math.cos((degFromTop * Math.PI) / 180),
        });
        const makeSectorPath = (startDeg, endDeg, r = 120, cx = 130, cy = 130) => {
          const s = toSvgXY(startDeg, r, cx, cy);
          const e = toSvgXY(endDeg, r, cx, cy);
          return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 0 1 ${e.x} ${e.y} Z`;
        };

        return (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center px-4"
            style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(12px)' }}
          >
            <div
              className="w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl"
              style={{
                background: 'linear-gradient(180deg, #0f172a 0%, #1a0505 50%, #0f0a1e 100%)',
                border: '2px solid #ef4444',
                boxShadow: '0 0 60px rgba(239,68,68,0.3)',
              }}
            >
              {/* 헤더 */}
              <div
                className="px-6 py-4 text-center"
                style={{ background: 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #7f1d1d 100%)' }}
              >
                <p className="text-3xl mb-1">🎰</p>
                <h2 className="text-xl font-black text-white">최종 문제 추첨</h2>
                <p className="text-xs text-red-300 mt-0.5">4단계 · 평가당일 랜덤 1문제 선정</p>
              </div>

              {/* 피평가자 정보 */}
              <div className="px-6 pt-4 pb-2 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-3"
                  style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid #ef444450' }}>
                  <span className="text-lg font-black text-red-400">{cs?.name?.charAt(0)}</span>
                  <span className="font-bold text-slate-200">{cs?.name}</span>
                  <span className="text-xs text-slate-500">{cs?.team}</span>
                </div>
                {/* 배정된 3문제 미니 표시 */}
                <div className="flex items-center justify-center gap-2">
                  {rouletteQuestions.map((q, i) => (
                    <div
                      key={q.key}
                      className="rounded-xl px-3 py-2 text-center transition-all duration-500"
                      style={{
                        background: roulettePhase === 'result' && rouletteResult?.category === q.key
                          ? `${q.stroke}30` : 'rgba(15,23,42,0.8)',
                        border: `2px solid ${roulettePhase === 'result' && rouletteResult?.category === q.key
                          ? q.stroke : '#1e293b'}`,
                        transform: roulettePhase === 'result' && rouletteResult?.category === q.key
                          ? 'scale(1.15)' : 'scale(1)',
                        boxShadow: roulettePhase === 'result' && rouletteResult?.category === q.key
                          ? `0 0 20px ${q.stroke}60` : 'none',
                        opacity: roulettePhase === 'result' && rouletteResult?.category !== q.key ? 0.35 : 1,
                      }}
                    >
                      <p className="text-lg font-black leading-none" style={{ color: q.color }}>#{q.questionId}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: q.color }}>{q.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* 룰렛 휠 영역 */}
              <div className="flex items-center justify-center py-4">
                <div className="relative" style={{ width: 280, height: 280 }}>
                  {/* 포인터 삼각형 (상단 중앙) */}
                  <div
                    className="absolute z-20"
                    style={{
                      top: -2, left: '50%',
                      transform: 'translateX(-50%)',
                      width: 0, height: 0,
                      borderLeft: '14px solid transparent',
                      borderRight: '14px solid transparent',
                      borderTop: '26px solid #ef4444',
                      filter: 'drop-shadow(0 0 8px rgba(239,68,68,1))',
                    }}
                  />
                  {/* 외곽 링 */}
                  <div
                    className="absolute inset-0 rounded-full z-10 pointer-events-none"
                    style={{
                      border: '5px solid #ef4444',
                      boxShadow: '0 0 24px rgba(239,68,68,0.5), inset 0 0 12px rgba(0,0,0,0.5)',
                    }}
                  />
                  {/* SVG 회전 휠 */}
                  <svg
                    width="280" height="280" viewBox="0 0 260 260"
                    style={{
                      position: 'absolute', inset: 0,
                      transform: `rotate(${rouletteAngle}deg)`,
                      transition: roulettePhase === 'spinning'
                        ? 'transform 4.5s cubic-bezier(0.08, 0.6, 0.1, 1)' : 'none',
                    }}
                  >
                    {rouletteQuestions.map((q, i) => {
                      const startDeg = i * 120;
                      const endDeg = (i + 1) * 120;
                      const midDeg = startDeg + 60;
                      const textPos = toSvgXY(midDeg, 72, 130, 130);
                      const iconPos = toSvgXY(midDeg, 94, 130, 130);
                      return (
                        <g key={q.key}>
                          {/* 섹터 */}
                          <path
                            d={makeSectorPath(startDeg, endDeg)}
                            fill={q.fill}
                            stroke="#0f172a"
                            strokeWidth="2.5"
                          />
                          {/* 섹터 테두리 (색상) */}
                          <path
                            d={makeSectorPath(startDeg, endDeg, 120)}
                            fill="none"
                            stroke={q.stroke}
                            strokeWidth="2"
                            opacity="0.6"
                          />
                          {/* 아이콘 */}
                          <text
                            x={iconPos.x} y={iconPos.y}
                            textAnchor="middle" dominantBaseline="middle"
                            fontSize="18"
                          >{q.icon}</text>
                          {/* 문제 번호 */}
                          <text
                            x={textPos.x} y={textPos.y - 8}
                            textAnchor="middle" dominantBaseline="middle"
                            fill={q.color} fontSize="22" fontWeight="900"
                            fontFamily="monospace"
                          >#{q.questionId}</text>
                          {/* 분야명 */}
                          <text
                            x={textPos.x} y={textPos.y + 14}
                            textAnchor="middle" dominantBaseline="middle"
                            fill={q.color} fontSize="10" fontWeight="700"
                          >{q.label}</text>
                          {/* 섹터 구분선 */}
                          {(() => {
                            const lineEnd = toSvgXY(endDeg, 120, 130, 130);
                            return (
                              <line
                                x1="130" y1="130"
                                x2={lineEnd.x} y2={lineEnd.y}
                                stroke="#0f172a" strokeWidth="3"
                              />
                            );
                          })()}
                        </g>
                      );
                    })}
                    {/* 중앙 허브 */}
                    <circle cx="130" cy="130" r="22" fill="#0f172a" stroke="#ef4444" strokeWidth="3" />
                    <circle cx="130" cy="130" r="16" fill="#1a0505" stroke="#991b1b" strokeWidth="1.5" />
                    <text x="130" y="130" textAnchor="middle" dominantBaseline="middle" fontSize="16">🎯</text>
                  </svg>
                </div>
              </div>

              {/* 스피닝 중 메시지 */}
              {(roulettePhase === 'spinning' || roulettePhase === 'idle') && (
                <div className="px-6 pb-5 text-center">
                  <p className="text-red-400 font-bold animate-pulse">
                    {roulettePhase === 'spinning' ? '🎰 추첨 중...' : '잠시 후 시작됩니다...'}
                  </p>
                  <div className="flex items-center justify-center gap-1 mt-2">
                    {[0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ background: '#ef4444', animationDelay: `${i * 0.2}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* 결과 표시 */}
              {roulettePhase === 'result' && rouletteResult && (() => {
                const winCat = ROULETTE_CATS.find((c) => c.key === rouletteResult.category);
                const winQ = rouletteQuestions.find((q) => q.key === rouletteResult.category);
                return (
                  <div className="px-6 pb-6">
                    {/* 당첨 결과 박스 */}
                    <div
                      className="rounded-2xl px-6 py-5 mb-4 text-center"
                      style={{
                        background: `linear-gradient(135deg, ${winCat?.fill || '#1a0505'} 0%, rgba(239,68,68,0.1) 100%)`,
                        border: `2px solid ${winCat?.stroke || '#ef4444'}`,
                        boxShadow: `0 0 30px ${winCat?.stroke || '#ef4444'}40`,
                      }}
                    >
                      <p className="text-xs font-bold mb-2" style={{ color: winCat?.color }}>
                        🎯 최종 선정 문제
                      </p>
                      <p className="text-5xl font-black mb-1" style={{ color: winCat?.stroke }}>
                        #{rouletteResult.questionId}
                      </p>
                      <p className="text-sm font-bold" style={{ color: winCat?.color }}>
                        {winCat?.icon} {getCategoryLabel(rouletteResult.category)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-2">
                        {cs?.name} · {new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 추첨
                      </p>
                    </div>
                    {/* ── 최종 확정 버튼 (관리자 전용) ── */}
                    {adminMode && (
                      <button
                        onClick={handleConfirmFinalSelection}
                        disabled={confirmingCandidate === rouletteCandidateId}
                        className="w-full py-3.5 rounded-2xl text-base font-black text-white transition hover:opacity-90 active:scale-95 shadow-lg mb-2"
                        style={{
                          background: confirmingCandidate === rouletteCandidateId
                            ? 'linear-gradient(135deg, #065f46 0%, #064e3b 100%)'
                            : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                          opacity: confirmingCandidate === rouletteCandidateId ? 0.8 : 1,
                        }}
                      >
                        {confirmingCandidate === rouletteCandidateId
                          ? '⏳ 확정 저장 중...'
                          : '🎯 이 문제로 최종 확정'}
                      </button>
                    )}
                    {/* 닫기 버튼 */}
                    <button
                      onClick={() => { setShowRoulette(false); setRoulettePhase('idle'); }}
                      className="w-full py-2.5 rounded-xl text-sm font-bold transition"
                      style={{
                        background: adminMode ? 'transparent' : 'linear-gradient(135deg, #ef4444 0%, #991b1b 100%)',
                        color: adminMode ? '#64748b' : '#fff',
                        border: adminMode ? '1px solid #334155' : 'none',
                      }}
                    >
                      {adminMode ? '닫기 (나중에 확정)' : '✅ 확인 · 닫기'}
                    </button>
                  </div>
                );
              })()}
            </div>
          </div>
        );
      })()}

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
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setAssignConfirmPassword('');
                    setAssignConfirmText('');
                    setAssignConfirmError('');
                    setShowAssignConfirmAuth(true);
                  }}
                  className="px-4 py-2 rounded-xl text-sm font-black text-stone-900 transition hover:opacity-90 active:scale-95 border-2 border-stone-800/40 shadow-md"
                  style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' }}
                >
                  📋 랜덤 배정 출제 확정
                </button>
                <div className="text-right">
                  <p className="text-xs text-stone-700 font-medium">배정일</p>
                  <p className="text-sm font-black text-stone-900">{ROUND2_DATE_STR}</p>
                </div>
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
            <div ref={assignmentsResultRef} className="px-6 py-5">

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
              <div id="assignments-action-area" className="flex items-center gap-3 mb-5 flex-wrap">
                {/* 랜덤배정출제: 관리자=실제 저장, 비관리자=미리보기 */}
                <button
                  onClick={handleRandomAssignment}
                  disabled={isSpinning}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl font-bold text-sm transition hover:opacity-90 shadow-lg active:scale-95 border-2 disabled:opacity-50"
                  style={
                    adminMode
                      ? { background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)', borderColor: 'rgb(163,120,55)', color: '#1a1207' }
                      : { background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', borderColor: '#d97706', color: '#fbbf24' }
                  }
                >
                  🎲 랜덤배정출제
                  {assignments.length > 0 || testAssignments.length > 0 ? ' (재실행)' : ''}
                </button>

                {adminMode && assignments.length > 0 && (
                  <button
                    onClick={() => setShowClearAssignConfirm(true)}
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

              {/* ── 랜덤배정출제 결과 (미리보기, 비관리자) ── */}
              {testAssignments.length > 0 && (
                <div className="mb-6">
                  <div className="rounded-2xl border-2 border-dashed border-amber-600/60 overflow-hidden" style={{ background: 'rgba(120,80,20,0.08)' }}>
                    <div className="px-5 py-3 border-b border-amber-800/30 flex items-center justify-between" style={{ background: 'rgba(217,119,6,0.1)' }}>
                      <div className="flex items-center gap-2">
                        <span className="text-base">🎲</span>
                        <p className="text-sm font-bold text-amber-400">랜덤배정출제 결과</p>
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
                        ⚠️ 미리보기입니다. 저장하려면 관리자 모드로 로그인 후 "랜덤배정출제"를 클릭하세요.
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
                    관리자 모드에서 "🎲 랜덤배정출제"를 클릭하거나, 상단 네비바 "📋 랜덤 배정 출제 확정"으로 이동하세요
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
                      style={{
                        borderColor: draw?.confirmed ? '#059669' : draw ? '#166534' : '#374151',
                        background: 'rgba(15,23,42,0.6)',
                        boxShadow: draw?.confirmed ? '0 0 12px rgba(5,150,105,0.15)' : 'none',
                      }}
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
                              <span className="text-lg font-black" style={{ color: draw.confirmed ? '#34d399' : '#f87171' }}>
                                #{draw.questionId}
                              </span>
                              <p className="text-[10px]" style={{ color: draw.confirmed ? '#6ee7b7' : '#fca5a580' }}>
                                {getCategoryLabel(draw.category)}
                              </p>
                              {draw.confirmed ? (
                                <span
                                  className="inline-block text-[9px] px-2 py-0.5 rounded-full font-bold mt-1"
                                  style={{ background: 'rgba(5,150,105,0.2)', color: '#34d399', border: '1px solid #065f4680' }}
                                >
                                  ✅ 확정완료
                                </span>
                              ) : adminMode && (
                                <button
                                  onClick={() => {
                                    setRouletteResult(drawResults[cs.candidateId]);
                                    setRouletteCandidateId(cs.candidateId);
                                    setRouletteQuestions(ROULETTE_CATS.map((cat) => ({
                                      ...cat,
                                      questionId: cs?.record?.stage2?.[cat.key] ?? '?',
                                    })));
                                    setRoulettePhase('result');
                                    setRouletteAngle(0);
                                    setShowRoulette(true);
                                  }}
                                  className="block mx-auto mt-1 text-[9px] px-2 py-0.5 rounded font-bold transition"
                                  style={{ background: '#166534', color: '#4ade80', border: '1px solid #16653480' }}
                                >
                                  🎯 확정하기
                                </button>
                              )}
                              {!draw.confirmed && !adminMode && (
                                <span className="text-[9px] text-amber-500/60 block mt-0.5">미확정</span>
                              )}
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
              {Object.keys(drawResults).length === 3 && (() => {
                const confirmedCount = Object.values(drawResults).filter(d => d.confirmed).length;
                const allConfirmed = confirmedCount === 3;
                return (
                  <div
                    className="mt-4 rounded-xl px-5 py-3 border flex items-center gap-3"
                    style={{
                      borderColor: allConfirmed ? '#059669' : '#166534',
                      background: allConfirmed ? 'rgba(5,150,105,0.15)' : 'rgba(22,101,52,0.1)',
                    }}
                  >
                    <span className="text-xl">{allConfirmed ? '🏆' : '✅'}</span>
                    <div className="flex-1">
                      {allConfirmed ? (
                        <>
                          <p className="text-sm font-bold text-emerald-300">4단계 최종 선정 확정 완료!</p>
                          <p className="text-xs text-emerald-500">
                            3명 모두 최종 문제가 확정되었습니다 · Supabase에 저장됨 · 5단계 인증평가 진행
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-emerald-400">4단계 추첨 완료 ({confirmedCount}/3명 확정)</p>
                          <p className="text-xs text-emerald-600">
                            추첨은 완료되었으나 아직 미확정 인원이 있습니다. 관리자가 "확정하기" 버튼을 눌러 최종 확정하세요.
                          </p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          Supabase 전체 워크플로우 데이터 조회 대시보드
      ════════════════════════════════════════════════════════ */}
      {votingConfig.closed && assignments.length > 0 && (
        <div className="mt-8">
          <div
            className="rounded-2xl overflow-hidden border-2 shadow-2xl"
            style={{ borderColor: '#1e40af', background: 'linear-gradient(135deg, #030712 0%, #0c1524 100%)' }}
          >
            {/* 헤더 */}
            <div
              className="px-6 py-5 flex items-center justify-between"
              style={{ background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">🗄️</span>
                <div>
                  <h2 className="text-lg font-black text-blue-100">Supabase 전체 데이터 조회</h2>
                  <p className="text-xs text-blue-300/70 font-medium">
                    전체 워크플로우 8단계 데이터 실시간 확인 · qs_v_candidate_progress 뷰
                  </p>
                </div>
              </div>
              <button
                onClick={handleLoadSupabaseProgress}
                disabled={loadingSupabase}
                className="text-xs px-4 py-2 rounded-xl font-bold border transition hover:opacity-80 active:scale-95"
                style={{
                  borderColor: '#93c5fd',
                  color: '#93c5fd',
                  background: loadingSupabase ? 'rgba(59,130,246,0.2)' : 'rgba(30,58,138,0.4)',
                }}
              >
                {loadingSupabase ? '⏳ 로딩중...' : '🔍 Supabase 데이터 조회'}
              </button>
            </div>

            {/* 조회 결과 */}
            {showSupabasePanel && (
              <div className="px-6 py-5">
                {supabaseProgress.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-slate-500 text-sm">Supabase에 데이터가 없습니다</p>
                    <p className="text-xs text-slate-600 mt-1">
                      Migration SQL을 실행한 후 배정·추첨을 진행하면 데이터가 저장됩니다
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-4">
                      {supabaseProgress.map((row) => {
                        const stageColor = row.current_stage >= 5 ? '#059669' :
                          row.current_stage >= 4 ? '#d97706' : '#3b82f6';
                        return (
                          <div
                            key={row.candidate_id}
                            className="rounded-2xl border overflow-hidden"
                            style={{ borderColor: '#1e3a8a40', background: 'rgba(15,23,42,0.8)' }}
                          >
                            {/* 후보자 헤더 */}
                            <div
                              className="px-5 py-3 flex items-center gap-3 border-b"
                              style={{ background: 'rgba(30,58,138,0.25)', borderColor: '#1e3a8a30' }}
                            >
                              <div
                                className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black flex-shrink-0"
                                style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#fff' }}
                              >
                                {row.candidate_name?.charAt(0)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-slate-100 text-sm">{row.candidate_name}</p>
                                <p className="text-xs text-slate-500">{row.team}</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className="text-xs px-3 py-1 rounded-lg font-black"
                                  style={{ background: `${stageColor}20`, color: stageColor, border: `1px solid ${stageColor}50` }}
                                >
                                  STAGE {row.current_stage}
                                </span>
                                {row.draw_confirmed_at && (
                                  <span
                                    className="text-[10px] px-2 py-0.5 rounded-full font-bold"
                                    style={{ background: 'rgba(5,150,105,0.2)', color: '#34d399', border: '1px solid #05966940' }}
                                  >
                                    ✅ 확정완료
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* 단계별 데이터 그리드 */}
                            <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                              {/* 2차 배정 */}
                              <div className="rounded-xl p-3 border border-blue-900/30 bg-blue-900/10">
                                <p className="text-[10px] text-blue-400 font-bold mb-1">📊 2차 배정</p>
                                {row.r2_stock_transfer ? (
                                  <div className="space-y-0.5">
                                    <p className="text-[11px] text-blue-300 font-mono">주식: #{row.r2_stock_transfer}</p>
                                    <p className="text-[11px] text-purple-300 font-mono">차명: #{row.r2_nominee_stock}</p>
                                    <p className="text-[11px] text-emerald-300 font-mono">가지: #{row.r2_temporary_payment}</p>
                                  </div>
                                ) : (
                                  <p className="text-[11px] text-slate-600">미배정</p>
                                )}
                              </div>

                              {/* 최종 추첨 */}
                              <div className="rounded-xl p-3 border border-red-900/30 bg-red-900/10">
                                <p className="text-[10px] text-red-400 font-bold mb-1">🎰 최종 추첨</p>
                                {row.selected_question_id ? (
                                  <>
                                    <p className="text-base font-black text-red-300">#{row.selected_question_id}</p>
                                    <p className="text-[10px] text-red-400/60">{getCategoryLabel(row.selected_category)}</p>
                                    {row.draw_confirmed_at && (
                                      <p className="text-[9px] text-emerald-500 mt-0.5">
                                        확정: {new Date(row.draw_confirmed_at).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-[11px] text-slate-600">미추첨</p>
                                )}
                              </div>

                              {/* 인증 결과 */}
                              <div className="rounded-xl p-3 border border-emerald-900/30 bg-emerald-900/10">
                                <p className="text-[10px] text-emerald-400 font-bold mb-1">🏆 인증 결과</p>
                                {row.pass_status && row.pass_status !== 'pending' ? (
                                  <>
                                    <p className={`text-sm font-black ${row.pass_status === 'pass' ? 'text-emerald-300' : 'text-red-400'}`}>
                                      {row.pass_status === 'pass' ? '합격' : '불합격'}
                                    </p>
                                    {row.total_score && (
                                      <p className="text-[10px] text-slate-400">{row.total_score}점</p>
                                    )}
                                    {row.certificate_number && (
                                      <p className="text-[9px] text-amber-400 font-mono mt-0.5">{row.certificate_number}</p>
                                    )}
                                  </>
                                ) : (
                                  <p className="text-[11px] text-slate-600">미결정</p>
                                )}
                              </div>

                              {/* 업데이트 시각 */}
                              <div className="rounded-xl p-3 border border-slate-700/40 bg-slate-800/40">
                                <p className="text-[10px] text-slate-500 font-bold mb-1">🕐 최근 업데이트</p>
                                <p className="text-[11px] text-slate-400 font-mono leading-relaxed">
                                  {row.updated_at
                                    ? new Date(row.updated_at).toLocaleString('ko-KR', {
                                        month: 'short', day: 'numeric',
                                        hour: '2-digit', minute: '2-digit',
                                      })
                                    : '-'}
                                </p>
                                <p className="text-[9px] text-slate-600 mt-1">
                                  생성: {row.created_at
                                    ? new Date(row.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
                                    : '-'}
                                </p>
                              </div>
                            </div>

                            {/* 단계별 상태 바 */}
                            <div className="px-5 pb-4">
                              <div className="flex items-center gap-1">
                                {[1,2,3,4,5,6,7,8].map((n) => {
                                  const stageKey = `stage${n}_data`;
                                  const stageData = row[stageKey];
                                  const done = stageData?.status === 'completed';
                                  const inProgress = stageData?.status === 'in_progress';
                                  return (
                                    <div
                                      key={n}
                                      className="flex-1 h-1.5 rounded-full transition-all"
                                      style={{
                                        background: done ? '#059669' : inProgress ? '#d97706' : '#1e293b',
                                      }}
                                      title={`${n}단계: ${stageData?.status || 'pending'}`}
                                    />
                                  );
                                })}
                              </div>
                              <div className="flex justify-between mt-1">
                                <span className="text-[9px] text-slate-600">1차출제</span>
                                <span className="text-[9px] text-slate-600">인증서수여</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-slate-600 text-center mt-3">
                      📡 Supabase qs_v_candidate_progress 뷰 · 조회: {new Date().toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </>
                )}
              </div>
            )}

            {/* 안내 (미조회 상태) */}
            {!showSupabasePanel && (
              <div className="px-6 py-5">
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {[
                    { table: 'qs_candidate_tracker', desc: '8단계 전체 진행 상태', icon: '📋' },
                    { table: 'qs_round2_assignments', desc: '2차 배정 결과', icon: '🎲' },
                    { table: 'qs_final_draw', desc: '4단계 추첨 + 확정', icon: '🎰' },
                    { table: 'qs_certification_results', desc: '최종 인증 결과', icon: '🏆' },
                  ].map(({ table, desc, icon }) => (
                    <div
                      key={table}
                      className="rounded-xl p-3 border border-blue-900/30 bg-blue-900/10 text-center"
                    >
                      <span className="text-xl block mb-1">{icon}</span>
                      <p className="text-[10px] font-bold text-blue-400 font-mono">{table}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">{desc}</p>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-600 text-center mt-3">
                  위 버튼을 클릭하면 Supabase에서 실시간 데이터를 조회합니다
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          5~8단계 인증평가 워크플로우 패널
      ════════════════════════════════════════════════════════ */}
      {votingConfig.closed && (
        <div className="mt-8">
          <div
            className="rounded-2xl overflow-hidden border-2 shadow-2xl"
            style={{ borderColor: '#7c3aed', background: 'linear-gradient(135deg, #030712 0%, #1a0a2e 100%)' }}
          >
            {/* 헤더 */}
            <div
              className="px-6 py-5"
              style={{ background: 'linear-gradient(135deg, #5b21b6 0%, #7c3aed 100%)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-3xl">📋</span>
                <div>
                  <h2 className="text-lg font-black text-purple-100">5~8단계 인증평가 워크플로우</h2>
                  <p className="text-xs text-purple-300/70 font-medium">
                    인증평가 실시 → 평가위원 협의 → 결과 발표 → 인증서 수여
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">
              {/* ── 5단계: 인증평가 실시 ── */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#1e40af40', background: 'rgba(15,23,42,0.6)' }}>
                <div
                  className="px-5 py-3 flex items-center justify-between cursor-pointer"
                  style={{ background: 'rgba(59,130,246,0.15)' }}
                  onClick={() => setShowEvalPanel(!showEvalPanel)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📋</span>
                    <span className="text-sm font-bold text-blue-300">5단계: 인증평가 실시</span>
                    <span className="text-[10px] text-blue-500">3월 28일 10:00~18:00</span>
                  </div>
                  <span className="text-xs text-blue-400">{showEvalPanel ? '△' : '▽'}</span>
                </div>
                {showEvalPanel && (
                  <div className="px-5 py-4 space-y-3">
                    <div className="grid grid-cols-1 gap-3">
                      {trackerSummary.map((cs) => {
                        const stage5 = cs.record?.stage5 || {};
                        const isStarted = stage5.status === 'in_progress' || stage5.status === 'completed';
                        const isCompleted = stage5.status === 'completed';
                        return (
                          <div key={cs.candidateId} className="flex items-center gap-3 rounded-lg p-3 border border-slate-700/50 bg-slate-800/40">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                              style={{ background: 'linear-gradient(135deg, #1e3a8a, #2563eb)', color: '#fff' }}>
                              {cs.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-200">{cs.name} <span className="text-xs text-slate-500 font-normal">{cs.team}</span></p>
                              <p className="text-[10px] text-slate-500">
                                {isCompleted ? `✅ 평가완료 (${new Date(stage5.evaluationCompleted).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })})` :
                                 isStarted ? `🔄 평가진행중 (${new Date(stage5.evaluationStarted).toLocaleString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 시작)` :
                                 '⏳ 대기중'}
                              </p>
                            </div>
                            <div className="flex gap-2">
                              {adminMode && !isStarted && (
                                <button
                                  onClick={() => handleStartEval(cs.candidateId)}
                                  className="text-[11px] px-3 py-1.5 rounded-lg font-bold border transition hover:opacity-80"
                                  style={{ borderColor: '#3b82f6', color: '#93c5fd', background: 'rgba(59,130,246,0.15)' }}
                                >
                                  ▶ 평가 시작
                                </button>
                              )}
                              {adminMode && isStarted && !isCompleted && (
                                <button
                                  onClick={() => handleCompleteEval(cs.candidateId)}
                                  className="text-[11px] px-3 py-1.5 rounded-lg font-bold border transition hover:opacity-80"
                                  style={{ borderColor: '#059669', color: '#6ee7b7', background: 'rgba(5,150,105,0.15)' }}
                                >
                                  ✅ 평가 완료
                                </button>
                              )}
                              {isCompleted && (
                                <span className="text-[11px] px-3 py-1.5 rounded-lg font-bold" style={{ color: '#34d399' }}>완료됨</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="text-[10px] text-slate-600 border-t border-slate-700/50 pt-2">
                      사전교육(9:00~10:00) → 오전 인터뷰(10:00~13:00) → 점심 → 오후 프레젠테이션(15:00~17:00) → 피드백(17:00~18:00)
                    </div>
                  </div>
                )}
              </div>

              {/* ── 6단계: 평가위원 협의 (상세 평가 데이터 연동) ── */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#7c3aed40', background: 'rgba(15,23,42,0.6)' }}>
                <div
                  className="px-5 py-3 flex items-center justify-between cursor-pointer"
                  style={{ background: 'rgba(124,58,237,0.15)' }}
                  onClick={() => setShowScoringPanel(!showScoringPanel)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤝</span>
                    <span className="text-sm font-bold text-purple-300">6단계: 평가위원 협의</span>
                    <span className="text-[10px] text-purple-500">합격기준: 평균 70점 이상 (PM역량 100점 + 가점 10점)</span>
                  </div>
                  <span className="text-xs text-purple-400">{showScoringPanel ? '△' : '▽'}</span>
                </div>
                {showScoringPanel && (
                  <div className="px-5 py-4 space-y-4">
                    {/* 평가시스템 바로가기 링크 */}
                    <div className="flex items-center gap-2 rounded-lg px-4 py-2.5 border border-purple-700/40 bg-purple-950/20">
                      <span className="text-sm">📊</span>
                      <span className="text-xs text-purple-300 flex-1">
                        평가위원 평가표 입력은 <strong>평가시스템</strong>에서 진행됩니다.
                      </span>
                      <a
                        href="/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] px-3 py-1.5 rounded-lg font-bold border transition hover:opacity-80"
                        style={{ borderColor: '#7c3aed', color: '#c4b5fd', background: 'rgba(124,58,237,0.2)' }}
                      >
                        🔗 평가시스템 열기
                      </a>
                    </div>

                    {/* 평가 기준 안내 */}
                    <div className="rounded-lg border border-slate-700/40 bg-slate-900/50 px-4 py-3">
                      <p className="text-[11px] font-bold text-purple-300 mb-2">📋 평가 기준표 (PM 역량평가 100점 + 가점 10점)</p>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {(evalCriteriaSections.length > 0 ? evalCriteriaSections : [
                          { id: 'A', label: '커뮤니케이션(인터뷰) 역량', maxScore: 50, evalMethod: '인터뷰' },
                          { id: 'B', label: '결과보기 제안능력', maxScore: 40, evalMethod: 'PT' },
                          { id: 'C', label: '실행설계와 위험고지', maxScore: 10, evalMethod: 'PT' },
                        ]).map((sec) => (
                          <div key={sec.id || sec.displayCode} className="rounded-lg px-3 py-2 border border-slate-700/30 bg-slate-800/40">
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-black bg-purple-900/50 text-purple-300 border border-purple-700/40">
                                {sec.displayCode || sec.id}
                              </span>
                              <span className="text-[10px] font-bold text-slate-300">{sec.label}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-500">{sec.evalMethod}</span>
                              <span className="text-xs font-black text-purple-400">{sec.maxScore}점</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 피평가자 선택 탭 */}
                    <div className="flex gap-2">
                      {trackerSummary.map((cs) => {
                        // 평가시스템(store.js)에서 실시간 데이터 조회
                        const evalCandidate = evalCandidates.find(c => c.name === cs.name || c.id === cs.candidateId);
                        const candidateResult = evalCandidate ? getCandidateResult(evalCandidate.id) : null;
                        const stage6 = cs.record?.stage6 || {};
                        const isDone = stage6.status === 'completed';
                        const hasEvalData = candidateResult && candidateResult.evalCount > 0;

                        return (
                          <button
                            key={cs.candidateId}
                            onClick={() => {
                              setScoringCandidateId(cs.candidateId);
                              setScoringResult(null);
                              setShowScoringPanel(true);
                            }}
                            className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                              scoringCandidateId === cs.candidateId
                                ? 'border-purple-500 bg-purple-900/40 text-purple-200'
                                : isDone
                                ? 'border-emerald-700 bg-emerald-900/20 text-emerald-400'
                                : hasEvalData
                                ? 'border-blue-600 bg-blue-900/20 text-blue-300'
                                : 'border-slate-600 bg-slate-800 text-slate-400 hover:border-slate-500'
                            }`}
                          >
                            {isDone ? '✅ ' : hasEvalData ? '📊 ' : ''}{cs.name}
                            {isDone && stage6.finalAverage ? ` (${stage6.finalAverage}점)` : ''}
                            {!isDone && hasEvalData ? ` (${candidateResult.evalCount}명 평가)` : ''}
                          </button>
                        );
                      })}
                    </div>

                    {/* 선택된 피평가자 상세 평가 결과 */}
                    {scoringCandidateId && (() => {
                      const cs = trackerSummary.find(t => t.candidateId === scoringCandidateId);
                      const evalCandidate = evalCandidates.find(c => c.name === cs?.name || c.id === scoringCandidateId);
                      const candidateResult = evalCandidate ? getCandidateResult(evalCandidate.id) : null;
                      const stage6 = cs?.record?.stage6 || {};
                      const isDone = stage6.status === 'completed';

                      if (evalStoreLoading) {
                        return (
                          <div className="text-center py-6">
                            <div className="inline-block w-6 h-6 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mb-2" />
                            <p className="text-xs text-slate-500">평가 데이터 로딩중...</p>
                          </div>
                        );
                      }

                      if (!candidateResult || candidateResult.evalCount === 0) {
                        return (
                          <div className="rounded-xl border border-slate-700/40 bg-slate-900/50 p-5 text-center">
                            <p className="text-3xl mb-2">📝</p>
                            <p className="text-sm font-bold text-slate-300 mb-1">{cs?.name} - 평가 데이터 없음</p>
                            <p className="text-xs text-slate-500 mb-3">
                              아직 평가위원이 평가를 완료하지 않았습니다.<br/>
                              평가시스템에서 평가를 진행해 주세요.
                            </p>
                            <a
                              href="/"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-block text-[11px] px-4 py-2 rounded-lg font-bold border transition hover:opacity-80"
                              style={{ borderColor: '#7c3aed', color: '#c4b5fd', background: 'rgba(124,58,237,0.2)' }}
                            >
                              🔗 평가시스템에서 평가하기
                            </a>

                            {/* 수동 입력 폴백 (관리자용) */}
                            {adminMode && !isDone && (
                              <div className="mt-4 pt-4 border-t border-slate-700/40">
                                <p className="text-[10px] text-slate-600 mb-2">관리자 수동 입력 (Supabase 미연동 시)</p>
                                <div className="rounded-lg border border-slate-700/50 overflow-hidden">
                                  <div className="grid grid-cols-[1fr,80px,80px,60px] gap-0 text-[10px] font-bold text-slate-400 px-3 py-2 border-b border-slate-700/50 bg-slate-800/60">
                                    <span>평가위원</span>
                                    <span className="text-center">PM역량 (100)</span>
                                    <span className="text-center">가점 (10)</span>
                                    <span className="text-center">합계</span>
                                  </div>
                                  {EVALUATORS.map((name) => {
                                    const s = evaluatorScores[name] || { pmScore: '', bonusScore: '' };
                                    const pm = Number(s.pmScore) || 0;
                                    const bonus = Number(s.bonusScore) || 0;
                                    const total = pm + bonus;
                                    return (
                                      <div key={name} className="grid grid-cols-[1fr,80px,80px,60px] gap-0 items-center px-3 py-1.5 border-b border-slate-800/50 hover:bg-slate-800/30">
                                        <span className="text-xs text-slate-300 font-medium">{name}</span>
                                        <input type="number" min="0" max="100" value={s.pmScore}
                                          onChange={(e) => setEvaluatorScores(prev => ({ ...prev, [name]: { ...prev[name], pmScore: e.target.value } }))}
                                          className="w-16 mx-auto px-2 py-1 rounded text-xs text-center bg-slate-800 border border-slate-600 text-slate-200 focus:border-purple-500 outline-none" placeholder="0~100" />
                                        <input type="number" min="0" max="10" value={s.bonusScore}
                                          onChange={(e) => setEvaluatorScores(prev => ({ ...prev, [name]: { ...prev[name], bonusScore: e.target.value } }))}
                                          className="w-16 mx-auto px-2 py-1 rounded text-xs text-center bg-slate-800 border border-slate-600 text-slate-200 focus:border-purple-500 outline-none" placeholder="0~10" />
                                        <span className={`text-xs font-bold text-center ${total >= 70 ? 'text-emerald-400' : total > 0 ? 'text-amber-400' : 'text-slate-600'}`}>
                                          {s.pmScore !== '' ? total : '-'}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                                <button onClick={handleSubmitScores}
                                  className="w-full mt-2 py-2 rounded-lg text-[11px] font-bold text-white transition hover:opacity-90"
                                  style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}>
                                  수동 점수 제출
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      }

                      // ── 평가 데이터가 있는 경우: 상세 점수 표시 ──
                      const sections = evalCriteriaSections.length > 0 ? evalCriteriaSections : [
                        { id: 'A', displayCode: 'A', label: '커뮤니케이션(인터뷰) 역량', maxScore: 50 },
                        { id: 'B', displayCode: 'B', label: '결과보기 제안능력', maxScore: 40 },
                        { id: 'C', displayCode: 'C', label: '실행설계와 위험고지', maxScore: 10 },
                      ];
                      const passScore = evalPeriodInfo?.passScore ?? 70;

                      return (
                        <div className="space-y-3">
                          {/* 평가 결과 요약 카드 */}
                          <div className="rounded-xl border p-4"
                            style={{
                              borderColor: candidateResult.pass === true ? '#059669' : candidateResult.pass === false ? '#dc2626' : '#7c3aed40',
                              background: candidateResult.pass === true ? 'rgba(5,150,105,0.1)' : candidateResult.pass === false ? 'rgba(220,38,38,0.1)' : 'rgba(124,58,237,0.05)',
                            }}>
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <p className="text-sm font-bold text-slate-200">{cs?.name} 평가 결과</p>
                                <p className="text-[10px] text-slate-500">{candidateResult.evalCount}명 평가완료 / 가점: {candidateResult.bonus}점</p>
                              </div>
                              <div className="text-right">
                                <p className={`text-2xl font-black ${
                                  candidateResult.pass === true ? 'text-emerald-400' : candidateResult.pass === false ? 'text-red-400' : 'text-purple-300'
                                }`}>
                                  {candidateResult.finalAvg !== null ? candidateResult.finalAvg.toFixed(1) : '-'}점
                                </p>
                                <p className={`text-xs font-bold ${
                                  candidateResult.pass === true ? 'text-emerald-500' : candidateResult.pass === false ? 'text-red-500' : 'text-slate-500'
                                }`}>
                                  {candidateResult.pass === true ? '✅ 합격' : candidateResult.pass === false ? '❌ 불합격' : '평가 진행중'}
                                  <span className="text-[10px] text-slate-600 font-normal ml-1">(기준: {passScore}점)</span>
                                </p>
                              </div>
                            </div>

                            {/* 산식 표시 */}
                            <div className="rounded-lg px-3 py-2 bg-slate-800/60 border border-slate-700/30 text-[10px] text-slate-400">
                              평균 = (평가총점수 {candidateResult.totalSum}점 + 가점 {candidateResult.bonus}점) ÷ 평가위원수 {candidateResult.evalCount}명 = <strong className="text-white">{candidateResult.finalAvg !== null ? candidateResult.finalAvg.toFixed(2) : '-'}점</strong>
                            </div>
                          </div>

                          {/* 평가위원별 상세 점수 테이블 */}
                          <div className="rounded-lg border border-slate-700/50 overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="w-full text-[11px]">
                                <thead>
                                  <tr className="bg-slate-800/60 border-b border-slate-700/50">
                                    <th className="text-left px-3 py-2 text-slate-400 font-bold">평가위원</th>
                                    {sections.map((sec) => (
                                      <th key={sec.id} className="text-center px-2 py-2 text-slate-400 font-bold whitespace-nowrap">
                                        {sec.displayCode || sec.id} ({sec.maxScore})
                                      </th>
                                    ))}
                                    <th className="text-center px-2 py-2 text-purple-400 font-bold">합계 (100)</th>
                                    <th className="text-center px-2 py-2 text-slate-400 font-bold">상태</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {candidateResult.evaluatorDetails.map((detail) => {
                                    const isExcl = detail.isSameTeam;
                                    return (
                                      <tr key={detail.evaluator.id}
                                        className={`border-b border-slate-800/50 ${isExcl ? 'opacity-40' : 'hover:bg-slate-800/30'}`}>
                                        <td className="px-3 py-2 text-slate-300 font-medium whitespace-nowrap">
                                          {detail.evaluator.name}
                                          {isExcl && <span className="text-[9px] text-red-400 ml-1">(제외)</span>}
                                        </td>
                                        {sections.map((sec) => (
                                          <td key={sec.id} className="text-center px-2 py-2 text-slate-300 font-mono">
                                            {detail.isComplete ? (detail.sectionBreakdown[sec.id] || 0) : '-'}
                                          </td>
                                        ))}
                                        <td className={`text-center px-2 py-2 font-bold font-mono ${
                                          detail.isComplete
                                            ? detail.totalScore >= 70 ? 'text-emerald-400' : 'text-amber-400'
                                            : 'text-slate-600'
                                        }`}>
                                          {detail.isComplete ? detail.totalScore : '-'}
                                        </td>
                                        <td className="text-center px-2 py-2">
                                          {detail.isComplete ? (
                                            <span className="text-emerald-500 text-[10px]">✅</span>
                                          ) : isExcl ? (
                                            <span className="text-red-400 text-[10px]">제외</span>
                                          ) : (
                                            <span className="text-amber-500 text-[10px]">진행중</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                  {/* 가점 행 */}
                                  <tr className="bg-purple-900/20 border-t border-purple-700/30">
                                    <td className="px-3 py-2 text-purple-300 font-bold" colSpan={sections.length + 1}>
                                      가점 (코치 부여)
                                    </td>
                                    <td className="text-center px-2 py-2 text-purple-300 font-black font-mono">
                                      +{candidateResult.bonus}
                                    </td>
                                    <td className="text-center px-2 py-2 text-[10px] text-purple-400">
                                      /10점
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>

                          {/* 협의 메모 */}
                          <textarea
                            value={consensusNotes}
                            onChange={(e) => setConsensusNotes(e.target.value)}
                            placeholder="평가위원 협의 메모 (선택사항)"
                            className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-600 text-xs text-slate-200 placeholder-slate-600 focus:border-purple-500 outline-none resize-none"
                            rows={2}
                          />

                          {/* 결과 확정 버튼 (관리자용) */}
                          {adminMode && !isDone && candidateResult.evalCount > 0 && (
                            <button
                              onClick={() => {
                                try {
                                  // store.js 데이터를 기반으로 submitEvaluatorScores 호출
                                  const storeScores = candidateResult.evaluatorDetails
                                    .filter(d => !d.isSameTeam && d.isComplete)
                                    .map(d => ({
                                      evaluator: d.evaluator.name,
                                      pmScore: d.totalScore,
                                      bonusScore: candidateResult.bonus,
                                    }));
                                  const result = submitEvaluatorScores(scoringCandidateId, storeScores, consensusNotes);
                                  setScoringResult(result);
                                  setTrackerSummary(getCandidateTrackerSummary());
                                } catch (err) {
                                  alert('결과 확정 오류: ' + err.message);
                                }
                              }}
                              className="w-full py-3 rounded-xl text-sm font-bold text-white transition hover:opacity-90 active:scale-[0.98]"
                              style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%)' }}
                            >
                              🤝 평가 결과 확정 (평균 {candidateResult.finalAvg?.toFixed(1)}점 → {candidateResult.pass ? '합격' : '불합격'})
                            </button>
                          )}

                          {/* 이미 확정된 경우 */}
                          {isDone && (
                            <div className="rounded-xl border p-4 text-center"
                              style={{
                                borderColor: stage6.passStatus === 'passed' ? '#059669' : '#dc2626',
                                background: stage6.passStatus === 'passed' ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)',
                              }}>
                              <p className="text-sm font-bold text-slate-300">
                                ✅ 결과 확정됨 — {stage6.passStatus === 'passed' ? '합격' : '불합격'} ({stage6.finalAverage}점)
                              </p>
                              <p className="text-[10px] text-slate-500 mt-1">
                                확정일: {stage6.decidedAt ? new Date(stage6.decidedAt).toLocaleString('ko-KR') : '-'}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })()}

                    {/* 제출 완료 결과 팝업 */}
                    {scoringResult && (
                      <div className="rounded-xl border p-4 text-center"
                        style={{
                          borderColor: scoringResult.passStatus === 'passed' ? '#059669' : '#dc2626',
                          background: scoringResult.passStatus === 'passed' ? 'rgba(5,150,105,0.15)' : 'rgba(220,38,38,0.15)',
                        }}>
                        <p className="text-3xl mb-2">{scoringResult.passStatus === 'passed' ? '🎉' : '😞'}</p>
                        <p className={`text-xl font-black ${scoringResult.passStatus === 'passed' ? 'text-emerald-300' : 'text-red-400'}`}>
                          {scoringResult.passStatus === 'passed' ? '합격' : '불합격'}
                        </p>
                        <p className="text-2xl font-black text-white mt-1">{scoringResult.finalAverage.toFixed(1)}점</p>
                        <p className="text-xs text-slate-400 mt-1">
                          {scoringResult.scores.length}명 평가위원 평균 · 합격기준 70점
                        </p>
                        <div className="mt-3 flex flex-wrap justify-center gap-2">
                          {scoringResult.scores.map((s) => (
                            <span key={s.evaluator} className="text-[10px] px-2 py-0.5 rounded-full border border-slate-600 bg-slate-800/60 text-slate-300">
                              {s.evaluator}: {s.total}점
                            </span>
                          ))}
                        </div>
                        <button
                          onClick={() => { setScoringResult(null); setScoringCandidateId(null); }}
                          className="mt-3 text-xs text-purple-400 hover:text-purple-300 transition"
                        >
                          닫기
                        </button>
                      </div>
                    )}

                    {/* 피평가자 미선택 시 안내 */}
                    {!scoringCandidateId && (
                      <div className="text-center py-4 text-sm text-slate-500">
                        위에서 피평가자를 선택하여 평가 결과를 확인하세요
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── 7단계: 최종 결과 발표 ── */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#05966940', background: 'rgba(15,23,42,0.6)' }}>
                <div
                  className="px-5 py-3 flex items-center justify-between cursor-pointer"
                  style={{ background: 'rgba(16,185,129,0.12)' }}
                  onClick={() => setShowAnnouncementPanel(!showAnnouncementPanel)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📢</span>
                    <span className="text-sm font-bold text-emerald-300">7단계: 최종 결과 발표</span>
                    <span className="text-[10px] text-emerald-500">3월 31일(화)</span>
                  </div>
                  <span className="text-xs text-emerald-400">{showAnnouncementPanel ? '△' : '▽'}</span>
                </div>
                {showAnnouncementPanel && (
                  <div className="px-5 py-4 space-y-3">
                    <div className="text-[10px] text-slate-500 mb-2">
                      합격/불합격 여부만 공개 · 점수 비공개 · 개별 피드백 제공
                    </div>
                    {trackerSummary.map((cs) => {
                      const stage6 = cs.record?.stage6 || {};
                      const stage7 = cs.record?.stage7 || {};
                      const hasResult = stage6.passStatus;
                      const isAnnounced = stage7.status === 'completed';
                      return (
                        <div key={cs.candidateId} className="rounded-lg p-3 border border-slate-700/50 bg-slate-800/40">
                          <div className="flex items-center gap-3 mb-2">
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                              style={{ background: 'linear-gradient(135deg, #065f46, #059669)', color: '#fff' }}>
                              {cs.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                              <p className="text-sm font-bold text-slate-200">{cs.name}</p>
                            </div>
                            {hasResult && (
                              <span className={`text-sm font-black px-3 py-1 rounded-lg ${
                                stage6.passStatus === 'passed' ? 'bg-emerald-900/30 text-emerald-300 border border-emerald-700/50' :
                                'bg-red-900/30 text-red-400 border border-red-700/50'
                              }`}>
                                {stage6.passStatus === 'passed' ? '합격' : '불합격'}
                              </span>
                            )}
                            {!hasResult && (
                              <span className="text-xs text-slate-600">6단계 미완료</span>
                            )}
                          </div>
                          {hasResult && !isAnnounced && (
                            <div className="flex gap-2 items-end">
                              <input
                                type="text"
                                value={feedbackInputs[cs.candidateId] || ''}
                                onChange={(e) => setFeedbackInputs((prev) => ({ ...prev, [cs.candidateId]: e.target.value }))}
                                placeholder="개별 피드백 입력 (선택사항)"
                                className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-slate-800 border border-slate-600 text-slate-200 placeholder-slate-600 focus:border-emerald-500 outline-none"
                              />
                              <button
                                onClick={() => handleAnnounce(cs.candidateId)}
                                className="text-[11px] px-4 py-1.5 rounded-lg font-bold border transition hover:opacity-80 whitespace-nowrap"
                                style={{ borderColor: '#059669', color: '#6ee7b7', background: 'rgba(5,150,105,0.15)' }}
                              >
                                📢 발표
                              </button>
                            </div>
                          )}
                          {isAnnounced && (
                            <div className="text-[10px] text-emerald-500 mt-1">
                              ✅ 발표완료 ({new Date(stage7.announcedAt).toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })})
                              {stage7.feedback && <span className="text-slate-500 ml-2">피드백: {stage7.feedback}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── 8단계: 인증서 수여식 ── */}
              <div className="rounded-xl border overflow-hidden" style={{ borderColor: '#d9770640', background: 'rgba(15,23,42,0.6)' }}>
                <div
                  className="px-5 py-3 flex items-center justify-between cursor-pointer"
                  style={{ background: 'rgba(245,158,11,0.12)' }}
                  onClick={() => setShowCertPanel(!showCertPanel)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🏆</span>
                    <span className="text-sm font-bold text-amber-300">8단계: 인증서 수여식</span>
                    <span className="text-[10px] text-amber-500">4월 TAG일 · 전사 행사</span>
                  </div>
                  <span className="text-xs text-amber-400">{showCertPanel ? '△' : '▽'}</span>
                </div>
                {showCertPanel && (
                  <div className="px-5 py-4 space-y-3">
                    {trackerSummary.map((cs) => {
                      const stage6 = cs.record?.stage6 || {};
                      const stage7 = cs.record?.stage7 || {};
                      const stage8 = cs.record?.stage8 || {};
                      const isPassed = stage6.passStatus === 'passed';
                      const isAnnounced = stage7.status === 'completed';
                      const isCertIssued = stage8.status === 'completed';
                      return (
                        <div key={cs.candidateId} className="flex items-center gap-3 rounded-lg p-3 border border-slate-700/50 bg-slate-800/40">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black"
                            style={{ background: isPassed ? 'linear-gradient(135deg, #d97706, #f59e0b)' : '#374151', color: '#fff' }}>
                            {cs.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-slate-200">{cs.name}</p>
                            {isCertIssued ? (
                              <p className="text-[10px] text-amber-400 font-mono">
                                🏆 {stage8.certificateNumber} · 발급: {new Date(stage8.issuedAt).toLocaleDateString('ko-KR')}
                              </p>
                            ) : isPassed && isAnnounced ? (
                              <p className="text-[10px] text-slate-500">합격자 · 인증서 미발급</p>
                            ) : !isPassed && stage6.passStatus ? (
                              <p className="text-[10px] text-red-500">불합격 · 인증서 대상 아님</p>
                            ) : (
                              <p className="text-[10px] text-slate-600">이전 단계 미완료</p>
                            )}
                          </div>
                          {isPassed && isAnnounced && !isCertIssued && (
                            <button
                              onClick={() => handleIssueCert(cs.candidateId)}
                              className="text-[11px] px-4 py-1.5 rounded-lg font-bold border transition hover:opacity-80"
                              style={{ borderColor: '#d97706', color: '#fcd34d', background: 'rgba(217,119,6,0.15)' }}
                            >
                              🏆 인증서 발급
                            </button>
                          )}
                          {isCertIssued && (
                            <span className="text-[11px] font-bold text-amber-400">발급완료</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
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

      {/* ═══ 배정 초기화 확인 모달 ═══ */}
      {showClearAssignConfirm && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-center justify-center z-50 px-4 py-6 overflow-y-auto">
          <div className="bg-slate-900 rounded-2xl border border-red-800/70 shadow-2xl w-full max-w-md overflow-hidden my-auto">
            <div className="px-6 py-5 text-white" style={{ background: 'linear-gradient(135deg, #450a0a 0%, #7f1d1d 100%)' }}>
              <h3 className="text-lg font-bold flex items-center gap-2">⚠️ 배정 초기화 보안 확인</h3>
              <p className="text-red-200 text-xs mt-1">관리자 비밀번호 + &quot;배정초기화하라&quot; 직접 입력 필수</p>
            </div>
            <div className="px-6 py-5 space-y-5">
              <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3">
                <p className="text-red-300 text-xs font-bold mb-1.5">초기화 시</p>
                <ul className="text-xs text-red-400/90 space-y-0.5">
                  <li>• localStorage의 2차 출제 배정 데이터가 삭제됩니다</li>
                  <li>• 화면의 확정 배정 결과가 초기화됩니다</li>
                </ul>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-2">
                  <span className="w-5 h-5 rounded-full bg-red-900/60 border border-red-700 flex items-center justify-center text-xs text-red-300 font-black">1</span>
                  관리자 비밀번호 입력
                </label>
                <input
                  type="password"
                  value={clearAssignPassword}
                  onChange={(e) => setClearAssignPassword(e.target.value)}
                  placeholder="관리자 비밀번호"
                  className="w-full px-4 py-2.5 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm focus:border-red-500 outline-none transition"
                />
                {clearAssignPassword && (
                  <p className={`text-xs mt-1 ${ADMINS.some((a) => a.password === clearAssignPassword) ? 'text-emerald-400' : 'text-red-500'}`}>
                    {ADMINS.some((a) => a.password === clearAssignPassword) ? '✓ 비밀번호 확인됨' : '✗ 비밀번호 불일치'}
                  </p>
                )}
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-200 mb-2">
                  <span className="w-5 h-5 rounded-full bg-red-900/60 border border-red-700 flex items-center justify-center text-xs text-red-300 font-black">2</span>
                  <span>
                    아래 텍스트를 직접 입력하세요
                    <span className="ml-2 px-2 py-0.5 rounded bg-slate-700 text-amber-300 font-mono text-xs border border-slate-600">{ASSIGN_RESET_KEYWORD}</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={clearAssignText}
                  onChange={(e) => setClearAssignText(e.target.value)}
                  placeholder={`"${ASSIGN_RESET_KEYWORD}" 입력`}
                  className={`w-full px-4 py-2.5 rounded-lg bg-slate-800 border text-sm text-slate-100 placeholder-slate-600 outline-none transition ${
                    clearAssignText === '' ? 'border-slate-600 focus:border-red-500' :
                    clearAssignText === ASSIGN_RESET_KEYWORD ? 'border-emerald-600 bg-emerald-950/30' : 'border-red-700 bg-red-950/20'
                  }`}
                />
                {clearAssignText && (
                  <p className={`text-xs mt-1 ${clearAssignText === ASSIGN_RESET_KEYWORD ? 'text-emerald-400' : 'text-red-500'}`}>
                    {clearAssignText === ASSIGN_RESET_KEYWORD ? '✓ 확인됨' : '✗ 정확히 입력해 주세요'}
                  </p>
                )}
              </div>
              {clearAssignError && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-2.5 text-xs text-red-400">⚠️ {clearAssignError}</div>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleClearAssignmentConfirm}
                  disabled={!ADMINS.some((a) => a.password === clearAssignPassword) || clearAssignText !== ASSIGN_RESET_KEYWORD}
                  className="flex-1 text-white py-3 rounded-xl font-bold transition hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ background: 'linear-gradient(135deg, #dc2626 0%, #7f1d1d 100%)' }}
                >
                  배정 초기화 실행
                </button>
                <button
                  onClick={closeClearAssignModal}
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

      {/* 빌드 버전 (배포 검증용) */}
      <p className="text-[10px] text-slate-600 text-center py-4">빌드: 2026-03-17-v4-finalize</p>

      {/* ═══════════════════════════════════════════
          랜덤 배정 출제 확정 — 관리자 이중인증 모달
      ═══════════════════════════════════════════ */}
      {showAssignConfirmAuth && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-2xl border"
            style={{ borderColor: 'rgb(163,120,55)', background: 'linear-gradient(180deg, #1a1207 0%, #0f0a03 100%)' }}>

            {/* 헤더 */}
            <div className="px-6 py-5 text-center"
              style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}>
              <div className="text-3xl mb-1">📋</div>
              <h3 className="text-lg font-black text-stone-900">랜덤 배정 출제 확정</h3>
              <p className="text-xs text-stone-700 mt-1 font-medium">
                관리자 인증 후 확정 페이지로 이동합니다
              </p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* 1단계: 관리자 비밀번호 */}
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1.5">
                  1단계 — 관리자 비밀번호
                </label>
                <input
                  type="password"
                  value={assignConfirmPassword}
                  onChange={(e) => { setAssignConfirmPassword(e.target.value); setAssignConfirmError(''); }}
                  placeholder="비밀번호 입력"
                  autoFocus
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* 2단계: 확인 텍스트 입력 */}
              <div>
                <label className="block text-xs font-bold text-amber-400 mb-1.5">
                  2단계 — 확인 문구 입력 :{' '}
                  <span className="text-yellow-300 font-black">"배정확정"</span>
                </label>
                <input
                  type="text"
                  value={assignConfirmText}
                  onChange={(e) => { setAssignConfirmText(e.target.value); setAssignConfirmError(''); }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const VALID_PASSWORDS = ['ksa2026', 'lhk2026'];
                      if (!VALID_PASSWORDS.includes(assignConfirmPassword)) {
                        setAssignConfirmError('관리자 비밀번호가 올바르지 않습니다.');
                        return;
                      }
                      if (assignConfirmText !== '배정확정') {
                        setAssignConfirmError('"배정확정"을 정확히 입력해 주세요.');
                        return;
                      }
                      setShowAssignConfirmAuth(false);
                      navigate('/question-selection/assignment-confirm');
                    }
                  }}
                  placeholder="배정확정"
                  className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-slate-100 placeholder-slate-500 text-sm outline-none focus:border-amber-500 transition"
                />
              </div>

              {/* 에러 */}
              {assignConfirmError && (
                <div className="px-3 py-2.5 rounded-lg bg-red-900/30 border border-red-700/50 text-xs text-red-400 font-medium">
                  ⚠️ {assignConfirmError}
                </div>
              )}

              {/* 버튼 */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowAssignConfirmAuth(false)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-bold bg-slate-700 text-slate-300 hover:bg-slate-600 transition"
                >
                  취소
                </button>
                <button
                  onClick={() => {
                    const VALID_PASSWORDS = ['ksa2026', 'lhk2026'];
                    if (!VALID_PASSWORDS.includes(assignConfirmPassword)) {
                      setAssignConfirmError('관리자 비밀번호가 올바르지 않습니다.');
                      return;
                    }
                    if (assignConfirmText !== '배정확정') {
                      setAssignConfirmError('"배정확정"을 정확히 입력해 주세요.');
                      return;
                    }
                    setShowAssignConfirmAuth(false);
                    navigate('/question-selection/assignment-confirm');
                  }}
                  disabled={!assignConfirmPassword || !assignConfirmText}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-black text-stone-900 disabled:opacity-40 disabled:cursor-not-allowed transition hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
                >
                  🔐 확정 페이지 이동
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ═══════════════════════════════════════════════════════════════
// 피평가자 전용 뷰 — 본인 배정 출제문제 확인 + 다운로드
// ═══════════════════════════════════════════════════════════════
function CandidateAssignmentView({ candidate, onLogout }) {
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadAssignmentsHybrid().then((res) => {
      setLoading(false);
      if (res?.assignments?.length > 0) {
        const myAssignment = res.assignments.find((a) => a.candidateId === candidate.id);
        setAssignment(myAssignment || null);
      }
    }).catch((err) => {
      setLoading(false);
      setError(err?.message || '배정 데이터를 불러올 수 없습니다.');
    });
  }, [candidate.id]);

  const examUrl = assignment
    ? `${window.location.origin}/question-selection/exam/${encodeToken(assignment)}`
    : '';

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(examUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const CATEGORY_CONFIG = {
    stock_transfer:    { label: '주식이동',  icon: '📊', color: 'text-blue-400',    bg: 'bg-blue-900/20',    border: 'border-blue-700/50' },
    nominee_stock:     { label: '차명주식',  icon: '🔐', color: 'text-purple-400',  bg: 'bg-purple-900/20',  border: 'border-purple-700/50' },
    temporary_payment: { label: '가지급금',  icon: '💰', color: 'text-emerald-400', bg: 'bg-emerald-900/20', border: 'border-emerald-700/50' },
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* 헤더 */}
      <div
        className="rounded-2xl overflow-hidden mb-6 shadow-2xl border-2"
        style={{ borderColor: 'rgb(214,173,101)', background: 'linear-gradient(135deg, #1a1207 0%, #292010 100%)' }}
      >
        <div
          className="px-6 py-5 flex items-center justify-between"
          style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl font-black"
              style={{ background: 'rgba(30,20,5,0.4)', color: '#1a1207' }}>
              {candidate.name.charAt(0)}
            </div>
            <div>
              <h1 className="text-lg font-black text-stone-900">{candidate.name}</h1>
              <p className="text-xs text-stone-700 font-medium">{candidate.team}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="px-4 py-2 rounded-lg bg-stone-800/40 text-stone-800 text-xs font-bold hover:bg-stone-800/60 transition"
          >
            로그아웃
          </button>
        </div>

        <div className="px-6 py-4">
          <div className="text-xs font-bold mb-1" style={{ color: 'rgb(214,173,101)' }}>
            🎲 2차 출제 — 나의 배정 문제
          </div>
          <p className="text-[11px] text-stone-500">
            아래 3문제를 모두 준비하세요. 시험 당일 평가위원회에서 1문제를 최종 추첨합니다.
          </p>
        </div>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="text-center py-16">
          <div className="text-4xl mb-4">🎲</div>
          <p className="text-slate-400">배정 데이터를 불러오는 중...</p>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="rounded-xl border border-red-700/50 bg-red-900/20 p-6 text-center">
          <p className="text-red-400 text-sm mb-3">{error}</p>
          <button onClick={() => window.location.reload()}
            className="text-xs text-amber-400 hover:text-amber-300 underline">
            새로고침
          </button>
        </div>
      )}

      {/* 배정 없음 */}
      {!loading && !error && !assignment && (
        <div className="rounded-2xl border-2 border-dashed border-amber-700/50 p-10 text-center bg-amber-950/20">
          <div className="text-5xl mb-4">⏳</div>
          <h2 className="text-lg font-bold text-slate-200 mb-2">아직 배정이 완료되지 않았습니다</h2>
          <p className="text-slate-400 text-sm">
            관리자가 랜덤 배정을 실행한 후 다시 확인해 주세요.
          </p>
        </div>
      )}

      {/* 배정 결과 */}
      {!loading && !error && assignment && (
        <div className="space-y-4">
          {/* 3문제 카드 */}
          {['stock_transfer', 'nominee_stock', 'temporary_payment'].map((catKey) => {
            const cfg = CATEGORY_CONFIG[catKey];
            const qId = assignment[catKey];
            const q = QS_QUESTIONS[qId];
            return (
              <div key={catKey}
                className={`rounded-2xl border p-5 ${cfg.bg} ${cfg.border}`}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">{cfg.icon}</span>
                  <span className={`text-xs font-bold ${cfg.color}`}>{cfg.label}</span>
                  <span className={`text-xs font-black ${cfg.color} ml-auto`}>#{qId}</span>
                </div>
                <h3 className="text-base font-bold text-slate-100 mb-1">{q?.title || `문제 #${qId}`}</h3>
                {q?.description && (
                  <p className="text-xs text-slate-400 leading-relaxed">{q.description}</p>
                )}
              </div>
            );
          })}

          {/* 출제 확인 URL + 다운로드 */}
          <div className="rounded-2xl border border-amber-800/50 bg-amber-950/30 p-5">
            <p className="text-xs font-bold text-amber-400 mb-2">🔗 출제 확인 개인 URL</p>
            <div className="flex gap-2 items-center bg-slate-900/60 rounded-xl px-4 py-3 border border-slate-700/50 mb-3">
              <p className="text-xs text-slate-300 flex-1 break-all font-mono">{examUrl}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleCopyUrl}
                className="flex-1 py-3 rounded-xl text-sm font-bold border transition flex items-center justify-center gap-2"
                style={copied
                  ? { background: '#065f46', borderColor: '#065f46', color: '#6ee7b7' }
                  : { background: 'rgba(214,173,101,0.12)', borderColor: 'rgb(163,120,55)', color: 'rgb(214,173,101)' }}
              >
                {copied ? '✅ 복사 완료' : '📋 URL 복사'}
              </button>
              <a
                href={examUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-xl text-sm font-bold text-stone-900 transition hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
              >
                📄 문제 확인 →
              </a>
            </div>
          </div>

          {/* 안내 박스 */}
          <div className="rounded-xl border border-slate-700/40 bg-slate-800/40 p-4 text-xs text-slate-400 leading-relaxed space-y-1">
            <p className="font-bold text-slate-300 mb-1.5">📌 중요 안내</p>
            <p>• 위 3문제를 모두 충분히 준비해 주세요.</p>
            <p>• 시험 당일 아침 평가위원회에서 <span className="text-amber-400 font-bold">1문제를 최종 추첨</span>합니다.</p>
            <p>• 개인 URL을 통해 언제든지 배정 문제를 확인할 수 있습니다.</p>
            <p>• 문의사항은 담당 코치에게 연락해 주세요.</p>
          </div>
        </div>
      )}
    </div>
  );
}
