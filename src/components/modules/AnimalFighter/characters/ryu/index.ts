import type { CharacterSpec } from '../../moves/types';
import { DEFAULT_CPU_TABLE } from '../shared/cpu';
import { DEFAULT_HURTBOX } from '../shared/hurtbox';
import { makeNormal } from '../shared/normals';
import { DEFAULT_PROJECTILE } from '../shared/specials/projectile';

export const ryu: CharacterSpec = {
  id: 'ryu',
  name: 'KUMA-RYU',
  color: '#8b5a2b',
  // 初代 遠立ち中Ｐ 4/4/6・強Ｋ 3/4/17。全キャラの基準
  hurtbox: DEFAULT_HURTBOX,
  punch: makeNormal('punch', {
    startup: 4,
    active: 4,
    recovery: 10,
    damage: 8,
    reach: 55
  }),
  kick: makeNormal('kick', {
    startup: 3,
    active: 4,
    recovery: 17,
    damage: 13,
    reach: 75
  }),
  specials: [DEFAULT_PROJECTILE],
  cpu: DEFAULT_CPU_TABLE
};
