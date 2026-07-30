// Ver.6 までの「Cキーで飛び道具」をそのまま必殺技スロットに載せたもの。
// 固有必殺技をまだ用意していない9キャラが据え置きで使う。
// 数値は Ver.6 の ATTACKS.projectile と spawnProjectile から一切変えていない。

import type { SpecialMove } from '../../../moves/types';

export const DEFAULT_PROJECTILE: SpecialMove = {
  id: 'projectile',
  name: '飛び道具',
  pose: 'punch',
  startup: 12,
  active: 1,
  recovery: 20,
  damage: 12,
  // 打撃判定は持たず弾だけで当てるので maxHits: 0。hitbox は使われないが型のために置く
  hitbox: { reach: 0, spread: 'forward', topOffset: 15, bottomInset: 18 },
  maxHits: 0,
  hitInterval: 0,
  behavior: {
    kind: 'projectile',
    spawnFrame: 12,
    speed: 6,
    height: 94,
    offsetX: 38
  },
  command: { kind: 'buttonOnly', trigger: 'special' },
  cooldown: 60,
  animation: null
};
