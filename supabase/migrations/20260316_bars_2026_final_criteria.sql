-- ═══════════════════════════════════════════════════════════════
-- 변경일: 2026-03-16
-- 변경내용: 2026년 치프인증 BARS 평가표 최종확정 기준 반영
--   - A: 커뮤니케이션(인터뷰) 역량 50점
--   - B: 결과보기 제안능력 40점
--   - C: 실행설계와 위험고지 10점
--   - 세부 항목 라벨·설명·배점 동기화
-- 적용 대상: Supabase 운영 DB (period a0000000-0000-0000-0000-000000000001)
-- ═══════════════════════════════════════════════════════════════

BEGIN;

-- 1. 평가 기준 섹션 업데이트 (A, B, C)
UPDATE chief_eval_criteria_sections
SET
  label = '커뮤니케이션(인터뷰) 역량',
  max_score = 50,
  eval_method = '인터뷰 (1:1 롤플레이)'
WHERE id = 'A' AND period_id = 'a0000000-0000-0000-0000-000000000001';

UPDATE chief_eval_criteria_sections
SET
  label = '결과보기 제안능력',
  max_score = 40,
  eval_method = 'PT (프레젠테이션 / 결과보기 롤플레이)'
WHERE id = 'B' AND period_id = 'a0000000-0000-0000-0000-000000000001';

UPDATE chief_eval_criteria_sections
SET
  label = '실행설계와 위험고지',
  max_score = 10,
  eval_method = 'PT (실무 설계 기반)'
WHERE id = 'C' AND period_id = 'a0000000-0000-0000-0000-000000000001';

-- 2. 평가 기준 항목 업데이트 (A1, A2, A3)
UPDATE chief_eval_criteria_items
SET
  label = '고객과의 관계 정립 + 브랜드 소개',
  max_score = 20,
  description = '고객과의 첫 만남에서 신뢰를 형성하고, 기업의별 브랜드와 치프의 역할·차별점을 명확히 소개하는 역량'
WHERE id = 'A1' AND section_id = 'A';

UPDATE chief_eval_criteria_items
SET
  label = '이슈 인터뷰 (Hidden Interest 찾기)',
  max_score = 20,
  description = '구조화된 인터뷰를 통해 고객의 표면적 발언 이면에 있는 숨겨진 관심사(Hidden Interest)를 발굴하는 역량'
WHERE id = 'A2' AND section_id = 'A';

UPDATE chief_eval_criteria_items
SET
  label = '거절처리와 차별화 포인트',
  max_score = 10,
  description = '고객의 가격·기간·필요성 거절에 능숙하게 대응하고, 기업의별 치프 서비스의 차별화 포인트를 설득력 있게 제시하는 역량'
WHERE id = 'A3' AND section_id = 'A';

-- 3. 평가 기준 항목 업데이트 (B1, B2, B3)
UPDATE chief_eval_criteria_items
SET
  label = '문제정의 및 설명 능력',
  max_score = 10,
  description = '고객의 핵심 이슈를 구조화하여 명확히 정의하고, 문제의 위험성과 긴박성을 수치 기반으로 설명하는 역량'
WHERE id = 'B1' AND section_id = 'B';

UPDATE chief_eval_criteria_items
SET
  label = '솔루션(스토리) 전달 및 설득력',
  max_score = 10,
  description = '고객이 이해하고 공감할 수 있는 솔루션 스토리를 구성하고, 반론에 설득력 있게 응대하는 역량'
WHERE id = 'B2' AND section_id = 'B';

UPDATE chief_eval_criteria_items
SET
  label = '스마트빌 명분과 솔루션 연계',
  max_score = 20,
  description = '스마트빌의 명분(통합 전문가 팀, 계약 기반 책임 컨설팅, 사후관리 체계)을 고객 문제 상황과 정확히 연계하여 설득하는 역량'
WHERE id = 'B3' AND section_id = 'B';

-- 4. 평가 기준 항목 업데이트 (C1, C2) — 2026 BARS는 C1·C2만 사용
UPDATE chief_eval_criteria_items
SET
  label = '업무요약서 작성 및 설명',
  max_score = 5,
  description = '인터뷰 내용을 바탕으로 고객 상황·이슈·제안 방향이 정리된 업무요약서를 작성하고, 고객이 이해하기 쉽게 설명하는 역량',
  sort_order = 1,
  is_active = true
WHERE id = 'C1' AND section_id = 'C';

UPDATE chief_eval_criteria_items
SET
  label = '리스크 관리(위험고지) 및 대응 고지',
  max_score = 5,
  description = '프로젝트 진행 시 발생 가능한 리스크를 고객에게 명확히 고지하고, 각 리스크에 대한 대응 방안과 책임 범위를 투명하게 설명하는 역량',
  sort_order = 2,
  is_active = true
WHERE id = 'C2' AND section_id = 'C';

-- 5. C3 비활성화 (2026 BARS에는 C1·C2만 존재)
UPDATE chief_eval_criteria_items
SET is_active = false
WHERE id = 'C3' AND section_id = 'C';

COMMIT;
