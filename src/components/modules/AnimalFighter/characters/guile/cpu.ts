// サマーソルトキックは飛び道具ではなく短距離の対空技なので、遠距離では撃たせない。
// 春麗のバードキックと同じ考え方だが、ガイルは前進せずその場で回るので
// 相手が跳び込んでくる中〜近距離に寄せる。

import type { CpuProbabilityTable } from '../../moves/types';

export const GUILE_CPU_TABLE: CpuProbabilityTable = {
  far: [
    ['approach', 0.6],
    ['idle', 0.4]
  ],
  mid: [
    ['approach', 0.45],
    ['jumpForward', 0.2],
    ['special', 0.15],
    ['idle', 0.2]
  ],
  close: [
    ['punch', 0.3],
    ['kick', 0.2],
    ['special', 0.2],
    ['retreat', 0.15],
    ['jump', 0.05],
    ['jumpForward', 0.1]
  ],
  projectileDodge: 0.4
};
