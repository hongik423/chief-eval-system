import { useState, useEffect, useMemo } from 'react';
import { useStore } from '@/lib/store';
import { PASS_SCORE, TOTAL_MAX_SCORE } from '@/lib/constants';
import {
  Card, Badge, Button, ScoreInput, ProgressRing,
  SectionHeader, StatBox, ConnectionStatus, Spinner,
} from '@/components/ui';
import toast from 'react-hot-toast';

// ─── Tabs ───
const TABS = [
  { id: 'overview', label: '현황 요약', icon: '📊' },
  { id: 'candidates', label: '응시자별 상세', icon: '👤' },
  { id: 'evaluators', label: '평가위원별 현황', icon: '🧑‍⚖️' },
  { id: 'criteria', label: '평가표 관리', icon: '⚙️' },
  { id: 'audit', label: '데이터 추적', icon: '📋' },
];

export default function AdminDashboard() {
  const {
    evaluators, candidates, criteriaSections, criteriaItems,
    bonusScores, periodInfo, logout, usingSupabase, getCandidateResult,
    saveBonusScore, updateCandidateStatus, resetAllData,
    loadAuditLog, auditLog, updateCriteriaItem, addCriteriaItem,
  } = useStore();

  const [activeTab, setActiveTab] = useState('overview');
  const [expandedCandidate, setExpandedCandidate] = useState(null);
  const [expandedEvaluator, setExpandedEvaluator] = useState(null);

  useEffect(() => {
    if (activeTab === 'audit') loadAuditLog();
  }, [activeTab]);

  // Candidate results
  const candidateResults = useMemo(() =>
    candidates.map(c => getCandidateResult(c.id)).filter(Boolean)
  , [candidates, getCandidateResult, bonusScores]);

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
    } catch (err) {
      toast.error('가점 저장 실패');
    }
  };

  const handleJudge = async (candId, pass) => {
    try {
      await updateCandidateStatus(candId, pass ? 'passed' : 'failed');
      toast.success(`${candidates.find(c => c.id === candId)?.name} → ${pass ? '합격' : '불합격'} 처리`);
    } catch (err) {
      toast.error('상태 변경 실패');
    }
  };

  const handleReset = async () => {
    if (!confirm('모든 평가 데이터를 초기화하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) return;
    await resetAllData();
    toast.success('데이터가 초기화되었습니다.');
  };

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-[22px] font-extrabold text-white tracking-tight">관리자 대시보드</h1>
            <Badge variant="gold">PM</Badge>
            <ConnectionStatus usingSupabase={usingSupabase} />
          </div>
          <p className="text-sm text-slate-400">이후경 HRD 실장 · 전체 평가 현황 관리</p>
        </div>
        <div className="flex gap-2">
          <Button variant="danger" size="sm" onClick={handleReset}>초기화</Button>
          <Button variant="secondary" size="sm" onClick={logout}>로그아웃</Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-surface-100 p-1 rounded-xl border border-surface-500/30 overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all
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
                  <ProgressRing value={r.finalAvg ? Math.round(r.finalAvg) : 0} max={110} size={72} />
                </div>
                {r.finalAvg != null ? (
                  <Badge variant={r.pass ? 'green' : 'red'}>
                    {r.pass ? '합격' : '미달'} · {r.finalAvg.toFixed(1)}점
                  </Badge>
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
          <Card className="mb-6">
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

          {/* Formula */}
          <Card className="bg-surface-300/50">
            <div className="text-sm font-bold text-white mb-2">📐 점수 산정 공식</div>
            <div className="text-xs text-slate-400 leading-relaxed space-y-1">
              <div>평균 점수 = (Σ 평가위원 PM역량점수 + 가점) ÷ 평가위원 수</div>
              <div>※ 소속 평가위원 점수는 총점 및 평가인원에서 제외</div>
              <div>※ 합격 기준: 평균 {periodInfo?.passScore ?? PASS_SCORE}점 이상 ({periodInfo?.totalMaxScore ?? TOTAL_MAX_SCORE}점 만점 기준)</div>
            </div>
          </Card>
        </div>
      )}

      {/* ═══ TAB: Candidates Detail ═══ */}
      {activeTab === 'candidates' && (
        <div className="space-y-3">
          {candidateResults.map(result => {
            const isExpanded = expandedCandidate === result.candidate.id;
            return (
              <Card key={result.candidate.id} className="!p-0 overflow-hidden">
                {/* Header Row */}
                <div
                  onClick={() => setExpandedCandidate(isExpanded ? null : result.candidate.id)}
                  className="flex items-center gap-4 px-6 py-4 cursor-pointer hover:bg-surface-300/30 transition-colors"
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
                      <div className="text-[10px] text-slate-500">평균 (가점 포함)</div>
                    </div>
                  )}

                  {/* Pass/Fail Buttons */}
                  <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                    <Button
                      variant={result.candidate.status === 'passed' ? 'success' : 'ghost'}
                      size="sm"
                      onClick={() => handleJudge(result.candidate.id, true)}
                      disabled={result.finalAvg == null}
                    >합격</Button>
                    <Button
                      variant={result.candidate.status === 'failed' ? 'danger' : 'ghost'}
                      size="sm"
                      onClick={() => handleJudge(result.candidate.id, false)}
                      disabled={result.finalAvg == null}
                    >불합격</Button>
                  </div>

                  <span className={`text-slate-500 text-sm transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}>›</span>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-6 pb-5 border-t border-surface-500/20">
                    {/* Score Table */}
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
                              <td className={`text-center py-3 px-3 font-mono font-bold
                                ${ed.isSameTeam ? 'text-slate-600' : ed.isComplete ? 'text-brand-400' : 'text-slate-600'}`}>
                                {ed.isSameTeam ? '—' : ed.isComplete ? ed.totalScore : '—'}
                              </td>
                              <td className="text-center py-3 px-3">
                                {ed.isSameTeam ? <Badge variant="muted">제외</Badge>
                                  : ed.isComplete ? <Badge variant="green">완료</Badge>
                                  : <Badge variant="muted">미평가</Badge>}
                              </td>
                            </tr>
                          ))}
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
                              <td className="py-3 px-3 font-bold text-white text-sm">최종 평균 (가점 포함)</td>
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

                    {/* Comments */}
                    {result.evaluatorDetails.some(ed => ed.comments) && (
                      <div className="mt-4">
                        <div className="text-[11px] font-semibold text-slate-500 mb-2">평가 코멘트</div>
                        <div className="space-y-2">
                          {result.evaluatorDetails.filter(ed => ed.comments && !ed.isSameTeam).map(ed => (
                            <div key={ed.evaluator.id} className="px-4 py-3 rounded-lg bg-surface-100 border border-surface-500/20">
                              <span className="text-[11px] font-semibold text-brand-400">{ed.evaluator.name}:</span>
                              <span className="text-xs text-slate-400 ml-2">{ed.comments}</span>
                              {ed.completedAt && (
                                <span className="text-[10px] text-slate-600 ml-2">
                                  ({new Date(ed.completedAt).toLocaleDateString('ko-KR')})
                                </span>
                              )}
                            </div>
                          ))}
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
              {usingSupabase
                ? '모든 점수 변경 이력이 Supabase chief_audit_log 테이블에 자동 기록됩니다.'
                : 'Supabase 미연결 상태에서는 감사 로그가 기록되지 않습니다. .env.local 을 설정해 주세요.'}
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
