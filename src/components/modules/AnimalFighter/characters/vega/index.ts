import type { CharacterSpec } from '../../moves/types';
import { DEFAULT_CPU_TABLE } from '../shared/cpu';
import { makeNormal } from '../shared/normals';
import { DEFAULT_PROJECTILE } from '../shared/specials/projectile';

export const vega: CharacterSpec = {
  id: 'vega',
  name: 'TIGER VEGA',
  color: '#f28c28',
  // 初代（バルログ）遠立ち中Ｐ 5/4/7・強Ｋ 7/6/19。速くて爪のリーチが長い、体は細い
  hurtbox: { width: 50, height: 132, crouchHeight: 66 },
  punch: makeNormal('punch', {
    startup: 5,
    active: 4,
    recovery: 11,
    damage: 7,
    reach: 70
  }),
  kick: makeNormal('kick', {
    startup: 7,
    active: 6,
    recovery: 19,
    damage: 12,
    reach: 82
  }),
  specials: [DEFAULT_PROJECTILE],
  cpu: DEFAULT_CPU_TABLE
};
