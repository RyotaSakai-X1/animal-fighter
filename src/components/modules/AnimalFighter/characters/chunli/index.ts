import type { CharacterSpec } from '../../moves/types';
import { makeNormal } from '../shared/normals';
import { CHUNLI_CPU_TABLE } from './cpu';
import { SPINNING_BIRD_KICK } from './specials/spinningBirdKick';

export const chunli: CharacterSpec = {
  id: 'chunli',
  name: 'KITSUNE CHUN-LI',
  color: '#e0862f',
  // 初代 中Ｐ 5/4/4・強Ｋ 11/8/14。発生が早く脚が長い、低威力
  hurtbox: { width: 48, height: 126, crouchHeight: 62 },
  punch: makeNormal('punch', {
    startup: 5,
    active: 4,
    recovery: 8,
    damage: 6,
    reach: 52
  }),
  kick: makeNormal('kick', {
    startup: 11,
    active: 8,
    recovery: 14,
    damage: 11,
    reach: 88
  }),
  // 飛び道具（気功拳）は未実装なので、必殺技はスピニングバードキックのみ。
  // C の単押しでは何も出ず、↓溜め → C押しながら↑ で発動する
  specials: [SPINNING_BIRD_KICK],
  cpu: CHUNLI_CPU_TABLE
};
