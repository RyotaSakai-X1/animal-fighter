// Ver.6 の「Cキーで飛び道具」を必殺技スロットに載せたもの。固有技のない9キャラが使う。
// 数値は Ver.6 から変えていない（削りのみ属性として明示）。

import type { SpecialMove } from '../../../moves/types';

export const DEFAULT_PROJECTILE: SpecialMove = {
  id: 'projectile',
  name: '飛び道具',
  pose: 'punch',
  startup: 12,
  active: 1,
  recovery: 20,
  damage: 12,
  // 本家の波動拳と同じくガードしても削る
  chipDamage: 3,
  // Ver.6 から据え置き。他8キャラの間合いを変えないため
  knockback: 6,
  // 弾だけで当てるので打撃判定なし。hitbox は型のためのダミー
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
