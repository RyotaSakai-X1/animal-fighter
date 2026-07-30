import type { CharacterSpec } from '../../moves/types';
import { DEFAULT_CPU_TABLE } from '../shared/cpu';
import { makeNormal } from '../shared/normals';
import { DEFAULT_PROJECTILE } from '../shared/specials/projectile';

export const guile: CharacterSpec = {
  id: 'guile',
  name: 'GORILLA GUILE',
  color: '#5a7d2a',
  // 初代 遠立ち中Ｐ 3/2/13・強Ｋ 6/5/24。発生最速だが硬直が長い
  hurtbox: { width: 56, height: 134, crouchHeight: 67 },
  punch: makeNormal('punch', {
    startup: 3,
    active: 2,
    recovery: 16,
    damage: 8,
    reach: 58
  }),
  kick: makeNormal('kick', {
    startup: 6,
    active: 5,
    recovery: 24,
    damage: 14,
    reach: 80
  }),
  specials: [DEFAULT_PROJECTILE],
  cpu: DEFAULT_CPU_TABLE
};
