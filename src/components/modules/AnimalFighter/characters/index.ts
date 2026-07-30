// キャラクターのレジストリ。エンジン（logic.ts）はここ経由でだけキャラ別データに触る。
// 新しいキャラを足すときは characters/<id>/index.ts を作って CHARACTER_SPEC_ORDER に並べる。

import type {
  CharacterDefinition,
  CharacterSpec,
  MoveSpec,
  SpecialMove
} from '../moves/types';
import { bison } from './bison';
import { blanka } from './blanka';
import { chunli } from './chunli';
import { dhalsim } from './dhalsim';
import { guile } from './guile';
import { honda } from './honda';
import type { CharacterId } from './ids';
import { ken } from './ken';
import { ryu } from './ryu';
import { vega } from './vega';
import { zangief } from './zangief';

export { CHARACTER_IDS } from './ids';
export type { CharacterId } from './ids';

// 選択画面のカーソル順。この並びが 5列×2行のグリッドの並びそのものになる
export const CHARACTER_SPEC_ORDER: readonly CharacterSpec[] = [
  ryu,
  ken,
  chunli,
  honda,
  zangief,
  guile,
  dhalsim,
  bison,
  blanka,
  vega
];

// id 索引。Record なので10キャラ全員の登録を型が強制する
export const CHARACTER_SPECS: Record<CharacterId, CharacterSpec> = {
  ryu,
  ken,
  chunli,
  honda,
  zangief,
  guile,
  dhalsim,
  bison,
  blanka,
  vega
};

// 選択画面とファイター生成が使う軽量な定義。CHARACTER_SPEC_ORDER と同じ並び
export const CHARACTER_DEFINITIONS: readonly CharacterDefinition[] =
  CHARACTER_SPEC_ORDER.map(({ id, name, color }) => ({ id, name, color }));

// Record 索引なので noUncheckedIndexedAccess 下でも undefined にならないが、
// 型を跨いだ呼び出しに備えて既存の getDefinition と同じく不正IDでは throw する
export const getCharacterSpec = (id: CharacterId): CharacterSpec => {
  const spec = CHARACTER_SPECS[id];
  if (spec === undefined) {
    throw new Error(`Unknown character: ${id}`);
  }
  return spec;
};

// 技IDからフレームデータを引く。通常技は固定2枠、必殺技はキャラ固有の可変長配列。
// 見つからなければ undefined を返し、呼び出し側（startAttack / advanceAttack）が
// 攻撃を打ち切る
export const getMoveSpec = (
  id: CharacterId,
  moveId: string
): MoveSpec | undefined => {
  const spec = getCharacterSpec(id);
  if (moveId === spec.punch.id) {
    return spec.punch;
  }
  if (moveId === spec.kick.id) {
    return spec.kick;
  }
  return spec.specials.find((special) => special.id === moveId);
};

// 技IDが必殺技ならその定義を返す（クールダウンやアニメの設定を読むため）
export const getSpecialMove = (
  id: CharacterId,
  moveId: string
): SpecialMove | undefined =>
  getCharacterSpec(id).specials.find((special) => special.id === moveId);
