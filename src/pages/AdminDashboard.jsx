import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { PASS_SCORE, TOTAL_MAX_SCORE } from '@/lib/constants';
import {
  Card, Badge, Button, ScoreInput, ProgressRing,
  SectionHeader, StatBox, ConnectionStatus, Spinner,
} from '@/components/ui';
import ResetConfirmModal from '@/components/ResetConfirmModal';
import { generateEvaluationReport } from '@/lib/aiReport';
import { exportReportToDocx } from '@/lib/exportDocx';
import toast from 'react-hot-toast';

// ─── Tabs ───
const TABS = [
  { id: 'overview', label: '현황 요약', icon: '📊' },
  { id: 'periods', label: '기간 관리', icon: '📅' },
  { id: 'candidates', label: '응시자별 상세', icon: '👤' },
  { id: 'evaluators', label: '평가위원별 현황', icon: '🧑‍⚖️' },
  { id: 'reports', label: '평가보고서', icon: '📄' },
  { id: 'archives', label: '보관 데이터', icon: '📦' },
  { id: 'criteria', label: '평가표 관리', icon: '⚙️' },
  { id: 'audit', label: '데이터 추적', icon: '📋' },
];

export default function AdminDashboard() {
  const {
    periods, selectedPeriodId, periodInfo,
    evaluators, candidates, criteriaSections, criteriaItems,
    bonusScores, sessions, scores, logout, getCandidateResult,
    saveBonusScore, updateCandidateStatus, resetAllData,
    loadAuditLog, auditLog, loadArchives, getArchiveDetail, getArchiveCandidateResults,
    archives, archiveDetail, updateCriteriaItem, addCriteriaItem,
    setSelectedPeriod,     createPeriod, setPeriodStatus, addCandidate,
    addPeriodEvaluator, removePeriodEvaluator,
    allEvaluators,
  } = useStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [expandedEvaluator, setExpandedEvaluator] = useState(null);
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  // ─── 점수 산정 방식 토글 ───
  // 'default' = 전체 평균  |  'trimmed' = 최고·최저 제외 평균
  const [scoringMethod, setScoringMethod] = useState('default');

  useEffect(() => {
    if (activeTab === 'audit') loadAuditLog();
    if (activeTab === 'archives') loadArchives(selectedPeriodId);
  }, [activeTab, selectedPeriodId]);

  // Candidate results (sessions/scores 변경 시에도 재계산)
  const candidateResultsRaw = useMemo(() =>
    candidates.map(c => getCandidateResult(c.id)).filter(Boolean)
  , [candidates, getCandidateResult, bonusScores, sessions, scores]);

  // ─── 트림 평균 재계산 유틸 ───
  const applyTrimmed = (result) => {
    const passScore = periodInfo?.passScore ?? PASS_SCORE;
    // 유효 평가위원(소속제외 + 완료) — {id, score} 쌍으로 추출
    const validEntries = result.evaluatorDetails
      .filter(ed => !ed.isSameTeam && ed.isComplete)
      .map(ed => ({ id: ed.evaluator.id, score: ed.totalScore }));

    if (validEntries.length < 3) {
      // 3명 미만이면 트림 불가 → 기본 방식 유지 + trimUnavailable 플래그
      return { ...result, trimUnavailable: true };
    }

    const sorted = [...validEntries].sort((a, b) => a.score - b.score);
    const minEntry = sorted[0];                       // 최저점 평가위원
    const maxEntry = sorted[sorted.length - 1];       // 최고점 평가위원
    // 제외 대상 ID Set (중복 점수여도 정확히 1명씩만 제외)
    const excludedIds = new Set([minEntry.id, maxEntry.id]);

    const remaining = sorted.filter(e => !excludedIds.has(e.id));
    const trimCount = remaining.length;
    const trimSum = remaining.reduce((s, e) => s + e.score, 0);
    const bonus = result.bonus;
    const trimAvg = (trimSum + bonus) / trimCount;
    const trimPass = trimAvg >= passScore;

    return {
      ...result,
      finalAvg: trimAvg,
      pass: trimPass,
      evalCount: trimCount,
      totalSum: trimSum,
      trimInfo: {
        excludedMin: minEntry.score,
        excludedMax: maxEntry.score,
        excludedIds,   // ← ID 기반 제외 판별용
        originalAvg: result.finalAvg,
        originalPass: result.pass,
        originalEvalCount: result.evalCount,
      },
    };
  };

  // scoringMethod에 따라 결과 분기
  const candidateResults = useMemo(() => {
    if (scoringMethod === 'trimmed') {
      return candidateResultsRaw.map(r => applyTrimmed(r));
    }
    return candidateResultsRaw;
  }, [candidateResultsRaw, scoringMethod, periodInfo]);

  // Stats
  const stats = useMemo(() => {
    const total = candidateResults.length;
    const evaluated = candidateResults.filter(r => r.evalCount > 0).length;
    const passed = candidateResults.filter(r => r.pass === true).length;
    const failed = candidateResults.filter(r => r.pass === false).length;
    return { total, evaluated, passed, failed };
  }, [candidateResults]);

  const handleBonusChange = async (candId, value) => {
    try {
      await saveBonusScore(candId, value);
      toast.success('가점이 저장되었습니다.');
    } catch (err) {
      console.error('가점 저장 실패:', err);
      toast.error('가점 저장 실패: ' + (err?.message || '알 수 없는 오류'));
    }
  };

  const handleJudge = async (candId, pass) => {
    try {
      await updateCandidateStatus(candId, pass ? 'passed' : 'failed', scoringMethod);
      toast.success(`${candidates.find(c => c.id === candId)?.name} → ${pass ? '합격' : '불합격'} 처리`);
    } catch (err) {
      toast.error('상태 변경 실패');
    }
  };

  const handleResetClick = () => setResetModalOpen(true);

  const handleResetConfirm = async () => {
    setIsResetting(true);
    try {
      await resetAllData();
      setResetModalOpen(false);
      toast.success('데이터가 초기화되었습니다.');
    } catch (err) {
      toast.error('초기화 실패: ' + (err?.message || '알 수 없는 오류'));
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <>
    <div className="max-w-[1200px] mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-8 sm:pb-6">
      {/* Header + Period Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-1">
            <h1 className="text-xl sm:text-[22px] font-extrabold text-white tracking-tight">관리자 대시보드</h1>
            <Badge variant="gold">PM</Badge>
            <ConnectionStatus />
          </div>
          <p className="text-xs sm:text-sm text-slate-400">강선애 | 이후경 · 전체 평가 현황 관리</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap min-h-[44px]">
          {periods.length > 1 && (
            <select
              value={selectedPeriodId || ''}
              onChange={(e) => {
                const v = e.target.value;
                if (v) setSelectedPeriod(v);
              }}
              className="px-3 py-2.5 min-h-[44px] sm:min-h-0 rounded-lg bg-surface-200 border border-surface-500 text-white text-sm font-medium outline-none focus:border-brand-500"
            >
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.status === 'active' && '●'}
                </option>
              ))}
            </select>
          )}
          <Button variant="danger" size="sm" onClick={handleResetClick} className="min-h-[44px] sm:min-h-0">초기화</Button>
          <Button variant="secondary" size="sm" onClick={logout} className="min-h-[44px] sm:min-h-0">로그아웃</Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-surface-100 p-1 rounded-xl border border-surface-500/30 overflow-x-auto scrollbar-thin -mx-3 px-3 sm:mx-0 sm:px-0" style={{ scrollbarWidth: 'thin' }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-3 sm:py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all min-h-[44px] sm:min-h-0 flex-shrink-0
              ${activeTab === tab.id
                ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                : 'text-slate-400 hover:text-white hover:bg-surface-300/50'}`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: Overview ═══ */}
      {activeTab === 'overview' && (
        <div>
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <StatBox label="총 응시자" value={stats.total} unit="명" variant="brand" />
            <StatBox label="평가 진행" value={stats.evaluated} unit="명" variant="amber" />
            <StatBox label="합격" value={stats.passed} unit="명" variant="green" />
            <StatBox label="미달" value={stats.failed} unit="명" variant="red" />
          </div>

          {/* Candidate Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {candidateResults.map(r => (
              <Card key={r.candidate.id} className="text-center !p-5">
                <div className="text-base font-bold text-white mb-1">{r.candidate.name}</div>
                <div className="text-[11px] text-slate-500 mb-4">{r.candidate.team}</div>
                <div className="flex justify-center mb-3">
                  <ProgressRing
                    value={r.finalAvg != null ? Math.round(r.finalAvg) : (r.bonus || 0)}
                    max={110}
                    size={72}
                  />
                </div>
                {r.finalAvg != null ? (
                  <div className="space-y-1">
                    <Badge variant={r.pass ? 'green' : 'red'}>
                      {r.pass ? '합격' : '미달'} · {r.finalAvg.toFixed(1)}점
                    </Badge>
                    {r.trimInfo && !r.trimUnavailable && (
                      <div className="text-[10px] text-amber-400/70">
                        제외: ↓{r.trimInfo.excludedMin} ↑{r.trimInfo.excludedMax}
                        <span className="text-slate-600 ml-1">(기본: {r.trimInfo.originalAvg?.toFixed(1)})</span>
                      </div>
                    )}
                    {r.trimUnavailable && (
                      <div className="text-[10px] text-red-400/60">트림 불가 (3명 미만)</div>
                    )}
                  </div>
                ) : (
                  <Badge variant="muted">
                    평가 대기 ({r.evalCount}명 완료)
                    {r.bonus > 0 && ` · 가점 ${r.bonus}점`}
                  </Badge>
                )}
              </Card>
            ))}
          </div>

          {/* Bonus Scores */}
          <SectionHeader>치프 역량 강화 교육 이수 가점 (담당코치: 하상현 수석, 최대 10점)</SectionHeader>
          <Card className="mb-6 !p-4 sm:!p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {candidates.map(cand => (
                <div key={cand.id} className="p-4 rounded-xl bg-surface-100 border border-surface-500/30">
                  <div className="text-sm font-semibold text-white mb-2">{cand.name}</div>
                  <ScoreInput
                    value={bonusScores[cand.id] ?? null}
                    max={10}
                    onChange={(v) => handleBonusChange(cand.id, v)}
                  />
                </div>
              ))}
            </div>
          </Card>

          {/* ── 점수 산정 방식 선택 + 공식 ── */}
          <Card className="bg-surface-300/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div className="text-sm font-bold text-white">📐 점수 산정 방식</div>
              {/* Toggle Buttons */}
              <div className="flex rounded-lg overflow-hidden border border-surface-500/40">
                <button
                  onClick={() => setScoringMethod('default')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-all ${
                    scoringMethod === 'default'
                      ? 'bg-brand-500 text-white'
                      : 'bg-surface-200 text-slate-400 hover:text-white hover:bg-surface-300'
                  }`}
                >
                  기본 — 전체 평균
                </button>
                <button
                  onClick={() => setScoringMethod('trimmed')}
                  className={`px-3 py-1.5 text-xs font-semibold transition-all border-l border-surface-500/40 ${
                    scoringMethod === 'trimmed'
                      ? 'bg-amber-500 text-white'
                      : 'bg-surface-200 text-slate-400 hover:text-white hover:bg-surface-300'
                  }`}
                >
                  최고·최저 제외 평균
                </button>
              </div>
            </div>

            {scoringMethod === 'default' ? (
              <div className="text-xs text-slate-400 leading-relaxed space-y-1 pl-1 border-l-2 border-brand-500/40 ml-1">
                <div>평균 점수 = (Σ 평가위원 PM역량점수 + 가점) ÷ N  <span className="text-slate-500">(N = 유효 평가위원 수)</span></div>
                <div className="text-amber-400/80 font-semibold">※ 가점은 획득점수 / N (N = 평가위원의 수) 으로 적용</div>
                <div>※ 소속 평가위원 점수는 총점 및 평가인원(N)에서 제외</div>
                <div>※ 합격 기준: 평균 {periodInfo?.passScore ?? PASS_SCORE}점 이상 ({periodInfo?.totalMaxScore ?? TOTAL_MAX_SCORE}점 만점 기준)</div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 leading-relaxed space-y-1 pl-1 border-l-2 border-amber-500/40 ml-1">
                <div className="text-amber-300 font-semibold">평균 점수 = (Σ 평가위원 PM역량점수 <span className="text-red-400">− 최고점 − 최저점</span> + 가점) ÷ N'</div>
                <div><span className="text-slate-500">N' = 유효 평가위원 수 − 2</span>  (최고 1명 + 최저 1명 제외)</div>
                <div className="text-amber-400/80 font-semibold">※ 가점은 획득점수 / N' (N' = 트림 후 평가위원 수) 으로 적용</div>
                <div>※ 소속 평가위원 점수는 총점 및 평가인원에서 제외 (기본과 동일)</div>
                <div className="text-red-400/70">※ 유효 평가위원 3명 미만 시 트림 불가 → 기본 방식 자동 적용</div>
                <div>※ 합격 기준: 평균 {periodInfo?.passScore ?? PASS_SCORE}점 이상 ({periodInfo?.totalMaxScore ?? TOTAL_MAX_SCORE}점 만점 기준)</div>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* ═══ TAB: Period Management ═══ */}
      {activeTab === 'periods' && (
        <PeriodManagementTab
          periods={periods}
          selectedPeriodId={selectedPeriodId}
          periodInfo={periodInfo}
          evaluators={evaluators}
          allEvaluators={allEvaluators || []}
          onSelectPeriod={setSelectedPeriod}
          onCreatePeriod={createPeriod}
          onSetStatus={setPeriodStatus}
          onAddEvaluator={addPeriodEvaluator}
          onRemoveEvaluator={removePeriodEvaluator}
          onAddCandidate={addCandidate}
        />
      )}

      {/* ═══ TAB: Candidates Detail ═══ */}
      {activeTab === 'candidates' && (
        <div className="space-y-3">
          {/* 현재 산정 방식 표시 */}
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="text-[11px] text-slate-500">적용 중인 산정 방식:</span>
            {scoringMethod === 'trimmed' ? (
              <Badge variant="amber">최고·최저 제외 평균</Badge>
            ) : (
              <Badge variant="brand">전체 평균 (기본)</Badge>
            )}
          </div>
          {candidateResults.map(result => {
            const isExpanded = expandedCandidate === result.candidate.id;
            return (
              <Card key={result.candidate.id} className="!p-0 overflow-hidden">
                {/* Header Row */}
                <div
                  onClick={() => setExpandedCandidate(isExpanded ? null : result.candidate.id)}
                  className="flex flex-wrap sm:flex-nowrap items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 cursor-pointer hover:bg-surface-300/30 transition-colors min-h-[72px]"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0
                    ${result.pass === true ? 'bg-emerald-500/10 text-emerald-400'
                      : result.pass === false ? 'bg-red-500/10 text-red-400'
                      : 'bg-surface-300 text-slate-500'}`}>
                    {result.candidate.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-white">{result.candidate.name}</div>
                    <div className="text-xs text-slate-500">{result.candidate.team} · 평가완료 {result.evalCount}명</div>
                  </div>

                  {result.finalAvg != null && (
                    <div className="text-right mr-3">
                      <div className={`text-xl font-extrabold font-mono
                        ${result.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.finalAvg.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {scoringMethod === 'trimmed' && !result.trimUnavailable
                          ? '트림 평균 (최고·최저 제외)'
                          : '평균 (가점 포함)'}
                      </div>
                      {result.trimInfo && !result.trimUnavailable && (
                        <div className="text-[9px] text-amber-400/60 mt-0.5">
                          기본: {result.trimInfo.originalAvg?.toFixed(1)}점
                        </div>
                      )}
                    </div>
                  )}

                  {/* Pass/Fail Buttons */}
                  <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    <Button
                      variant={result.candidate.status === 'passed' ? 'success' : 'ghost'}
                      size="sm"
                      onClick={() => handleJudge(result.candidate.id, true)}
                      disabled={result.finalAvg == null}
                      className="min-h-[40px] sm:min-h-0"
                    >합격</Button>
                    <Button
                      variant={result.candidate.status === 'failed' ? 'danger' : 'ghost'}
                      size="sm"
                      onClick={() => handleJudge(result.candidate.id, false)}
                      disabled={result.finalAvg == null}
                      className="min-h-[40px] sm:min-h-0"
                    >불합격</Button>
                  </div>

                  <span className={`text-slate-500 text-sm transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-5 border-t border-surface-500/20">
                    {/* Score Table */}
                    <div className="overflow-x-auto -mx-2 px-2 sm:mx-0 sm:px-0 mt-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-surface-500/40">
                            <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-semibold">평가위원</th>
                            {criteriaSections.map(sec => (
                              <th key={sec.id} className="text-center py-2 px-2 text-[11px] text-slate-500 font-semibold">
                                {sec.id}영역 ({sec.maxScore})
                              </th>
                            ))}
                            <th className="text-center py-2 px-3 text-[11px] text-slate-500 font-semibold">합계</th>
                            <th className="text-center py-2 px-3 text-[11px] text-slate-500 font-semibold">상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.evaluatorDetails.map(ed => {
                            // 트림 모드에서 최고·최저 평가위원 식별 (ID 기반 — 중복 점수 오판 방지)
                            const isTrimExcluded = scoringMethod === 'trimmed' && result.trimInfo && !result.trimUnavailable
                              && result.trimInfo.excludedIds?.has(ed.evaluator.id);
                            return (
                            <tr key={ed.evaluator.id} className={`border-b border-surface-500/10
                              ${ed.isSameTeam ? 'opacity-30' : ''}
                              ${isTrimExcluded ? 'bg-amber-500/5' : ''}`}>
                              <td className="py-3 px-3 font-semibold text-white">
                                {ed.evaluator.name}
                                {ed.isSameTeam && <span className="text-[10px] text-slate-500 ml-1.5">(소속제외)</span>}
                                {isTrimExcluded && (
                                  <span className="text-[10px] text-amber-400 ml-1.5">
                                    ({ed.totalScore === result.trimInfo.excludedMax ? '↑최고' : '↓최저'} 제외)
                                  </span>
                                )}
                              </td>
                              {criteriaSections.map(sec => (
                                <td key={sec.id} className={`text-center py-3 px-2 font-mono font-semibold
                                  ${isTrimExcluded ? 'text-slate-500 line-through decoration-amber-500/40' : 'text-white'}`}>
                                  {ed.isSameTeam ? '—' : (ed.sectionBreakdown[sec.id] ?? '—')}
                                </td>
                              ))}
                              <td className={`text-center py-3 px-3 font-mono font-bold
                                ${ed.isSameTeam ? 'text-slate-600'
                                  : isTrimExcluded ? 'text-slate-500 line-through decoration-amber-500/40'
                                  : ed.isComplete ? 'text-brand-400' : 'text-slate-600'}`}>
                                {ed.isSameTeam ? '—' : ed.isComplete ? ed.totalScore : '—'}
                              </td>
                              <td className="text-center py-3 px-3">
                                {ed.isSameTeam ? <Badge variant="muted">소속제외</Badge>
                                  : isTrimExcluded ? <Badge variant="amber">트림제외</Badge>
                                  : ed.isComplete ? <Badge variant="green">완료</Badge>
                                  : <Badge variant="muted">미평가</Badge>}
                              </td>
                            </tr>
                            );
                          })}
                          {/* Bonus */}
                          <tr className="bg-yellow-500/5">
                            <td className="py-3 px-3 text-yellow-400 font-semibold text-xs">가점 (역량강화교육)</td>
                            <td colSpan={criteriaSections.length} />
                            <td className="text-center py-3 px-3 text-yellow-400 font-mono font-bold">
                              {result.bonus || '—'}
                            </td>
                            <td />
                          </tr>
                          {/* Final */}
                          {result.finalAvg != null && (
                            <tr className={result.pass ? 'bg-emerald-500/5' : 'bg-red-500/5'}>
                              <td className="py-3 px-3 font-bold text-white text-sm">
                                {scoringMethod === 'trimmed' && !result.trimUnavailable
                                  ? '트림 평균 (최고·최저 제외 + 가점)'
                                  : '최종 평균 (가점 포함)'}
                              </td>
                              <td colSpan={criteriaSections.length} />
                              <td className={`text-center py-3 px-3 text-lg font-extrabold font-mono
                                ${result.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                                {result.finalAvg.toFixed(1)}
                              </td>
                              <td className="text-center py-3 px-3">
                                <Badge variant={result.pass ? 'green' : 'red'}>
                                  {result.pass ? '합격' : '미달'}
                                </Badge>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Section Comments */}
                    {result.evaluatorDetails.some(ed => {
                      const cs = ed.commentsSection || {};
                      return (cs.A || cs.B || cs.C || ed.comments) && !ed.isSameTeam;
                    }) && (
                      <div className="mt-4">
                        <div className="text-[11px] font-semibold text-slate-500 mb-2">평가 코멘트 (A/B/C 섹션별)</div>
                        <div className="space-y-2">
                          {result.evaluatorDetails.filter(ed => !ed.isSameTeam).map(ed => {
                            const cs = ed.commentsSection || {};
                            const hasAny = cs.A || cs.B || cs.C || ed.comments;
                            if (!hasAny) return null;
                            return (
                              <div key={ed.evaluator.id} className="px-4 py-3 rounded-lg bg-surface-100 border border-surface-500/20 space-y-1">
                                <span className="text-[11px] font-semibold text-brand-400">{ed.evaluator.name}</span>
                                {ed.completedAt && (
                                  <span className="text-[10px] text-slate-600 ml-2">
                                    ({new Date(ed.completedAt).toLocaleDateString('ko-KR')})
                                  </span>
                                )}
                                <div className="text-xs text-slate-400 space-y-1 mt-1">
                                  {cs.A && <div><span className="text-slate-600">A.</span> {cs.A}</div>}
                                  {cs.B && <div><span className="text-slate-600">B.</span> {cs.B}</div>}
                                  {cs.C && <div><span className="text-slate-600">C.</span> {cs.C}</div>}
                                  {ed.comments && <div><span className="text-slate-600">종합</span> {ed.comments}</div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ TAB: Evaluators Progress ═══ */}
      {activeTab === 'evaluators' && (
        <div className="space-y-3">
          {evaluators.map(ev => {
            const isExpanded = expandedEvaluator === ev.id;
            const eligibleCandidates = candidates.filter(c => {
              const excluded = ev.team === c.team && ev.team !== '대표';
              return !excluded;
            });
            const completedCount = eligibleCandidates.filter(c => {
              const result = getCandidateResult(c.id);
              const detail = result?.evaluatorDetails.find(d => d.evaluator.id === ev.id);
              return detail?.isComplete;
            }).length;

            return (
              <Card key={ev.id} className="!p-0 overflow-hidden">
                <div
                  onClick={() => setExpandedEvaluator(isExpanded ? null : ev.id)}
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-surface-300/30 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 text-base font-bold">
                    {ev.name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="text-[15px] font-bold text-white">{ev.name}</div>
                    <div className="text-xs text-slate-500">{ev.role} · {ev.team}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant={completedCount === eligibleCandidates.length ? 'green' : 'amber'}>
                      {completedCount}/{eligibleCandidates.length} 완료
                    </Badge>
                    <div className="w-20 h-1.5 bg-surface-500/40 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-500 rounded-full transition-all"
                        style={{ width: `${eligibleCandidates.length > 0 ? (completedCount / eligibleCandidates.length) * 100 : 0}%` }} />
                    </div>
                  </div>
                  <span className={`text-slate-500 text-sm transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                </div>

                {isExpanded && (
                  <div className="px-6 pb-5 border-t border-surface-500/20 space-y-2 mt-3">
                    {candidates.map(cand => {
                      const excluded = ev.team === cand.team && ev.team !== '대표';
                      const result = getCandidateResult(cand.id);
                      const detail = result?.evaluatorDetails.find(d => d.evaluator.id === ev.id);

                      return (
                        <div key={cand.id} className={`flex items-center gap-4 p-3 rounded-lg bg-surface-100 border border-surface-500/20 ${excluded ? 'opacity-30' : ''}`}>
                          <div className="flex-1">
                            <span className="text-sm font-semibold text-white">{cand.name}</span>
                            <span className="text-xs text-slate-500 ml-2">{cand.team}</span>
                          </div>
                          {excluded ? (
                            <Badge variant="muted">동일팀 제외</Badge>
                          ) : detail?.isComplete ? (
                            <>
                              <div className="flex gap-2">
                                {Object.entries(detail.sectionBreakdown).map(([key, val]) => (
                                  <span key={key} className="text-xs text-slate-400 font-mono">{key}:{val}</span>
                                ))}
                              </div>
                              <span className="text-sm font-bold text-brand-400 font-mono">{detail.totalScore}점</span>
                              <Badge variant="green">완료</Badge>
                            </>
                          ) : (
                            <Badge variant="muted">미평가</Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* ═══ TAB: Evaluation Reports ═══ */}
      {activeTab === 'reports' && (
        <ReportTab
          candidateResults={candidateResults}
          criteriaSections={criteriaSections}
        />
      )}

      {/* ═══ TAB: Archives (보관 데이터) ═══ */}
      {activeTab === 'archives' && (
        <ArchiveTab
          archives={archives}
          archiveDetail={archiveDetail}
          criteriaSections={criteriaSections}
          onSelectArchive={getArchiveDetail}
          getArchiveCandidateResults={getArchiveCandidateResults}
        />
      )}

      {/* ═══ TAB: Criteria Management ═══ */}
      {activeTab === 'criteria' && (
        <CriteriaManagement
          sections={criteriaSections}
          items={criteriaItems}
          onUpdateItem={updateCriteriaItem}
          onAddItem={addCriteriaItem}
        />
      )}

      {/* ═══ TAB: Audit Log ═══ */}
      {activeTab === 'audit' && (
        <div>
          <Card className="mb-4 !p-4 bg-surface-300/50">
            <div className="text-sm text-slate-400">
              모든 점수 변경 이력이 Supabase chief_audit_log 테이블에 자동 기록됩니다.
            </div>
          </Card>

          {auditLog.length > 0 ? (
            <div className="space-y-2">
              {auditLog.map((log, i) => (
                <Card key={log.id || i} className="!p-4">
                  <div className="flex items-center gap-3 mb-2">
                    <Badge variant={log.action === 'INSERT' ? 'green' : log.action === 'UPDATE' ? 'amber' : 'red'}>
                      {log.action}
                    </Badge>
                    <span className="text-xs text-slate-500">{log.table_name}</span>
                    <span className="text-[10px] text-slate-600 ml-auto">
                      {new Date(log.performed_at).toLocaleString('ko-KR')}
                    </span>
                  </div>
                  {log.action === 'UPDATE' && log.old_data && log.new_data && (
                    <div className="text-xs text-slate-400 font-mono bg-surface-100 rounded-lg p-3 mt-2 overflow-x-auto">
                      {log.table_name === 'chief_evaluation_scores' ? (
                        <>
                          <div className="text-red-400/70">- score: {log.old_data.score}</div>
                          <div className="text-emerald-400/70">+ score: {log.new_data.score}</div>
                          <div className="text-slate-500 mt-1">item: {log.new_data.criteria_item_id}</div>
                        </>
                      ) : log.table_name === 'chief_evaluation_sessions' ? (
                        <>
                          <div className="text-red-400/70">- total_score: {log.old_data.total_score ?? '—'}</div>
                          <div className="text-emerald-400/70">+ total_score: {log.new_data.total_score ?? '—'}</div>
                          {log.new_data.status && <div className="text-slate-500 mt-1">status: {log.new_data.status}</div>}
                        </>
                      ) : (
                        <pre>{JSON.stringify({ old: log.old_data, new: log.new_data }, null, 2)}</pre>
                      )}
                    </div>
                  )}
                  {log.action === 'INSERT' && log.new_data && (
                    <div className="text-xs text-slate-400 font-mono bg-surface-100 rounded-lg p-3 mt-2 overflow-x-auto">
                      {log.table_name === 'chief_evaluation_scores' ? (
                        <div className="text-emerald-400/70">+ score: {log.new_data.score}, item: {log.new_data.criteria_item_id}</div>
                      ) : log.table_name === 'chief_evaluation_sessions' ? (
                        <div className="text-emerald-400/70">+ total_score: {log.new_data.total_score ?? '—'}, status: {log.new_data.status}</div>
                      ) : (
                        <pre>{JSON.stringify(log.new_data, null, 2)}</pre>
                      )}
                    </div>
                  )}
                </Card>
              ))}
            </div>
          ) : (
            <Card className="text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <div className="text-lg font-bold text-white mb-1">변경 이력 없음</div>
              <div className="text-sm text-slate-400">평가 점수가 입력되면 여기에 변경 이력이 표시됩니다.</div>
            </Card>
          )}
        </div>
      )}
    </div>

    <ResetConfirmModal
      open={resetModalOpen}
      onClose={() => setResetModalOpen(false)}
      onConfirm={handleResetConfirm}
      isResetting={isResetting}
    />
  </>
  );
}


// ─── Period Management Tab: 기간(프로젝트) 관리 ───
function PeriodManagementTab({ periods, selectedPeriodId, periodInfo, evaluators, allEvaluators, onSelectPeriod, onCreatePeriod, onSetStatus, onAddEvaluator, onRemoveEvaluator, onAddCandidate }) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear(), term: 1, passScore: 70, totalMaxScore: 110 });

  const handleCreate = async () => {
    if (!form.name || !form.year || !form.term) {
      toast.error('이름, 연도, 기수를 입력해 주세요.');
      return;
    }
    setCreating(true);
    try {
      await onCreatePeriod({
        name: form.name,
        year: Number(form.year),
        term: Number(form.term),
        passScore: Number(form.passScore) || 70,
        totalMaxScore: Number(form.totalMaxScore) || 110,
      });
      toast.success(`"${form.name}" 기간이 생성되었습니다.`);
      setShowCreate(false);
      setForm({ name: '', year: new Date().getFullYear(), term: 1, passScore: 70, totalMaxScore: 110 });
    } catch (err) {
      toast.error('기간 생성 실패: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleSetActive = async (periodId) => {
    try {
      await onSetStatus(periodId, 'active');
      toast.success('활성 기간으로 설정되었습니다.');
    } catch (err) {
      toast.error('설정 실패: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="!p-4 bg-surface-300/50">
        <div className="text-sm text-slate-400">
          <strong className="text-white">기간(프로젝트) 관리:</strong> 2026년 2기, 2027년 3기, 2028년 4기 등
          여러 기수의 치프인증 평가를 관리할 수 있습니다. 새 기간을 생성하면 기본 평가 기준이 자동 복사됩니다.
        </div>
      </Card>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">평가 기간 목록</h3>
        <Button size="sm" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? '취소' : '+ 새 기간 추가'}
        </Button>
      </div>

      {showCreate && (
        <Card className="!p-5">
          <div className="text-sm font-semibold text-white mb-4">새 평가 기간 생성</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-4">
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">이름</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="예: 2027년 3기"
                className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-surface-500 text-white text-sm outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">연도</label>
              <input type="number" value={form.year} onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-surface-500 text-white text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">기수</label>
              <input type="number" value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}
                placeholder="1, 2, 3..."
                className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-surface-500 text-white text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">합격 기준 (점)</label>
              <input type="number" value={form.passScore} onChange={e => setForm(f => ({ ...f, passScore: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-surface-500 text-white text-sm outline-none focus:border-brand-500" />
            </div>
            <div>
              <label className="block text-[11px] text-slate-500 mb-1">총 만점</label>
              <input type="number" value={form.totalMaxScore} onChange={e => setForm(f => ({ ...f, totalMaxScore: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-surface-100 border border-surface-500 text-white text-sm outline-none focus:border-brand-500" />
            </div>
          </div>
          <Button size="sm" onClick={handleCreate} disabled={creating}>
            {creating ? '생성 중...' : '기간 생성'}
          </Button>
        </Card>
      )}

      <div className="space-y-2">
        {periods.map(p => (
          <Card key={p.id} className={`!p-4 flex items-center justify-between ${selectedPeriodId === p.id ? 'ring-2 ring-brand-500/50' : ''}`}>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-white">{p.name}</span>
              <Badge variant={p.status === 'active' ? 'green' : 'muted'}>{p.status === 'active' ? '활성' : p.status}</Badge>
              <span className="text-xs text-slate-500">{p.year}년 {p.term}기 · 합격 {p.passScore}점</span>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={() => onSelectPeriod(p.id)}>
                선택
              </Button>
              {p.status !== 'active' && (
                <Button variant="secondary" size="sm" onClick={() => handleSetActive(p.id)}>
                  활성으로 설정
                </Button>
              )}
            </div>
          </Card>
        ))}
        {periods.length === 0 && (
          <Card className="text-center py-12">
            <div className="text-4xl mb-3">📅</div>
            <div className="text-lg font-bold text-white mb-1">등록된 기간 없음</div>
            <div className="text-sm text-slate-400">새 기간을 추가하여 시작하세요.</div>
          </Card>
        )}
      </div>

      {periodInfo && (
        <Card className="!p-4 bg-surface-300/30">
          <div className="text-xs text-slate-500">현재 선택: <span className="text-white font-semibold">{periodInfo.name}</span></div>
        </Card>
      )}

      {/* 기간별 평가위원 관리 */}
      {selectedPeriodId && (
        <EvaluatorManagementCard
          periodId={selectedPeriodId}
          evaluators={evaluators || []}
          allEvaluators={allEvaluators || []}
          onAdd={onAddEvaluator}
          onRemove={onRemoveEvaluator}
        />
      )}

      <AddCandidateForm periodId={selectedPeriodId} onAddCandidate={onAddCandidate} />
    </div>
  );
}

function EvaluatorManagementCard({ periodId, evaluators, allEvaluators, onAdd, onRemove }) {
  const [adding, setAdding] = useState(false);
  const notInPeriod = allEvaluators.filter(e => !evaluators.some(ev => ev.id === e.id));

  const handleAdd = async (evaluatorId) => {
    setAdding(true);
    try {
      await onAdd(periodId, evaluatorId);
      toast.success('평가위원이 추가되었습니다.');
    } catch (err) {
      toast.error('추가 실패: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (evaluatorId) => {
    if (!confirm('이 평가위원을 이 기간에서 제거하시겠습니까?\n관련 평가 세션도 삭제됩니다.')) return;
    try {
      await onRemove(periodId, evaluatorId);
      toast.success('평가위원이 제거되었습니다.');
    } catch (err) {
      toast.error('제거 실패: ' + err.message);
    }
  };

  return (
    <Card className="!p-5 mt-4">
      <div className="text-sm font-semibold text-white mb-3">기간별 평가위원 ({evaluators.length}명)</div>
      <div className="text-[11px] text-slate-500 mb-4">
        해당 기간에 평가할 수 있는 평가위원을 관리합니다. 비어 있으면 전체 평가위원이 사용됩니다.
      </div>
      <div className="flex flex-wrap gap-2 mb-3">
        {evaluators.map(ev => (
          <div key={ev.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-100 border border-surface-500/30">
            <span className="text-sm font-medium text-white">{ev.name}</span>
            <span className="text-[10px] text-slate-500">({ev.team})</span>
            <button
              type="button"
              onClick={() => handleRemove(ev.id)}
              className="text-red-400 hover:text-red-300 text-xs ml-1"
              title="제거"
            >×</button>
          </div>
        ))}
      </div>
      {notInPeriod.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-slate-500">추가:</span>
          {notInPeriod.map(ev => (
            <Button
              key={ev.id}
              variant="secondary"
              size="sm"
              onClick={() => handleAdd(ev.id)}
              disabled={adding}
            >
              + {ev.name}
            </Button>
          ))}
        </div>
      )}
    </Card>
  );
}

function AddCandidateForm({ periodId, onAddCandidate }) {
  const [show, setShow] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', team: '미정', phone: '', email: '' });

  if (!periodId) return null;

  const handleAdd = async () => {
    if (!form.name?.trim()) {
      toast.error('이름을 입력해 주세요.');
      return;
    }
    setAdding(true);
    try {
      await onAddCandidate(periodId, form);
      toast.success(`"${form.name}" 응시자가 추가되었습니다.`);
      setShow(false);
      setForm({ name: '', team: '미정', phone: '', email: '' });
    } catch (err) {
      toast.error('추가 실패: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="mt-4">
      <Button variant="secondary" size="sm" onClick={() => setShow(!show)}>
        {show ? '취소' : '+ 응시자 추가'}
      </Button>
      {show && (
        <Card className="!p-5 mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="이름" className="px-3 py-2 rounded-lg bg-surface-100 border border-surface-500 text-white text-sm" />
            <input value={form.team} onChange={e => setForm(f => ({ ...f, team: e.target.value }))}
              placeholder="팀" className="px-3 py-2 rounded-lg bg-surface-100 border border-surface-500 text-white text-sm" />
            <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              placeholder="연락처" className="px-3 py-2 rounded-lg bg-surface-100 border border-surface-500 text-white text-sm" />
            <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="이메일" className="px-3 py-2 rounded-lg bg-surface-100 border border-surface-500 text-white text-sm" />
          </div>
          <Button size="sm" onClick={handleAdd} disabled={adding}>{adding ? '추가 중...' : '추가'}</Button>
        </Card>
      )}
    </div>
  );
}

// ─── Archive Tab: 초기화 전 보관 데이터 조회 ───
function ArchiveTab({ archives, archiveDetail, criteriaSections, onSelectArchive, getArchiveCandidateResults }) {
  const [selectedArchiveId, setSelectedArchiveId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSelect = async (archiveId) => {
    setSelectedArchiveId(archiveId);
    setExpandedId(null);
    setLoading(true);
    try {
      await onSelectArchive(archiveId);
    } catch (err) {
      toast.error('아카이브 로드 실패: ' + err?.message);
    } finally {
      setLoading(false);
    }
  };

  const candidateResults = archiveDetail && selectedArchiveId
    ? getArchiveCandidateResults(archiveDetail)
    : [];

  return (
    <div className="space-y-4">
      <Card className="!p-4 bg-surface-300/50">
        <div className="text-sm text-slate-400">
          <strong className="text-white">보관 데이터:</strong> 초기화 시 해당 기간 데이터가 자동으로 아카이브에 보관됩니다.
          아래 목록에서 보관 시점을 선택해 과거 평가 데이터를 조회할 수 있습니다.
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {archives.map((a) => (
          <Card
            key={a.id}
            onClick={() => handleSelect(a.id)}
            className={`cursor-pointer transition-all !p-4
              ${selectedArchiveId === a.id ? 'ring-2 ring-brand-500 bg-surface-300/50' : 'hover:bg-surface-300/30'}`}
          >
            <div className="font-semibold text-white">
              {new Date(a.archived_at).toLocaleString('ko-KR')}
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate">
              {a.note || '초기화 전 보관'}
            </div>
          </Card>
        ))}
      </div>

      {archives.length === 0 && (
        <Card className="text-center py-12">
          <div className="text-4xl mb-3">📦</div>
          <div className="text-lg font-bold text-white mb-1">보관된 데이터 없음</div>
          <div className="text-sm text-slate-400">초기화를 실행하면 해당 시점 데이터가 여기에 보관됩니다.</div>
        </Card>
      )}

      {loading && (
        <div className="flex justify-center py-8">
          <Spinner size="md" />
        </div>
      )}

      {!loading && selectedArchiveId && candidateResults.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-surface-500/30">
          <SectionHeader>보관 당시 응시자별 결과</SectionHeader>
          {candidateResults.map((result) => {
            const isExpanded = expandedId === result.candidate.id;
            return (
              <Card key={result.candidate.id} className="!p-0 overflow-hidden">
                <div
                  onClick={() => setExpandedId(isExpanded ? null : result.candidate.id)}
                  className="flex items-center gap-4 px-4 sm:px-6 py-4 cursor-pointer hover:bg-surface-300/30 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base font-bold shrink-0
                    ${result.pass === true ? 'bg-emerald-500/10 text-emerald-400'
                      : result.pass === false ? 'bg-red-500/10 text-red-400'
                      : 'bg-surface-300 text-slate-500'}`}>
                    {result.candidate.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-bold text-white">{result.candidate.name}</div>
                    <div className="text-xs text-slate-500">{result.candidate.team} · 평가완료 {result.evalCount}명</div>
                  </div>
                  {result.finalAvg != null && (
                    <div className="text-right">
                      <div className={`text-xl font-extrabold font-mono
                        ${result.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                        {result.finalAvg.toFixed(1)}
                      </div>
                      <div className="text-[10px] text-slate-500">평균</div>
                    </div>
                  )}
                  <span className={`text-slate-500 text-sm transition-transform ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                </div>

                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-5 border-t border-surface-500/20">
                    <div className="overflow-x-auto mt-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-surface-500/40">
                            <th className="text-left py-2 px-3 text-[11px] text-slate-500 font-semibold">평가위원</th>
                            {criteriaSections.map(sec => (
                              <th key={sec.id} className="text-center py-2 px-2 text-[11px] text-slate-500 font-semibold">
                                {sec.id}영역 ({sec.maxScore})
                              </th>
                            ))}
                            <th className="text-center py-2 px-3 text-[11px] text-slate-500 font-semibold">합계</th>
                            <th className="text-center py-2 px-3 text-[11px] text-slate-500 font-semibold">상태</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.evaluatorDetails.map(ed => (
                            <tr key={ed.evaluator.id} className={`border-b border-surface-500/10 ${ed.isSameTeam ? 'opacity-30' : ''}`}>
                              <td className="py-3 px-3 font-semibold text-white">
                                {ed.evaluator.name}
                                {ed.isSameTeam && <span className="text-[10px] text-slate-500 ml-1.5">(제외)</span>}
                              </td>
                              {criteriaSections.map(sec => (
                                <td key={sec.id} className="text-center py-3 px-2 font-mono font-semibold text-white">
                                  {ed.isSameTeam ? '—' : (ed.sectionBreakdown[sec.id] ?? '—')}
                                </td>
                              ))}
                              <td className="text-center py-3 px-3 font-mono font-bold text-brand-400">
                                {ed.isSameTeam ? '—' : ed.totalScore}
                              </td>
                              <td className="text-center py-3 px-3">
                                {ed.isSameTeam ? <Badge variant="muted">제외</Badge>
                                  : ed.isComplete ? <Badge variant="green">완료</Badge>
                                  : <Badge variant="muted">미평가</Badge>}
                              </td>
                            </tr>
                          ))}
                          <tr className="bg-yellow-500/5">
                            <td className="py-3 px-3 text-yellow-400 font-semibold text-xs">가점</td>
                            <td colSpan={criteriaSections.length} />
                            <td className="text-center py-3 px-3 text-yellow-400 font-mono font-bold">{result.bonus || '—'}</td>
                            <td />
                          </tr>
                          {result.finalAvg != null && (
                            <tr className={result.pass ? 'bg-emerald-500/5' : 'bg-red-500/5'}>
                              <td className="py-3 px-3 font-bold text-white text-sm">최종 평균</td>
                              <td colSpan={criteriaSections.length} />
                              <td className={`text-center py-3 px-3 text-lg font-extrabold font-mono
                                ${result.pass ? 'text-emerald-400' : 'text-red-400'}`}>
                                {result.finalAvg.toFixed(1)}
                              </td>
                              <td>
                                <Badge variant={result.pass ? 'green' : 'red'}>
                                  {result.pass ? '합격' : '미달'}
                                </Badge>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {result.evaluatorDetails.some(ed => {
                      const cs = ed.commentsSection || {};
                      const hasAny = criteriaSections.some(sec => (cs[sec.id] || '').trim()) || (ed.comments || '').trim();
                      return hasAny && !ed.isSameTeam;
                    }) && (
                      <div className="mt-4">
                        <div className="text-[11px] font-semibold text-slate-500 mb-2">평가 코멘트</div>
                        <div className="space-y-2">
                          {result.evaluatorDetails.filter(ed => !ed.isSameTeam).map(ed => {
                            const cs = ed.commentsSection || {};
                            const hasAny = criteriaSections.some(sec => (cs[sec.id] || '').trim()) || (ed.comments || '').trim();
                            if (!hasAny) return null;
                            return (
                              <div key={ed.evaluator.id} className="px-4 py-3 rounded-lg bg-surface-100 border border-surface-500/20 text-xs text-slate-400">
                                <span className="font-semibold text-brand-400">{ed.evaluator.name}</span>
                                {criteriaSections.map(sec => {
                                  const comment = (cs[sec.id] || '').trim();
                                  return comment ? <div key={sec.id} className="mt-1"><span className="text-slate-600">{sec.id}.</span> {comment}</div> : null;
                                })}
                                {ed.comments && <div className="mt-1 font-medium text-slate-300">종합: {ed.comments}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Report Tab: AI 평가보고서 생성 (Gemini + GPT 병렬) ───
function ReportTab({ candidateResults, criteriaSections }) {
  const [generating, setGenerating] = useState(null);
  const [reportContent, setReportContent] = useState({});
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const handleGenerate = async (result) => {
    setGenerating(result.candidate.id);
    try {
      const { content, coverImageBase64 } = await generateEvaluationReport({
        ...result,
        criteriaSections,
      });
      setReportContent(prev => ({ ...prev, [result.candidate.id]: { content, coverImageBase64 } }));
      setSelectedCandidate(result.candidate.id);
      toast.success(`${result.candidate.name} 평가보고서가 생성되었습니다. (표지 이미지 포함)`);
    } catch (err) {
      toast.error('보고서 생성 실패: ' + err.message);
    } finally {
      setGenerating(null);
    }
  };

  const handleDownload = (candId, name) => {
    const data = reportContent[candId];
    if (!data?.content) return;
    exportReportToDocx(data.content, name, data.coverImageBase64 || null);
    toast.success('Word 문서로 다운로드되었습니다.');
  };

  return (
    <div className="space-y-4">
      <Card className="!p-4 bg-surface-300/50">
        <div className="text-sm text-slate-400">
          <strong className="text-white">AI 평가보고서:</strong> 응시자별로 평가위원들의 점수와 섹션별 코멘트를 반영하여
          AI(Gemini + GPT 병렬 호출, 최적 답변 선택)로 평가보고서를 자동 생성합니다.
          표지에 치프인증자 이름과 AI 생성 이미지가 포함되며, Word(.docx)로 다운로드됩니다.
          <br />
          <span className="text-xs text-slate-500 mt-1 block">
            환경변수: VITE_GEMINI_API_KEY, VITE_OPENAI_API_KEY, VITE_GEMINI_IMAGE_MODEL (.env.local)
          </span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {candidateResults.map(result => (
          <Card key={result.candidate.id} className="!p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <div className="font-bold text-white">{result.candidate.name}</div>
                <div className="text-xs text-slate-500">
                  {result.candidate.team} · {result.evalCount}명 평가완료
                  {result.finalAvg != null && ` · ${result.finalAvg.toFixed(1)}점`}
                </div>
              </div>
              <Button
                size="sm"
                onClick={() => handleGenerate(result)}
                disabled={generating != null || !result.evaluatorDetails?.some(ed => ed.isComplete)}
              >
                {generating === result.candidate.id ? '생성 중...' : '보고서 생성'}
              </Button>
            </div>
            {reportContent[result.candidate.id]?.content && (
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedCandidate(selectedCandidate === result.candidate.id ? null : result.candidate.id)}
                >
                  미리보기
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDownload(result.candidate.id, result.candidate.name)}
                >
                  다운로드 (.docx)
                </Button>
              </div>
            )}
          </Card>
        ))}
      </div>

      {selectedCandidate && reportContent[selectedCandidate]?.content && (
        <Card className="!p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-white">보고서 미리보기</h3>
            <Button variant="ghost" size="sm" onClick={() => setSelectedCandidate(null)}>닫기</Button>
          </div>
          <pre className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap font-sans max-h-[400px] overflow-y-auto">
            {reportContent[selectedCandidate].content}
          </pre>
        </Card>
      )}
    </div>
  );
}

// ─── Criteria Management Sub-component ───
function CriteriaManagement({ sections, items, onUpdateItem, onAddItem }) {
  const [editingItem, setEditingItem] = useState(null);
  const [editLabel, setEditLabel] = useState('');
  const [editMax, setEditMax] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [addSection, setAddSection] = useState(null);
  const [newLabel, setNewLabel] = useState('');
  const [newMax, setNewMax] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const startEdit = (item) => {
    setEditingItem(item.id);
    setEditLabel(item.label);
    setEditMax(String(item.maxScore));
    setEditDesc(item.description || '');
  };

  const saveEdit = async () => {
    if (!editLabel || !editMax) return;
    await onUpdateItem(editingItem, {
      label: editLabel,
      maxScore: parseInt(editMax),
      description: editDesc,
    });
    setEditingItem(null);
    toast.success('항목이 수정되었습니다.');
  };

  const handleAdd = async () => {
    if (!addSection || !newLabel || !newMax) return;
    await onAddItem(addSection, newLabel, parseInt(newMax), newDesc);
    setAddSection(null);
    setNewLabel('');
    setNewMax('');
    setNewDesc('');
    toast.success('새 항목이 추가되었습니다.');
  };

  return (
    <div>
      <Card className="mb-4 !p-4 bg-surface-300/50">
        <div className="text-sm text-slate-400">
          평가표 항목을 수정하거나 새 항목을 추가할 수 있습니다. 변경사항은 즉시 반영됩니다.
        </div>
      </Card>

      {sections.map(sec => {
        const sectionItems = items.filter(i => i.sectionId === sec.id);
        const totalMax = sectionItems.reduce((s, i) => s + i.maxScore, 0);

        return (
          <Card key={sec.id} className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-bold flex items-center justify-center">
                  {sec.id}
                </span>
                <div>
                  <div className="text-[15px] font-bold text-white">{sec.label}</div>
                  <div className="text-[11px] text-slate-500">{sec.evalMethod} · 배점 {totalMax}/{sec.maxScore}점</div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setAddSection(addSection === sec.id ? null : sec.id)}>
                + 항목 추가
              </Button>
            </div>

            <div className="space-y-2">
              {sectionItems.map(item => (
                <div key={item.id} className="p-4 rounded-xl bg-surface-100 border border-surface-500/30">
                  {editingItem === item.id ? (
                    <div className="space-y-3">
                      <div className="flex gap-3">
                        <input
                          value={editLabel} onChange={e => setEditLabel(e.target.value)}
                          className="flex-1 px-3 py-2 rounded-lg bg-surface-50 border border-surface-500 text-white text-sm outline-none focus:border-brand-500"
                          placeholder="항목명"
                        />
                        <input
                          type="number" value={editMax} onChange={e => setEditMax(e.target.value)}
                          className="w-20 px-3 py-2 rounded-lg bg-surface-50 border border-surface-500 text-white text-sm text-center outline-none focus:border-brand-500"
                          placeholder="배점"
                        />
                      </div>
                      <input
                        value={editDesc} onChange={e => setEditDesc(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-500 text-white text-sm outline-none focus:border-brand-500"
                        placeholder="상세 설명 (선택)"
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit}>저장</Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingItem(null)}>취소</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-semibold text-slate-600 shrink-0">{item.id}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-300">{item.label}</div>
                        {item.description && <div className="text-[11px] text-slate-600 mt-0.5">{item.description}</div>}
                      </div>
                      <Badge variant="muted">{item.maxScore}점</Badge>
                      <Button variant="ghost" size="sm" onClick={() => startEdit(item)}>수정</Button>
                    </div>
                  )}
                </div>
              ))}

              {/* Add new item form */}
              {addSection === sec.id && (
                <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/20 space-y-3">
                  <div className="text-xs font-semibold text-brand-400 mb-1">새 항목 추가</div>
                  <div className="flex gap-3">
                    <input
                      value={newLabel} onChange={e => setNewLabel(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-lg bg-surface-50 border border-surface-500 text-white text-sm outline-none focus:border-brand-500"
                      placeholder="항목명"
                    />
                    <input
                      type="number" value={newMax} onChange={e => setNewMax(e.target.value)}
                      className="w-20 px-3 py-2 rounded-lg bg-surface-50 border border-surface-500 text-white text-sm text-center outline-none focus:border-brand-500"
                      placeholder="배점"
                    />
                  </div>
                  <input
                    value={newDesc} onChange={e => setNewDesc(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-surface-50 border border-surface-500 text-white text-sm outline-none focus:border-brand-500"
                    placeholder="상세 설명 (선택)"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAdd}>추가</Button>
                    <Button size="sm" variant="ghost" onClick={() => setAddSection(null)}>취소</Button>
                  </div>
                </div>
              )}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
