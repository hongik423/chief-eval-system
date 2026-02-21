/**
 * 2026년 ASSO 치프(PM) 인증 평가 공고
 * docs/plan.pdf 전문 동일 게시 (표는 HTML table로 표시)
 * @encoding UTF-8
 */

import { Button } from '@/components/ui';

const tableClass = 'w-full border-collapse text-sm';
const thClass = 'border border-surface-500/60 bg-surface-200/80 px-3 py-2 text-left font-semibold text-white';
const tdClass = 'border border-surface-500/40 px-3 py-2 text-slate-400';

export default function AnnouncementModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-surface-100 border border-surface-500 rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-surface-500/60 shrink-0">
          <h2 className="text-lg font-bold text-white">2026년 ASSO 치프(PM) 인증 평가 공고</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>닫기</Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 text-[13px] text-slate-300 leading-relaxed space-y-6">
          {/* 1. 개요 */}
          <section>
            <h3 className="font-bold text-white mb-2">1. 개요</h3>
            <h4 className="font-semibold text-slate-200 mt-3 mb-1">1.1 목적</h4>
            <p>본 평가는 어쏘(Associate) 직급에서 프로젝트 매니저(PM) 역할을 수행하는 치프(Chief) 직급으로의 인증을 위한 종합 평가 제도입니다.</p>
            <h4 className="font-semibold text-slate-200 mt-3 mb-1">1.2 배경</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>2025년 제도 운영 결과 반영: 경영진 피드백과 1기 운영 경험을 바탕으로 개선</li>
              <li>PM 역할 명확화: 기업의별 제휴 세무사(1,874명)와 협력하는 프로젝트 관리 전문가 양성</li>
              <li>ASSO 직무의 한시적 운영: 비상시적(非常時的) 직무로 향후 미운영 예정</li>
            </ul>
            <h4 className="font-semibold text-slate-200 mt-3 mb-1">1.3 평가 대상</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>치프 인증 지원 어쏘: 김민경, 김창곤, 백진영, 양현호</li>
              <li>2026년 상반기 지원 예상 인원: 5명 내외</li>
            </ul>
          </section>

          {/* 2. 평가 체계 */}
          <section>
            <h3 className="font-bold text-white mb-2">2. 평가 체계</h3>
            <h4 className="font-semibold text-slate-200 mt-3 mb-1">2.1 평가위원회 구성</h4>
            <ul className="list-disc pl-5 space-y-1">
              <li>평가위원장: 나동환 대표</li>
              <li>평가위원: 권영도, 권오경, 김홍, 박성현, 윤덕상, 하상현 6명 이상 (코치자격보유 치프)</li>
            </ul>
            <h4 className="font-semibold text-slate-200 mt-3 mb-1">2.2 평가 구성 및 배점 (총 110점 = PM 역량평가 100점 + 가점제도 10점)</h4>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>평가 영역</th>
                  <th className={thClass}>배점</th>
                  <th className={thClass}>평가 방법</th>
                  <th className={thClass}>세부 항목</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={tdClass}>PM 역량 평가</td>
                  <td className={tdClass}>100점</td>
                  <td className={tdClass}>PT+인터뷰</td>
                  <td className={tdClass}>
                    A. 세무사 협력 커뮤니케이션 역량 (50점)<br />
                    B. 고객 솔루션 제안 커뮤니케이션 역량 (30점)<br />
                    C. 프로젝트 설계 및 실무 역량 (20점)
                  </td>
                </tr>
                <tr>
                  <td className={tdClass}>치프 역량 강화 교육 이수 가점</td>
                  <td className={tdClass}>10점</td>
                  <td className={tdClass}>역량강화 코치 평가 가점</td>
                  <td className={tdClass}>
                    • 역량강화 담당코치 교육 이수 평가 점수 반영 (10점 만점: 평가점수 가점 반영)<br />
                    • 2026년 역량강화 담당코치: 하상현 수석
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 3. 세부 평가 기준 */}
          <section>
            <h3 className="font-bold text-white mb-2">3. 세부 평가 기준</h3>
            <h4 className="font-semibold text-slate-200 mt-3 mb-1">3.1 PM 역량 평가 (100점) - TEST RED</h4>
            <p className="mb-2">출제 방식</p>
            <ul className="list-disc pl-5 space-y-1 mb-4">
              <li>1차 출제 시기: TEST RED 30일 전 (각 분야별 3문제씩 출제, 총 9문제 출제)</li>
              <li>출제 분야: 주식 이동 3문제, 차명 주식 해소 3문제, 가지급금 정리 3문제</li>
              <li>출제 위원: 평가위원장, 권영도, 권오경, 김홍, 박성현, 윤덕상, 하상현</li>
              <li>1차 출제 2월 26일(목), 2차 출제 3월 18일(수)</li>
              <li>최종평가일 3월 28일(토) 오전 10시~오후 6시</li>
              <li>2차 출제 3문제 중 Random 1문제 선택 → 오전 인터뷰 | 오후 결과보기+발제안 (평가위원회 전원참석, 소속 평가대상자 제외)</li>
            </ul>
            <p className="mb-2">평가표 예시</p>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>평가 영역</th>
                  <th className={thClass}>배점</th>
                  <th className={thClass}>평가 방식</th>
                  <th className={thClass}>세부 평가 항목</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={tdClass}>A. 세무사 협력 커뮤니케이션 역량</td>
                  <td className={tdClass}>50점</td>
                  <td className={tdClass}>인터뷰 (1:1 롤플레이)</td>
                  <td className={tdClass}>
                    • 세무사 응대 및 관계 구축 능력 (20점)<br />
                    • 프로젝트 협의 커뮤니케이션 스킬 (20점)<br />
                    • 치프-세무사-고객 간 인터페이스 조율 역량 (10점)
                  </td>
                </tr>
                <tr>
                  <td className={tdClass}>B. 고객 솔루션 제안 커뮤니케이션 역량</td>
                  <td className={tdClass}>30점</td>
                  <td className={tdClass}>PT (프레젠테이션)</td>
                  <td className={tdClass}>
                    • 고객 문제 진단 및 설명 능력 (10점)<br />
                    • 솔루션 제안 전달력 및 설득력 (10점)<br />
                    • 금융/법률 연계 방안 제시 능력 (10점)
                  </td>
                </tr>
                <tr>
                  <td className={tdClass}>C. 프로젝트 설계 및 실무 역량</td>
                  <td className={tdClass}>20점</td>
                  <td className={tdClass}>PT (프레젠테이션)</td>
                  <td className={tdClass}>
                    • 프로젝트 목표 및 범위 정의 (10점)<br />
                    • 단계별 실행 계획 수립 (5점)<br />
                    • 리스크 관리 및 대응 전략 (5점)
                  </td>
                </tr>
                <tr>
                  <td className={tdClass + ' font-semibold'}>합계</td>
                  <td className={tdClass}>100점</td>
                  <td className={tdClass}>-</td>
                  <td className={tdClass}>-</td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 4. 평가 진행 일정 */}
          <section>
            <h3 className="font-bold text-white mb-2">4. 평가 진행 일정</h3>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>단계</th>
                  <th className={thClass}>일정</th>
                  <th className={thClass}>주요 내용</th>
                  <th className={thClass}>세부 사항</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={tdClass}>1-1 단계 지원서 접수 및 자격 검증</td>
                  <td className={tdClass}>2월 12일(목)~2월 20일(금) (8일간)</td>
                  <td className={tdClass}>• 공고 발표<br />• 지원서 접수</td>
                  <td className={tdClass}>• 접수 마감: 2월 20일(금) 18시<br />• 제출처: lhk@stellain.com</td>
                </tr>
                <tr>
                  <td className={tdClass}>1-2 단계</td>
                  <td className={tdClass}>2/23(월) 11시</td>
                  <td className={tdClass}>- 평가제도 안내: 이후경<br />- 역량강화 코칭: 하상현<br />- 최고 10점 가점제도</td>
                  <td className={tdClass}>-</td>
                </tr>
                <tr>
                  <td className={tdClass}>2-1 단계 1차 출제</td>
                  <td className={tdClass}>2월 26일(목) (평가일 30일 전)</td>
                  <td className={tdClass}>1차 출제</td>
                  <td className={tdClass}>• TEST 케이스 9문제 출제<br />• 출제위원 7명<br />• 주식이동+차명주식+가지급금 각 3문제<br />• 난이도: 중 (커뮤니케이션 중심)<br />• 인터뷰 예상 질문 10개 내외</td>
                </tr>
                <tr>
                  <td className={tdClass}>2-2 단계 2차 출제</td>
                  <td className={tdClass}>3월 18일(수) (평가일 10일 전)</td>
                  <td className={tdClass}>2차 출제</td>
                  <td className={tdClass}>• 최종 3문제 선정 및 배정<br />• 1차 9문제 중 분야별 1문제씩 선정<br />• 멘토링 기간 시작 (3/18~3/27, 선택)</td>
                </tr>
                <tr>
                  <td className={tdClass}>3 단계 응시자 준비 기간</td>
                  <td className={tdClass}>2월 26일 ~ 3월 27일 (30일)</td>
                  <td className={tdClass}>• 학습 및 준비<br />• 멘토링 참여</td>
                  <td className={tdClass}>• 선택적 멘토링 (3/18~3/27)</td>
                </tr>
                <tr>
                  <td className={tdClass}>4 단계 최종 문제 선정</td>
                  <td className={tdClass}>3월 28일(토) 오전 (평가 당일)</td>
                  <td className={tdClass}>• 평가 문제 추첨</td>
                  <td className={tdClass}>• 2차 3문제 중 1문제 Random 선택 (평가당일 선정)</td>
                </tr>
                <tr>
                  <td className={tdClass}>5 단계 인증평가 실시</td>
                  <td className={tdClass}>3월 28일(토) 10:00~18:00</td>
                  <td className={tdClass}>[9:00~10:00 평가위원 사전교육]<br />[10:00~13:00 오전 인터뷰]<br />[15:00~17:00 오후 결과보기+발제안]<br />[17:00~18:00 FEEDBACK]</td>
                  <td className={tdClass}>• 1:1 롤플레이 인터뷰<br />• 케이스 PT<br />• 평가위원 전원 참석</td>
                </tr>
                <tr>
                  <td className={tdClass}>6 단계 평가위원 협의</td>
                  <td className={tdClass}>3월 28일(토) (평가 당일)</td>
                  <td className={tdClass}>• 평가 결과 협의<br />• 합격/불합격 결정</td>
                  <td className={tdClass}>• PM 역량 100점+가점 10점, 평균 70점 이상 합격</td>
                </tr>
                <tr>
                  <td className={tdClass}>7 단계 최종 결과 발표</td>
                  <td className={tdClass}>3월 31일(화)</td>
                  <td className={tdClass}>• 결과 공지<br />• 피드백 제공</td>
                  <td className={tdClass}>• 합격/불합격만 공개 (점수 비공개)<br />• 평가표는 응시자에게 비공개</td>
                </tr>
                <tr>
                  <td className={tdClass}>8 단계 인증서 수여식</td>
                  <td className={tdClass}>4월 TAG일</td>
                  <td className={tdClass}>• 인증서 수여</td>
                  <td className={tdClass}>• 전사 행사로 진행</td>
                </tr>
              </tbody>
            </table>
            <p className="font-semibold text-slate-200 mt-3 mb-1">핵심 일정 요약</p>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>구분</th>
                  <th className={thClass}>날짜</th>
                  <th className={thClass}>비고</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className={tdClass}>공고 발표</td><td className={tdClass}>2월 12일(목)</td><td className={tdClass}>-</td></tr>
                <tr><td className={tdClass}>지원 마감</td><td className={tdClass}>2월 20일(금) 18시</td><td className={tdClass}>lhk@stellain.com</td></tr>
                <tr><td className={tdClass}>1차 출제(9문제)</td><td className={tdClass}>2월 26일(목)</td><td className={tdClass}>평가일 30일 전</td></tr>
                <tr><td className={tdClass}>2차 출제(3문제)</td><td className={tdClass}>3월 18일(수)</td><td className={tdClass}>평가일 10일 전</td></tr>
                <tr><td className={tdClass}>멘토링 기간</td><td className={tdClass}>3월 18일 ~ 3월 27일</td><td className={tdClass}>선택사항</td></tr>
                <tr><td className={tdClass}>인증 평가일</td><td className={tdClass}>3월 28일(토) 10:00~18:00</td><td className={tdClass}>-</td></tr>
                <tr><td className={tdClass}>결과 발표</td><td className={tdClass}>3월 31일(화)</td><td className={tdClass}>합격/불합격만 공개</td></tr>
                <tr><td className={tdClass}>인증서 수여식</td><td className={tdClass}>4월 TAG일</td><td className={tdClass}>전사 행사</td></tr>
              </tbody>
            </table>
          </section>

          {/* 5. 인증 요건 */}
          <section>
            <h3 className="font-bold text-white mb-2">5. 인증 요건</h3>
            <h4 className="font-semibold text-slate-200 mt-3 mb-1">5.1 합격 기준</h4>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>구분</th>
                  <th className={thClass}>내용</th>
                  <th className={thClass}>세부 설명</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={tdClass}>평가 점수 산정</td>
                  <td className={tdClass}>평가위원 평균 점수 70점 이상</td>
                  <td className={tdClass}>
                    • 총점: PM 100점 + 가점 10점 = 110점 만점<br />
                    • 소속 평가위원 점수 제외<br />
                    • 가산점: 치프 역량강화 교육 이수 가점 ÷ 평가자인원수
                  </td>
                </tr>
                <tr>
                  <td className={tdClass}>합격 기준</td>
                  <td className={tdClass}>평균 70점 이상</td>
                  <td className={tdClass}>• 110점 만점 기준 70점 이상<br />• 약 64% 이상 득점 필요</td>
                </tr>
              </tbody>
            </table>
            <h4 className="font-semibold text-slate-200 mt-3 mb-1">5.2 평가 점수 산정 방식 - 점수 산정 예시</h4>
            <p className="mb-2">[예시 1] 평가 대상자가 A팀 소속인 경우</p>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>평가위원</th>
                  <th className={thClass}>소속</th>
                  <th className={thClass}>평가 점수</th>
                  <th className={thClass}>산정 여부</th>
                </tr>
              </thead>
              <tbody>
                <tr><td className={tdClass}>나동환</td><td className={tdClass}>대표</td><td className={tdClass}>75점</td><td className={tdClass}>산정</td></tr>
                <tr><td className={tdClass}>권영도</td><td className={tdClass}>B팀</td><td className={tdClass}>80점</td><td className={tdClass}>산정</td></tr>
                <tr><td className={tdClass}>권오경</td><td className={tdClass}>C팀</td><td className={tdClass}>72점</td><td className={tdClass}>산정</td></tr>
                <tr><td className={tdClass}>김홍</td><td className={tdClass}>A팀</td><td className={tdClass}>85점</td><td className={tdClass + ' text-red-400'}>❌ 제외 (동일팀)</td></tr>
                <tr><td className={tdClass}>박성현</td><td className={tdClass}>D팀</td><td className={tdClass}>68점</td><td className={tdClass}>산정</td></tr>
                <tr><td className={tdClass}>윤덕상</td><td className={tdClass}>E팀</td><td className={tdClass}>78점</td><td className={tdClass}>산정</td></tr>
                <tr><td className={tdClass}>하상현</td><td className={tdClass}>F팀</td><td className={tdClass}>74점</td><td className={tdClass}>산정</td></tr>
                <tr><td className={tdClass}>치프 역량 강화 교육 이수 가점</td><td className={tdClass}>2026년 담당 코치</td><td className={tdClass}>10점</td><td className={tdClass}>산정</td></tr>
              </tbody>
            </table>
            <p className="mt-2">평균 점수 계산: (75+80+72+68+78+74+10) ÷ 6명 = 76.2점 → 합격</p>
            <h4 className="font-semibold text-slate-200 mt-3 mb-1">5.3 인증 혜택</h4>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>혜택 구분</th>
                  <th className={thClass}>내용</th>
                  <th className={thClass}>비고</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={tdClass}>1) 독립 업무(Ri) 배정</td>
                  <td className={tdClass}>• 분기별 신규 치프에게 독립 업무 배정<br />• 소속 팀 선임 치프가 Ri 배정 관리 책임</td>
                  <td className={tdClass}>치프 인증 즉시</td>
                </tr>
                <tr>
                  <td className={tdClass}>2) 파트너 세무사 배정</td>
                  <td className={tdClass}>• 치프 선임 후 6개월 레지던트 기간<br />• 성과 평가 통과 시 파트너 세무사 배정</td>
                  <td className={tdClass}>6개월 후 성과평가 통과 시</td>
                </tr>
              </tbody>
            </table>
            <h4 className="font-semibold text-slate-200 mt-3 mb-1">5.4 불합격 시 조치</h4>
            <table className={tableClass}>
              <thead>
                <tr>
                  <th className={thClass}>구분</th>
                  <th className={thClass}>내용</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className={tdClass}>결과 통보</td>
                  <td className={tdClass}>• 합격/불합격 여부만 공개 (점수 비공개)<br />• 평가표는 응시자에게 비공개</td>
                </tr>
                <tr>
                  <td className={tdClass}>피드백 제공</td>
                  <td className={tdClass}>• 불합격자 개별 피드백 제공<br />• 보완이 필요한 역량 영역 안내</td>
                </tr>
                <tr>
                  <td className={tdClass}>재응시</td>
                  <td className={tdClass}>• 다음 정기 평가(매년 3월) 재응시 가능<br />• 재응시 횟수 제한 없음</td>
                </tr>
              </tbody>
            </table>
            <p className="font-semibold text-slate-200 mt-3 mb-1">핵심 요약</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>합격 기준: 평균 70점 이상 (110점 만점)</li>
              <li>공정성 확보: 소속 팀 평가위원 점수 제외</li>
              <li>평가 투명성: 점수 비공개, 합격 여부만 공개</li>
              <li>성장 기회: 불합격 시 피드백 제공 및 재응시 가능</li>
            </ul>
          </section>

          {/* 6. 문의 및 피드백 */}
          <section>
            <h3 className="font-bold text-white mb-2">6. 문의 및 피드백</h3>
            <p className="font-semibold text-slate-200 mb-1">담당 부서</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>HRD 팀: 강선애 | 이후경</li>
              <li>전화: 010-9251-9743 | E-MAIL: lhk@stellain.com</li>
              <li>카카오톡: 2026 기업의별 치프인증과정</li>
              <li>근무 시간: 평일 09:00~18:00</li>
            </ul>
            <p className="font-semibold text-slate-200 mt-3 mb-1">피드백 제출</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>제도 개선 의견은 이메일로 상시 접수</li>
              <li>분기별 피드백 취합 후 제도 개선 반영</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
