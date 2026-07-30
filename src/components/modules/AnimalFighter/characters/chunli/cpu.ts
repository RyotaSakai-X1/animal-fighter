// バードキックは飛び道具ではなく短距離の打ち上げ技なので、遠距離では撃たせない。

import type { CpuProbabilityTable } from '../../moves/types';

export const CHUNLI_CPU_TABLE: CpuProbabilityTable = {
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
