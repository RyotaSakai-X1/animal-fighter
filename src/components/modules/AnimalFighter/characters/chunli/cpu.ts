// 春麗の CPU 抽選テーブル。共通テーブルとの違いは必殺技の使い所で、
// スピニングバードキックは飛び道具ではなく短距離の打ち上げ技なので、
// 遠距離では一切撃たず、中〜近距離でだけ混ぜる。

import type { CpuProbabilityTable } from '../../moves/types';

export const CHUNLI_CPU_TABLE: CpuProbabilityTable = {
  // 遠距離は近づくだけ。ここでバードキックを撃っても届かない
  far: [
    ['approach', 0.7],
    ['idle', 0.3]
  ],
  mid: [
    ['approach', 0.5],
    ['jumpForward', 0.2],
    ['special', 0.1],
    ['idle', 0.2]
  ],
  close: [
    ['punch', 0.3],
    ['kick', 0.2],
    ['special', 0.15],
    ['retreat', 0.15],
    ['jump', 0.1],
    ['jumpForward', 0.1]
  ],
  projectileDodge: 0.4
};
