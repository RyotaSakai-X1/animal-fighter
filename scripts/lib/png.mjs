// PNG の読み書きと画素処理。Node 標準の zlib だけで完結させる（sharp などは入れない）。
// 連番アニメ用の normalize-sprite-sequence.mjs と単発ポーズ用の import-pose-images.mjs が共有する。

import { deflateSync, inflateSync } from 'node:zlib';

// アルファがこれ以下なら「透明」とみなす。アンチエイリアスの裾を拾わない程度の値
export const OPAQUE = 16;

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
export const decodePng = (buffer) => {
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
export const encodePng = ({ width, height, data }) => {
  const stride = width * 4;
  const out = Buffer.alloc(height * (stride + 1));
  const prev = new Uint8Array(stride);
  const candidate = new Uint8Array(stride);
  const best = new Uint8Array(stride);
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

// 不透明画素の外接矩形。描画側は余白ごと縮めるので、ここで測って切り詰める
export const alphaBounds = (image) => {
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
  return { top, bottom, left, right };
};

// 不透明画素の重心。回転する滞空アニメは足元で揃えられないのでこちらを軸にする
export const alphaCentroid = (image) => {
  const { width, height, data } = image;
  let sx = 0;
  let sy = 0;
  let n = 0;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (data[(y * width + x) * 4 + 3] <= OPAQUE) continue;
      sx += x;
      sy += y;
      n += 1;
    }
  }
  if (n === 0) throw new Error('不透明画素が無い');
  return { x: sx / n, y: sy / n };
};

export const transparentRatio = (image) => {
  const { width, height, data } = image;
  let clear = 0;
  for (let i = 0; i < width * height; i += 1) {
    if (data[i * 4 + 3] <= OPAQUE) clear += 1;
  }
  return clear / (width * height);
};

// ---------------------------------------------------------------- 背景除去

// 画像の端から同系色を塗りつぶして背景と判定する。
// 体の内側にある同系色は端から連結していないので守られる（濃い輪郭線が壁になる）。
// tolerance は緩めすぎるとキャラを食う。ガイルの肌と背景が距離36しか離れていない
// 素材があったので 24 前後に留めること。
export const removeBackground = (image, tolerance = 24, featherPx = 2) => {
  const { width, height, data } = image;
  const seedR = data[0];
  const seedG = data[1];
  const seedB = data[2];
  const isBg = (x, y) => {
    const o = (y * width + x) * 4;
    return (
      Math.abs(data[o] - seedR) <= tolerance &&
      Math.abs(data[o + 1] - seedG) <= tolerance &&
      Math.abs(data[o + 2] - seedB) <= tolerance
    );
  };

  const mask = new Uint8Array(width * height);
  const stack = [];
  for (let x = 0; x < width; x += 1) {
    stack.push(x, 0, x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    stack.push(0, y, width - 1, y);
  }
  while (stack.length > 0) {
    const y = stack.pop();
    const x = stack.pop();
    if (x < 0 || y < 0 || x >= width || y >= height) continue;
    const i = y * width + x;
    if (mask[i] === 1) continue;
    if (!isBg(x, y)) continue;
    mask[i] = 1;
    stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
  }

  for (let i = 0; i < width * height; i += 1) {
    if (mask[i] === 1) data[i * 4 + 3] = 0;
  }

  // 縁のアンチエイリアスには背景色が混ざっている。背景に接する数pxのアルファを
  // 落として、切り抜き跡のふちどりを目立たなくする
  for (let pass = 0; pass < featherPx; pass += 1) {
    const edge = [];
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = y * width + x;
        if (mask[i] === 1 || data[i * 4 + 3] === 0) continue;
        const touching =
          (x > 0 && mask[i - 1] === 1) ||
          (x < width - 1 && mask[i + 1] === 1) ||
          (y > 0 && mask[i - width] === 1) ||
          (y < height - 1 && mask[i + width] === 1);
        if (touching) edge.push(i);
      }
    }
    for (const i of edge) {
      data[i * 4 + 3] = Math.round(data[i * 4 + 3] * 0.45);
      if (data[i * 4 + 3] <= OPAQUE) mask[i] = 1;
    }
  }
  return image;
};

// ---------------------------------------------------------------- 再サンプル

export const createImage = (width, height) => ({
  width,
  height,
  data: new Uint8Array(width * height * 4)
});

// 面積平均で dst へ描き込む。src の (srcAnchorX, srcAnchorY) が dst の
// (dstAnchorX, dstAnchorY) に来るように scale 倍する。
// 大きく縮小するので最近傍では潰れる。アルファは乗算済みで畳んでから戻す
// （そのまま平均すると縁が暗く濁る）。
// tint を渡すと色を寄せて半透明で重ねる＝コンタクトシート用。
export const drawScaled = (
  dst,
  dstAnchorX,
  dstAnchorY,
  src,
  srcAnchorX,
  srcAnchorY,
  scale,
  tint
) => {
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
      // 重ね描きするので既にある画素とアルファ合成する
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
