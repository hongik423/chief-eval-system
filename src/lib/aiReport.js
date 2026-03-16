/**
 * 평가보고서 AI 생성 — 고도화 버전
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 메인 보고서 작성 : Claude Sonnet 4.6 (단일 호출, 충분한 토큰)
 * 섹션별 인사이트 이미지 : 나노바나나 2 (Gemini 이미지 생성)
 * 표지 이미지          : 나노바나나 2 (Gemini 이미지 생성)
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @encoding UTF-8
 * @version 2026-03-16-v5-advanced
 */

// ─── AI 모델 설정 ───
const CLAUDE_MODEL = import.meta.env.VITE_CLAUDE_MODEL || 'claude-sonnet-4-6';
const GEMINI_IMAGE_MODEL = import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image-preview';

// ─── 보고서 섹션 정의 (순서 고정) ───
// imagePromptHint: null이면 이미지 미생성. 총 4개 섹션만 이미지 (표지 포함 5장 이하)
const REPORT_SECTIONS = [
  { key: 'overview',       title: '종합 평가 개요',              imagePromptHint: 'abstract business evaluation overview with geometric shapes and connected nodes' },
  { key: 'scoreTable',     title: '평가 점수 총괄표',            imagePromptHint: null },
  { key: 'sectionA',       title: 'A. 커뮤니케이션(인터뷰) 역량 심층 분석', imagePromptHint: 'abstract handshake and conversation bubbles in corporate style' },
  { key: 'sectionB',       title: 'B. 결과보기 제안능력 심층 분석',          imagePromptHint: null },
  { key: 'sectionC',       title: 'C. 실행설계와 위험고지 심층 분석',        imagePromptHint: null },
  { key: 'strengths',      title: '핵심 강점 분석',              imagePromptHint: 'abstract golden star with upward arrows representing excellence' },
  { key: 'improvements',   title: '보완 과제 및 개선 방향',       imagePromptHint: null },
  { key: 'contrasting',    title: '대비되는 평가 의견',           imagePromptHint: null },
  { key: 'roadmap',        title: '성장 로드맵 — 12주 학습 액션 플랜', imagePromptHint: 'abstract ascending staircase path with milestone dots in teal and navy' },
  { key: 'conclusion',     title: '결론 및 권고사항',             imagePromptHint: null },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  표지 이미지 생성 (나노바나나 2)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateCoverImage(candidateName, apiKey) {
  if (!apiKey) return null;
  const prompt = `Create a professional, elegant certificate cover image.
Style: clean, corporate, trustworthy. Color palette: deep navy (#1a1f36), teal (#0d9488), gold accent (#d4af37), white.
Design: abstract geometric patterns, subtle star emblem and certification seal motif at center.
Include thin decorative border lines and soft gradient background.
CRITICAL: Do NOT include ANY text, letters, words, numbers, or characters of any language in the image. The image must be purely visual — no text whatsoever. Only abstract shapes, patterns, and symbols.`;
  return await callGeminiImage(prompt, apiKey);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  섹션별 인사이트 이미지 생성 (나노바나나 2)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export async function generateSectionImage(sectionTitle, candidateName, sectionSummary, apiKey) {
  if (!apiKey) return null;
  // imagePromptHint에서 이미 추상적 시각 요소로 기술됨
  const prompt = `Create a professional abstract illustration for a business report.
Visual concept: ${sectionSummary}

Design requirements:
- Clean, modern corporate style
- Color palette: deep navy (#1a1f36), teal (#0d9488), amber (#f59e0b), white
- Landscape orientation (wide format)
- Abstract and symbolic — use geometric shapes, icons, gradients, and visual metaphors
- Professional and elegant, suitable for a formal Word document
- CRITICAL: Do NOT include ANY text, letters, words, numbers, or characters of any language. The image must be PURELY VISUAL — only abstract shapes, icons, and patterns. Zero text.`;
  return await callGeminiImage(prompt, apiKey);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Gemini 이미지 생성 공통
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function callGeminiImage(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;
  try {
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        // responseMimeType 제거 — Gemini 이미지 모델은 image/png를 mime type으로 허용하지 않음
      },
    };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('Gemini 이미지 생성 실패:', res.status, err);
      return null;
    }
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      const inlineData = part.inlineData || part.inline_data;
      if (inlineData?.data) return inlineData.data;
    }
  } catch (e) {
    console.warn('이미지 생성 오류:', e);
  }
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Claude Sonnet 4.6 — 메인 보고서 생성 (자동 연속 생성)
//  max_tokens: 32768 + output-128k 베타 헤더
//  중단 시 최대 2회 추가 호출하여 완성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const CLAUDE_MAX_TOKENS = 32768;
const MAX_CONTINUATIONS = 2;  // 최대 연속 호출 횟수

async function callClaudeOnce(messages, apiKey) {
  const url = 'https://api.anthropic.com/v1/messages';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'anthropic-beta': 'output-128k-2025-02-19',
    },
    body: JSON.stringify({
      model: CLAUDE_MODEL,
      max_tokens: CLAUDE_MAX_TOKENS,
      temperature: 0.3,
      messages,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Claude API 오류: ${res.status} ${err?.error?.message || res.statusText}`);
  }
  return await res.json();
}

async function callClaude(prompt, apiKey, onProgress) {
  // ── 1차 호출 ──
  const messages = [{ role: 'user', content: prompt }];
  const firstResult = await callClaudeOnce(messages, apiKey);
  let fullText = firstResult.content?.[0]?.text || '';
  if (!fullText) throw new Error('Claude 응답 형식 오류');

  let stopReason = firstResult.stop_reason;
  let continuations = 0;

  // ── 연속 생성: stop_reason이 'max_tokens'이고 '— 보고서 끝 —'이 없으면 이어서 생성 ──
  while (stopReason === 'max_tokens' && !fullText.includes('— 보고서 끝 —') && continuations < MAX_CONTINUATIONS) {
    continuations++;
    console.log(`📝 보고서 연속 생성 ${continuations}/${MAX_CONTINUATIONS}회차...`);
    if (onProgress) {
      onProgress({ step: 2, total: 4, message: `보고서 연속 작성 중... (${continuations}/${MAX_CONTINUATIONS}회차)` });
    }

    // 이전 대화를 이어서 보내기 (assistant 응답 + user 연속 요청)
    const contMessages = [
      { role: 'user', content: prompt },
      { role: 'assistant', content: fullText },
      { role: 'user', content: `이전 응답이 토큰 한도로 중단되었습니다. 바로 위 내용에 이어서 나머지 섹션을 모두 완성해 주세요.
중복 없이 끊긴 지점부터 이어 작성하세요. 마지막에 반드시 "— 보고서 끝 —"을 기재하세요.` },
    ];

    const contResult = await callClaudeOnce(contMessages, apiKey);
    const contText = contResult.content?.[0]?.text || '';
    if (contText) {
      fullText += '\n' + contText;
    }
    stopReason = contResult.stop_reason;
  }

  if (continuations > 0) {
    console.log(`✅ 보고서 연속 생성 완료 (총 ${continuations + 1}회 호출, ${fullText.length}자)`);
  }

  return fullText;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  Gemini Fallback (Claude 실패 시)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const GEMINI_TEXT_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.5-flash';

async function callGeminiText(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_TEXT_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 16384 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini API 오류: ${res.status}`);
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답 형식 오류');
  return text;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  메인 진입점 — 평가보고서 생성
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @param {Object} candidateData - { candidate, evaluatorDetails, criteriaSections, criteriaItems, finalAvg, pass, bonus }
 * @param {Function} onProgress  - 진행 상태 콜백 (optional)
 * @returns {{ content, coverImageBase64, sectionImages, usedEngine }}
 */
export async function generateEvaluationReport(candidateData, onProgress = () => {}) {
  const claudeKey = import.meta.env.VITE_CLAUDE_API_KEY;
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;

  if (!claudeKey && !geminiKey) {
    throw new Error('VITE_CLAUDE_API_KEY 또는 VITE_GEMINI_API_KEY를 .env.local에 설정해 주세요.');
  }

  // ── Step 1: 고도화 프롬프트 생성 ──
  onProgress({ step: 1, total: 4, message: '프롬프트 구성 중...' });
  const prompt = buildAdvancedReportPrompt(candidateData);

  // ── Step 2: 메인 보고서 생성 (Claude Sonnet 4.6 우선, Gemini 폴백) ──
  onProgress({ step: 2, total: 4, message: 'AI 보고서 작성 중... (Claude Sonnet 4.6)' });
  let content;
  let usedEngine = 'Claude Sonnet 4.6';

  try {
    if (claudeKey) {
      content = await callClaude(prompt, claudeKey, onProgress);
    } else {
      throw new Error('Claude API 키 없음 — Gemini로 전환');
    }
  } catch (claudeErr) {
    console.warn('Claude 호출 실패, Gemini로 전환:', claudeErr.message);
    if (!geminiKey) throw claudeErr;
    onProgress({ step: 2, total: 4, message: 'AI 보고서 작성 중... (Gemini 폴백)' });
    content = await callGeminiText(prompt, geminiKey);
    usedEngine = 'Gemini (폴백)';
  }

  // ── Step 3: 이미지 병렬 생성 (나노바나나 2) ──
  onProgress({ step: 3, total: 4, message: '섹션별 인사이트 이미지 생성 중... (나노바나나 2)' });
  const candidateName = candidateData.candidate?.name || '';

  // 섹션별 요약 추출 (보고서 본문에서)
  const sectionSummaries = extractSectionSummaries(content);

  const imagePromises = [];

  // 표지 이미지
  imagePromises.push(
    generateCoverImage(candidateName, geminiKey)
      .then(img => ({ key: 'cover', image: img }))
      .catch(() => ({ key: 'cover', image: null }))
  );

  // 섹션별 인사이트 이미지 (imagePromptHint가 있는 섹션만)
  for (const sec of REPORT_SECTIONS) {
    if (!sec.imagePromptHint) continue;
    const summary = sectionSummaries[sec.key] || sec.title;
    imagePromises.push(
      generateSectionImage(sec.title, candidateName, summary, geminiKey)
        .then(img => ({ key: sec.key, image: img }))
        .catch(() => ({ key: sec.key, image: null }))
    );
  }

  const imageResults = await Promise.allSettled(imagePromises);
  const sectionImages = {};
  let coverImageBase64 = null;

  for (const result of imageResults) {
    if (result.status === 'fulfilled' && result.value.image) {
      if (result.value.key === 'cover') {
        coverImageBase64 = result.value.image;
      } else {
        sectionImages[result.value.key] = result.value.image;
      }
    }
  }

  // ── Step 4: 완료 ──
  onProgress({ step: 4, total: 4, message: '보고서 완성!' });

  return { content, coverImageBase64, sectionImages, usedEngine };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  보고서 본문에서 섹션별 핵심 요약 추출
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function extractSectionSummaries(content) {
  const summaries = {};
  const sectionRegex = /##\s+(.+)/g;
  let match;
  const headings = [];

  while ((match = sectionRegex.exec(content)) !== null) {
    headings.push({ title: match[1], index: match.index });
  }

  for (let i = 0; i < headings.length; i++) {
    const start = headings[i].index;
    const end = i + 1 < headings.length ? headings[i + 1].index : content.length;
    const sectionText = content.slice(start, end);
    // 첫 2문장만 추출
    const sentences = sectionText.replace(/^##.+\n/, '').trim().split(/[.。]\s*/);
    const summary = sentences.slice(0, 2).join('. ').slice(0, 200);

    // 매칭 시도
    const title = headings[i].title.toLowerCase();
    for (const sec of REPORT_SECTIONS) {
      if (title.includes(sec.key.replace('section', '').toLowerCase()) ||
          title.includes(sec.title.slice(0, 6))) {
        summaries[sec.key] = summary;
      }
    }
  }

  return summaries;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  고도화 프롬프트 빌더
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function buildAdvancedReportPrompt(data) {
  const { candidate, evaluatorDetails, criteriaSections, criteriaItems, finalAvg, pass, bonus } = data;

  // ── BARS 평가 기준 상세 ──
  const barsSpec = (criteriaSections || []).map(sec => {
    const items = (criteriaItems || data.criteriaItems || []).filter(i => i.sectionId === sec.id);
    const itemsText = items.map(it =>
      `    - ${it.id}. ${it.label} (${it.maxScore}점): ${it.description || ''}`
    ).join('\n');
    return `  ■ ${sec.id}. ${sec.label} (${sec.maxScore}점) — 평가방법: ${sec.evalMethod || ''}\n${itemsText}`;
  }).join('\n\n');

  // ── 평가위원별 상세 데이터 (소속제외 제외) ──
  const validDetails = (evaluatorDetails || []).filter(ed => !ed.isSameTeam && ed.isComplete);

  const evaluatorBlock = validDetails.map(ed => {
    const sections = (criteriaSections || []).map(sec => {
      const score = ed.sectionBreakdown?.[sec.id] ?? '-';
      const maxScore = sec.maxScore;
      const cs = ed.commentsSection || {};
      const comment = (cs[sec.id] || '').trim();
      return `  ${sec.id}영역 (${score}/${maxScore}점)${comment ? `: "${comment}"` : ''}`;
    }).join('\n');
    const general = ed.comments ? `  종합코멘트: "${ed.comments}"` : '';
    return `### ${ed.evaluator.name} 위원 (총점: ${ed.totalScore}점)\n${sections}${general ? '\n' + general : ''}`;
  }).join('\n\n');

  // ── 점수 통계 ──
  const scores = validDetails.map(ed => ed.totalScore);
  const maxScore = scores.length ? Math.max(...scores) : 0;
  const minScore = scores.length ? Math.min(...scores) : 0;
  const avgScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : '-';
  const scoreRange = maxScore - minScore;

  // ── 항목별 평균 계산 ──
  const itemAvgBlock = (criteriaSections || []).map(sec => {
    const items = (criteriaItems || data.criteriaItems || []).filter(i => i.sectionId === sec.id);
    const itemAvgs = items.map(it => {
      const itemScores = validDetails.map(ed => {
        const sessionScores = ed.sessionScores || {};
        return Number(sessionScores[it.id]) || 0;
      });
      const avg = itemScores.length ? (itemScores.reduce((a, b) => a + b, 0) / itemScores.length).toFixed(1) : '-';
      const max = it.maxScore;
      const pct = itemScores.length ? ((itemScores.reduce((a, b) => a + b, 0) / itemScores.length / max) * 100).toFixed(0) : '-';
      return `  ${it.id}. ${it.label}: 평균 ${avg}/${max}점 (달성률 ${pct}%)`;
    }).join('\n');
    const secAvg = validDetails.length ? (validDetails.map(ed => ed.sectionBreakdown?.[sec.id] || 0).reduce((a, b) => a + b, 0) / validDetails.length).toFixed(1) : '-';
    return `■ ${sec.id}. ${sec.label} — 영역 평균: ${secAvg}/${sec.maxScore}점\n${itemAvgs}`;
  }).join('\n\n');

  // ── 프롬프트 조립 ──
  return `당신은 "기업의별 치프인증 평가"의 최고 수준 평가보고서 작성 전문가입니다.

═══════════════════════════════════════════
  역할과 목적
═══════════════════════════════════════════
이 보고서의 **핵심 목적**은 치프인증 응시자 "${candidate.name}"이(가) 최고의 치프(Chief)로 성장하기 위한
**행동 중심·실천 중심의 정밀 피드백과 학습 로드맵**을 제공하는 것입니다.

단순 점수 나열이 아닌, 평가위원들의 피드백을 사실 기반으로 분석하고,
BARS(행동기준 평가척도)의 각 평가 항목별 점수를 기반으로 강점과 보완점을 도출하여,
응시자가 **구체적 행동 변화**로 역량을 강화할 수 있는 로드맵을 제시해야 합니다.

═══════════════════════════════════════════
  기본 정보
═══════════════════════════════════════════
- 응시자: ${candidate.name} (${candidate.team || '소속 미정'})
- 최종 평균 점수: ${finalAvg != null ? finalAvg.toFixed(1) : '-'}점 / 110점 만점 (가점 ${bonus || 0}점 포함)
- 결과: ${pass === true ? '✅ 합격' : pass === false ? '❌ 미달' : '⏳ 평가 중'}
- 유효 평가위원 수: ${validDetails.length}명
- 점수 범위: 최저 ${minScore}점 ~ 최고 ${maxScore}점 (편차 ${scoreRange}점)
- 평가위원 평균: ${avgScore}점

═══════════════════════════════════════════
  BARS 평가 기준 체계 (행동기준 평가척도)
═══════════════════════════════════════════
${barsSpec}

═══════════════════════════════════════════
  항목별 평균 점수 및 달성률
═══════════════════════════════════════════
${itemAvgBlock}

═══════════════════════════════════════════
  평가위원별 점수 및 코멘트 (전체 원문)
═══════════════════════════════════════════
${evaluatorBlock}

═══════════════════════════════════════════
  보고서 작성 지침 (반드시 준수)
═══════════════════════════════════════════

보고서는 다음 섹션 순서대로 작성하세요. **모든 섹션을 빠짐없이 작성**하고, 중간에 끊기거나 생략하지 마세요.

## 1. 종합 평가 개요
- 전체적인 평가 결과 흐름을 2~3문단으로 요약
- 합격/미달 여부와 핵심 근거를 명시
- 평가위원 간 의견 일치도를 언급

## 2. 평가 점수 총괄표
- 반드시 **마크다운 표** 형식으로 작성
- 구조: | 평가위원 | A영역(50) | B영역(40) | C영역(10) | 합계(100) |
- 마지막 행에 **평균** 행 추가
- 표 아래에 점수 분포 특이사항 코멘트

## 3. A. 커뮤니케이션(인터뷰) 역량 심층 분석 (50점)
- 하위 항목(A1, A2, A3) 각각에 대해:
  - 평균 점수와 달성률
  - 평가위원들의 구체적 피드백 인용 (원문 그대로)
  - BARS 기준 대비 행동 수준 진단
  - 구체적 개선 행동 제안 (3가지 이상)
- 해당 영역의 전체 요약과 핵심 인사이트를 마크다운 표로 정리

## 4. B. 결과보기 제안능력 심층 분석 (40점)
- 하위 항목(B1, B2, B3) 각각에 대해 위와 동일 구조로 분석
- 해당 영역의 전체 요약과 핵심 인사이트를 마크다운 표로 정리

## 5. C. 실행설계와 위험고지 심층 분석 (10점)
- 하위 항목(C1, C2) 각각에 대해 위와 동일 구조로 분석
- 해당 영역의 전체 요약과 핵심 인사이트를 마크다운 표로 정리

## 6. 핵심 강점 분석
- 3~5가지 핵심 강점을 구체적 근거(평가위원 피드백 인용)와 함께 기술
- 각 강점이 실무에서 어떻게 발현되었는지 행동 사례 중심으로 서술
- 마크다운 표로 강점 요약: | 강점 | 근거 | 활용 방안 |

## 7. 보완 과제 및 개선 방향
- 3~5가지 보완 과제를 구체적으로 기술
- 각 과제에 대해:
  - 현재 수준 진단 (평가위원 피드백 기반)
  - 목표 수준 설정
  - 구체적 실천 방법 (행동 중심)
- 마크다운 표로 정리: | 보완 과제 | 현재 수준 | 목표 수준 | 실천 방법 |

## 8. 대비되는 평가 의견
- 평가위원 간 점수·코멘트가 크게 다른 항목을 모두 찾아 상세히 기술
- 형식: "○○ 위원은 '~'라고 평가한 반면, △△ 위원은 '~'라고 평가했습니다."
- 대비 의견이 시사하는 바와 응시자가 참고할 점을 분석
- **절대 생략·축약하지 말 것** — 모든 상이한 관점을 담아야 함

## 9. 성장 로드맵 — 12주 학습 액션 플랜
- **마크다운 표** 형식 필수: | 주차 | 학습 주제 | 핵심 활동 | 기대 성과 | 연관 평가항목 |
- 12주를 4단계로 구분:
  - 1~3주: 기초 역량 보강 (가장 낮은 점수 항목 집중)
  - 4~6주: 핵심 역량 심화 (중간 수준 항목 레벨업)
  - 7~9주: 통합 역량 실전 (실제 고객 시뮬레이션)
  - 10~12주: 마스터 역량 완성 (고난도 시나리오 대응)
- 각 주차별 구체적 학습 활동과 측정 가능한 기대 성과 제시
- 보완 과제와 직접 연결되는 액션 아이템 포함

## 10. 결론 및 권고사항
- 최종 평가 요약 (2~3문장)
- 즉시 실천 가능한 Top 3 권고사항 (구체적, 행동 중심)
- 장기적 성장 비전 제시
- 격려와 응원의 메시지

═══════════════════════════════════════════
  작성 스타일 규칙
═══════════════════════════════════════════
1. **한국어** 전문적이면서 읽기 쉬운 문체
2. **마크다운** 적극 활용: ## 제목, **강조**, 표(|---|), 불릿(-)
3. **사실 기반**: 평가위원의 실제 코멘트를 정확히 인용 (큰따옴표 사용)
4. **행동 중심**: "~할 것을 권고합니다", "~를 실천해 보시기 바랍니다" 등 실행 가능한 문구
5. **절대 중단 금지**: 모든 10개 섹션을 빠짐없이, 충분한 분량으로 완성하세요. 중간에 끊기거나 "이하 생략" 등으로 축약하지 마세요.
6. **표 적극 활용**: 점수 총괄, 강점 요약, 보완 과제, 12주 로드맵은 반드시 마크다운 표로 작성
7. 추상적 표현 지양 — 구체적 행동, 구체적 수치, 구체적 사례 중심
8. 각 섹션은 **최소 300자 이상** 충분히 작성. 12주 로드맵 표는 12행 모두 작성.
9. **마지막 섹션(결론 및 권고사항)까지 반드시 완성**한 후 응답을 종료하세요. 마지막에 반드시 "— 보고서 끝 —"을 기재하세요.`;
}
