import type { CharacterSpec } from '../../moves/types';
import { DEFAULT_CPU_TABLE } from '../shared/cpu';
import { makeNormal } from '../shared/normals';
import { DEFAULT_PROJECTILE } from '../shared/specials/projectile';

export const honda: CharacterSpec = {
  id: 'honda',
  name: 'AKITA-DOG HONDA',
  color: '#d9a05b',
  // 初代 遠立ち中Ｐ 6/4/4・強Ｋ 9/6/18。速くて重い、体が横に広くリーチ短
  hurtbox: { width: 68, height: 124, crouchHeight: 66 },
  punch: makeNormal('punch', {
    startup: 6,
    active: 4,
    recovery: 8,
    damage: 9,
    reach: 50
  }),
  kick: makeNormal('kick', {
    startup: 9,
    active: 6,
    recovery: 18,
    damage: 14,
    reach: 70
  }),
  specials: [DEFAULT_PROJECTILE],
  cpu: DEFAULT_CPU_TABLE
};
