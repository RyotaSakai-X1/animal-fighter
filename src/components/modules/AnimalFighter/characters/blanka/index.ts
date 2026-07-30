import type { CharacterSpec } from '../../moves/types';
import { DEFAULT_CPU_TABLE } from '../shared/cpu';
import { makeNormal } from '../shared/normals';
import { DEFAULT_PROJECTILE } from '../shared/specials/projectile';

export const blanka: CharacterSpec = {
  id: 'blanka',
  name: 'SHISHI BLANKA',
  color: '#58a832',
  // 初代 遠立ち中Ｐ 5/2/6・強Ｋ 6/11/20（持続は8で打ち止め）。速い・中庸・前傾姿勢で背が低い
  hurtbox: { width: 60, height: 124, crouchHeight: 62 },
  punch: makeNormal('punch', {
    startup: 5,
    active: 2,
    recovery: 10,
    damage: 7,
    reach: 54
  }),
  kick: makeNormal('kick', {
    startup: 6,
    active: 8,
    recovery: 20,
    damage: 12,
    reach: 72
  }),
  specials: [DEFAULT_PROJECTILE],
  cpu: DEFAULT_CPU_TABLE
};
