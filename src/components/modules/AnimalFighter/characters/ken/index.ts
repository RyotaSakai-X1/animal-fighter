import type { CharacterSpec } from '../../moves/types';
import { DEFAULT_CPU_TABLE } from '../shared/cpu';
import { makeNormal } from '../shared/normals';
import { DEFAULT_PROJECTILE } from '../shared/specials/projectile';

export const ken: CharacterSpec = {
  id: 'ken',
  name: 'KUMA-KEN',
  color: '#f0ead6',
  // リュウとほぼ同じで、強Ｋの硬直だけ短い
  hurtbox: { width: 56, height: 130, crouchHeight: 65 },
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
    recovery: 16,
    damage: 13,
    reach: 75
  }),
  specials: [DEFAULT_PROJECTILE],
  cpu: DEFAULT_CPU_TABLE
};
