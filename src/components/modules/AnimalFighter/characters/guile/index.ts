import type { CharacterSpec } from '../../moves/types';
import { makeNormal } from '../shared/normals';
import { GUILE_CPU_TABLE } from './cpu';
import { SOMERSAULT_KICK } from './specials/somersaultKick';

export const guile: CharacterSpec = {
  id: 'guile',
  name: 'GORILLA GUILE',
  color: '#5a7d2a',
  // 初代 中Ｐ 3/2/13・強Ｋ 6/5/24。発生最速だが硬直が長い
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
  specials: [SOMERSAULT_KICK],
  cpu: GUILE_CPU_TABLE
};
