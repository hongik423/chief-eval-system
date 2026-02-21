import { create } from 'zustand';
import bcrypt from 'bcryptjs';
import { supabase, isSupabaseConfigured } from './supabase';
import {
  CURRENT_PERIOD_ID,
  DEFAULT_EVALUATORS,
  DEFAULT_CANDIDATES,
  DEFAULT_CRITERIA,
  PASS_SCORE,
  ADMIN_ID,
  ADMIN_PASSWORD,
} from './constants';

// ─── localStorage fallback ───
const LS_KEY = 'chief-eval-2026-v2';
const loadLS = () => { try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; } };
const saveLS = (data) => { try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {} };

// ═══════════════════════════════════════════════════════════════
// Store
// ═══════════════════════════════════════════════════════════════
export const useStore = create((set, get) => ({
  // ─── Auth State ───
  currentUser: null,      // evaluator id or 'admin'
  isAdmin: false,

  // ─── Data State ───
  evaluators: [],
  candidates: [],
  criteriaSections: [],
  criteriaItems: [],
  sessions: [],           // evaluation_sessions
  scores: {},             // { sessionId: { itemId: score } }
  bonusScores: {},        // { candidateId: score }
  auditLog: [],
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
    const ev = state.evaluators.find(e => e.id === evaluatorId);
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
    if (state.usingSupabase) {
      const { error } = await supabase.from('chief_evaluators').update({ password_hash: hash }).eq('id', evaluatorId);
      if (error) throw error;
    } else {
      const prev = loadLS();
      const pwStore = { ...(prev.passwords || {}), [evaluatorId]: hash };
      saveLS({ ...prev, passwords: pwStore });
    }
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

    if (isSupabaseConfigured()) {
      try {
        await get().loadFromSupabase();
        set({ usingSupabase: true, loading: false });
        return;
      } catch (err) {
        console.error('Supabase 연결 실패, localStorage 모드로 전환:', err);
      }
    }

    // Fallback: localStorage
    get().loadFromLocalStorage();
    set({ usingSupabase: false, loading: false });
  },

  // ═══════════════════════════════
  // Supabase Data Loading (치프인증 평가 워크플로우 연동)
  // ═══════════════════════════════
  loadFromSupabase: async () => {
    const periodId = CURRENT_PERIOD_ID;
    const [
      { data: periodData, error: periodErr },
      { data: evaluators, error: evErr },
      { data: candidates, error: caErr },
      { data: sections, error: secErr },
      { data: items, error: itemErr },
      { data: sessions, error: sessErr },
      { data: allScores, error: scoreErr },
      { data: bonusData, error: bonusErr },
    ] = await Promise.all([
      supabase.from('chief_eval_periods').select('id,name,pass_score,total_max_score,status').eq('id', periodId).single(),
      supabase.from('chief_evaluators').select('*').eq('is_active', true),
      supabase.from('chief_candidates').select('*').eq('period_id', periodId),
      supabase.from('chief_eval_criteria_sections').select('*').eq('period_id', periodId).eq('is_active', true).order('sort_order'),
      supabase.from('chief_eval_criteria_items').select('*').eq('is_active', true).order('sort_order'),
      supabase.from('chief_evaluation_sessions').select('*').eq('period_id', periodId),
      supabase.from('chief_evaluation_scores').select('*, chief_evaluation_sessions!inner(period_id)').eq('chief_evaluation_sessions.period_id', periodId),
      supabase.from('chief_bonus_scores').select('*').eq('period_id', periodId),
    ]);

    const criticalErrs = [evErr, caErr, secErr, itemErr, sessErr, scoreErr, bonusErr].filter(Boolean);
    if (criticalErrs.length > 0) {
      const first = criticalErrs[0];
      throw new Error(`Supabase 로드 실패: ${first.message} (${first.code || first.hint || ''})`);
    }

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

    set({
      periodInfo: periodData ? {
        id: periodData.id,
        name: periodData.name,
        passScore: Number(periodData.pass_score) || PASS_SCORE,
        totalMaxScore: Number(periodData.total_max_score) || 110,
        status: periodData.status,
      } : null,
      evaluators: evaluators || [],
      candidates: candidates || [],
      criteriaSections: (sections || []).map(s => ({
        id: s.id, label: s.label, maxScore: s.max_score, evalMethod: s.eval_method, sortOrder: s.sort_order,
      })),
      criteriaItems: periodItems.map(i => ({
        id: i.id, sectionId: i.section_id, label: i.label, maxScore: i.max_score,
        description: i.description, sortOrder: i.sort_order,
      })),
      sessions: sessions || [],
      scores: scoresMap,
      bonusScores: bonusMap,
    });
  },

  // ═══════════════════════════════
  // localStorage Data Loading
  // ═══════════════════════════════
  loadFromLocalStorage: () => {
    const saved = loadLS();
    const candidateStatuses = saved.candidateStatuses || {};
    const candidates = DEFAULT_CANDIDATES.map(c => ({
      ...c,
      status: candidateStatuses[c.id] || c.status || 'registered',
    }));
    const passwords = saved.passwords || {};
    const evaluators = DEFAULT_EVALUATORS.map(e => ({
      ...e,
      password_hash: passwords[e.id] || null,
    }));
    set({
      periodInfo: null,
      evaluators,
      candidates,
      criteriaSections: DEFAULT_CRITERIA.sections,
      criteriaItems: DEFAULT_CRITERIA.items,
      sessions: saved.sessions || [],
      scores: saved.scores || {},
      bonusScores: saved.bonusScores || {},
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

    if (state.usingSupabase) {
      // Find or create session
      let session = state.getSession(evaluatorId, candidateId);

      if (!session) {
        const { data, error } = await supabase.from('chief_evaluation_sessions').insert({
          period_id: CURRENT_PERIOD_ID,
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

      // Upsert score
      const { error } = await supabase.from('chief_evaluation_scores').upsert({
        session_id: session.id,
        criteria_item_id: itemId,
        score: score,
      }, { onConflict: 'session_id,criteria_item_id' });

      if (error) throw error;

      // Update local state
      const newScores = { ...state.scores };
      if (!newScores[session.id]) newScores[session.id] = {};
      newScores[session.id][itemId] = score;
      set({ scores: newScores });

    } else {
      // localStorage mode - use composite key
      const sessionKey = `${evaluatorId}__${candidateId}`;
      const newScores = { ...state.scores };
      if (!newScores[sessionKey]) newScores[sessionKey] = {};
      newScores[sessionKey][itemId] = score;

      // Ensure session exists in local list
      let session = state.sessions.find(s =>
        s.evaluator_id === evaluatorId && s.candidate_id === candidateId
      );
      let newSessions = [...state.sessions];
      if (!session) {
        session = {
          id: sessionKey,
          period_id: CURRENT_PERIOD_ID,
          evaluator_id: evaluatorId,
          candidate_id: candidateId,
          status: 'in_progress',
          is_excluded: state.isExcluded(evaluatorId, candidateId),
          started_at: new Date().toISOString(),
        };
        newSessions.push(session);
      }

      set({ scores: newScores, sessions: newSessions });
      const candidateStatuses = state.candidates.reduce((acc, c) => { acc[c.id] = c.status; return acc; }, {});
      saveLS({ sessions: newSessions, scores: newScores, bonusScores: state.bonusScores, candidateStatuses });
    }
  },

  // ═══════════════════════════════
  // Complete evaluation (save comments + finalize)
  // ═══════════════════════════════
  completeEvaluation: async (evaluatorId, candidateId, comments) => {
    const state = get();
    const { criteriaItems } = state;

    // Calculate total score
    const sessionKey = state.usingSupabase
      ? state.getSession(evaluatorId, candidateId)?.id
      : `${evaluatorId}__${candidateId}`;

    const sessionScores = state.scores[sessionKey] || {};
    const totalScore = criteriaItems.reduce((sum, item) => sum + (sessionScores[item.id] || 0), 0);

    if (state.usingSupabase) {
      const session = state.getSession(evaluatorId, candidateId);
      if (!session) return;

      const { error } = await supabase.from('chief_evaluation_sessions')
        .update({
          status: 'completed',
          total_score: totalScore,
          comments: comments || null,
          completed_at: new Date().toISOString(),
        })
        .eq('id', session.id);

      if (error) throw error;

      set({
        sessions: state.sessions.map(s =>
          s.id === session.id
            ? { ...s, status: 'completed', total_score: totalScore, comments, completed_at: new Date().toISOString() }
            : s
        ),
      });
    } else {
      const newSessions = state.sessions.map(s =>
        s.evaluator_id === evaluatorId && s.candidate_id === candidateId
          ? { ...s, status: 'completed', total_score: totalScore, comments, completed_at: new Date().toISOString() }
          : s
      );
      set({ sessions: newSessions });
      const candidateStatuses = state.candidates.reduce((acc, c) => { acc[c.id] = c.status; return acc; }, {});
      saveLS({ sessions: newSessions, scores: state.scores, bonusScores: state.bonusScores, candidateStatuses });
    }
  },

  // ═══════════════════════════════
  // Save bonus score
  // ═══════════════════════════════
  saveBonusScore: async (candidateId, score) => {
    const state = get();
    const newBonus = { ...state.bonusScores, [candidateId]: score };
    set({ bonusScores: newBonus });

    if (state.usingSupabase) {
      const { error } = await supabase.from('chief_bonus_scores')
        .upsert({
          period_id: CURRENT_PERIOD_ID,
          candidate_id: candidateId,
          score: score,
          coach_id: 'hsh',
        }, { onConflict: 'period_id,candidate_id' });

      if (error) {
        set({ bonusScores: state.bonusScores });
        throw error;
      }
    } else {
      const candidateStatuses = state.candidates.reduce((acc, c) => { acc[c.id] = c.status; return acc; }, {});
      saveLS({ sessions: state.sessions, scores: state.scores, bonusScores: newBonus, candidateStatuses });
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
      const sessionKey = session?.id || `${ev.id}__${candidateId}`;
      const sessionScores = scores[sessionKey] || {};
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

      evaluatorDetails.push({
        evaluator: ev,
        isSameTeam,
        isComplete,
        totalScore: evTotal,
        sectionBreakdown,
        comments: session?.comments || null,
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

  // ═══════════════════════════════
  // Get evaluator scores for a candidate
  // ═══════════════════════════════
  getSessionScores: (evaluatorId, candidateId) => {
    const { sessions, scores } = get();
    const session = sessions.find(s => s.evaluator_id === evaluatorId && s.candidate_id === candidateId);
    const sessionKey = session?.id || `${evaluatorId}__${candidateId}`;
    return scores[sessionKey] || {};
  },

  getSessionComments: (evaluatorId, candidateId) => {
    const { sessions } = get();
    const session = sessions.find(s => s.evaluator_id === evaluatorId && s.candidate_id === candidateId);
    return session?.comments || '';
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
    const newCandidates = state.candidates.map(c =>
      c.id === candidateId ? { ...c, status } : c
    );

    if (state.usingSupabase) {
      await supabase.from('chief_candidates')
        .update({ status })
        .eq('id', candidateId);
    } else {
      const candidateStatuses = newCandidates.reduce((acc, c) => {
        acc[c.id] = c.status;
        return acc;
      }, {});
      saveLS({
        sessions: state.sessions,
        scores: state.scores,
        bonusScores: state.bonusScores,
        candidateStatuses,
      });
    }

    set({ candidates: newCandidates });
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

    if (state.usingSupabase) {
      await supabase.from('chief_eval_criteria_items').insert({
        id: newId,
        section_id: sectionId,
        label,
        max_score: maxScore,
        description,
        sort_order: existing.length + 1,
      });
    }

    set({ criteriaItems: [...state.criteriaItems, newItem] });
  },

  updateCriteriaItem: async (itemId, updates) => {
    const state = get();

    if (state.usingSupabase) {
      const dbUpdates = {};
      if (updates.label) dbUpdates.label = updates.label;
      if (updates.maxScore !== undefined) dbUpdates.max_score = updates.maxScore;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      await supabase.from('chief_eval_criteria_items').update(dbUpdates).eq('id', itemId);
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
  // Reset (admin only)
  // ═══════════════════════════════
  resetAllData: async () => {
    const state = get();

    if (state.usingSupabase) {
      await supabase.from('chief_evaluation_scores').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('chief_evaluation_sessions')
        .update({ status: 'pending', total_score: null, comments: null, completed_at: null })
        .eq('period_id', CURRENT_PERIOD_ID);
      await supabase.from('chief_bonus_scores')
        .update({ score: 0 })
        .eq('period_id', CURRENT_PERIOD_ID);
      await supabase.from('chief_candidates')
        .update({ status: 'registered' })
        .eq('period_id', CURRENT_PERIOD_ID);
    }

    localStorage.removeItem(LS_KEY);
    set({ sessions: [], scores: {}, bonusScores: {} });
    await get().initialize();
  },
}));
