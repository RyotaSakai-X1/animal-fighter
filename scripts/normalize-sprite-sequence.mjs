#!/usr/bin/env node
// 連番スプライトの正規化。生成画像はコマごとに縦横比もキャラの描画倍率もバラバラなので、
// そのまま高さ正規化 + 中心アンカーで描くと体格と立ち位置がコマごとにずれる。
// 頭骨の幅を基準に全コマを同一スケールへ揃え、足元を基準に同一寸法のキャンバスへ焼き直す。
//
//   node scripts/normalize-sprite-sequence.mjs \
//     --reference src/assets/animal-fighter/dhalsim/fight.png --reference-height 180 \
//     --out src/assets/animal-fighter/dhalsim/yoga-fire --name yoga-fire \
//     --contact-sheet /tmp/yoga-fire-check.png \
//     "…/ヨガファイヤー1.png" "…/ヨガファイヤー2.png" …
//
// 依存は Node 標準の zlib だけ。sharp などは入れない。

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync, inflateSync } from 'node:zlib';

// ---------------------------------------------------------------- PNG

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = -1;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ -1) >>> 0;
};

const paeth = (a, b, c) => {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
};

const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

// 8bit・非インタレースの PNG を RGBA 配列へ。素材が満たさなければ落とす
const decodePng = (buffer) => {
  let offset = 8;
  let header = null;
  let palette = null;
  let transparency = null;
  const chunks = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('latin1', offset + 4, offset + 8);
    const body = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') header = body;
    else if (type === 'PLTE') palette = body;
    else if (type === 'tRNS') transparency = body;
    else if (type === 'IDAT') chunks.push(body);
    offset += 12 + length;
  }
  if (header === null) throw new Error('IHDR が見つからない');
  const width = header.readUInt32BE(0);
  const height = header.readUInt32BE(4);
  const depth = header[8];
  const colorType = header[9];
  const interlace = header[12];
  if (depth !== 8) throw new Error(`bit depth 8 のみ対応 (${depth})`);
  if (interlace !== 0) throw new Error('インタレース PNG は非対応');
  const channels = CHANNELS[colorType];
  if (channels === undefined) throw new Error(`color type ${colorType} は非対応`);

  const raw = inflateSync(Buffer.concat(chunks));
  const stride = width * channels;
  const lines = new Uint8Array(height * stride);
  let pos = 0;
  let prev = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const line = lines.subarray(y * stride, (y + 1) * stride);
    line.set(raw.subarray(pos, pos + stride));
    pos += stride;
    if (filter === 1) {
      for (let i = channels; i < stride; i += 1) line[i] = (line[i] + line[i - channels]) & 255;
    } else if (filter === 2) {
      for (let i = 0; i < stride; i += 1) line[i] = (line[i] + prev[i]) & 255;
    } else if (filter === 3) {
      for (let i = 0; i < stride; i += 1) {
        const a = i >= channels ? line[i - channels] : 0;
        line[i] = (line[i] + ((a + prev[i]) >> 1)) & 255;
      }
    } else if (filter === 4) {
      for (let i = 0; i < stride; i += 1) {
        const a = i >= channels ? line[i - channels] : 0;
        const c = i >= channels ? prev[i - channels] : 0;
        line[i] = (line[i] + paeth(a, prev[i], c)) & 255;
      }
    } else if (filter !== 0) {
      throw new Error(`未知のフィルタ ${filter}`);
    }
    prev = line;
  }

  const rgba = new Uint8Array(width * height * 4);
  for (let i = 0, n = width * height; i < n; i += 1) {
    const s = i * channels;
    const d = i * 4;
    if (colorType === 6) {
      rgba[d] = lines[s];
      rgba[d + 1] = lines[s + 1];
      rgba[d + 2] = lines[s + 2];
      rgba[d + 3] = lines[s + 3];
    } else if (colorType === 2) {
      rgba[d] = lines[s];
      rgba[d + 1] = lines[s + 1];
      rgba[d + 2] = lines[s + 2];
      rgba[d + 3] = 255;
    } else if (colorType === 3) {
      const idx = lines[s];
      rgba[d] = palette[idx * 3];
      rgba[d + 1] = palette[idx * 3 + 1];
      rgba[d + 2] = palette[idx * 3 + 2];
      rgba[d + 3] = transparency !== null && idx < transparency.length ? transparency[idx] : 255;
    } else if (colorType === 0) {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = lines[s];
      rgba[d + 3] = 255;
    } else {
      rgba[d] = rgba[d + 1] = rgba[d + 2] = lines[s];
      rgba[d + 3] = lines[s + 1];
    }
  }
  return { width, height, data: rgba };
};

const chunk = (type, body) => {
  const out = Buffer.alloc(body.length + 12);
  out.writeUInt32BE(body.length, 0);
  out.write(type, 4, 'latin1');
  Buffer.from(body).copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + body.length)), 8 + body.length);
  return out;
};

// 行ごとに5種のフィルタを試し、絶対値和が最小のものを選ぶ（標準的なヒューリスティック）
const encodePng = ({ width, height, data }) => {
  const stride = width * 4;
  const out = Buffer.alloc(height * (stride + 1));
  const prev = new Uint8Array(stride);
  const candidate = new Uint8Array(stride);
  let best = new Uint8Array(stride);
  for (let y = 0; y < height; y += 1) {
    const line = data.subarray(y * stride, (y + 1) * stride);
    let bestFilter = 0;
    let bestScore = Infinity;
    for (let filter = 0; filter <= 4; filter += 1) {
      let score = 0;
      for (let i = 0; i < stride; i += 1) {
        const a = i >= 4 ? line[i - 4] : 0;
        const b = prev[i];
        const c = i >= 4 ? prev[i - 4] : 0;
        let v;
        if (filter === 0) v = line[i];
        else if (filter === 1) v = (line[i] - a) & 255;
        else if (filter === 2) v = (line[i] - b) & 255;
        else if (filter === 3) v = (line[i] - ((a + b) >> 1)) & 255;
        else v = (line[i] - paeth(a, b, c)) & 255;
        candidate[i] = v;
        score += v < 128 ? v : 256 - v;
      }
      if (score < bestScore) {
        bestScore = score;
        bestFilter = filter;
        best.set(candidate);
      }
    }
    out[y * (stride + 1)] = bestFilter;
    Buffer.from(best.buffer, best.byteOffset, stride).copy(out, y * (stride + 1) + 1);
    prev.set(line);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(out, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ]);
};

// ---------------------------------------------------------------- 計測

const OPAQUE = 16;

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

// ---------------------------------------------------------------- 再サンプル

// 面積平均。8〜13倍の縮小なので最近傍では潰れる。
// アルファは乗算済みで畳んでから戻す（そのまま平均すると縁が暗く濁る）
const drawScaled = (dst, dstAnchorX, dstAnchorY, src, srcAnchorX, srcAnchorY, scale, tint) => {
  const step = 1 / scale;
  for (let oy = 0; oy < dst.height; oy += 1) {
    const sy0 = (oy - dstAnchorY) * step + srcAnchorY;
    const sy1 = sy0 + step;
    if (sy1 <= 0 || sy0 >= src.height) continue;
    for (let ox = 0; ox < dst.width; ox += 1) {
      const sx0 = (ox - dstAnchorX) * step + srcAnchorX;
      const sx1 = sx0 + step;
      if (sx1 <= 0 || sx0 >= src.width) continue;
      let r = 0;
      let g = 0;
      let b = 0;
      let a = 0;
      let total = 0;
      for (let sy = Math.floor(sy0); sy < Math.ceil(sy1); sy += 1) {
        if (sy < 0 || sy >= src.height) continue;
        const wy = Math.min(sy + 1, sy1) - Math.max(sy, sy0);
        if (wy <= 0) continue;
        for (let sx = Math.floor(sx0); sx < Math.ceil(sx1); sx += 1) {
          if (sx < 0 || sx >= src.width) continue;
          const wx = Math.min(sx + 1, sx1) - Math.max(sx, sx0);
          if (wx <= 0) continue;
          const w = wx * wy;
          const o = (sy * src.width + sx) * 4;
          const alpha = src.data[o + 3] / 255;
          r += src.data[o] * alpha * w;
          g += src.data[o + 1] * alpha * w;
          b += src.data[o + 2] * alpha * w;
          a += src.data[o + 3] * w;
          total += w;
        }
      }
      if (total <= 0) continue;
      const outA = a / total;
      if (outA < 1) continue;
      const norm = outA / 255;
      let cr = r / total / norm;
      let cg = g / total / norm;
      let cb = b / total / norm;
      if (tint !== undefined) {
        cr = cr * 0.35 + tint[0] * 0.65;
        cg = cg * 0.35 + tint[1] * 0.65;
        cb = cb * 0.35 + tint[2] * 0.65;
      }
      const d = (oy * dst.width + ox) * 4;
      // コンタクトシートは重ね描きするので、既にある画素とアルファ合成する
      const sa = (tint === undefined ? outA : outA * 0.5) / 255;
      const da = dst.data[d + 3] / 255;
      const oa = sa + da * (1 - sa);
      if (oa <= 0) continue;
      dst.data[d] = (cr * sa + dst.data[d] * da * (1 - sa)) / oa;
      dst.data[d + 1] = (cg * sa + dst.data[d + 1] * da * (1 - sa)) / oa;
      dst.data[d + 2] = (cb * sa + dst.data[d + 2] * da * (1 - sa)) / oa;
      dst.data[d + 3] = oa * 255;
    }
  }
};

// ---------------------------------------------------------------- 本体

const parseArgs = (argv) => {
  const options = { supersample: 2, referenceHeight: 180, inputs: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--reference') options.reference = argv[(i += 1)];
    else if (arg === '--reference-height') options.referenceHeight = Number(argv[(i += 1)]);
    else if (arg === '--out') options.out = argv[(i += 1)];
    else if (arg === '--name') options.name = argv[(i += 1)];
    else if (arg === '--contact-sheet') options.contactSheet = argv[(i += 1)];
    else if (arg === '--supersample') options.supersample = Number(argv[(i += 1)]);
    else options.inputs.push(arg);
  }
  return options;
};

const options = parseArgs(process.argv.slice(2));
if (!options.reference || !options.out || !options.name || options.inputs.length === 0) {
  console.error('usage: --reference <png> --reference-height <px> --out <dir> --name <base> <inputs…>');
  process.exit(1);
}

const reference = decodePng(readFileSync(options.reference));
const referenceInfo = measure(reference);
// 基準スプライトが実際に描画される倍率へ換算し、そこでの頭骨幅を目標値にする
const referenceScale = options.referenceHeight / reference.height;
const targetSkull8 = referenceInfo.skull8 * referenceScale;
const targetSkull16 = referenceInfo.skull16 * referenceScale;

console.log(`基準 ${options.reference}`);
console.log(
  `  ${reference.width}x${reference.height} → 描画高 ${options.referenceHeight}px` +
    ` / 頭骨幅 ${targetSkull8.toFixed(1)}px(8%) ${targetSkull16.toFixed(1)}px(16%)`
);
console.log('');

const frames = options.inputs.map((path) => {
  const image = decodePng(readFileSync(path));
  const info = measure(image);
  // 8%と16%の2点から出した倍率を平均する。頭の傾きで片方だけ荒れるのを均す
  const scale = (targetSkull8 / info.skull8 + targetSkull16 / info.skull16) / 2;
  return { path, image, info, scale };
});

const supersample = options.supersample;
let padLeft = 0;
let padRight = 0;
let padUp = 0;
let padDown = 0;
for (const frame of frames) {
  const s = frame.scale * supersample;
  padLeft = Math.max(padLeft, (frame.info.feetMidX - frame.info.left) * s);
  padRight = Math.max(padRight, (frame.info.right + 1 - frame.info.feetMidX) * s);
  padUp = Math.max(padUp, (frame.info.feetBottomY - frame.info.top) * s);
  padDown = Math.max(padDown, (frame.info.bottom + 1 - frame.info.feetBottomY) * s);
}
const canvasWidth = Math.ceil(padLeft + padRight);
const canvasHeight = Math.ceil(padUp + padDown);
const anchorX = Math.round(padLeft);
const anchorY = Math.round(padUp);

mkdirSync(options.out, { recursive: true });

console.log('コマごとの計測と倍率:');
frames.forEach((frame, index) => {
  const { info, scale } = frame;
  console.log(
    `  ${index + 1}: ${frame.image.width}x${frame.image.height}` +
      ` 頭骨 ${info.skull8}/${info.skull16}` +
      ` → 倍率 ${scale.toFixed(4)}` +
      ` / 頭〜足 ${(info.charHeight * scale).toFixed(1)}px` +
      ` / 立ち位置から右端まで ${((info.right - info.feetMidX) * scale).toFixed(0)}px`
  );
});

frames.forEach((frame, index) => {
  const canvas = {
    width: canvasWidth,
    height: canvasHeight,
    data: new Uint8Array(canvasWidth * canvasHeight * 4)
  };
  drawScaled(
    canvas,
    anchorX,
    anchorY,
    frame.image,
    frame.info.feetMidX,
    frame.info.feetBottomY,
    frame.scale * supersample
  );
  const file = join(options.out, `${options.name}-${index + 1}.png`);
  writeFileSync(file, encodePng(canvas));
  console.log(`  書き出し ${file}`);
});

if (options.contactSheet !== undefined) {
  const sheet = {
    width: canvasWidth,
    height: canvasHeight,
    data: new Uint8Array(canvasWidth * canvasHeight * 4)
  };
  const tints = [
    [255, 90, 90],
    [90, 220, 120],
    [110, 160, 255],
    [255, 210, 80]
  ];
  frames.forEach((frame, index) => {
    drawScaled(
      sheet,
      anchorX,
      anchorY,
      frame.image,
      frame.info.feetMidX,
      frame.info.feetBottomY,
      frame.scale * supersample,
      tints[index % tints.length]
    );
  });
  // 接地線・アンカー線・頭頂線。ここが揃っていれば位置と等身は合っている
  const headTop = Math.min(
    ...frames.map((f) => anchorY - (f.info.feetBottomY - f.info.top) * f.scale * supersample)
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
console.log('');
console.log('extendingFlame の reach（立ち位置から右端まで、描画px）:');
console.log(
  `  ${frames.map((f) => Math.round((f.info.right - f.info.feetMidX) * f.scale)).join(', ')}`
);
