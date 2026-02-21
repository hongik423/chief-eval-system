import { create } from 'zustand';
import bcrypt from 'bcryptjs';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  CURRENT_PERIOD_ID,
  PASS_SCORE,
  ADMIN_ID,
  ADMIN_PASSWORD,
  DEFAULT_CRITERIA,
} from './constants';

// ═══════════════════════════════════════════════════════════════
// Store - 다중 기수(프로젝트) 지원
// ═══════════════════════════════════════════════════════════════
export const useStore = create((set, get) => ({
  // ─── Auth State ───
  currentUser: null,      // evaluator id or 'admin'
  isAdmin: false,

  // ─── Period (기간/프로젝트) State ───
  periods: [],            // [{ id, name, year, term, status, pass_score, ... }]
  selectedPeriodId: null, // 활성 선택 기간 ID

  // ─── Data State ───
  allEvaluators: [],      // 전체 평가위원 풀 (관리자용)
  evaluators: [],         // 현재 기간 평가위원 (필터됨)
  candidates: [],
  criteriaSections: [],
  criteriaItems: [],
  sessions: [],           // evaluation_sessions
  scores: {},             // { sessionId: { itemId: score } }
  bonusScores: {},        // { candidateId: score }
  auditLog: [],
  archives: [],        // [{ id, period_id, archived_at, note }]
  archiveDetail: null, // 선택한 아카이브 상세 (sessions, scores, bonus 재구성)
  periodInfo: null,     // DB에서 로드한 평가 기간 정보 (pass_score 등)
  loading: true,
  error: null,
  usingSupabase: false,

  // ═══════════════════════════════
  // Auth Actions
  // ═══════════════════════════════
  login: (userId, admin) => set({ currentUser: userId, isAdmin: admin }),
  logout: () => set({ currentUser: null, isAdmin: false }),

  loginWithPassword: async (evaluatorId, password, asAdmin = false, adminId = '') => {
    const state = get();
    if (asAdmin) {
      if (adminId !== ADMIN_ID) throw new Error('관리자 아이디가 일치하지 않습니다.');
      if (password !== ADMIN_PASSWORD) throw new Error('관리자 비밀번호가 일치하지 않습니다.');
      set({ currentUser: 'admin', isAdmin: true });
      return;
    }
    const ev = (state.evaluators || []).find(e => e.id === evaluatorId)
      || (state.allEvaluators || []).find(e => e.id === evaluatorId);
    if (!ev) throw new Error('평가위원을 찾을 수 없습니다.');
    if (ev.password_hash) {
      if (!bcrypt.compareSync(password, ev.password_hash)) throw new Error('비밀번호가 일치하지 않습니다.');
    } else {
      if (password !== ev.id) throw new Error('비밀번호가 일치하지 않습니다. (초기: 아이디와 동일)');
    }
    set({ currentUser: evaluatorId, isAdmin: false });
  },

  changePassword: async (evaluatorId, currentPassword, newPassword) => {
    const state = get();
    const ev = state.evaluators.find(e => e.id === evaluatorId);
    if (!ev) throw new Error('평가위원을 찾을 수 없습니다.');
    if (ev.password_hash) {
      if (!bcrypt.compareSync(currentPassword, ev.password_hash)) throw new Error('현재 비밀번호가 일치하지 않습니다.');
    } else {
      if (currentPassword !== ev.id) throw new Error('현재 비밀번호가 일치하지 않습니다.');
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    const { error } = await supabase.from('chief_evaluators').update({ password_hash: hash }).eq('id', evaluatorId);
    if (error) throw error;
    set({
      evaluators: state.evaluators.map(e =>
        e.id === evaluatorId ? { ...e, password_hash: hash } : e
      ),
    });
  },

  // ═══════════════════════════════
  // Initialize - Load all data
  // ═══════════════════════════════
  initialize: async () => {
    set({ loading: true, error: null });

    if (!isSupabaseConfigured()) {
      set({
        loading: false,
        error: 'Supabase 환경변수가 설정되지 않았습니다. VITE_SUPABASE_URL과 VITE_SUPABASE_ANON_KEY를 확인해 주세요.',
        usingSupabase: false,
      });
      return;
    }

    try {
      await get().loadPeriods();
      const { periods, selectedPeriodId } = get();
      const periodId = selectedPeriodId || periods[0]?.id || CURRENT_PERIOD_ID;
      if (!selectedPeriodId && periods[0]?.id) {
        set({ selectedPeriodId: periodId });
      }
      await get().loadFromSupabase(periodId);
      set({ usingSupabase: true, loading: false, error: null });
    } catch (err) {
      console.error('Supabase 연결 실패:', err);
      set({
        loading: false,
        error: err?.message || 'Supabase 연결에 실패했습니다. 환경변수와 DB 스키마를 확인해 주세요.',
        usingSupabase: false,
      });
    }
  },

  loadPeriods: async () => {
    const { data, error } = await supabase
      .from('chief_eval_periods')
      .select('id,name,year,term,status,eval_date,pass_score,total_max_score')
      .order('year', { ascending: false })
      .order('term', { ascending: false });
    if (error) throw error;
    const periods = (data || []).map(p => ({
      id: p.id,
      name: p.name,
      year: p.year,
      term: p.term,
      status: p.status,
      evalDate: p.eval_date,
      passScore: Number(p.pass_score) || 70,
      totalMaxScore: Number(p.total_max_score) || 110,
    }));
    const active = periods.find(p => p.status === 'active') || periods[0];
    set({ periods, selectedPeriodId: active?.id || null });
  },

  setSelectedPeriod: async (periodId) => {
    set({ selectedPeriodId: periodId });
    await get().loadFromSupabase(periodId);
  },

  // ═══════════════════════════════
  // Supabase Data Loading (치프인증 평가 워크플로우 연동)
  // ═══════════════════════════════
  loadFromSupabase: async (periodId) => {
    const pid = periodId || get().selectedPeriodId || CURRENT_PERIOD_ID;
    const [
      { data: periodData, error: periodErr },
      { data: allEvs, error: evErr },
      { data: periodEvIds, error: peErr },
      { data: candidates, error: caErr },
      { data: sections, error: secErr },
      { data: items, error: itemErr },
      { data: sessions, error: sessErr },
      { data: allScores, error: scoreErr },
      { data: bonusData, error: bonusErr },
    ] = await Promise.all([
      supabase.from('chief_eval_periods').select('id,name,pass_score,total_max_score,status').eq('id', pid).single(),
      supabase.from('chief_evaluators').select('*').eq('is_active', true),
      supabase.from('chief_period_evaluators').select('evaluator_id').eq('period_id', pid),
      supabase.from('chief_candidates').select('*').eq('period_id', pid),
      supabase.from('chief_eval_criteria_sections').select('*').eq('period_id', pid).eq('is_active', true).order('sort_order'),
      supabase.from('chief_eval_criteria_items').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('chief_evaluation_sessions').select('*').eq('period_id', pid),
      supabase.from('chief_evaluation_scores').select('*, chief_evaluation_sessions!inner(period_id)').eq('chief_evaluation_sessions.period_id', pid),
      supabase.from('chief_bonus_scores').select('*').eq('period_id', pid),
    ]);

    const criticalErrs = [evErr, caErr, secErr, itemErr, sessErr, scoreErr, bonusErr].filter(Boolean);
    if (criticalErrs.length > 0) {
      const first = criticalErrs[0];
      throw new Error(`Supabase 로드 실패: ${first.message} (${first.code || first.hint || ''})`);
    }

    const allEvaluators = allEvs || [];
    const periodEvaluatorIds = (!peErr && periodEvIds) ? periodEvIds.map(p => p.evaluator_id) : [];
    const evaluators = periodEvaluatorIds.length > 0
      ? allEvaluators.filter(e => periodEvaluatorIds.includes(e.id))
      : allEvaluators;

    // Transform scores into { sessionId: { itemId: score } }
    const scoresMap = {};
    (allScores || []).forEach((s) => {
      if (!scoresMap[s.session_id]) scoresMap[s.session_id] = {};
      scoresMap[s.session_id][s.criteria_item_id] = Number(s.score) || 0;
    });

    // Transform bonus scores into { candidateId: score }
    const bonusMap = {};
    (bonusData || []).forEach((b) => {
      bonusMap[b.candidate_id] = Number(b.score) || 0;
    });

    const sectionIds = new Set((sections || []).map(s => s.id));
    const periodItems = (items || []).filter(i => sectionIds.has(i.section_id));

    const displayCode = (id) => (id && id.includes('_') ? id.split('_').pop() : id) || id;

    set({
      selectedPeriodId: pid,
      periodInfo: periodData ? {
        id: periodData.id,
        name: periodData.name,
        passScore: Number(periodData.pass_score) || PASS_SCORE,
        totalMaxScore: Number(periodData.total_max_score) || 110,
        status: periodData.status,
      } : null,
      allEvaluators,
      evaluators,
      candidates: candidates || [],
      criteriaSections: (sections || []).map(s => ({
        id: s.id, displayCode: displayCode(s.id), label: s.label, maxScore: s.max_score, evalMethod: s.eval_method, sortOrder: s.sort_order,
      })),
      criteriaItems: periodItems.map(i => ({
        id: i.id, displayCode: displayCode(i.id), sectionId: i.section_id, label: i.label, maxScore: i.max_score,
        description: i.description, sortOrder: i.sort_order,
      })),
      sessions: sessions || [],
      scores: scoresMap,
      bonusScores: bonusMap,
    });
  },

  // ═══════════════════════════════
  // Get/Find session
  // ═══════════════════════════════
  getSession: (evaluatorId, candidateId) => {
    const { sessions } = get();
    return sessions.find(s => s.evaluator_id === evaluatorId && s.candidate_id === candidateId);
  },

  isExcluded: (evaluatorId, candidateId) => {
    const { evaluators, candidates } = get();
    const ev = evaluators.find(e => e.id === evaluatorId);
    const ca = candidates.find(c => c.id === candidateId);
    if (!ev || !ca) return false;
    return ev.team === ca.team && ev.team !== '대표';
  },

  // ═══════════════════════════════
  // Save individual score
  // ═══════════════════════════════
  saveScore: async (evaluatorId, candidateId, itemId, score) => {
    const state = get();
    let session = state.getSession(evaluatorId, candidateId);

    if (!session) {
      const periodId = state.periodInfo?.id || state.selectedPeriodId || CURRENT_PERIOD_ID;
      const { data, error } = await supabase.from('chief_evaluation_sessions').insert({
        period_id: periodId,
        evaluator_id: evaluatorId,
        candidate_id: candidateId,
        status: 'in_progress',
        is_excluded: state.isExcluded(evaluatorId, candidateId),
        started_at: new Date().toISOString(),
      }).select().single();

      if (error) throw error;
      session = data;
      set({ sessions: [...state.sessions, session] });
    } else if (session.status === 'pending') {
      await supabase.from('chief_evaluation_sessions')
        .update({ status: 'in_progress', started_at: new Date().toISOString() })
        .eq('id', session.id);

      set({
        sessions: state.sessions.map(s =>
          s.id === session.id ? { ...s, status: 'in_progress' } : s
        ),
      });
    }

    // Optimistic update: 즉시 UI 반영 후 Supabase 저장
    const newScores = { ...state.scores };
    if (!newScores[session.id]) newScores[session.id] = {};
    newScores[session.id][itemId] = score;
    set({ scores: newScores });

    const { error } = await supabase.from('chief_evaluation_scores').upsert({
      session_id: session.id,
      criteria_item_id: itemId,
      score: score,
    }, { onConflict: 'session_id,criteria_item_id' });

    if (error) {
      // 롤백
      set({ scores: state.scores });
      throw error;
    }
  },

  // ═══════════════════════════════
  // Complete evaluation (save comments + finalize)
  // ═══════════════════════════════
  completeEvaluation: async (evaluatorId, candidateId, commentsSection) => {
    const state = get();
    const session = state.getSession(evaluatorId, candidateId);
    if (!session) return;

    const sessionScores = state.scores[session.id] || {};
    const totalScore = state.criteriaItems.reduce((sum, item) => sum + (sessionScores[item.id] || 0), 0);

    const commentsSec = commentsSection && typeof commentsSection === 'object'
      ? commentsSection
      : (typeof commentsSection === 'string' ? { overall: commentsSection } : {});

    const { error } = await supabase.from('chief_evaluation_sessions')
      .update({
        status: 'completed',
        total_score: totalScore,
        comments_section: commentsSec,
        comments: commentsSec?.overall || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', session.id);

    if (error) throw error;

    set({
      sessions: state.sessions.map(s =>
        s.id === session.id
          ? { ...s, status: 'completed', total_score: totalScore, comments_section: commentsSec, completed_at: new Date().toISOString() }
          : s
      ),
    });
  },

  // ═══════════════════════════════
  // Save bonus score
  // ═══════════════════════════════
  saveBonusScore: async (candidateId, score) => {
    const state = get();
    const periodId = state.periodInfo?.id || state.selectedPeriodId || CURRENT_PERIOD_ID;
    if (!periodId) throw new Error('평가 기간이 선택되지 않았습니다.');

    // null/undefined 시 0으로 처리 (DB NOT NULL 제약)
    const safeScore = Math.max(0, Math.min(10, Number(score) || 0));
    const newBonus = { ...state.bonusScores, [candidateId]: safeScore };
    set({ bonusScores: newBonus });

    const { error } = await supabase.from('chief_bonus_scores')
      .upsert({
        period_id: periodId,
        candidate_id: candidateId,
        score: safeScore,
        coach_id: 'hsh',
      }, { onConflict: 'period_id,candidate_id' });

    if (error) {
      set({ bonusScores: state.bonusScores });
      throw error;
    }
  },

  // ═══════════════════════════════
  // Calculate candidate result
  // ═══════════════════════════════
  getCandidateResult: (candidateId) => {
    const { evaluators, candidates, sessions, scores, bonusScores, criteriaItems, criteriaSections, periodInfo } = get();
    const candidate = candidates.find(c => c.id === candidateId);
    if (!candidate) return null;

    const bonus = Number(bonusScores[candidateId]) || 0;
    let evalCount = 0;
    let totalSum = 0;
    const evaluatorDetails = [];

    evaluators.forEach(ev => {
      const isSameTeam = ev.team === candidate.team && ev.team !== '대표';
      const session = sessions.find(s => s.evaluator_id === ev.id && s.candidate_id === candidateId);
      const sessionScores = scores[session?.id] || {};
      const isComplete = session?.status === 'completed' ||
        (!session?.status && criteriaItems.every(item => sessionScores[item.id] != null));

      // Section breakdown
      const sectionBreakdown = {};
      criteriaSections.forEach(sec => {
        const sectionItems = criteriaItems.filter(i => i.sectionId === sec.id);
        sectionBreakdown[sec.id] = sectionItems.reduce((s, item) => s + (Number(sessionScores[item.id]) || 0), 0);
      });

      const evTotal = criteriaItems.reduce((s, item) => s + (Number(sessionScores[item.id]) || 0), 0);

      if (!isSameTeam && isComplete) {
        evalCount++;
        totalSum += evTotal;
      }

      const cs = session?.comments_section || {};
      evaluatorDetails.push({
        evaluator: ev,
        isSameTeam,
        isComplete,
        totalScore: evTotal,
        sectionBreakdown,
        comments: session?.comments || null,
        commentsSection: { A: cs?.A || '', B: cs?.B || '', C: cs?.C || '' },
        completedAt: session?.completed_at || null,
        sessionScores,
      });
    });

    const passScore = periodInfo?.passScore ?? PASS_SCORE;
    const finalAvg = evalCount > 0 ? (Number(totalSum) + Number(bonus)) / evalCount : null;
    const pass = finalAvg !== null ? finalAvg >= passScore : null;

    return {
      candidate,
      bonus,
      evalCount,
      totalSum,
      finalAvg,
      pass,
      evaluatorDetails,
    };
  },

  /** 아카이브 데이터로 응시자별 결과 재계산 (조회 전용) */
  getArchiveCandidateResults: (archiveDetail) => {
    const { evaluators, candidates, criteriaItems, criteriaSections, periodInfo } = get();
    if (!archiveDetail?.sessions?.length) return [];

    const { sessions, scores, bonusScores } = archiveDetail;
    const candidateIds = [...new Set(sessions.map(s => s.candidate_id))];

    return candidateIds.map(candidateId => {
      const candidate = candidates.find(c => c.id === candidateId) || {
        id: candidateId,
        name: candidateId,
        team: '—',
      };
      const bonus = Number(bonusScores[candidateId]) || 0;
      let evalCount = 0;
      let totalSum = 0;
      const evaluatorDetails = [];

      evaluators.forEach(ev => {
        const isSameTeam = ev.team === candidate.team && ev.team !== '대표';
        const session = sessions.find(s => s.evaluator_id === ev.id && s.candidate_id === candidateId);
        const sessionScores = scores[session?.id] || {};
        const isComplete = session?.status === 'completed' ||
          (!session?.status && criteriaItems.every(item => sessionScores[item.id] != null));

        const sectionBreakdown = {};
        criteriaSections.forEach(sec => {
          const sectionItems = criteriaItems.filter(i => i.sectionId === sec.id);
          sectionBreakdown[sec.id] = sectionItems.reduce((s, item) => s + (Number(sessionScores[item.id]) || 0), 0);
        });
        const evTotal = criteriaItems.reduce((s, item) => s + (Number(sessionScores[item.id]) || 0), 0);

        if (!isSameTeam && isComplete) {
          evalCount++;
          totalSum += evTotal;
        }

        const cs = session?.comments_section || {};
        const commentsSection = criteriaSections.reduce((acc, sec) => {
          acc[sec.id] = (cs && cs[sec.id]) || '';
          return acc;
        }, {});
        evaluatorDetails.push({
          evaluator: ev,
          isSameTeam,
          isComplete,
          totalScore: evTotal,
          sectionBreakdown,
          comments: session?.comments || null,
          commentsSection,
          completedAt: session?.completed_at || null,
          sessionScores,
        });
      });

      const passScore = periodInfo?.passScore ?? PASS_SCORE;
      const finalAvg = evalCount > 0 ? (Number(totalSum) + Number(bonus)) / evalCount : null;
      const pass = finalAvg !== null ? finalAvg >= passScore : null;

      return { candidate, bonus, evalCount, totalSum, finalAvg, pass, evaluatorDetails };
    }).filter(Boolean);
  },

  // ═══════════════════════════════
  // Get evaluator scores for a candidate
  // ═══════════════════════════════
  getSessionScores: (evaluatorId, candidateId) => {
    const { sessions, scores } = get();
    const session = sessions.find(s => s.evaluator_id === evaluatorId && s.candidate_id === candidateId);
    return scores[session?.id] || {};
  },

  getSessionComments: (evaluatorId, candidateId) => {
    const { sessions } = get();
    const session = sessions.find(s => s.evaluator_id === evaluatorId && s.candidate_id === candidateId);
    return session?.comments || '';
  },

  getSessionSectionComments: (evaluatorId, candidateId) => {
    const { sessions } = get();
    const session = sessions.find(s => s.evaluator_id === evaluatorId && s.candidate_id === candidateId);
    const cs = session?.comments_section;
    return {
      A: (cs && cs.A) || '',
      B: (cs && cs.B) || '',
      C: (cs && cs.C) || '',
    };
  },

  getSessionStatus: (evaluatorId, candidateId) => {
    const { sessions } = get();
    const session = sessions.find(s => s.evaluator_id === evaluatorId && s.candidate_id === candidateId);
    return session?.status || 'pending';
  },

  // ═══════════════════════════════
  // Update candidate status (pass/fail)
  // ═══════════════════════════════
  updateCandidateStatus: async (candidateId, status) => {
    const state = get();
    const { error } = await supabase.from('chief_candidates')
      .update({ status })
      .eq('id', candidateId);

    if (error) throw error;

    set({
      candidates: state.candidates.map(c =>
        c.id === candidateId ? { ...c, status } : c
      ),
    });
  },

  // ═══════════════════════════════
  // Criteria management (for future updates)
  // ═══════════════════════════════
  addCriteriaItem: async (sectionId, label, maxScore, description) => {
    const state = get();
    const existing = state.criteriaItems.filter(i => i.sectionId === sectionId);
    const newId = `${sectionId}${existing.length + 1}`;
    const newItem = {
      id: newId, sectionId, label, maxScore, description, sortOrder: existing.length + 1,
    };

    const { error } = await supabase.from('chief_eval_criteria_items').insert({
      id: newId,
      section_id: sectionId,
      label,
      max_score: maxScore,
      description,
      sort_order: existing.length + 1,
    });

    if (error) throw error;
    set({ criteriaItems: [...state.criteriaItems, newItem] });
  },

  updateCriteriaItem: async (itemId, updates) => {
    const state = get();
    const dbUpdates = {};
    if (updates.label) dbUpdates.label = updates.label;
    if (updates.maxScore !== undefined) dbUpdates.max_score = updates.maxScore;
    if (updates.description !== undefined) dbUpdates.description = updates.description;

    if (Object.keys(dbUpdates).length > 0) {
      const { error } = await supabase.from('chief_eval_criteria_items').update(dbUpdates).eq('id', itemId);
      if (error) throw error;
    }

    set({
      criteriaItems: state.criteriaItems.map(i =>
        i.id === itemId ? { ...i, ...updates } : i
      ),
    });
  },

  // ═══════════════════════════════
  // Audit log
  // ═══════════════════════════════
  loadAuditLog: async () => {
    if (!isSupabaseConfigured()) return;
    const { data } = await supabase
      .from('chief_audit_log')
      .select('*')
      .order('performed_at', { ascending: false })
      .limit(100);
    set({ auditLog: data || [] });
  },

  // ═══════════════════════════════
  // Archive (초기화 전 데이터 보관)
  // ═══════════════════════════════
  archiveCurrentPeriod: async (periodId) => {
    const pid = periodId || get().periodInfo?.id || get().selectedPeriodId || CURRENT_PERIOD_ID;

    // 1) 해당 기간 세션 조회
    const { data: sessions, error: sessErr } = await supabase
      .from('chief_evaluation_sessions')
      .select('*')
      .eq('period_id', pid);
    if (sessErr) throw sessErr;
    if (!sessions || sessions.length === 0) return null;

    const sessionIds = sessions.map(s => s.id);

    // 2) 해당 세션들의 점수 조회
    const { data: scores, error: scoreErr } = await supabase
      .from('chief_evaluation_scores')
      .select('*')
      .in('session_id', sessionIds);
    if (scoreErr) throw scoreErr;

    // 3) 가점 조회
    const { data: bonusData, error: bonusErr } = await supabase
      .from('chief_bonus_scores')
      .select('*')
      .eq('period_id', pid);
    if (bonusErr) throw bonusErr;

    // 4) 아카이브 메타 생성
    const { data: meta, error: metaErr } = await supabase
      .from('chief_archive_meta')
      .insert({ period_id: pid, note: `초기화 전 보관 (${new Date().toLocaleString('ko-KR')})` })
      .select()
      .single();
    if (metaErr) throw metaErr;
    const archiveId = meta.id;

    // 5) 세션 아카이브 (original_session_id 매핑)
    const sessionMap = {};
    for (const s of sessions) {
      const { data: archSess, error: insErr } = await supabase
        .from('chief_evaluation_sessions_archive')
        .insert({
          archive_id: archiveId,
          original_session_id: s.id,
          period_id: s.period_id,
          evaluator_id: s.evaluator_id,
          candidate_id: s.candidate_id,
          status: s.status,
          is_excluded: s.is_excluded,
          total_score: s.total_score,
          comments: s.comments,
          comments_section: s.comments_section || {},
          completed_at: s.completed_at,
        })
        .select()
        .single();
      if (insErr) throw insErr;
      sessionMap[s.id] = archSess.id;
    }

    // 6) 점수 아카이브
    for (const sc of scores || []) {
      const sessionArchiveId = sessionMap[sc.session_id];
      if (!sessionArchiveId) continue;
      const { error: scErr } = await supabase
        .from('chief_evaluation_scores_archive')
        .insert({
          archive_id: archiveId,
          session_archive_id: sessionArchiveId,
          criteria_item_id: sc.criteria_item_id,
          score: sc.score,
        });
      if (scErr) throw scErr;
    }

    // 7) 가점 아카이브
    for (const b of bonusData || []) {
      const { error: bErr } = await supabase
        .from('chief_bonus_scores_archive')
        .insert({
          archive_id: archiveId,
          period_id: b.period_id,
          candidate_id: b.candidate_id,
          score: b.score,
          coach_id: b.coach_id,
        });
      if (bErr) throw bErr;
    }

    return archiveId;
  },

  loadArchives: async (periodId) => {
    const pid = periodId || get().selectedPeriodId;
    if (!pid) return;
    try {
      const { data, error } = await supabase
        .from('chief_archive_meta')
        .select('id, period_id, archived_at, note')
        .eq('period_id', pid)
        .order('archived_at', { ascending: false });
      if (error) throw error;
      set({ archives: data || [] });
    } catch (err) {
      console.warn('아카이브 로드 실패 (테이블 미생성 시 무시):', err);
      set({ archives: [] });
    }
  },

  getArchiveDetail: async (archiveId) => {
    const [sessRes, bonusRes] = await Promise.all([
      supabase.from('chief_evaluation_sessions_archive').select('*').eq('archive_id', archiveId),
      supabase.from('chief_bonus_scores_archive').select('*').eq('archive_id', archiveId),
    ]);
    if (sessRes.error) throw sessRes.error;
    if (bonusRes.error) throw bonusRes.error;

    const sessions = sessRes.data || [];
    const sessionIds = sessions.map(s => s.id);

    const { data: scores } = await supabase
      .from('chief_evaluation_scores_archive')
      .select('*')
      .in('session_archive_id', sessionIds);

    const scoresMap = {};
    (scores || []).forEach((s) => {
      if (!scoresMap[s.session_archive_id]) scoresMap[s.session_archive_id] = {};
      scoresMap[s.session_archive_id][s.criteria_item_id] = Number(s.score) || 0;
    });

    const bonusMap = {};
    (bonusRes.data || []).forEach((b) => {
      bonusMap[b.candidate_id] = Number(b.score) || 0;
    });

    const detail = {
      sessions,
      scores: scoresMap,
      bonusScores: bonusMap,
    };
    set({ archiveDetail: detail });
    return detail;
  },

  // ═══════════════════════════════
  // Reset (admin only) - 초기화 전 아카이브 자동 보관
  // ═══════════════════════════════
  resetAllData: async () => {
    const state = get();
    const periodId = state.periodInfo?.id || state.selectedPeriodId || CURRENT_PERIOD_ID;

    // 초기화 전 해당 기간 데이터 아카이브
    try {
      await get().archiveCurrentPeriod(periodId);
    } catch (err) {
      console.warn('아카이브 실패 (테이블 미생성 시 무시):', err);
    }

    // 해당 기간 세션 ID 목록 (점수 삭제용)
    const { data: periodSessions } = await supabase
      .from('chief_evaluation_sessions')
      .select('id')
      .eq('period_id', periodId);
    const sessionIds = (periodSessions || []).map(s => s.id);

    if (sessionIds.length > 0) {
      await supabase.from('chief_evaluation_scores').delete().in('session_id', sessionIds);
    }
    await supabase.from('chief_evaluation_sessions')
      .update({ status: 'pending', total_score: null, comments: null, comments_section: {}, completed_at: null })
      .eq('period_id', periodId);
    await supabase.from('chief_bonus_scores')
      .update({ score: 0 })
      .eq('period_id', periodId);
    await supabase.from('chief_candidates')
      .update({ status: 'registered' })
      .eq('period_id', periodId);

    set({ sessions: [], scores: {}, bonusScores: {}, archiveDetail: null });
    await get().loadFromSupabase(periodId);
    await get().loadArchives(periodId);
  },

  createPeriod: async (input) => {
    const { name, year, term, passScore = 70, totalMaxScore = 110 } = input;
    const { data: period, error: periodErr } = await supabase.from('chief_eval_periods').insert({
      name,
      year,
      term,
      status: 'draft',
      pass_score: passScore,
      total_max_score: totalMaxScore,
    }).select().single();
    if (periodErr) throw periodErr;

    const slug = `${year}_${term}`;
    for (const sec of DEFAULT_CRITERIA.sections) {
      const secId = slug + '_' + sec.id;
      await supabase.from('chief_eval_criteria_sections').insert({
        id: secId,
        period_id: period.id,
        label: sec.label,
        max_score: sec.maxScore,
        eval_method: sec.evalMethod,
        sort_order: sec.sortOrder,
      });
    }
    for (const item of DEFAULT_CRITERIA.items) {
      const itemId = slug + '_' + item.id;
      await supabase.from('chief_eval_criteria_items').insert({
        id: itemId,
        section_id: slug + '_' + item.sectionId,
        label: item.label,
        max_score: item.maxScore,
        description: item.description,
        sort_order: item.sortOrder,
      });
    }

    try {
      const { data: allEvs } = await supabase.from('chief_evaluators').select('id').eq('is_active', true);
      for (const e of (allEvs || [])) {
        await supabase.from('chief_period_evaluators').upsert(
          { period_id: period.id, evaluator_id: e.id },
          { onConflict: 'period_id,evaluator_id' }
        );
      }
    } catch (_) {
      // chief_period_evaluators 미존재 시 스킵 (마이그레이션 미실행)
    }

    await get().loadPeriods();
    set({ selectedPeriodId: period.id });
    await get().loadFromSupabase(period.id);
    return period;
  },

  addPeriodEvaluator: async (periodId, evaluatorId) => {
    const { error: peErr } = await supabase.from('chief_period_evaluators').upsert(
      { period_id: periodId, evaluator_id: evaluatorId },
      { onConflict: 'period_id,evaluator_id' }
    );
    if (peErr) throw peErr;

    const state = get();
    const candidates = state.candidates || [];
    for (const cand of candidates) {
      const isExcl = state.isExcluded(evaluatorId, cand.id);
      await supabase.from('chief_evaluation_sessions').upsert({
        period_id: periodId,
        evaluator_id: evaluatorId,
        candidate_id: cand.id,
        is_excluded: isExcl,
      }, { onConflict: 'period_id,evaluator_id,candidate_id' });
    }
    await get().loadFromSupabase(periodId);
  },

  removePeriodEvaluator: async (periodId, evaluatorId) => {
    await supabase.from('chief_evaluation_sessions')
      .delete()
      .eq('period_id', periodId)
      .eq('evaluator_id', evaluatorId);
    const { error } = await supabase.from('chief_period_evaluators')
      .delete()
      .eq('period_id', periodId)
      .eq('evaluator_id', evaluatorId);
    if (error) throw error;
    await get().loadFromSupabase(periodId);
  },

  addCandidate: async (periodId, input) => {
    const { name, team, phone, email } = input;
    const id = `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
    const { data: cand, error: caErr } = await supabase.from('chief_candidates').insert({
      id,
      name,
      team: team || '미정',
      phone: phone || null,
      email: email || null,
      period_id: periodId,
      status: 'registered',
    }).select().single();
    if (caErr) throw caErr;

    const state = get();
    const evs = state.evaluators || [];
    for (const ev of evs) {
      const isExcl = ev.team === cand.team && ev.team !== '대표';
      await supabase.from('chief_evaluation_sessions').insert({
        period_id: periodId,
        evaluator_id: ev.id,
        candidate_id: cand.id,
        is_excluded: isExcl,
      });
    }
    await supabase.from('chief_bonus_scores').insert({
      period_id: periodId,
      candidate_id: cand.id,
      score: 0,
      coach_id: evs[0]?.id || 'hsh',
    });

    await get().loadFromSupabase(periodId);
    return cand;
  },

  setPeriodStatus: async (periodId, status) => {
    const { error } = await supabase.from('chief_eval_periods')
      .update({ status }).eq('id', periodId);
    if (error) throw error;
    if (status === 'active') {
      await supabase.from('chief_eval_periods')
        .update({ status: 'draft' }).eq('status', 'active').neq('id', periodId);
    }
    await get().loadPeriods();
  },
}));
