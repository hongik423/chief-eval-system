/**
 * 평가보고서 Word(.docx) 내보내기 — 고도화 버전
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * - 표지 (치프인증자 이름 + AI 생성 이미지)
 * - 본문 (마크다운 → docx 변환 + 표 지원 + 이미지 삽입)
 * - 섹션별 인사이트 이미지 삽입
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * @encoding UTF-8
 * @version 2026-03-16-v2-advanced
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  BorderStyle,
  convertInchesToTwip,
  TableLayoutType,
} from 'docx';
import { saveAs } from 'file-saver';

// ─── 스타일 상수 ───
const COLORS = {
  navy: '1a1f36',
  teal: '0d9488',
  tealLight: 'ccfbf1',
  amber: 'f59e0b',
  amberLight: 'fef3c7',
  white: 'ffffff',
  gray100: 'f1f5f9',
  gray200: 'e2e8f0',
  gray500: '64748b',
  gray700: '334155',
  gray900: '0f172a',
  brand: '6366f1',
  brandLight: 'e0e7ff',
};

const TABLE_BORDERS = {
  top: { style: BorderStyle.SINGLE, size: 1, color: COLORS.gray200 },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: COLORS.gray200 },
  left: { style: BorderStyle.SINGLE, size: 1, color: COLORS.gray200 },
  right: { style: BorderStyle.SINGLE, size: 1, color: COLORS.gray200 },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: COLORS.gray200 },
  insideVertical: { style: BorderStyle.SINGLE, size: 1, color: COLORS.gray200 },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  base64 → Uint8Array
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  마크다운 표 파싱
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function parseMarkdownTable(lines) {
  const rows = [];
  for (const line of lines) {
    const trimmed = line.trim();
    // 구분선(---|---) 건너뛰기
    if (/^\|[\s\-:|]+\|$/.test(trimmed)) continue;
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    const cells = trimmed.slice(1, -1).split('|').map(c => c.trim());
    rows.push(cells);
  }
  return rows;
}

function buildDocxTable(rows, isFirstRowHeader = true) {
  if (!rows.length) return null;

  const colCount = Math.max(...rows.map(r => r.length));

  const tableRows = rows.map((row, rowIdx) => {
    const isHeader = isFirstRowHeader && rowIdx === 0;
    const cells = [];

    for (let c = 0; c < colCount; c++) {
      const cellText = row[c] || '';
      cells.push(
        new TableCell({
          children: [
            new Paragraph({
              children: parseInlineFormatting(cellText),
              alignment: AlignmentType.CENTER,
              spacing: { before: 40, after: 40 },
            }),
          ],
          shading: isHeader
            ? { fill: COLORS.navy, color: COLORS.white }
            : rowIdx % 2 === 1
              ? { fill: COLORS.gray100 }
              : undefined,
          width: { size: Math.floor(100 / colCount), type: WidthType.PERCENTAGE },
        })
      );
    }

    return new TableRow({ children: cells });
  });

  return new Table({
    rows: tableRows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: TABLE_BORDERS,
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  마크다운 → docx Paragraph 배열 변환 (고도화)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function markdownToDocxParagraphs(text, sectionImages = {}) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let i = 0;
  let currentSectionKey = null;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // 빈 줄
    if (!trimmed) {
      result.push(new Paragraph({ spacing: { after: 80 } }));
      i++;
      continue;
    }

    // 마크다운 표 감지 (| 로 시작하는 연속 줄)
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableLines = [];
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      const rows = parseMarkdownTable(tableLines);
      if (rows.length > 0) {
        const table = buildDocxTable(rows);
        if (table) {
          result.push(table);
          result.push(new Paragraph({ spacing: { after: 160 } }));
        }
      }
      continue;
    }

    // ## 대제목
    if (trimmed.startsWith('## ')) {
      const headingText = trimmed.slice(3).replace(/^\d+\.\s*/, ''); // "## 1. 종합 평가" → "종합 평가"
      const headingFull = trimmed.slice(3);

      // 섹션 이미지 키 매칭
      currentSectionKey = matchSectionKey(headingFull);

      // 섹션 구분선 추가
      result.push(new Paragraph({
        children: [new TextRun({ text: '━'.repeat(60), color: COLORS.teal, size: 16 })],
        spacing: { before: 360, after: 80 },
      }));

      result.push(new Paragraph({
        children: [new TextRun({ text: headingFull, bold: true, size: 28, color: COLORS.navy, font: 'Malgun Gothic' })],
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 80, after: 160 },
      }));

      // 섹션별 인사이트 이미지 삽입
      if (currentSectionKey && sectionImages[currentSectionKey]) {
        try {
          const imgData = base64ToUint8Array(sectionImages[currentSectionKey]);
          result.push(new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: imgData,
                transformation: { width: 500, height: 250 },
                type: 'png',
              }),
            ],
            spacing: { before: 120, after: 200 },
          }));
        } catch (e) {
          console.warn(`섹션 이미지 삽입 실패 (${currentSectionKey}):`, e);
        }
      }

      i++;
      continue;
    }

    // ### 소제목
    if (trimmed.startsWith('### ')) {
      result.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(4), bold: true, size: 24, color: COLORS.teal, font: 'Malgun Gothic' })],
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
      }));
      i++;
      continue;
    }

    // #### 소소제목
    if (trimmed.startsWith('#### ')) {
      result.push(new Paragraph({
        children: [new TextRun({ text: trimmed.slice(5), bold: true, size: 22, color: COLORS.gray700, font: 'Malgun Gothic' })],
        spacing: { before: 160, after: 80 },
      }));
      i++;
      continue;
    }

    // - 불릿
    if (trimmed.startsWith('- ')) {
      const content = trimmed.slice(2);
      result.push(new Paragraph({
        children: parseInlineFormatting(content),
        bullet: { level: 0 },
        spacing: { after: 60 },
      }));
      i++;
      continue;
    }

    // 하위 불릿 (  - )
    if (trimmed.startsWith('  - ') || trimmed.startsWith('    - ')) {
      const content = trimmed.replace(/^\s+- /, '');
      result.push(new Paragraph({
        children: parseInlineFormatting(content),
        bullet: { level: 1 },
        spacing: { after: 40 },
      }));
      i++;
      continue;
    }

    // 번호 목록
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      result.push(new Paragraph({
        children: [
          new TextRun({ text: `${numMatch[1]}. `, bold: true, color: COLORS.teal }),
          ...parseInlineFormatting(numMatch[2]),
        ],
        spacing: { after: 60 },
        indent: { left: convertInchesToTwip(0.3) },
      }));
      i++;
      continue;
    }

    // 인용문 (> )
    if (trimmed.startsWith('> ')) {
      result.push(new Paragraph({
        children: [
          new TextRun({ text: '  ', font: 'Courier New' }),
          ...parseInlineFormatting(trimmed.slice(2)),
        ],
        spacing: { after: 80 },
        indent: { left: convertInchesToTwip(0.4) },
        shading: { fill: COLORS.gray100 },
      }));
      i++;
      continue;
    }

    // 구분선 (---, ***)
    if (/^[-*_]{3,}$/.test(trimmed)) {
      result.push(new Paragraph({
        children: [new TextRun({ text: '─'.repeat(60), color: COLORS.gray200, size: 14 })],
        spacing: { before: 120, after: 120 },
      }));
      i++;
      continue;
    }

    // 일반 문단
    result.push(new Paragraph({
      children: parseInlineFormatting(trimmed),
      spacing: { after: 100 },
    }));
    i++;
  }

  return result;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  섹션 키 매칭 (이미지 삽입용)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function matchSectionKey(heading) {
  const h = heading.toLowerCase();
  if (h.includes('종합') && h.includes('평가')) return 'overview';
  if (h.includes('a.') || h.includes('커뮤니케이션') || h.includes('인터뷰')) return 'sectionA';
  if (h.includes('b.') || h.includes('결과보기') || h.includes('제안')) return 'sectionB';
  if (h.includes('c.') || h.includes('실행설계') || h.includes('위험')) return 'sectionC';
  if (h.includes('강점')) return 'strengths';
  if (h.includes('보완') || h.includes('개선')) return 'improvements';
  if (h.includes('로드맵') || h.includes('학습') || h.includes('액션')) return 'roadmap';
  if (h.includes('결론') || h.includes('권고')) return 'conclusion';
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  인라인 서식 파싱 (**bold**, *italic*, ✅❌⏳ 등)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function parseInlineFormatting(text) {
  const runs = [];
  let remaining = text;

  while (remaining.length > 0) {
    // **bold** 처리
    const boldStart = remaining.indexOf('**');
    if (boldStart === -1) {
      if (remaining) runs.push(new TextRun({ text: remaining, font: 'Malgun Gothic' }));
      break;
    }
    if (boldStart > 0) {
      runs.push(new TextRun({ text: remaining.slice(0, boldStart), font: 'Malgun Gothic' }));
    }
    const boldEnd = remaining.indexOf('**', boldStart + 2);
    if (boldEnd === -1) {
      runs.push(new TextRun({ text: remaining.slice(boldStart + 2), bold: true, font: 'Malgun Gothic' }));
      break;
    }
    runs.push(new TextRun({
      text: remaining.slice(boldStart + 2, boldEnd),
      bold: true,
      color: COLORS.navy,
      font: 'Malgun Gothic',
    }));
    remaining = remaining.slice(boldEnd + 2);
  }

  return runs.length > 0 ? runs : [new TextRun({ text: text || '', font: 'Malgun Gothic' })];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
//  메인 내보내기 함수
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
/**
 * @param {string} content - 마크다운 본문
 * @param {string} candidateName - 치프인증자 이름
 * @param {string|null} coverImageBase64 - 표지 이미지
 * @param {Object} sectionImages - 섹션별 인사이트 이미지 { sectionA: base64, ... }
 */
export async function exportReportToDocx(content, candidateName, coverImageBase64 = null, sectionImages = {}) {
  const sectionChildren = [];

  // ─── 표지 페이지 ───
  sectionChildren.push(
    new Paragraph({ text: '', spacing: { before: 800 } }),
  );

  // 기업의별 로고/타이틀
  sectionChildren.push(new Paragraph({
    children: [new TextRun({
      text: '기업의별',
      size: 24,
      color: COLORS.teal,
      font: 'Malgun Gothic',
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 60 },
  }));

  sectionChildren.push(new Paragraph({
    children: [new TextRun({
      text: '치프인증 평가 보고서',
      size: 48,
      bold: true,
      color: COLORS.navy,
      font: 'Malgun Gothic',
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 120 },
  }));

  sectionChildren.push(new Paragraph({
    children: [new TextRun({
      text: 'Stellain Chief Certification Evaluation Report',
      size: 20,
      color: COLORS.gray500,
      italics: true,
      font: 'Calibri',
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 300 },
  }));

  // 표지 이미지
  if (coverImageBase64) {
    try {
      const imgData = base64ToUint8Array(coverImageBase64);
      sectionChildren.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: imgData,
            transformation: { width: 420, height: 315 },
            type: 'png',
          }),
        ],
        spacing: { after: 300 },
      }));
    } catch (e) {
      console.warn('표지 이미지 변환 실패:', e);
    }
  }

  // 응시자 이름
  sectionChildren.push(new Paragraph({
    children: [new TextRun({
      text: candidateName,
      size: 40,
      bold: true,
      color: COLORS.navy,
      font: 'Malgun Gothic',
    })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 100 },
  }));

  sectionChildren.push(new Paragraph({
    children: [new TextRun({
      text: '치프인증자',
      size: 22,
      color: COLORS.teal,
      font: 'Malgun Gothic',
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 400 },
  }));

  // 날짜
  const today = new Date();
  const dateStr = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일`;
  sectionChildren.push(new Paragraph({
    children: [new TextRun({
      text: dateStr,
      size: 18,
      color: COLORS.gray500,
      font: 'Malgun Gothic',
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // AI 엔진 표시
  sectionChildren.push(new Paragraph({
    children: [new TextRun({
      text: 'AI 기반 자동 생성 보고서 (Claude Sonnet 4.6 + 나노바나나 2)',
      size: 14,
      color: COLORS.gray500,
      italics: true,
      font: 'Malgun Gothic',
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // 페이지 구분
  sectionChildren.push(new Paragraph({ pageBreakBefore: true }));

  // ─── 목차 (간략) ───
  sectionChildren.push(new Paragraph({
    children: [new TextRun({
      text: '목 차',
      size: 32,
      bold: true,
      color: COLORS.navy,
      font: 'Malgun Gothic',
    })],
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 300 },
  }));

  const tocItems = [
    '1. 종합 평가 개요',
    '2. 평가 점수 총괄표',
    '3. A. 커뮤니케이션(인터뷰) 역량 심층 분석',
    '4. B. 결과보기 제안능력 심층 분석',
    '5. C. 실행설계와 위험고지 심층 분석',
    '6. 핵심 강점 분석',
    '7. 보완 과제 및 개선 방향',
    '8. 대비되는 평가 의견',
    '9. 성장 로드맵 — 12주 학습 액션 플랜',
    '10. 결론 및 권고사항',
  ];

  for (const item of tocItems) {
    sectionChildren.push(new Paragraph({
      children: [new TextRun({
        text: item,
        size: 22,
        color: COLORS.gray700,
        font: 'Malgun Gothic',
      })],
      spacing: { after: 100 },
      indent: { left: convertInchesToTwip(0.5) },
    }));
  }

  sectionChildren.push(new Paragraph({ pageBreakBefore: true }));

  // ─── 본문 ───
  const bodyParagraphs = markdownToDocxParagraphs(content || '', sectionImages);
  sectionChildren.push(...bodyParagraphs);

  // ─── 푸터 (Disclaimer) ───
  sectionChildren.push(new Paragraph({
    children: [new TextRun({ text: '─'.repeat(60), color: COLORS.gray200, size: 14 })],
    spacing: { before: 600, after: 120 },
  }));

  sectionChildren.push(new Paragraph({
    children: [new TextRun({
      text: '본 보고서는 AI(Claude Sonnet 4.6)에 의해 자동 생성되었으며, 평가위원들의 실제 점수와 코멘트를 기반으로 작성되었습니다. ' +
            '섹션별 인사이트 이미지는 나노바나나 2에 의해 생성되었습니다. ' +
            '보고서 내용은 참고용이며, 최종 판단은 평가위원회의 결정에 따릅니다.',
      size: 16,
      color: COLORS.gray500,
      italics: true,
      font: 'Malgun Gothic',
    })],
    spacing: { after: 80 },
  }));

  sectionChildren.push(new Paragraph({
    children: [new TextRun({
      text: `© ${today.getFullYear()} 기업의별 (Stellain) — 치프인증 평가 시스템`,
      size: 14,
      color: COLORS.gray500,
      font: 'Malgun Gothic',
    })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }));

  // ─── 문서 생성 ───
  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(0.8),
            right: convertInchesToTwip(0.8),
            bottom: convertInchesToTwip(0.8),
            left: convertInchesToTwip(0.8),
          },
        },
      },
      children: sectionChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `치프인증_평가보고서_${candidateName}.docx`);
}
