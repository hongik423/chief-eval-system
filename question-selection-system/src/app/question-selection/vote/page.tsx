'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  {
    key: 'stock_transfer',
    label: '주식 이동 프로젝트 설계',
    color: 'blue',
    bgGradient: 'from-blue-700 to-blue-900',
    darkBg: 'bg-blue-950/30',
    borderColor: 'border-blue-500',
    textColor: 'text-blue-400',
    ringColor: 'ring-blue-700/50',
    questionIds: [1, 2, 3, 4, 5, 6, 7],
  },
  {
    key: 'nominee_stock',
    label: '차명 주식 해소 프로젝트 설계',
    color: 'purple',
    bgGradient: 'from-purple-700 to-purple-900',
    darkBg: 'bg-purple-950/30',
    borderColor: 'border-purple-500',
    textColor: 'text-purple-400',
    ringColor: 'ring-purple-700/50',
    questionIds: [8, 9, 10, 11, 12, 13, 14],
  },
  {
    key: 'temporary_payment',
    label: '가지급금 정리 프로젝트 설계',
    color: 'green',
    bgGradient: 'from-emerald-700 to-emerald-900',
    darkBg: 'bg-emerald-950/30',
    borderColor: 'border-emerald-500',
    textColor: 'text-emerald-400',
    ringColor: 'ring-emerald-700/50',
    questionIds: [15, 16, 17, 18, 19, 20, 21],
  },
];

const QUESTIONS: Record<number, { title: string; submitter: string; issue: string; difficulty: number }> = {
  1: { title: 'Cloud A사 - 가업승계 전략', submitter: '김홍', issue: '가업승계 증여세 과세특례 및 기업가치 관리', difficulty: 3 },
  2: { title: '제조 B사 - 지분 분산 및 경영권 강화', submitter: '권영도', issue: '형제간 지분 분쟁 예방 및 경영권 안정화', difficulty: 3 },
  3: { title: 'IT서비스 C사 - 스톡옵션 연계 승계', submitter: '권오경', issue: '핵심인재 유지와 연계한 단계적 지분 이전', difficulty: 3 },
  4: { title: '유통 D사 - 가족 법인 활용 승계', submitter: '박성현', issue: '개인 지분의 가족법인 이전을 통한 절세 승계', difficulty: 4 },
  5: { title: '건설 E사 - 합병을 통한 지분 구조조정', submitter: '윤덕상', issue: '계열사 합병을 활용한 지배구조 개편', difficulty: 4 },
  6: { title: '식품 F사 - 물적분할 후 지분 이전', submitter: '하상현', issue: '사업부 물적분할을 통한 승계 대상 기업가치 축소', difficulty: 4 },
  7: { title: '바이오 G사 - IPO 전 긴급 승계', submitter: '평가위원장', issue: 'IPO 추진 중 급격한 기업가치 상승 전 선제적 승계', difficulty: 5 },
  8: { title: '화학 D사 - 긴급 차명주식 회수', submitter: '김홍', issue: '명의신탁주식 실제소유자 확인 및 상속 리스크 관리', difficulty: 3 },
  9: { title: '물류 H사 - 전직 임원 차명주식', submitter: '권영도', issue: '퇴직 임원 명의 차명주식 회수 및 소송 리스크 관리', difficulty: 3 },
  10: { title: '섬유 I사 - 친인척 차명 다수 분산', submitter: '권오경', issue: '친인척 다수에 분산된 차명주식의 체계적 정리', difficulty: 3 },
  11: { title: '전자부품 J사 - 해외법인 차명', submitter: '박성현', issue: '해외법인 경유 차명주식의 국제세무 리스크 관리', difficulty: 4 },
  12: { title: '의료기기 K사 - 상속 발생 후 차명', submitter: '윤덕상', issue: '피상속인 사망 후 발견된 차명주식 처리', difficulty: 4 },
  13: { title: '건축자재 L사 - 위장분산 차명', submitter: '하상현', issue: '과점주주 회피 목적 위장분산 차명의 긴급 정상화', difficulty: 4 },
  14: { title: '반도체소재 M사 - 복합 차명 구조', submitter: '평가위원장', issue: '차명+교차소유+순환출자 복합구조 일괄 정리', difficulty: 5 },
  15: { title: '건재 M사 - 특허권 활용 정리', submitter: '김홍', issue: '특허권 활용 및 이익소각을 통한 SP(가지급금) 정리', difficulty: 3 },
  16: { title: '인쇄 N사 - 부동산 현물변제', submitter: '권영도', issue: '대표이사 부동산 현물변제를 통한 대규모 가지급금 해소', difficulty: 3 },
  17: { title: '소프트웨어 O사 - 급여체계 개편 정리', submitter: '권오경', issue: '임원 급여체계 재설계를 통한 가지급금 단계적 해소', difficulty: 3 },
  18: { title: '기계설비 P사 - 배당 활용 정리', submitter: '박성현', issue: '특별배당 및 중간배당을 활용한 가지급금 상쇄', difficulty: 4 },
  19: { title: '화장품 Q사 - 매출채권 활용 정리', submitter: '윤덕상', issue: '대표이사 관계사 매출채권 상계를 통한 가지급금 해소', difficulty: 4 },
  20: { title: '물류 R사 - 복합 가지급금 긴급 정리', submitter: '하상현', issue: '세무조사 사전통지 후 복합 가지급금 긴급 대응', difficulty: 4 },
  21: { title: '종합상사 S사 - 해외법인 가지급금', submitter: '평가위원장', issue: '해외법인 경유 가지급금의 국제세무 복합 리스크 해소', difficulty: 5 },
};

interface EvaluatorInfo {
  id: string;
  name: string;
  role: string;
}

export default function VotePage() {
  const router = useRouter();
  const [evaluator, setEvaluator] = useState<EvaluatorInfo | null>(null);
  const [selections, setSelections] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<number | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('qs_evaluator');
    if (!stored) {
      router.push('/question-selection');
      return;
    }
    setEvaluator(JSON.parse(stored));
  }, [router]);

  const handleSelect = (categoryKey: string, questionId: number) => {
    setSelections((prev) => ({
      ...prev,
      [categoryKey]: prev[categoryKey] === questionId ? 0 : questionId,
    }));
  };

  const allSelected = CATEGORIES.every(
    (cat) => selections[cat.key] && selections[cat.key] > 0
  );

  const handleSubmit = async () => {
    if (!evaluator || !allSelected) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/question-selection/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          evaluatorId: evaluator.id,
          evaluatorName: evaluator.name,
          votes: {
            stock_transfer: selections['stock_transfer'],
            nominee_stock: selections['nominee_stock'],
            temporary_payment: selections['temporary_payment'],
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        alert(data.message || '투표 제출에 실패했습니다.');
      }
    } catch {
      alert('서버 연결에 실패했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!evaluator) return null;

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto mt-12">
        <div className="bg-[#0f1117] rounded-2xl shadow-2xl border border-gray-800 overflow-hidden text-center">
          <div className="bg-gradient-to-r from-emerald-800 to-green-900 px-8 py-10 text-white">
            <div className="w-16 h-16 bg-green-700/50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-9 h-9 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold mb-2">투표 완료</h2>
            <p className="text-green-200">{evaluator.name}님의 투표가 성공적으로 제출되었습니다.</p>
          </div>
          <div className="px-8 py-6 space-y-3">
            {CATEGORIES.map((cat) => (
              <div key={cat.key} className={`${cat.darkBg} border border-gray-700 rounded-lg p-4 text-left`}>
                <div className="text-xs text-gray-500 mb-1">{cat.label}</div>
                <div className={`font-bold ${cat.textColor}`}>
                  {selections[cat.key]}번 - {QUESTIONS[selections[cat.key]]?.title}
                </div>
              </div>
            ))}
          </div>
          <div className="px-8 py-6 border-t border-gray-800 space-y-3">
            <button
              onClick={() => router.push('/question-selection/results')}
              className="w-full bg-blue-700 hover:bg-blue-600 text-white py-3 rounded-lg font-bold transition"
            >
              투표 현황 보기
            </button>
            <button
              onClick={() => {
                setSubmitted(false);
                setSelections({});
              }}
              className="w-full bg-gray-800 text-gray-400 py-3 rounded-lg font-medium hover:bg-gray-700 transition"
            >
              다시 투표하기
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* 상단 정보 */}
      <div className="bg-[#0f1117] rounded-xl border border-gray-800 px-6 py-4 mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-900/50 rounded-full flex items-center justify-center border border-blue-700/50">
            <span className="text-blue-400 font-bold text-lg">
              {evaluator.name.charAt(0)}
            </span>
          </div>
          <div>
            <div className="font-bold text-white">{evaluator.name}</div>
            <div className="text-xs text-gray-500">{evaluator.role}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <a
            href="https://drive.google.com/file/d/1e3xqEpIarKz3KuGKLm5yTwQt3nmybhpM/view?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
          >
            문제은행 PDF
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <div className="text-sm text-gray-400">
            선택: <span className="font-bold text-blue-400">{Object.values(selections).filter(v => v > 0).length}</span>/3
          </div>
        </div>
      </div>

      {/* 3개 분야 투표 */}
      <div className="space-y-8">
        {CATEGORIES.map((cat) => (
          <div key={cat.key} className="bg-[#0f1117] rounded-xl border border-gray-800 overflow-hidden">
            {/* 분야 헤더 */}
            <div className={`bg-gradient-to-r ${cat.bgGradient} px-6 py-4 text-white`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-lg">{cat.label}</h3>
                  <p className="text-sm opacity-80">7문제 중 1문제를 선택하세요</p>
                </div>
                {selections[cat.key] > 0 && (
                  <div className="bg-white/15 backdrop-blur rounded-lg px-3 py-1.5 text-sm font-medium">
                    {selections[cat.key]}번 선택됨
                  </div>
                )}
              </div>
            </div>

            {/* 문제 목록 */}
            <div className="divide-y divide-gray-800">
              {cat.questionIds.map((qId) => {
                const q = QUESTIONS[qId];
                const isSelected = selections[cat.key] === qId;
                const isExpanded = expandedQuestion === qId;

                return (
                  <div
                    key={qId}
                    className={`transition-all ${
                      isSelected
                        ? `${cat.darkBg} border-l-4 ${cat.borderColor}`
                        : 'border-l-4 border-transparent hover:bg-gray-800/30'
                    }`}
                  >
                    <div className="px-6 py-4 flex items-start gap-4">
                      {/* 투표 버튼 */}
                      <button
                        onClick={() => handleSelect(cat.key, qId)}
                        className={`mt-1 w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                          isSelected
                            ? `${cat.borderColor} ${cat.darkBg} ${cat.textColor}`
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        {isSelected ? (
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        ) : (
                          <span className="text-xs text-gray-600 font-bold">{qId}</span>
                        )}
                      </button>

                      {/* 문제 정보 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                            isSelected ? `${cat.darkBg} ${cat.textColor}` : 'bg-gray-800 text-gray-500'
                          }`}>
                            {qId}번
                          </span>
                          <span className="text-xs text-gray-600">출제: {q.submitter}</span>
                          <div className="flex gap-0.5">
                            {Array.from({ length: 5 }, (_, i) => (
                              <span key={i} className={`text-xs ${i < q.difficulty ? 'text-amber-400' : 'text-gray-700'}`}>
                                ★
                              </span>
                            ))}
                          </div>
                        </div>
                        <h4 className={`font-bold text-sm mb-1 ${isSelected ? cat.textColor : 'text-gray-200'}`}>
                          {q.title}
                        </h4>
                        <p className="text-xs text-gray-500 mb-2">{q.issue}</p>

                        {/* 상세 보기 토글 */}
                        <button
                          onClick={() => setExpandedQuestion(isExpanded ? null : qId)}
                          className="text-xs text-blue-500 hover:text-blue-400 flex items-center gap-1"
                        >
                          {isExpanded ? '접기 ▲' : '상세보기 ▼'}
                        </button>

                        {/* 확장 내용 */}
                        {isExpanded && (
                          <div className="mt-3 bg-gray-800/60 rounded-lg p-4 text-xs text-gray-400 space-y-2 border border-gray-700">
                            <p className="font-medium text-gray-300">
                              문제은행 PDF에서 상세 내용을 확인하세요
                            </p>
                            <a
                              href="https://drive.google.com/file/d/1e3xqEpIarKz3KuGKLm5yTwQt3nmybhpM/view?usp=sharing"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-blue-400 underline"
                            >
                              문제은행 PDF 보기 →
                            </a>
                          </div>
                        )}
                      </div>

                      {/* 선택 버튼 */}
                      <button
                        onClick={() => handleSelect(cat.key, qId)}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${
                          isSelected
                            ? `bg-gradient-to-r ${cat.bgGradient} text-white shadow-md`
                            : 'bg-gray-800 text-gray-500 hover:bg-gray-700'
                        }`}
                      >
                        {isSelected ? '선택됨' : '선택'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 하단 제출 바 */}
      <div className="sticky bottom-0 mt-8 bg-[#0f1117]/95 backdrop-blur border border-gray-700 rounded-xl shadow-2xl px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-bold text-white">
              {evaluator.name}님의 투표
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {CATEGORIES.map((cat) => (
                <span key={cat.key} className="mr-3">
                  {cat.label.split(' ')[0]}{' '}
                  {selections[cat.key] > 0 ? (
                    <span className={cat.textColor}>
                      {selections[cat.key]}번
                    </span>
                  ) : (
                    <span className="text-gray-700">미선택</span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={handleSubmit}
            disabled={!allSelected || submitting}
            className={`px-8 py-3 rounded-lg font-bold text-sm transition-all ${
              allSelected
                ? 'bg-gradient-to-r from-blue-700 to-indigo-800 text-white shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-indigo-700'
                : 'bg-gray-800 text-gray-600 cursor-not-allowed'
            }`}
          >
            {submitting ? '제출 중...' : allSelected ? '투표 제출' : `${3 - Object.values(selections).filter(v => v > 0).length}개 분야 선택 필요`}
          </button>
        </div>
      </div>
    </div>
  );
}
