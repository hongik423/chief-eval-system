/**
 * 평가위원 / 관리자 사용 매뉴얼 모달
 * @encoding UTF-8
 */

import { useState } from 'react';
import { Button } from '@/components/ui';

const EVALUATOR_MANUAL = [
  { title: '1. 로그인', content: '로그인 화면에서 본인(평가위원) 아이디를 선택하고, 비밀번호를 입력한 뒤 [평가 시작]을 클릭합니다. 초기 비밀번호는 아이디와 동일합니다(예: ndh/ndh).' },
  { title: '2. 대시보드', content: '평가 대상 응시자 4명이 카드로 표시됩니다. 각 카드의 [평가하기] 버튼을 클릭하면 해당 응시자의 평가 폼으로 이동합니다.' },
  { title: '3. 평가 방식', content: '평가는 3개 역량 영역(A·B·C)으로 구성되며, 총 9개 항목·100점 만점입니다. A. 세무사 협력 커뮤니케이션 역량(50점), B. 고객 솔루션 제안 역량(30점), C. 프로젝트 설계 및 실무 역량(20점)입니다. 가점(최대 10점)은 별도 적용되어 110점 만점으로 최종 산정됩니다. 평균 70점 이상 시 합격입니다.' },
  { title: '4. 점수 입력', content: '각 평가 항목의 점수 입력란에 0~최대점수 범위 내의 점수를 입력합니다. 점수는 저장 버튼 없이 자동 저장되며, 모든 항목에 점수를 입력해야 [평가 완료 저장]이 활성화됩니다.' },
  { title: '5. 평가 코멘트 (선택) 입력 방법', content: '점수 입력 폼 하단의 "📝 평가 코멘트 (선택)" 섹션에서, 각 역량 영역(A·B·C)별로 의견을 작성할 수 있습니다. 각 영역마다 별도의 텍스트 입력란(placeholder: "○○ 역량에 대한 의견을 작성해 주세요...")이 있습니다. 코멘트는 필수가 아니지만, 치프인증자의 역량 강화를 위한 구체적 피드백을 위해 작성하는 것을 권장합니다. 작성한 코멘트는 관리자가 AI 평가보고서를 생성할 때 반영됩니다.' },
  { title: '6. 동일팀 제외', content: '응시자와 동일한 팀 소속인 평가위원의 점수는 최종 평균 산정에서 자동으로 제외됩니다. 자신이 제외 대상인지 확인한 뒤 평가를 진행해 주세요.' },
  { title: '7. 평가 완료 저장', content: '모든 항목에 점수를 입력한 후 [평가 완료 저장]을 클릭하면 저장됩니다. 저장 후 대시보드로 돌아가 다른 응시자를 평가할 수 있습니다. 저장 전에 작성한 코멘트도 함께 저장됩니다.' },
  { title: '8. 평가보고서 생성 흐름 (평가위원 참고)', content: '관리자가 평가보고서 탭에서 [보고서 생성]을 클릭하면, 평가위원들이 입력한 점수와 섹션별 코멘트(A·B·C)가 AI(Gemini + GPT)에 전달되어 평가보고서가 자동 생성됩니다. 보고서에는 모든 평가위원의 의견이 반영되며, 대비되는 의견이 있을 경우 상세히 포함됩니다. 평가위원의 구체적인 코멘트가 많을수록 치프인증자에게 유용한 역량 강화 피드백이 담긴 보고서가 생성됩니다. 생성된 보고서는 Word(.docx)로 다운로드됩니다.' },
  { title: '9. 비밀번호 변경', content: '대시보드 우측 상단의 [비밀번호 변경] 버튼으로 초기 비밀번호를 변경할 수 있습니다.' },
];

const ADMIN_MANUAL = [
  { title: '1. 로그인', content: '로그인 화면에서 [관리자]를 선택하고, 아이디·비밀번호를 입력한 뒤 [관리자로 입장]을 클릭합니다. (.env.local의 VITE_ADMIN_ID, VITE_ADMIN_PASSWORD 참조)' },
  { title: '2. 현황 요약', content: '총 응시자, 평가 진행, 합격/미달 현황을 한눈에 확인할 수 있습니다. 응시자별 카드에서 가점 입력·합격/미달 판정이 가능합니다.' },
  { title: '3. 기간 관리', content: '평가 기간(기수)을 생성·수정·활성화할 수 있습니다. 각 기간별로 평가위원을 배정하고, 응시자를 추가합니다.' },
  { title: '4. 응시자별 상세', content: '응시자별로 평가위원들의 점수, 섹션별 코멘트, 총점·평균·가점·합격 여부를 상세히 확인합니다.' },
  { title: '5. 평가위원별 현황', content: '각 평가위원이 어떤 응시자를 얼마나 평가했는지, 완료/미완료 상태를 확인할 수 있습니다.' },
  { title: '6. 평가보고서', content: 'AI(Gemini + GPT)로 응시자별 평가보고서를 자동 생성합니다. 표지에 치프인증자 이름과 AI 생성 이미지가 포함되며, Word(.docx)로 다운로드됩니다. VITE_GEMINI_API_KEY, VITE_OPENAI_API_KEY 설정 필요.' },
  { title: '7. 평가표 관리', content: '평가 기준(역량 섹션, 항목, 배점)을 수정·추가할 수 있습니다. 기간별로 적용됩니다.' },
  { title: '8. 데이터 추적', content: '점수 변경·세션 완료 등 모든 데이터 변경 이력(audit_log)을 조회합니다.' },
  { title: '9. 초기화', content: '[초기화] 버튼은 관리자 전용입니다. 클릭 시 관리자 비밀번호 재입력과 확인 문구 "초기화하라" 입력이 필요합니다. 두 조건을 모두 만족해야 실행되며, 모든 평가 점수·세션·가점·합격여부가 삭제됩니다. 되돌릴 수 없으니 신중히 사용하세요.' },
];

export default function ManualModal({ open, onClose, isAdmin }) {
  const [tab, setTab] = useState(isAdmin ? 'admin' : 'evaluator');
  const manual = tab === 'evaluator' ? EVALUATOR_MANUAL : ADMIN_MANUAL;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-100 border border-surface-500 rounded-2xl max-w-2xl w-full max-h-[90vh] min-h-0 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-500/60">
          <div className="flex gap-2">
            <button
              onClick={() => setTab('evaluator')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'evaluator' ? 'bg-brand-500 text-white' : 'text-slate-400 hover:bg-surface-300/50'}`}
            >
              평가위원 매뉴얼
            </button>
            <button
              onClick={() => setTab('admin')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === 'admin' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-slate-400 hover:bg-surface-300/50'}`}
            >
              관리자 매뉴얼
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>닫기</Button>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          <p className="text-sm text-slate-400 mb-6">
            {tab === 'evaluator' ? '평가위원이 평가를 진행하는 방법을 안내합니다.' : '관리자가 대시보드와 평가 관리를 수행하는 방법을 안내합니다.'}
          </p>
          {manual.map((item, i) => (
            <div key={i} className="border-l-2 border-brand-500/50 pl-4 py-1">
              <h3 className="text-sm font-bold text-white mb-1">{item.title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{item.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
