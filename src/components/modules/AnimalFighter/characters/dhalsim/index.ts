import type { CharacterSpec } from '../../moves/types';
import { DEFAULT_CPU_TABLE } from '../shared/cpu';
import { makeNormal } from '../shared/normals';
import { DEFAULT_PROJECTILE } from '../shared/specials/projectile';

export const dhalsim: CharacterSpec = {
  id: 'dhalsim',
  name: 'GIBBON DHALSIM',
  color: '#d4a017',
  // 初代 中Ｐ 6/7/7・強Ｋ 12/12/13。最遅・リーチ極長・低威力。描画幅は最大だが腕が長いだけなので体幅は細い
  hurtbox: { width: 52, height: 132, crouchHeight: 66 },
  punch: makeNormal('punch', {
    startup: 6,
    active: 7,
    recovery: 11,
    damage: 7,
    reach: 85
  }),
  kick: makeNormal('kick', {
    startup: 12,
    active: 8,
    recovery: 13,
    damage: 10,
    reach: 95
  }),
  specials: [DEFAULT_PROJECTILE],
  cpu: DEFAULT_CPU_TABLE
};
