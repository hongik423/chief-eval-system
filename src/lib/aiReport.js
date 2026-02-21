/**
 * 평가보고서 AI 생성 - Gemini + OpenAI 병렬 호출 후 최적 답변 선택
 * 표지 이미지: Gemini 이미지 생성 모델 활용
 * @encoding UTF-8
 */

// Gemini 3.0 Flash, GPT 5.2 - 우수한 성능
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5.2';
// 표지 이미지 생성용 (gemini-2.0-flash-preview-image-generation deprecated → gemini-2.5-flash-image 사용)
const GEMINI_IMAGE_MODEL = import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'gemini-2.5-flash-image';

/**
 * Gemini 이미지 생성 - 치프인증자 이름이 들어간 표지 이미지
 * @param {string} candidateName - 응시자(치프인증자) 이름
 * @param {string} apiKey - Gemini API 키
 * @returns {Promise<string|null>} base64 이미지 데이터 또는 실패 시 null
 */
export async function generateCoverImage(candidateName, apiKey) {
  if (!apiKey) return null;
  const prompt = `Create a professional, elegant certificate cover image for "기업의별 치프인증 평가 보고서" (Stellain Chief Certification Evaluation Report). 
The image must prominently display the recipient name "${candidateName}" (치프인증자) in Korean text.
Style: clean, corporate, trustworthy, blue/teal color scheme. Minimal design. 
Do not include any placeholder text. Use the exact name: ${candidateName}.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;
  try {
    const body = {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        responseModalities: ['IMAGE', 'TEXT'],
        responseMimeType: 'image/png',
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
    console.warn('표지 이미지 생성 오류:', e);
  }
  return null;
}

/**
 * Gemini API 호출
 */
async function callGemini(prompt, apiKey) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2048,
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini API 오류: ${res.status} ${err}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini 응답 형식 오류');
  return text;
}

/**
 * OpenAI API 호출
 */
async function callOpenAI(prompt, apiKey) {
  const url = 'https://api.openai.com/v1/chat/completions';
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.4,
      max_tokens: 2048,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`OpenAI API 오류: ${res.status} ${err?.error?.message || res.statusText}`);
  }
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error('OpenAI 응답 형식 오류');
  return text;
}

/**
 * 두 AI 응답 중 최적 답변 선택
 * 기준: 구조적 완성도(문단 수), 길이 적정성(너무 짧지 않음), 특수문자/마크다운 활용
 */
function selectBestResponse(geminiRes, openaiRes) {
  const score = (text) => {
    let s = 0;
    const lines = text.trim().split(/\n/).filter(Boolean);
    s += Math.min(lines.length * 2, 20);
    if (text.includes('**') || text.includes('- ') || text.includes('1.')) s += 5;
    if (text.length >= 200 && text.length <= 2000) s += 10;
    if (text.length > 2000) s -= 5;
    return s;
  };
  const gScore = score(geminiRes);
  const oScore = score(openaiRes);
  return gScore >= oScore ? geminiRes : openaiRes;
}

/**
 * 응시자 평가보고서 생성 - Gemini + OpenAI 병렬 호출 후 최적 선택
 * 표지 이미지(Gemini 이미지 생성) 병렬 생성
 * @returns {{ content: string, coverImageBase64: string|null }}
 */
export async function generateEvaluationReport(candidateData) {
  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

  const prompt = buildReportPrompt(candidateData);

  // 보고서 본문 + 표지 이미지 병렬 생성
  const [reportResult, coverImageBase64] = await Promise.all([
    (async () => {
      const calls = [];
      if (geminiKey) calls.push(callGemini(prompt, geminiKey));
      if (openaiKey) calls.push(callOpenAI(prompt, openaiKey));
      if (calls.length === 0) {
        throw new Error('VITE_GEMINI_API_KEY 또는 VITE_OPENAI_API_KEY가 설정되지 않았습니다.');
      }
      const results = await Promise.allSettled(calls);
      const successes = results
        .map((r) => (r.status === 'fulfilled' ? r.value : null))
        .filter(Boolean);
      if (successes.length === 0) {
        const first = results.find(r => r.status === 'rejected');
        throw first?.reason || new Error('AI API 호출 실패');
      }
      return successes.length === 1 ? successes[0] : selectBestResponse(successes[0], successes[1]);
    })(),
    generateCoverImage(candidateData.candidate?.name || '', geminiKey),
  ]);

  return { content: reportResult, coverImageBase64 };
}

/**
 * 평가보고서용 프롬프트 생성
 * 목적: 치프인증자의 역량 강화를 위한 다양한·정밀한 피드백 제공
 */
function buildReportPrompt(data) {
  const { candidate, evaluatorDetails, criteriaSections, finalAvg, pass, bonus } = data;

  let text = `당신은 "기업의별 치프인증 평가"의 평가보고서 작성 전문가입니다.
**진정한 목적**: 이 보고서는 치프인증자 "${candidate.name}"의 역량을 강화하기 위한 다양한·정밀한 피드백을 제공하는 것입니다.
평가위원들이 제시한 모든 의견(긍정/부정, 일치/대비)을 누락 없이 반영하여, 치프인증자가 자기성찰과 개선에 활용할 수 있도록 작성해 주세요.

## 기본 정보
- 응시자: ${candidate.name} (${candidate.team})
- 최종 평균 점수: ${finalAvg != null ? finalAvg.toFixed(1) : '-'}점 (가점 ${bonus || 0}점 포함)
- 결과: ${pass === true ? '합격' : pass === false ? '미달' : '평가 중'}

## 평가위원별 점수 및 코멘트 (전체 원문)
`;

  evaluatorDetails
    .filter(ed => !ed.isSameTeam)
    .forEach(ed => {
      text += `\n### ${ed.evaluator.name} 위원 (총점 ${ed.totalScore}점)\n`;
      criteriaSections.forEach(sec => {
        const cs = ed.commentsSection || {};
        const comment = (cs[sec.id] || '').trim();
        if (comment) text += `- **${sec.id}. ${sec.label}**: ${comment}\n`;
      });
      if (ed.comments) text += `- **종합**: ${ed.comments}\n`;
    });

  text += `

## 보고서 작성 지침 (필수 준수)

### 1. 섹션 구성
- **종합 평가**: 전체적인 평가의 흐름 요약
- **역량별 분석**: 각 역량 영역별로 상세 분석
- **강점**: 인정할 만한 강점을 구체적으로 기술
- **개선 과제**: 개선이 필요한 부분을 구체적·실행 가능하게 기술
- **대비되는 평가 의견** (평가위원 간 의견이 상이할 경우 필수 포함): 평가위원 A는 ~라고 했으나, 평가위원 B는 ~라고 평가했다. 치프인증자는 양측 관점을 참고하여 균형 있게 발전할 수 있습니다.
- **결론 및 권고사항**: 역량 강화를 위한 구체적 권고

### 2. 대비되는 의견 처리 (핵심)
- 평가위원 간 점수·코멘트가 크게 다를 경우, 반드시 "대비되는 평가 의견" 섹션을 두고 **양측 의견을 상세히 나열**하세요.
- 예: "세무사 협력 역량에 대해 나동환 위원은 '우수하다'고 평가한 반면, 권영도 위원은 '초기 신뢰 구축에서 보완 필요'라고 지적했습니다. 이는 상황·관점 차이일 수 있으므로, 치프인증자는 두 관점을 모두 참고하여 균형 있게 발전하시기 바랍니다."
- 대비되는 의견을 생략·축약하지 말고 **모든 상이한 관점을 보고서에 담아** 치프인증자가 다양한 피드백으로 역량을 강화할 수 있게 하세요.

### 3. 역량 강화 중심 작성
- 단순 요약이 아니라, 치프인증자가 **구체적 행동으로 개선**할 수 있는 정밀한 피드백을 제공하세요.
- 추상적 표현 지양, "~할 것을 권고한다", "~역량을 강화하기 위해 ~를 실천해 보시기 바랍니다" 등 실행 가능한 문구 사용.

### 4. 형식
- 한국어, 전문적이면서 읽기 쉬운 문체
- 마크다운(제목, 불릿, **강조**) 활용`;

  return text;
}
