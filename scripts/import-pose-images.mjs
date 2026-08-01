#!/usr/bin/env node
// 単発ポーズ画像の取り込み。連番アニメ用の normalize-sprite-sequence.mjs とは目的が違う。
//
// 描画側の drawImageAnchored は「透明な余白ごと」画像を指定高さに縮めるので、
// 余白があるとキャラが小さく・地面から浮いて描かれる。実測では春麗の立ちガードが
// 180px 指定に対し 149.7px（17%小さい）になっていた。
// そこで **アルファの外接矩形で余白を切り詰めてから** 長辺512pxへ縮小する。
// 既存ポーズが余白ゼロなのはそうなっているから。
//
//   node scripts/import-pose-images.mjs \
//     --out-root src/assets/animal-fighter \
//     --remove-background \
//     ryu=…/ryu/guard.png:guard  ryu=…/ryu/crouch-guard.png:crouch-guard  …
//
// 依存は Node 標準の zlib だけ。

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import {
  alphaBounds,
  createImage,
  decodePng,
  drawScaled,
  encodePng,
  removeBackground,
  transparentRatio
} from './lib/png.mjs';

const LONG_SIDE = 512;

const parseArgs = (argv) => {
  const options = { inputs: [], tolerance: 24 };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--out-root') options.outRoot = argv[(i += 1)];
    else if (arg === '--tolerance') options.tolerance = Number(argv[(i += 1)]);
    else if (arg === '--remove-background') options.removeBackground = true;
    else options.inputs.push(arg);
  }
  return options;
};

const options = parseArgs(process.argv.slice(2));
if (options.outRoot === undefined || options.inputs.length === 0) {
  console.error('usage: --out-root <dir> [--remove-background] [--tolerance N] <id>=<src>:<name> …');
  process.exit(1);
}

console.log(`${'入力'.padEnd(34)} ${'元'.padEnd(12)} 背景除去  ${'切り詰め'.padEnd(12)} 出力`);

for (const spec of options.inputs) {
  const eq = spec.indexOf('=');
  const colon = spec.lastIndexOf(':');
  if (eq < 0 || colon < eq) throw new Error(`引数の形式は <id>=<src>:<name> : ${spec}`);
  const id = spec.slice(0, eq);
  const source = spec.slice(eq + 1, colon);
  const name = spec.slice(colon + 1);

  const image = decodePng(readFileSync(source));
  const before = `${image.width}x${image.height}`;

  // 既に透過があるものは切り抜き済みとみなす（二重処理で輪郭を削らない）
  let bgNote = '—';
  if (options.removeBackground && transparentRatio(image) < 0.02) {
    removeBackground(image, options.tolerance);
    bgNote = `実施(${(transparentRatio(image) * 100).toFixed(0)}%)`;
  }

  const bounds = alphaBounds(image);
  const cropW = bounds.right - bounds.left + 1;
  const cropH = bounds.bottom - bounds.top + 1;
  const scale = Math.min(1, LONG_SIDE / Math.max(cropW, cropH));
  const outW = Math.max(1, Math.round(cropW * scale));
  const outH = Math.max(1, Math.round(cropH * scale));

  const out = createImage(outW, outH);
  drawScaled(out, 0, 0, image, bounds.left, bounds.top, scale);

  const dir = join(options.outRoot, id);
  mkdirSync(dir, { recursive: true });
  const file = join(dir, `${name}.png`);
  writeFileSync(file, encodePng(out));

  console.log(
    `${basename(dirname(source)) + '/' + basename(source)}`.padEnd(34) +
      ` ${before.padEnd(12)} ${bgNote.padEnd(9)} ${`${cropW}x${cropH}`.padEnd(12)} ${outW}x${outH}  ${file}`
  );
}
