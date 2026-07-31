// ヨガファイヤーは最長リーチの置き技なので、距離を取って撃つ待ちキャラとして振る舞わせる。
// 近距離では殴り合わずに下がって、また撃てる間合いへ戻す。

import type { CpuProbabilityTable } from '../../moves/types';

export const DHALSIM_CPU_TABLE: CpuProbabilityTable = {
  far: [
    ['special', 0.35],
    ['approach', 0.35],
    ['idle', 0.3]
  ],
  mid: [
    ['approach', 0.35],
    ['special', 0.25],
    ['idle', 0.25],
    ['jumpForward', 0.15]
  ],
  close: [
    ['punch', 0.3],
    ['retreat', 0.3],
    ['kick', 0.25],
    ['jumpForward', 0.1],
    ['jump', 0.05]
  ],
  projectileDodge: 0.4
};
