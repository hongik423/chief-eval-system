/**
 * 평가보고서 AI 생성 - Gemini + OpenAI 병렬 호출 후 최적 답변 선택
 * 표지 이미지: Gemini 이미지 생성 모델 활용
 * @encoding UTF-8
 */

// Gemini 3.0 Flash, GPT 5.2 - 우수한 성능
const GEMINI_MODEL = import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash';
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5.2';
// 표지 이미지 생성용 (gemini-2.0-flash-preview-image-generation, gemini-2.5-flash-preview-05-20 등)
const GEMINI_IMAGE_MODEL = import.meta.env.VITE_GEMINI_IMAGE_MODEL || 'gemini-2.0-flash-preview-image-generation';

/**
 * Gemini 이미지 생성 - 치프인증자 이름이 들어간 표지 이미지
 * @param {string} candidateName - 응시자(치프인증자) 이름
 * @param {string} apiKey - Gemini API 키
 * @returns {Promise<string|null>} base64 이미지 데이터 또는 실패 시 null
 */
export async function generateCoverImage(candidateName, apiKey) {
  if (!apiKey) return null;
  const prompt = `Create a professional, elegant certificate cover image for "기업의별 치프인증 평가 보고서" (Stellain Chief Certification Evaluation Report). 
The image must prominently display the recipient name "${candidateName}" (치프인증자) in Korean.
Style: clean, corporate, trustworthy, blue/teal color scheme. Minimal design. 
Do not include any placeholder text. Use the exact name: ${candidateName}.`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_IMAGE_MODEL}:generateContent?key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['IMAGE'],
        },
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn('Gemini 이미지 생성 실패:', err);
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
 */
function buildReportPrompt(data) {
  const { candidate, evaluatorDetails, criteriaSections, finalAvg, pass, bonus } = data;

  let text = `다음은 "기업의별 치프인증 평가" 응시자 "${candidate.name}"(${candidate.team})에 대한 평가 데이터입니다.
평가위원들의 점수와 섹션별 코멘트를 바탕으로, 전문적이고 객관적인 평가보고서를 작성해 주세요.

## 기본 정보
- 응시자: ${candidate.name} (${candidate.team})
- 최종 평균 점수: ${finalAvg != null ? finalAvg.toFixed(1) : '-'}점 (가점 ${bonus || 0}점 포함)
- 결과: ${pass === true ? '합격' : pass === false ? '미달' : '평가 중'}

## 평가위원별 점수 및 코멘트
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

## 작성 지침
1. 평가보고서는 "종합 평가", "역량별 분석", "강점", "개선 과제", "결론" 섹션으로 구성해 주세요.
2. 각 평가위원의 코멘트를 균형 있게 반영하되, 개인 식별보다는 내용 중심으로 작성해 주세요.
3. 한국어로 작성하고, 전문적이면서 읽기 쉬운 문체를 사용하세요.
4. 마크다운 형식(제목, 불릿, 강조)을 활용해 주세요.`;

  return text;
}
