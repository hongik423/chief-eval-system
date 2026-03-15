import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { QS_QUESTIONS, QS_CATEGORIES } from '@/data/qsQuestions';
import {
  decodeToken,
  getQuestionPdfUrl,
  ROUND2_FOLDER_URL,
  EXAM_DATE,
  EXAM_DATE_STR,
  ROUND2_DATE_STR,
  RESULT_DATE_STR,
  CERT_DATE_STR,
  MENTORING_START,
  MENTORING_END,
} from '@/lib/qsAssignmentStore';

const CATEGORY_META = {
  stock_transfer: {
    label: '주식 이동 프로젝트 설계',
    shortLabel: '주식 이동',
    icon: '📊',
    gradient: 'linear-gradient(135deg, #1d4ed8 0%, #1e3a8a 100%)',
    border: 'border-blue-700/60',
    bg: 'bg-blue-900/20',
    badge: 'bg-blue-900/50 text-blue-300 border-blue-700/60',
    text: 'text-blue-400',
  },
  nominee_stock: {
    label: '차명 주식 해소 프로젝트 설계',
    shortLabel: '차명 주식',
    icon: '🔐',
    gradient: 'linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%)',
    border: 'border-purple-700/60',
    bg: 'bg-purple-900/20',
    badge: 'bg-purple-900/50 text-purple-300 border-purple-700/60',
    text: 'text-purple-400',
  },
  temporary_payment: {
    label: '가지급금 정리 프로젝트 설계',
    shortLabel: '가지급금',
    icon: '💰',
    gradient: 'linear-gradient(135deg, #047857 0%, #064e3b 100%)',
    border: 'border-emerald-700/60',
    bg: 'bg-emerald-900/20',
    badge: 'bg-emerald-900/50 text-emerald-300 border-emerald-700/60',
    text: 'text-emerald-400',
  },
};

const CATEGORY_ORDER = ['stock_transfer', 'nominee_stock', 'temporary_payment'];

function DifficultyStars({ level = 3 }) {
  return (
    <span className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`text-xs ${i <= level ? 'text-amber-400' : 'text-slate-600'}`}>
          ★
        </span>
      ))}
    </span>
  );
}

export default function QSExamPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState('');
  const [dDay, setDDay] = useState('');
  const [copiedKey, setCopiedKey] = useState('');

  const assignment = decodeToken(token);

  // 시험까지 카운트다운
  useEffect(() => {
    const tick = () => {
      const diff = EXAM_DATE - new Date();
      if (diff <= 0) {
        setCountdown('시험 당일');
        setDDay('D-0');
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      setDDay(`D-${d}`);
      setCountdown(`${d}일 ${h}시간 ${m}분 남음`);
    };
    tick();
    const id = setInterval(tick, 30000);
    return () => clearInterval(id);
  }, []);

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 2000);
    } catch {
      /* ignore */
    }
  };

  // ── 유효하지 않은 토큰 ──
  if (!assignment) {
    return (
      <div className="max-w-lg mx-auto mt-16 text-center">
        <div className="bg-slate-800 rounded-2xl border border-red-700/50 p-10 shadow-2xl">
          <div className="text-6xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-red-400 mb-2">유효하지 않은 링크입니다</h2>
          <p className="text-sm text-slate-400 mb-6">
            출제 문제 URL을 관리자에게 다시 요청해 주세요.
          </p>
          <button
            onClick={() => navigate('/question-selection')}
            className="text-sm text-blue-400 underline hover:text-blue-300 transition"
          >
            메인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const { candidate, questions } = assignment;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ══════════════════════════════════════════════════════
          헤더 — 피평가자 개인 출제 확정 배너
      ══════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl overflow-hidden shadow-2xl border border-amber-700/40"
        style={{ background: 'linear-gradient(135deg, #1a1207 0%, #292010 100%)' }}
      >
        {/* 상단 골드 헤더 */}
        <div
          className="px-8 py-6 text-center"
          style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
        >
          <p className="text-stone-700 text-xs font-bold tracking-widest mb-1">
            2026년 ASSO 치프인증 TEST RED
          </p>
          <h1 className="text-2xl font-black text-stone-900 mb-1">
            🎯 2차 출제 확정 문제
          </h1>
          <p className="text-stone-700 text-sm">
            아래 3문제를 준비하여 시험에 응하세요
          </p>
        </div>

        {/* 피평가자 정보 */}
        <div className="px-8 py-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black shadow-lg"
              style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)', color: '#292010' }}
            >
              {candidate.name.charAt(0)}
            </div>
            <div>
              <p className="text-lg font-black text-slate-100">{candidate.name}</p>
              <p className="text-sm text-slate-400">{candidate.team} · 인증 후보</p>
            </div>
          </div>

          {/* D-Day 카운터 */}
          <div className="text-right">
            <div
              className="text-3xl font-black tabular-nums"
              style={{ color: 'rgb(214,173,101)' }}
            >
              {dDay}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{countdown}</p>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          시험 일정 배너
      ══════════════════════════════════════════════════════ */}
      <div
        className="rounded-xl px-6 py-4 border border-slate-600/60 flex items-center gap-4"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
      >
        <span className="text-2xl flex-shrink-0">📅</span>
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">📌 시험일</span>
            <span className="font-bold text-slate-200">{EXAM_DATE_STR}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">⏰ 시간</span>
            <span className="font-bold text-slate-200">오전 10:00 시작</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500 text-xs">📋 형식</span>
            <span className="font-bold text-slate-200">인터뷰 + PT 발제안</span>
          </div>
        </div>
        <button
          onClick={() => copyToClipboard(window.location.href, 'pageUrl')}
          className="text-xs border px-3 py-1.5 rounded-lg transition flex-shrink-0 hover:bg-slate-700/50"
          style={{ color: 'rgb(214,173,101)', borderColor: 'rgb(120,80,20)' }}
        >
          {copiedKey === 'pageUrl' ? '✅ 복사됨' : '🔗 URL 복사'}
        </button>
      </div>

      {/* ══════════════════════════════════════════════════════
          4단계 — 평가당일 최종 문제 추첨 안내
      ══════════════════════════════════════════════════════ */}
      <div
        className="rounded-xl border overflow-hidden"
        style={{ borderColor: '#991b1b', background: 'linear-gradient(135deg, #1a0505 0%, #2a1010 100%)' }}
      >
        <div className="px-5 py-3 flex items-center gap-3" style={{ background: 'rgba(185,28,28,0.15)' }}>
          <span className="text-xl">🎰</span>
          <div className="flex-1">
            <p className="text-sm font-bold text-red-400">4단계 · 평가당일 최종 문제 추첨</p>
            <p className="text-xs text-red-600/80 mt-0.5">
              아래 3문제 중 <span className="text-red-300 font-bold">1문제</span>가 평가 당일 평가위원회에서 <span className="text-red-300 font-bold">Random 추첨</span>됩니다
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-[10px] text-red-600">추첨일</p>
            <p className="text-xs font-bold text-red-400">3월 28일(토) 오전</p>
          </div>
        </div>
        <div className="px-5 py-3 text-xs text-slate-400 leading-relaxed">
          3문제 <span className="text-slate-300 font-bold">모두 준비</span>해야 합니다. 평가 당일 아침, 평가위원회에서 3문제 중 1문제를 무작위 선정하여
          해당 문제로 인터뷰 + PT 발제안을 진행합니다.
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          멘토링 기간 안내
      ══════════════════════════════════════════════════════ */}
      {(() => {
        const now = new Date();
        const isMentoring = now >= MENTORING_START && now <= MENTORING_END;
        return (
          <div
            className="rounded-xl px-5 py-3.5 border flex items-center gap-3"
            style={{
              borderColor: isMentoring ? '#166534' : '#374151',
              background: isMentoring
                ? 'linear-gradient(135deg, #052e16 0%, #0a3622 100%)'
                : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            }}
          >
            <span className="text-xl flex-shrink-0">{isMentoring ? '📚' : '💡'}</span>
            <div className="flex-1">
              <p className={`text-sm font-bold ${isMentoring ? 'text-emerald-400' : 'text-slate-400'}`}>
                멘토링 기간 {isMentoring ? '진행중' : '(선택사항)'}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                3월 18일(수) ~ 3월 27일(금) · 코치 자격 보유 평가위원에게 자유롭게 멘토링 요청 가능
              </p>
            </div>
            {isMentoring && (
              <span className="text-xs px-2.5 py-1 rounded-full font-bold animate-pulse"
                style={{ background: '#16653430', color: '#4ade80', border: '1px solid #16653460' }}>
                NOW
              </span>
            )}
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════════════════
          확정 출제 문제 3개 카드
      ══════════════════════════════════════════════════════ */}
      <div>
        <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
          🎯 확정 출제 문제
          <span className="text-sm font-normal text-slate-400">총 3문제 · 분야별 1문제</span>
        </h2>

        <div className="space-y-4">
          {CATEGORY_ORDER.map((catKey, idx) => {
            const qId     = questions[catKey];
            const qData   = QS_QUESTIONS[qId];
            const meta    = CATEGORY_META[catKey];
            const pdfUrl  = getQuestionPdfUrl(qId);

            return (
              <div
                key={catKey}
                className={`rounded-2xl overflow-hidden border ${meta.border} shadow-xl`}
                style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
              >
                {/* 분야 헤더 */}
                <div className="px-6 py-4 text-white" style={{ background: meta.gradient }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{meta.icon}</span>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full font-bold">
                            분야 {idx + 1}
                          </span>
                          <span className="text-sm font-bold opacity-90">{meta.shortLabel}</span>
                        </div>
                        <p className="text-xs opacity-70 mt-0.5">{meta.label}</p>
                      </div>
                    </div>
                    <div className="bg-white/20 backdrop-blur rounded-xl px-4 py-2 text-center flex-shrink-0">
                      <p className="text-xs opacity-80 leading-none mb-0.5">문제번호</p>
                      <p className="text-2xl font-black leading-none">#{qId}</p>
                    </div>
                  </div>
                </div>

                {/* 문제 내용 */}
                <div className="px-6 py-5">
                  {/* 문제 제목 */}
                  <h3 className="text-base font-bold text-slate-100 mb-2">
                    {qData?.title || `문제 #${qId}`}
                  </h3>

                  {/* 핵심 이슈 */}
                  {qData?.issue && (
                    <div
                      className={`rounded-lg px-4 py-3 mb-4 border ${meta.border} ${meta.bg}`}
                    >
                      <p className="text-xs text-slate-400 mb-1 font-medium">📌 핵심 이슈</p>
                      <p className="text-sm text-slate-300 leading-relaxed">{qData.issue}</p>
                    </div>
                  )}

                  {/* 메타 정보 행 */}
                  <div className="flex items-center gap-4 mb-5 flex-wrap">
                    {qData?.difficulty && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">난이도</span>
                        <DifficultyStars level={qData.difficulty} />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs text-slate-500">출제유형</span>
                      <span className="text-xs text-slate-400 font-medium">
                        {qData?.year === 2025 ? '📌 2025년 기출' : '✏️ 2026년 코치 출제'}
                      </span>
                    </div>
                    {qData?.submitter && qData.year !== 2025 && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-slate-500">출제자</span>
                        <span className="text-xs text-slate-400">{qData.submitter}</span>
                      </div>
                    )}
                  </div>

                  {/* PDF 버튼 */}
                  <div className="flex items-center gap-3">
                    <a
                      href={pdfUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white transition hover:opacity-90 shadow-lg"
                      style={{ background: meta.gradient }}
                    >
                      📄 문제 PDF 보기
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                    </a>
                    <span className={`text-xs px-3 py-1.5 rounded-full border font-medium ${meta.badge}`}>
                      #{qId}번 문제
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          시험 준비 안내
      ══════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl border border-slate-600/50 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
      >
        <div
          className="px-6 py-4 border-b border-slate-700"
          style={{ background: 'rgba(30,41,59,0.8)' }}
        >
          <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
            📋 시험 준비 안내
          </h3>
        </div>
        <div className="px-6 py-5 space-y-4">

          {/* 평가 방식 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div
              className="rounded-xl p-4 border border-blue-800/40"
              style={{ background: 'rgba(30,58,138,0.15)' }}
            >
              <p className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-1">
                🎤 인터뷰 (1:1 롤플레이)
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                배정된 문제 중 <span className="text-blue-300 font-bold">세무사 협력 커뮤니케이션</span> 롤플레이.
                세무사와의 관계 구축 · 프로젝트 협의 · 이해관계 조율 역량을 평가합니다.
              </p>
            </div>
            <div
              className="rounded-xl p-4 border border-purple-800/40"
              style={{ background: 'rgba(76,29,149,0.15)' }}
            >
              <p className="text-xs font-bold text-purple-400 mb-2 flex items-center gap-1">
                📊 PT (프레젠테이션)
              </p>
              <p className="text-xs text-slate-400 leading-relaxed">
                고객 솔루션 제안 및 프로젝트 설계를 <span className="text-purple-300 font-bold">발표 + 발제안</span>으로 제출.
                솔루션 제안력 · 실행 계획 · 리스크 관리 역량을 평가합니다.
              </p>
            </div>
          </div>

          {/* 시험 당일 일정 */}
          <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-700/50 border-b border-slate-700">
              <p className="text-xs font-bold text-slate-300">📅 시험 당일 일정 ({EXAM_DATE_STR})</p>
            </div>
            <div className="divide-y divide-slate-700/50">
              {[
                { time: '09:00 ~ 10:00', label: '평가위원 사전교육', note: '' },
                { time: '10:00 ~ 13:00', label: '오전 인터뷰', note: '1:1 롤플레이 · 세무사 협력 커뮤니케이션' },
                { time: '15:00 ~ 17:00', label: '오후 결과보기 + 발제안', note: 'PT 발표 · 고객 솔루션 제안' },
                { time: '17:00 ~ 18:00', label: 'FEEDBACK', note: '평가위원 종합 피드백' },
              ].map(({ time, label, note }) => (
                <div key={time} className="px-4 py-2.5 flex items-center gap-3">
                  <span className="text-xs font-mono text-slate-400 w-28 flex-shrink-0">{time}</span>
                  <div>
                    <span className="text-xs font-bold text-slate-200">{label}</span>
                    {note && <span className="text-xs text-slate-500 ml-2">{note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 핵심 체크리스트 */}
          <div>
            <p className="text-xs font-bold text-slate-400 mb-2">✅ 시험 전 준비 체크리스트</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {[
                '배정된 3문제 PDF 상세 내용 검토',
                '세무사 롤플레이 시나리오 준비',
                '고객 솔루션 발표 자료(PT) 작성',
                '발제안 문서 사전 제출 준비',
                '프로젝트 실행 계획 및 리스크 검토',
                '문제은행 PDF 전체 검토 권장',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-xs text-slate-400">
                  <span className="text-emerald-500 flex-shrink-0">□</span>
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* 문제 전체 PDF 링크 */}
          <div
            className="rounded-xl px-5 py-4 border border-amber-800/40 flex items-center gap-4"
            style={{ background: 'rgba(120,53,15,0.15)' }}
          >
            <span className="text-2xl flex-shrink-0">📚</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-amber-400 mb-0.5">문제은행 전체 PDF</p>
              <p className="text-xs text-amber-600/80">21문제 전체 내용 · 배정 문제 상세 내용 확인</p>
            </div>
            <a
              href={ROUND2_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold px-4 py-2 rounded-lg flex-shrink-0 transition hover:opacity-90 text-stone-900"
              style={{ background: 'linear-gradient(135deg, rgb(214,173,101) 0%, rgb(163,120,55) 100%)' }}
            >
              📂 폴더 열기 →
            </a>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          전체 일정 로드맵
      ══════════════════════════════════════════════════════ */}
      <div
        className="rounded-2xl border border-slate-600/50 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
      >
        <div className="px-6 py-4 border-b border-slate-700" style={{ background: 'rgba(30,41,59,0.8)' }}>
          <h3 className="text-base font-bold text-slate-200 flex items-center gap-2">
            🗺️ 치프인증 전체 일정
          </h3>
        </div>
        <div className="px-6 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {[
              { icon: '🎲', label: '2차 출제 (3문제 배정)', date: ROUND2_DATE_STR, active: true,  color: '#d97706' },
              { icon: '📚', label: '멘토링 기간 (선택)',     date: '3월 18일 ~ 27일',  active: new Date() >= MENTORING_START && new Date() <= MENTORING_END, color: '#10b981' },
              { icon: '🎰', label: '최종 1문제 추첨',        date: '3월 28일(토) 오전', active: false, color: '#ef4444' },
              { icon: '📋', label: '인증평가 실시',          date: EXAM_DATE_STR,       active: false, color: '#3b82f6' },
              { icon: '📢', label: '최종 결과 발표',         date: RESULT_DATE_STR,     active: false, color: '#10b981' },
              { icon: '🏆', label: '인증서 수여식',          date: CERT_DATE_STR,       active: false, color: '#f59e0b' },
            ].map(({ icon, label, date, active, color }) => (
              <div
                key={label}
                className="rounded-lg px-4 py-2.5 border flex items-center gap-3"
                style={{
                  borderColor: active ? `${color}50` : '#334155',
                  background: active ? `${color}10` : 'transparent',
                }}
              >
                <span className="text-lg flex-shrink-0">{icon}</span>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${active ? 'text-slate-200' : 'text-slate-400'}`}>{label}</p>
                  <p className="text-[11px] text-slate-500">{date}</p>
                </div>
                {active && (
                  <span className="w-2 h-2 rounded-full animate-pulse flex-shrink-0" style={{ background: color }} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          합격 기준 안내
      ══════════════════════════════════════════════════════ */}
      <div
        className="rounded-xl px-6 py-4 border border-slate-700 flex items-center gap-4 text-xs text-slate-400"
        style={{ background: 'rgba(15,23,42,0.6)' }}
      >
        <span className="text-lg flex-shrink-0">🏅</span>
        <p>
          합격 기준: 평가위원 평균 <span className="text-amber-400 font-bold">70점 이상</span> (총 100점 + 가점 10점) ·
          소속 평가위원 점수 제외 처리 · 인증서 수여식 <span className="text-amber-400 font-bold">{CERT_DATE_STR}</span>
        </p>
      </div>

    </div>
  );
}
