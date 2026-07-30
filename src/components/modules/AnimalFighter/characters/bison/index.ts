import type { CharacterSpec } from '../../moves/types';
import { DEFAULT_CPU_TABLE } from '../shared/cpu';
import { DEFAULT_HURTBOX } from '../shared/hurtbox';
import { DEFAULT_KICK, DEFAULT_PUNCH, makeNormal } from '../shared/normals';
import { DEFAULT_PROJECTILE } from '../shared/specials/projectile';

export const bison: CharacterSpec = {
  id: 'bison',
  name: 'BISON BUFFALO',
  color: '#7b2fbe',
  hurtbox: DEFAULT_HURTBOX,
  punch: makeNormal('punch', DEFAULT_PUNCH),
  kick: makeNormal('kick', DEFAULT_KICK),
  specials: [DEFAULT_PROJECTILE],
  cpu: DEFAULT_CPU_TABLE
};
