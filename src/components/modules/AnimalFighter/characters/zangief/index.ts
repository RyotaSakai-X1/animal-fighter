import type { CharacterSpec } from '../../moves/types';
import { DEFAULT_CPU_TABLE } from '../shared/cpu';
import { makeNormal } from '../shared/normals';
import { DEFAULT_PROJECTILE } from '../shared/specials/projectile';

export const zangief: CharacterSpec = {
  id: 'zangief',
  name: 'BURU-DOG ZANGIEF',
  color: '#c0392b',
  // 初代 遠立ち中Ｐ 5/3/5・強Ｋ 5/8/11。最高威力・最短リーチ・体が厚くて背が高い
  hurtbox: { width: 64, height: 138, crouchHeight: 70 },
  punch: makeNormal('punch', {
    startup: 5,
    active: 3,
    recovery: 9,
    damage: 11,
    reach: 48
  }),
  kick: makeNormal('kick', {
    startup: 5,
    active: 8,
    recovery: 12,
    damage: 16,
    reach: 68
  }),
  specials: [DEFAULT_PROJECTILE],
  cpu: DEFAULT_CPU_TABLE
};
