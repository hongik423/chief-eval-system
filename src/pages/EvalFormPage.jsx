import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Card, Badge, Button, ScoreInput, ProgressRing } from '@/components/ui';
import { BARS_GUIDE } from '@/lib/barsGuide';
import toast from 'react-hot-toast';

// ── BARS 수준별 스타일 ──────────────────────────────────────
const LEVEL_STYLE = {
  amber:  { bg: 'bg-amber-500/10',  border: 'border-amber-500/30',  text: 'text-amber-300',  badge: 'bg-amber-500/20 text-amber-300' },
  green:  { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-300', badge: 'bg-emerald-500/20 text-emerald-300' },
  orange: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-300',  badge: 'bg-orange-500/20 text-orange-300' },
  red:    { bg: 'bg-red-500/10',    border: 'border-red-500/30',    text: 'text-red-300',    badge: 'bg-red-500/20 text-red-300' },
};

// ── BARS 가이드 패널 컴포넌트 ──────────────────────────────
function BarsGuidePanel({ itemId, maxScore }) {
  const guide = BARS_GUIDE[itemId];
  if (!guide) return null;

  const passPercent = Math.round((guide.passThreshold / maxScore) * 100);

  return (
    <div className="mt-3 rounded-xl border border-brand-500/20 bg-surface-50/50 overflow-hidden">
      {/* 합격기준선 */}
      <div className="px-4 py-2.5 bg-brand-500/8 border-b border-brand-500/20 flex items-center justify-between flex-wrap gap-2">
        <span className="text-[11px] font-bold text-brand-400 flex items-center gap-1.5">
          📊 BARS 평가 기준
        </span>
        <span className="text-[11px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">
          ✂️ 합격기준: {guide.passThreshold}점 이상 ({passPercent}%)
        </span>
      </div>

      {/* BARS 수준 테이블 */}
      <div className="divide-y divide-surface-500/20">
        {guide.levels.map((lv, i) => {
          const s = LEVEL_STYLE[lv.color];
          return (
            <div key={i} className={`px-4 py-3 flex gap-3 ${s.bg}`}>
              <div className="shrink-0 pt-0.5">
                <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${s.badge}`}>
                  {lv.label}
                </span>
                <div className={`text-[11px] font-mono font-bold mt-1 ${s.text}`}>{lv.range}</div>
              </div>
              <p className="text-[12px] text-slate-300 leading-relaxed">{lv.desc}</p>
            </div>
          );
        })}
      </div>

      {/* 평가자 참조 질문 */}
      {guide.refQuestions?.length > 0 && (
        <div className="border-t border-amber-500/20 bg-amber-500/5">
          <div className="px-4 py-2 border-b border-amber-500/15">
            <span className="text-[11px] font-bold text-amber-400">📋 평가위원 참조 — 체크 질문</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-3">
            {guide.refQuestions.map((rq, i) => (
              <div key={i} className="rounded-lg bg-surface-100/60 border border-amber-500/20 px-3 py-2.5">
                <div className="text-[10px] font-bold text-amber-500 mb-1">{rq.evaluator} 위원</div>
                <div className="text-[12px] text-slate-200 italic leading-snug mb-1">{rq.q}</div>
                <div className="text-[10px] text-slate-500">▶ {rq.point}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── 평가 항목 (점수입력 + BARS 가이드) ─────────────────────
function CriteriaItemRow({ item, score, onScoreChange }) {
  const [showBars, setShowBars] = useState(false);
  const guide = BARS_GUIDE[item.id];
  const passThreshold = guide?.passThreshold;
  const currentScore = score ?? null;

  // 현재 점수 수준 계산
  const scoreLevel = useMemo(() => {
    if (currentScore == null || currentScore === '') return null;
    const s = Number(currentScore);
    if (!guide) return null;
    // 합격 기준 이상이면 green, 미만이면 red
    return s >= passThreshold ? 'pass' : 'fail';
  }, [currentScore, guide, passThreshold]);

  return (
    <div className={`p-4 rounded-xl border transition-colors
      ${scoreLevel === 'pass' ? 'bg-emerald-500/5 border-emerald-500/20'
        : scoreLevel === 'fail' ? 'bg-red-500/5 border-red-500/20'
        : 'bg-surface-100 border-surface-500/30'}`}>

      {/* 항목 헤더 */}
      <div className="flex items-start gap-2 mb-2">
        <span className="text-[11px] font-bold text-slate-500 mt-0.5 shrink-0">{item.id}</span>
        <div className="flex-1 min-w-0">
          <span className="text-sm text-slate-200 font-semibold">{item.label}</span>
          {item.description && (
            <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{item.description}</p>
          )}
        </div>
        {/* 합격기준 + BARS 토글 */}
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {passThreshold != null && (
            <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full font-semibold whitespace-nowrap">
              기준 {passThreshold}점
            </span>
          )}
          {guide && (
            <button
              onClick={() => setShowBars(v => !v)}
              className={`flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all
                ${showBars
                  ? 'bg-brand-500/20 border-brand-500/40 text-brand-300'
                  : 'bg-surface-300/40 border-surface-500/30 text-slate-400 hover:text-brand-400 hover:border-brand-500/30'}`}
            >
              {showBars ? '▲ 기준 접기' : '▼ 평가 기준'}
            </button>
          )}
        </div>
      </div>

      {/* 점수 입력 */}
      <div className="flex items-center gap-3">
        <ScoreInput
          value={score ?? null}
          max={item.maxScore}
          onChange={(v) => onScoreChange(item.id, v)}
        />
        {/* 현재 점수 합격 여부 표시 */}
        {scoreLevel === 'pass' && (
          <span className="text-[11px] text-emerald-400 font-bold flex items-center gap-1">✅ 합격 기준 충족</span>
        )}
        {scoreLevel === 'fail' && (
          <span className="text-[11px] text-red-400 font-bold flex items-center gap-1">⚠️ 기준 미달</span>
        )}
      </div>

      {/* BARS 가이드 패널 (토글) */}
      {showBars && <BarsGuidePanel itemId={item.id} maxScore={item.maxScore} />}
    </div>
  );
}

// ── 메인 EvalFormPage ───────────────────────────────────────
export default function EvalFormPage({ candidateId, onBack }) {
  const {
    currentUser, evaluators, candidates, criteriaSections, criteriaItems,
    isExcluded, getSessionSectionComments,
    saveScore, completeEvaluation,
  } = useStore();

  const evaluator = evaluators.find(e => e.id === currentUser);
  const candidate = candidates.find(c => c.id === candidateId);
  const excluded = isExcluded(currentUser, candidateId);
  const scores = useStore(s => s.scores);
  const sessions = useStore(s => s.sessions);
  const sessionScores = useMemo(() => {
    const session = sessions.find(s => s.evaluator_id === currentUser && s.candidate_id === candidateId);
    return scores[session?.id] || {};
  }, [scores, sessions, currentUser, candidateId]);

  const [localScores, setLocalScores] = useState(() => ({}));
  const savedSectionComments = getSessionSectionComments(currentUser, candidateId);
  const [comments, setComments] = useState(() => savedSectionComments || { A: '', B: '', C: '' });
  const [saving, setSaving] = useState(false);

  const effectiveScores = { ...sessionScores, ...localScores };

  useEffect(() => {
    setLocalScores({});
  }, [candidateId, currentUser]);

  const sectionTotals = useMemo(() => {
    const totals = {};
    criteriaSections.forEach(sec => {
      const items = criteriaItems.filter(i => i.sectionId === sec.id);
      totals[sec.id] = items.reduce((sum, item) => sum + (Number(effectiveScores[item.id]) || 0), 0);
    });
    return totals;
  }, [effectiveScores, criteriaSections, criteriaItems]);

  const totalScore = useMemo(() =>
    criteriaItems.reduce((sum, item) => sum + (Number(effectiveScores[item.id]) || 0), 0)
  , [effectiveScores, criteriaItems]);

  const allFilled = useMemo(() =>
    criteriaItems.every(item => {
      const v = effectiveScores[item.id];
      return v != null && v !== '' && !Number.isNaN(Number(v));
    })
  , [effectiveScores, criteriaItems]);

  const handleScoreChange = (itemId, value) => {
    setLocalScores(prev => ({ ...prev, [itemId]: value }));
    saveScore(currentUser, candidateId, itemId, value).catch(err => {
      toast.error('점수 저장 실패: ' + err.message);
      setLocalScores(prev => {
        const next = { ...prev };
        delete next[itemId];
        return next;
      });
    });
  };

  const handleComplete = async () => {
    if (!allFilled) return;
    setSaving(true);
    try {
      await completeEvaluation(currentUser, candidateId, comments);
      toast.success(`${candidate.name} 평가가 저장되었습니다.`);
      onBack();
    } catch (err) {
      toast.error('저장 실패: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (excluded) {
    return (
      <div className="max-w-[480px] mx-auto px-4 py-20 text-center">
        <Card>
          <div className="text-5xl mb-4">🚫</div>
          <h2 className="text-xl font-bold text-white mb-2">평가 제외 대상</h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            {evaluator?.name} 위원과 {candidate?.name} 응시자는<br />
            동일 팀({evaluator?.team}) 소속으로 평가에서 제외됩니다.
          </p>
          <Button variant="secondary" onClick={onBack} className="mt-6">돌아가기</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-[800px] mx-auto px-3 sm:px-4 py-4 sm:py-6 pb-8 sm:pb-6">
      {/* Top Nav */}
      <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-6 sm:mb-7">
        <Button variant="ghost" size="sm" onClick={onBack} className="min-h-[44px] sm:min-h-0 shrink-0">← 목록</Button>
        <div className="flex-1 min-w-0" />
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="default" className="truncate">{evaluator?.name} 위원</Badge>
          <span className="text-slate-600 hidden sm:inline">→</span>
          <Badge variant="gold" className="truncate">{candidate?.name} 응시자</Badge>
        </div>
      </div>

      {/* BARS 안내 배너 */}
      <div className="mb-5 rounded-xl border border-brand-500/25 bg-brand-500/8 px-4 py-3 flex items-start gap-3">
        <span className="text-xl shrink-0">💡</span>
        <div>
          <p className="text-[12px] text-brand-300 font-semibold mb-0.5">BARS 평가 기준 안내</p>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            각 항목의 <strong className="text-slate-300">▼ 평가 기준</strong> 버튼을 클릭하면 행동 기반 평가 기준(BARS)과 평가자 참조 질문을 확인할 수 있습니다.
            합격 기준선(70%)을 참조하여 채점하세요.
          </p>
        </div>
      </div>

      {/* Score Summary */}
      <Card className="mb-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 !py-5">
        <ProgressRing value={totalScore} max={100} />
        <div className="flex-1">
          <div className="text-xs text-slate-500 mb-1">PM 역량평가 점수</div>
          <div className="flex items-baseline gap-2">
            <div className="text-3xl font-extrabold text-white font-mono">
              {totalScore}<span className="text-sm text-slate-500 font-normal ml-1">/ 100점</span>
            </div>
            {totalScore >= 70 && allFilled && (
              <span className="text-sm font-bold text-emerald-400">✅ 합격권</span>
            )}
            {totalScore < 70 && allFilled && (
              <span className="text-sm font-bold text-red-400">⚠️ 기준 미달</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {criteriaSections.map(sec => (
              <Badge key={sec.id} variant="muted">
                {sec.id}. {sectionTotals[sec.id] || 0}/{sec.maxScore}
              </Badge>
            ))}
          </div>
        </div>
      </Card>

      {/* Scoring Sections */}
      {criteriaSections.map(section => {
        const items = criteriaItems.filter(i => i.sectionId === section.id);
        return (
          <Card key={section.id} className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-brand-500/10 text-brand-400 text-xs font-bold">
                    {section.id}
                  </span>
                  <h3 className="text-[15px] font-bold text-white">{section.label}</h3>
                </div>
                <div className="text-[11px] text-slate-500 ml-9">{section.evalMethod}</div>

                {/* ── A 영역 전용: 별첨자료 활용 점검 안내 ── */}
                {section.id === 'A' && (
                  <div className="ml-9 mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/25">
                    <span className="text-orange-400 text-[11px]">📎</span>
                    <span className="text-[11px] font-semibold text-orange-300">
                      별첨자료 활용 점검 (인터뷰 시):
                    </span>
                    <span className="text-[11px] text-orange-200">
                      산출물 — <strong>RFN</strong> (고객요구사항), <strong>NDA</strong> (비밀유지계약서)
                    </span>
                  </div>
                )}
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-white font-mono">
                  {sectionTotals[section.id] || 0}
                  <span className="text-xs text-slate-500 font-normal">/{section.maxScore}</span>
                </div>
                <div className="text-[10px] text-red-400 mt-0.5">
                  기준 {Math.round(section.maxScore * 0.7)}점
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {items.map(item => (
                <CriteriaItemRow
                  key={item.id}
                  item={item}
                  score={effectiveScores[item.id] ?? null}
                  onScoreChange={handleScoreChange}
                />
              ))}
            </div>
          </Card>
        );
      })}

      {/* Section Comments */}
      <Card className="mb-5">
        <h3 className="text-[15px] font-bold text-white mb-3">📝 평가 코멘트 (선택)</h3>
        <div className="space-y-4">
          {criteriaSections.map(sec => (
            <div key={sec.id}>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
                {sec.id}. {sec.label}
              </label>
              <textarea
                value={comments[sec.id] ?? ''}
                onChange={(e) => setComments(prev => ({ ...prev, [sec.id]: e.target.value }))}
                placeholder={`${sec.label}에 대한 의견을 작성해 주세요...`}
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-surface-500 bg-surface-100 text-white text-sm leading-relaxed resize-y outline-none focus:border-brand-500 transition-colors placeholder:text-slate-600"
              />
            </div>
          ))}
        </div>
      </Card>

      {/* Actions */}
      <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end pb-10">
        <Button variant="secondary" onClick={onBack} className="w-full sm:w-auto min-h-[48px] sm:min-h-0">취소</Button>
        <Button
          variant={allFilled ? 'success' : 'primary'}
          onClick={handleComplete}
          disabled={!allFilled || saving}
          className="w-full sm:w-auto min-h-[48px] sm:min-h-0"
        >
          {saving ? '저장 중...' : allFilled ? '✓ 평가 완료 저장' : '모든 항목을 입력해 주세요'}
        </Button>
      </div>
    </div>
  );
}
