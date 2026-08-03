#!/usr/bin/env node
// ポーズの等身を見比べるための1枚を作る。
//
// 描画高は「そのポーズを何pxで描くか」の定数で、素材から自動で決められないことが多い
// （腕で顔を覆う・のけぞる・逆さになる、で計測ヒューリスティックが崩れる）。
// ゲームを起動せずに判断できるよう、実際の描画サイズのまま同じ接地線に並べる。
//
//   node scripts/pose-comparison-sheet.mjs --out /tmp/check.png \
//     ryu=fight:180 ryu=air-damage:205 ken=fight:180 ken=air-damage:205 …
//
// キャラが変わるところで区切り線を引く。

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createImage, decodePng, drawScaled, encodePng } from './lib/png.mjs';

const PAD = 14;
const TOP = 40;
const BOTTOM = 24;

const parseArgs = (argv) => {
  const options = { root: 'src/assets/animal-fighter', items: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out') options.out = argv[(i += 1)];
    else if (arg === '--root') options.root = argv[(i += 1)];
    else options.items.push(arg);
  }
  return options;
};

const options = parseArgs(process.argv.slice(2));
if (options.out === undefined || options.items.length === 0) {
  console.error('usage: --out <png> [--root <dir>] <id>=<pose>:<height> …');
  process.exit(1);
}

const entries = options.items.map((item) => {
  const [id, rest] = item.split('=');
  const [pose, height] = rest.split(':');
  const image = decodePng(readFileSync(join(options.root, id, `${pose}.png`)));
  const drawHeight = Number(height);
  const scale = drawHeight / image.height;
  return { id, pose, image, scale, drawHeight, drawWidth: image.width * scale };
});

const maxHeight = Math.max(...entries.map((e) => e.drawHeight));
const width =
  entries.reduce((sum, e) => sum + e.drawWidth + PAD, PAD);
const height = TOP + maxHeight + BOTTOM;
const sheet = createImage(Math.ceil(width), Math.ceil(height));
const groundY = TOP + maxHeight;

const dot = (x, y, r, g, b, a = 255) => {
  if (x < 0 || y < 0 || x >= sheet.width || y >= sheet.height) return;
  const d = (Math.round(y) * sheet.width + Math.round(x)) * 4;
  sheet.data[d] = r;
  sheet.data[d + 1] = g;
  sheet.data[d + 2] = b;
  sheet.data[d + 3] = a;
};

let cursor = PAD;
for (const [index, entry] of entries.entries()) {
  drawScaled(
    sheet,
    cursor,
    groundY,
    entry.image,
    0,
    entry.image.height,
    entry.scale
  );
  // 立ち絵の高さ(180)の線。ここを超えるぶんが「大きく見える」量になる
  for (let x = 0; x < entry.drawWidth; x += 2) {
    dot(cursor + x, groundY - 180, 90, 190, 255);
  }
  // キャラの区切り
  const previous = entries[index - 1];
  if (previous !== undefined && previous.id !== entry.id) {
    for (let y = 0; y < sheet.height; y += 3) {
      dot(cursor - PAD / 2, y, 120, 120, 120);
    }
  }
  cursor += entry.drawWidth + PAD;
}
// 接地線
for (let x = 0; x < sheet.width; x += 1) dot(x, groundY, 255, 90, 200);

writeFileSync(options.out, encodePng(sheet));
console.log(`${sheet.width}x${sheet.height} → ${options.out}`);
console.log('桃=接地線 / 青=立ち絵の高さ(180px)。青線を大きく超えていたら描画高が高すぎる');
for (const e of entries) {
  console.log(`  ${e.id}/${e.pose}: 描画 ${e.drawWidth.toFixed(0)}x${e.drawHeight}`);
}
