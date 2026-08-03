// 通常技は全キャラ共通の固定2枠で、中身だけキャラごとに差し替わる
// （キー入力の分岐を増やさないため）。

import type { MoveSpec } from '../../moves/types';

// 判定の形は共通で reach だけキャラ別。値は Ver.6 の getAttackBox のまま
const PUNCH_SHAPE = {
  spread: 'forward',
  topOffset: 15,
  bottomInset: 18
} as const;

const KICK_SHAPE = {
  spread: 'forward',
  topOffset: 35,
  bottomInset: 18
} as const;

export type NormalStats = {
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  reach: number;
};

export const makeNormal = (
  kind: 'punch' | 'kick',
  stats: NormalStats
): MoveSpec => ({
  id: kind,
  name: kind === 'punch' ? 'パンチ' : 'キック',
  pose: kind,
  startup: stats.startup,
  active: stats.active,
  recovery: stats.recovery,
  damage: stats.damage,
  // 本家スト2と同じく通常技のガードは削らない
  chipDamage: 0,
  knockback: 6,
  // 通常技は打ち上げない
  launch: 0,
  hitStop: 4,
  hitbox: {
    ...(kind === 'punch' ? PUNCH_SHAPE : KICK_SHAPE),
    reach: stats.reach
  },
  maxHits: 1,
  hitInterval: 0,
  behavior: null
});
