'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

const EVALUATORS = [
  { id: 'chairman', name: '평가위원장', role: '위원장' },
  { id: 'kwon_yd', name: '권영도', role: '평가위원' },
  { id: 'kwon_ok', name: '권오경', role: '평가위원' },
  { id: 'kim_h', name: '김홍', role: '평가위원' },
  { id: 'park_sh', name: '박성현', role: '평가위원' },
  { id: 'yoon_ds', name: '윤덕상', role: '평가위원' },
  { id: 'ha_sh', name: '하상현', role: '평가위원' },
];

export default function QuestionSelectionLoginPage() {
  const router = useRouter();
  const [selectedEvaluator, setSelectedEvaluator] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!selectedEvaluator) {
      setError('평가위원을 선택해주세요.');
      return;
    }
    if (!password) {
      setError('비밀번호를 입력해주세요.');
      return;
    }

    setLoading(true);

    try {
      const evaluator = EVALUATORS.find((ev) => ev.id === selectedEvaluator);
      if (!evaluator) {
        setError('유효하지 않은 평가위원입니다.');
        return;
      }

      const res = await fetch('/api/question-selection/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluatorId: selectedEvaluator,
          name: evaluator.name,
          password,
        }),
      });

      const data = await res.json();

      if (data.success) {
        // 세션 저장
        sessionStorage.setItem(
          'qs_evaluator',
          JSON.stringify({
            id: selectedEvaluator,
            name: evaluator.name,
            role: evaluator.role,
          })
        );
        router.push('/question-selection/vote');
      } else {
        setError(data.message || '로그인에 실패했습니다.');
      }
    } catch {
      setError('서버 연결에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto mt-12">
      {/* 안내 카드 */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        {/* 상단 배너 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-8 py-8 text-white text-center">
          <div className="text-5xl mb-3">📋</div>
          <h2 className="text-2xl font-bold mb-2">
            TEST 케이스 문제 선정
          </h2>
          <p className="text-blue-100 text-sm">
            2026년 ASSO 치프인증 1차 출제
          </p>
          <p className="text-blue-200 text-xs mt-1">
            각 분야별 1문제 선택 → 최다득표 순 3문제 확정
          </p>
        </div>

        {/* 투표 안내 */}
        <div className="px-8 py-4 bg-amber-50 border-b border-amber-100">
          <div className="flex items-start gap-2">
            <span className="text-amber-500 mt-0.5">ℹ️</span>
            <div className="text-xs text-amber-800">
              <p className="font-semibold mb-1">투표 안내</p>
              <ul className="space-y-0.5">
                <li>• 문제은행 21문제 중 분야별 1문제를 선택합니다</li>
                <li>• 3개 분야: 주식 이동 / 차명 주식 해소 / 가지급금 정리</li>
                <li>• 7명 평가위원의 최다득표 순 각 3문제 (총 9문제) 확정</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 로그인 폼 */}
        <form onSubmit={handleLogin} className="px-8 py-6 space-y-5">
          {/* 문제은행 PDF 링크 */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <p className="text-xs text-slate-500 mb-2 font-medium">
              📎 문제은행 PDF 확인
            </p>
            <a
              href="https://drive.google.com/file/d/1e3xqEpIarKz3KuGKLm5yTwQt3nmybhpM/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium underline"
            >
              📄 치프문제은행 21문제 보기 (Google Drive)
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>

          {/* 평가위원 선택 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              평가위원 선택
            </label>
            <div className="grid grid-cols-2 gap-2">
              {EVALUATORS.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => setSelectedEvaluator(ev.id)}
                  className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    selectedEvaluator === ev.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200'
                      : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
                  }`}
                >
                  <div className="font-bold">{ev.name}</div>
                  <div className="text-xs opacity-70">{ev.role}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 비밀번호 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호를 입력하세요"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all text-slate-900"
            />
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
              ⚠️ {error}
            </div>
          )}

          {/* 로그인 버튼 */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 rounded-lg font-bold text-base hover:from-blue-700 hover:to-indigo-800 transition-all shadow-lg disabled:opacity-50"
          >
            {loading ? '로그인 중...' : '🗳️ 문제 선정 투표 시작'}
          </button>
        </form>

        {/* 결과 보기 링크 */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 text-center">
          <button
            onClick={() => router.push('/question-selection/results')}
            className="text-sm text-slate-500 hover:text-blue-600 transition-colors underline"
          >
            📊 투표 현황 및 결과 보기
          </button>
        </div>
      </div>
    </div>
  );
}
