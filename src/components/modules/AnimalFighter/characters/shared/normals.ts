// 通常技（Z=パンチ / X=キック）の共通ベース。
// 技IDは全キャラ共通の固定2枠で、中身だけキャラごとに差し替わる。こうしておくと
// 「Zキーでどの技を出すか」の解決が不要になり、キー入力の分岐が増えない。

import type { MoveSpec } from '../../moves/types';

// 判定の形は全キャラ共通で、reach だけキャラ別に上書きする。
// topOffset / bottomInset は Ver.6 の getAttackBox の値そのまま
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

// Ver.6 の ATTACKS の値。固有のフレームデータを与えないキャラはこれを使う
export const DEFAULT_PUNCH: NormalStats = {
  startup: 6,
  active: 4,
  recovery: 10,
  damage: 8,
  reach: 55
};

export const DEFAULT_KICK: NormalStats = {
  startup: 10,
  active: 5,
  recovery: 16,
  damage: 13,
  reach: 75
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
  hitbox: {
    ...(kind === 'punch' ? PUNCH_SHAPE : KICK_SHAPE),
    reach: stats.reach
  },
  maxHits: 1,
  hitInterval: 0,
  behavior: null
});
