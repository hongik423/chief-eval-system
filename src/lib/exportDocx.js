/**
 * 평가보고서 Word(.docx) 내보내기
 * 표지(치프인증자 이름 + AI 생성 이미지) + 본문
 * @encoding UTF-8
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  ImageRun,
  HeadingLevel,
  AlignmentType,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';

/**
 * base64 → Uint8Array
 */
function base64ToUint8Array(base64) {
  const binary = atob(base64);
  const arr = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) arr[i] = binary.charCodeAt(i);
  return arr;
}

/**
 * 마크다운 텍스트를 docx Paragraph 배열로 변환
 */
function markdownToDocxParagraphs(text) {
  const lines = text.split(/\r?\n/);
  const result = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      result.push(new Paragraph({ spacing: { after: 120 } }));
      i++;
      continue;
    }

    // ## 제목
    if (trimmed.startsWith('## ')) {
      result.push(new Paragraph({
        text: trimmed.slice(3),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 240, after: 120 },
      }));
      i++;
      continue;
    }

    // ### 제목
    if (trimmed.startsWith('### ')) {
      result.push(new Paragraph({
        text: trimmed.slice(4),
        heading: HeadingLevel.HEADING_3,
        spacing: { before: 200, after: 100 },
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
        spacing: { after: 80 },
      }));
      i++;
      continue;
    }

    // 번호 목록 1. 2. (일반 문단으로 표시)
    const numMatch = trimmed.match(/^(\d+)\.\s+(.+)/);
    if (numMatch) {
      result.push(new Paragraph({
        children: parseInlineFormatting(`${numMatch[1]}. ${numMatch[2]}`),
        spacing: { after: 80 },
      }));
      i++;
      continue;
    }

    // 일반 문단
    result.push(new Paragraph({
      children: parseInlineFormatting(trimmed),
      spacing: { after: 120 },
    }));
    i++;
  }

  return result;
}

/** **bold** 파싱 */
function parseInlineFormatting(text) {
  const runs = [];
  let remaining = text;

  while (remaining.length > 0) {
    const boldStart = remaining.indexOf('**');
    if (boldStart === -1) {
      if (remaining) runs.push(new TextRun({ text: remaining }));
      break;
    }
    if (boldStart > 0) {
      runs.push(new TextRun({ text: remaining.slice(0, boldStart) }));
    }
    const boldEnd = remaining.indexOf('**', boldStart + 2);
    if (boldEnd === -1) {
      runs.push(new TextRun({ text: remaining.slice(boldStart + 2), bold: true }));
      break;
    }
    runs.push(new TextRun({ text: remaining.slice(boldStart + 2, boldEnd), bold: true }));
    remaining = remaining.slice(boldEnd + 2);
  }

  return runs.length > 0 ? runs : [new TextRun({ text: text || '' })];
}

/**
 * 평가보고서를 Word 문서로 다운로드
 * @param {string} content - 마크다운 본문
 * @param {string} candidateName - 치프인증자(응시자) 이름
 * @param {string|null} coverImageBase64 - 표지 이미지 (base64)
 */
export async function exportReportToDocx(content, candidateName, coverImageBase64 = null) {
  const sectionChildren = [];

  // ─── 표지 ───
  const coverParagraphs = [
    new Paragraph({ text: '', spacing: { before: 1200 } }),
    new Paragraph({
      text: '기업의별 치프인증 평가 보고서',
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
    }),
    new Paragraph({
      text: 'Stellain Chief Certification Evaluation Report',
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];

  if (coverImageBase64) {
    try {
      const imgData = base64ToUint8Array(coverImageBase64);
      coverParagraphs.push(new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new ImageRun({
            data: imgData,
            transformation: { width: 400, height: 300 },
            type: 'png',
          }),
        ],
        spacing: { after: 300 },
      }));
    } catch (e) {
      console.warn('표지 이미지 변환 실패:', e);
    }
  }

  coverParagraphs.push(new Paragraph({
    text: candidateName,
    alignment: AlignmentType.CENTER,
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 200, after: 400 },
  }));

  coverParagraphs.push(new Paragraph({
    text: '치프인증자',
    alignment: AlignmentType.CENTER,
    spacing: { after: 800 },
  }));

  sectionChildren.push(...coverParagraphs);
  sectionChildren.push(new Paragraph({ pageBreakBefore: true }));

  // ─── 본문 ───
  const bodyParagraphs = markdownToDocxParagraphs(content || '');
  sectionChildren.push(...bodyParagraphs);

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: {
            top: convertInchesToTwip(1),
            right: convertInchesToTwip(1),
            bottom: convertInchesToTwip(1),
            left: convertInchesToTwip(1),
          },
        },
      },
      children: sectionChildren,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `치프인증_평가보고서_${candidateName}.docx`);
}
