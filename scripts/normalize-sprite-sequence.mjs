#!/usr/bin/env node
// 連番スプライトの正規化。生成画像はコマごとに縦横比もキャラの描画倍率もバラバラなので、
// そのまま高さ正規化 + 中心アンカーで描くと体格と立ち位置がコマごとにずれる。
// 頭骨の幅を基準に全コマを同一スケールへ揃え、共通のアンカーで同一寸法のキャンバスへ焼き直す。
//
//   node scripts/normalize-sprite-sequence.mjs \
//     --reference src/assets/animal-fighter/dhalsim/fight.png --reference-height 180 \
//     --out src/assets/animal-fighter/dhalsim/yoga-fire --name yoga-fire \
//     --contact-sheet /tmp/yoga-fire-check.png \
//     "…/ヨガファイヤー1.png" "…/ヨガファイヤー2.png" …
//
// --anchor centroid  足元ではなく不透明画素の重心で揃える。回転する滞空技はこちら
//                    （逆さのコマは頭が下に来るので足元アンカーが使えない）
// --remove-background  端から同系色を塗りつぶして背景を抜く。透過済みの画像はスキップ
// --scale-by area    コマごとの頭骨幅ではなく、全コマ共通の1つの倍率を面積から決める。
//                    頭骨幅は「頭が上端にある」前提なので、蹴り上げや逆さのコマでは
//                    脚やエフェクトを頭と誤認する（実測でコマ2だけ6倍になった）。
//                    素材が同じ縮尺で描かれている場合はこちらが安全
//
// 単発ポーズの取り込みは import-pose-images.mjs。PNG 処理は lib/png.mjs に共通化してある。

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  alphaCentroid,
  createImage,
  decodePng,
  drawScaled,
  encodePng,
  OPAQUE,
  removeBackground,
  transparentRatio
} from './lib/png.mjs';

// ---------------------------------------------------------------- 計測

// 頭骨の幅。頭頂から一定割合だけ下がった行の最長ランを取る。
// ポーズが変わっても頭の大きさは変わらないので、しゃがみや前傾を打ち消さずに倍率だけ拾える
const longestRun = (image, y) => {
  const { width, data } = image;
  let best = 0;
  let run = 0;
  for (let x = 0; x < width; x += 1) {
    if (data[(y * width + x) * 4 + 3] > OPAQUE) {
      run += 1;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
};

const measure = (image) => {
  const { width, height, data } = image;
  let top = -1;
  let bottom = -1;
  let left = width;
  let right = -1;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= OPAQUE) continue;
      if (top < 0) top = y;
      bottom = y;
      if (x < left) left = x;
      if (x > right) right = x;
    }
  }
  if (top < 0) throw new Error('不透明画素が無い');
  const charHeight = bottom - top;
  const skull = [0.08, 0.16].map((frac) =>
    longestRun(image, Math.min(height - 1, top + Math.round(charHeight * frac)))
  );
  // 足の中点。キャラ高の下端4%にある不透明画素の水平中点を立ち位置とみなす
  const footTop = Math.max(top, bottom - Math.round(charHeight * 0.04));
  let footLeft = width;
  let footRight = -1;
  for (let y = footTop; y <= bottom; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= OPAQUE) continue;
      if (x < footLeft) footLeft = x;
      if (x > footRight) footRight = x;
    }
  }
  return {
    top,
    bottom,
    left,
    right,
    charHeight,
    skull8: skull[0],
    skull16: skull[1],
    feetMidX: (footLeft + footRight) / 2,
    feetBottomY: bottom
  };
};

// ---------------------------------------------------------------- 本体

const parseArgs = (argv) => {
  const options = {
    supersample: 2,
    referenceHeight: 180,
    anchor: 'feet',
    tolerance: 24,
    inputs: []
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--reference') options.reference = argv[(i += 1)];
    else if (arg === '--reference-height') options.referenceHeight = Number(argv[(i += 1)]);
    else if (arg === '--out') options.out = argv[(i += 1)];
    else if (arg === '--name') options.name = argv[(i += 1)];
    else if (arg === '--contact-sheet') options.contactSheet = argv[(i += 1)];
    else if (arg === '--supersample') options.supersample = Number(argv[(i += 1)]);
    else if (arg === '--anchor') options.anchor = argv[(i += 1)];
    else if (arg === '--scale-by') options.scaleBy = argv[(i += 1)];
    else if (arg === '--tolerance') options.tolerance = Number(argv[(i += 1)]);
    else if (arg === '--remove-background') options.removeBackground = true;
    else options.inputs.push(arg);
  }
  return options;
};

const options = parseArgs(process.argv.slice(2));
if (!options.reference || !options.out || !options.name || options.inputs.length === 0) {
  console.error('usage: --reference <png> --reference-height <px> --out <dir> --name <base> <inputs…>');
  process.exit(1);
}

const opaqueArea = (image) => {
  let n = 0;
  for (let i = 0; i < image.width * image.height; i += 1) {
    if (image.data[i * 4 + 3] > OPAQUE) n += 1;
  }
  return n;
};

const reference = decodePng(readFileSync(options.reference));
const referenceInfo = measure(reference);
// 基準スプライトが実際に描画される倍率へ換算する
const referenceScale = options.referenceHeight / reference.height;
const targetSkull8 = referenceInfo.skull8 * referenceScale;
const targetSkull16 = referenceInfo.skull16 * referenceScale;
const targetArea = opaqueArea(reference) * referenceScale * referenceScale;

console.log(`基準 ${options.reference}`);
console.log(
  `  ${reference.width}x${reference.height} → 描画高 ${options.referenceHeight}px` +
    (options.scaleBy === 'area'
      ? ` / 面積 ${Math.round(targetArea)}px²`
      : ` / 頭骨幅 ${targetSkull8.toFixed(1)}px(8%) ${targetSkull16.toFixed(1)}px(16%)`)
);
console.log('');

const loaded = options.inputs.map((path) => {
  const image = decodePng(readFileSync(path));
  // 既に透過があるものは切り抜き済みとみなす（二重処理で輪郭を削らない）
  let removed = false;
  if (options.removeBackground && transparentRatio(image) < 0.02) {
    removeBackground(image, options.tolerance);
    removed = true;
  }
  return { path, image, removed, info: measure(image), area: opaqueArea(image) };
});

// 面積基準は全コマ共通の1倍率。素材が同じ縮尺で描かれている前提なので、
// コマごとの差（ポーズによる面積の増減）は残したまま全体の大きさだけ合わせる。
// 代表値には中央値を使う（極端に丸まったコマに引っ張られないように）
let uniformScale = 1;
if (options.scaleBy === 'area') {
  const sorted = [...loaded].map((f) => f.area).sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  uniformScale = Math.sqrt(targetArea / median);
}

const frames = loaded.map((frame) => {
  const { info } = frame;
  const scale =
    options.scaleBy === 'area'
      ? uniformScale
      : // 8%と16%の2点から出した倍率を平均する。頭の傾きで片方だけ荒れるのを均す
        (targetSkull8 / info.skull8 + targetSkull16 / info.skull16) / 2;
  // 回転する滞空技は足元で揃えられない（逆さのコマは頭が下）ので重心を使う
  const centroid = alphaCentroid(frame.image);
  const anchorSrcX = options.anchor === 'centroid' ? centroid.x : info.feetMidX;
  const anchorSrcY = options.anchor === 'centroid' ? centroid.y : info.feetBottomY;
  return { ...frame, scale, anchorSrcX, anchorSrcY };
});

const supersample = options.supersample;
let padLeft = 0;
let padRight = 0;
let padUp = 0;
let padDown = 0;
for (const frame of frames) {
  const s = frame.scale * supersample;
  padLeft = Math.max(padLeft, (frame.anchorSrcX - frame.info.left) * s);
  padRight = Math.max(padRight, (frame.info.right + 1 - frame.anchorSrcX) * s);
  padUp = Math.max(padUp, (frame.anchorSrcY - frame.info.top) * s);
  padDown = Math.max(padDown, (frame.info.bottom + 1 - frame.anchorSrcY) * s);
}
const canvasWidth = Math.ceil(padLeft + padRight);
const canvasHeight = Math.ceil(padUp + padDown);
const anchorX = Math.round(padLeft);
const anchorY = Math.round(padUp);

mkdirSync(options.out, { recursive: true });

console.log(`アンカー: ${options.anchor === 'centroid' ? '重心' : '足元'}`);
console.log('コマごとの計測と倍率:');
frames.forEach((frame, index) => {
  const { info, scale } = frame;
  console.log(
    `  ${index + 1}: ${frame.image.width}x${frame.image.height}` +
      `${frame.removed ? ' 背景除去' : '        '}` +
      (options.scaleBy === 'area'
        ? ` 面積 ${frame.area}`
        : ` 頭骨 ${info.skull8}/${info.skull16}`) +
      ` → 倍率 ${scale.toFixed(4)}` +
      ` / 頭〜足 ${(info.charHeight * scale).toFixed(1)}px` +
      ` / アンカーから右端まで ${((info.right - frame.anchorSrcX) * scale).toFixed(0)}px`
  );
});

frames.forEach((frame, index) => {
  const canvas = createImage(canvasWidth, canvasHeight);
  drawScaled(
    canvas,
    anchorX,
    anchorY,
    frame.image,
    frame.anchorSrcX,
    frame.anchorSrcY,
    frame.scale * supersample
  );
  const file = join(options.out, `${options.name}-${index + 1}.png`);
  writeFileSync(file, encodePng(canvas));
  console.log(`  書き出し ${file}`);
});

if (options.contactSheet !== undefined) {
  const sheet = createImage(canvasWidth, canvasHeight);
  const tints = [
    [255, 90, 90],
    [90, 220, 120],
    [110, 160, 255],
    [255, 210, 80],
    [220, 120, 255]
  ];
  frames.forEach((frame, index) => {
    drawScaled(
      sheet,
      anchorX,
      anchorY,
      frame.image,
      frame.anchorSrcX,
      frame.anchorSrcY,
      frame.scale * supersample,
      tints[index % tints.length]
    );
  });
  // 接地線・アンカー線・頭頂線。ここが揃っていれば位置と等身は合っている
  const headTop = Math.min(
    ...frames.map((f) => anchorY - (f.anchorSrcY - f.info.top) * f.scale * supersample)
  );
  const guide = (x, y, r, g, b) => {
    if (x < 0 || y < 0 || x >= canvasWidth || y >= canvasHeight) return;
    const d = (y * canvasWidth + x) * 4;
    sheet.data[d] = r;
    sheet.data[d + 1] = g;
    sheet.data[d + 2] = b;
    sheet.data[d + 3] = 255;
  };
  for (let x = 0; x < canvasWidth; x += 1) {
    guide(x, Math.min(canvasHeight - 1, anchorY), 255, 255, 255);
    guide(x, Math.max(0, Math.round(headTop)), 0, 255, 255);
  }
  for (let y = 0; y < canvasHeight; y += 1) guide(anchorX, y, 255, 0, 255);
  writeFileSync(options.contactSheet, encodePng(sheet));
  console.log(`  検証用シート ${options.contactSheet}`);
}

console.log('');
console.log('sprites.ts に渡す値:');
console.log(`  キャンバス ${canvasWidth}x${canvasHeight} (supersample ${supersample}x)`);
console.log(`  height: ${Math.round(canvasHeight / supersample)}`);
console.log(`  anchorX: ${(anchorX / canvasWidth).toFixed(3)}`);
console.log(`  offsetY: ${Math.round((canvasHeight - anchorY) / supersample)}`);
if (options.anchor === 'centroid') {
  // 回転の軸はアンカー＝重心。描画高に対してアンカーが下端から何pxかを渡す
  console.log(`  pivotY: ${Math.round((canvasHeight - anchorY) / supersample)}`);
}
console.log('');
console.log('アンカーから右端までの距離（描画px。extendingFlame の reach 用）:');
console.log(
  `  ${frames.map((f) => Math.round((f.info.right - f.anchorSrcX) * f.scale)).join(', ')}`
);
