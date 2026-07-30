import type { CharacterSpec } from '../../moves/types';
import { DEFAULT_CPU_TABLE } from '../shared/cpu';
import { DEFAULT_HURTBOX } from '../shared/hurtbox';
import { DEFAULT_KICK, DEFAULT_PUNCH, makeNormal } from '../shared/normals';
import { SPINNING_BIRD_KICK } from './specials/spinningBirdKick';

export const chunli: CharacterSpec = {
  id: 'chunli',
  name: 'KITSUNE CHUN-LI',
  color: '#e0862f',
  hurtbox: DEFAULT_HURTBOX,
  punch: makeNormal('punch', DEFAULT_PUNCH),
  kick: makeNormal('kick', DEFAULT_KICK),
  // 飛び道具（気功拳）は未実装なので、必殺技はスピニングバードキックのみ。
  // C の単押しでは何も出ず、↓溜め → C押しながら↑ で発動する
  specials: [SPINNING_BIRD_KICK],
  cpu: DEFAULT_CPU_TABLE
};
