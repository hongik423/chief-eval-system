/**
 * bi.png에 "기업의별" 흰색 텍스트 추가 (다크모드 가시성)
 */
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const inputPath = join(ROOT, 'public', 'bi.png');
const outputPath = join(ROOT, 'public', 'bi.png');

const metadata = await sharp(inputPath).metadata();
const w = metadata.width || 256;
const h = metadata.height || 256;
const fontSize = Math.round(Math.min(w, h) * 0.12);
const textY = Math.round(h * 0.92);

const textSvg = Buffer.from(`
<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg">
  <text
    x="${w / 2}"
    y="${textY}"
    text-anchor="middle"
    font-family="Pretendard, -apple-system, BlinkMacSystemFont, sans-serif"
    font-size="${fontSize}"
    font-weight="700"
    fill="#FFFFFF"
  >기업의별</text>
</svg>
`);

const result = await sharp(inputPath)
  .composite([{ input: textSvg, top: 0, left: 0 }])
  .png()
  .toBuffer();

writeFileSync(outputPath, result);
console.log('bi.png 업데이트 완료: "기업의별" 흰색 텍스트 추가');
