import type { CharacterSpec } from '../../moves/types';
import { DEFAULT_CPU_TABLE } from '../shared/cpu';
import { makeNormal } from '../shared/normals';
import { DEFAULT_PROJECTILE } from '../shared/specials/projectile';

export const bison: CharacterSpec = {
  id: 'bison',
  name: 'BISON BUFFALO',
  color: '#7b2fbe',
  // 初代（ベガ）遠立ち中Ｐ 7/4/6・強Ｋ 6/6/21。重い
  hurtbox: { width: 58, height: 134, crouchHeight: 67 },
  punch: makeNormal('punch', {
    startup: 7,
    active: 4,
    recovery: 10,
    damage: 9,
    reach: 56
  }),
  kick: makeNormal('kick', {
    startup: 6,
    active: 6,
    recovery: 21,
    damage: 15,
    reach: 78
  }),
  specials: [DEFAULT_PROJECTILE],
  cpu: DEFAULT_CPU_TABLE
};
