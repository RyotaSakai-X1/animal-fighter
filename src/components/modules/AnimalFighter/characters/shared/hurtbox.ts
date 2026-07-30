// やられ判定の基準値。上限は高さ155px・幅70px（超えると Ver.6 の飛び越えが成立しない）。
// 幅を広げると攻撃判定も (幅-54)/2 前に伸びるので reach 側で相殺する。

import type { HurtboxSpec } from '../../moves/types';

export const DEFAULT_HURTBOX: HurtboxSpec = {
  width: 54,
  height: 130,
  crouchHeight: 65
};
