// CPU の行動抽選テーブルの共通ベース。Ver.6 の CPU_PROBABILITIES と同一の値で、
// 固有のテーブルを与えないキャラはこれを使う＝CPU の挙動は Ver.6 と一致する。

import type { CpuProbabilityTable } from '../../moves/types';

export const DEFAULT_CPU_TABLE: CpuProbabilityTable = {
  far: [
    ['approach', 0.6],
    ['projectile', 0.2],
    ['idle', 0.2]
  ],
  mid: [
    ['approach', 0.5],
    ['jumpForward', 0.2],
    ['projectile', 0.15],
    ['idle', 0.15]
  ],
  close: [
    ['punch', 0.35],
    ['kick', 0.25],
    ['retreat', 0.2],
    ['jump', 0.1],
    ['jumpForward', 0.1] // 近距離の前方ジャンプ＝飛び越えて裏に回る「めくり」狙い
  ],
  projectileDodge: 0.4
};
