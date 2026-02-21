import { useState, useMemo, useEffect } from 'react';
import { useStore } from '@/lib/store';
import { Card, Badge, Button, ScoreInput, ProgressRing } from '@/components/ui';
import toast from 'react-hot-toast';

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

  // Section totals 및 allFilled: effectiveScores 사용 (로컬 즉시 반영)
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
    <div className="max-w-[800px] mx-auto px-4 py-6">
      {/* Top Nav */}
      <div className="flex items-center gap-3 mb-7">
        <Button variant="ghost" size="sm" onClick={onBack}>← 목록</Button>
        <div className="flex-1" />
        <Badge variant="default">{evaluator?.name} 위원</Badge>
        <span className="text-slate-600">→</span>
        <Badge variant="gold">{candidate?.name} 응시자</Badge>
      </div>

      {/* Score Summary */}
      <Card className="mb-5 flex items-center gap-6 !py-5">
        <ProgressRing value={totalScore} max={100} />
        <div className="flex-1">
          <div className="text-xs text-slate-500 mb-1">PM 역량평가 점수</div>
          <div className="text-3xl font-extrabold text-white font-mono">
            {totalScore}<span className="text-sm text-slate-500 font-normal ml-1">/ 100점</span>
          </div>
          <div className="flex gap-2 mt-2">
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
              </div>
              <div className="text-right">
                <div className="text-xl font-extrabold text-white font-mono">
                  {sectionTotals[section.id] || 0}
                  <span className="text-xs text-slate-500 font-normal">/{section.maxScore}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {items.map(item => (
                <div key={item.id} className="p-4 rounded-xl bg-surface-100 border border-surface-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-slate-600">{item.id}</span>
                    <span className="text-sm text-slate-300 font-medium">{item.label}</span>
                  </div>
                  {item.description && (
                    <p className="text-[11px] text-slate-600 mb-3 ml-6">{item.description}</p>
                  )}
                  <ScoreInput
                    value={effectiveScores[item.id] ?? null}
                    max={item.maxScore}
                    onChange={(v) => handleScoreChange(item.id, v)}
                  />
                </div>
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
      <div className="flex gap-3 justify-end pb-10">
        <Button variant="secondary" onClick={onBack}>취소</Button>
        <Button
          variant={allFilled ? 'success' : 'primary'}
          onClick={handleComplete}
          disabled={!allFilled || saving}
        >
          {saving ? '저장 중...' : allFilled ? '✓ 평가 완료 저장' : '모든 항목을 입력해 주세요'}
        </Button>
      </div>
    </div>
  );
}
