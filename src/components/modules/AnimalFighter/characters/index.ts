// キャラのレジストリ。エンジンはここ経由でだけキャラ別データに触る。
// 新しいキャラは characters/<id>/index.ts を作って CHARACTER_SPEC_ORDER に並べる。

import {
  commandTokensToText,
  describeCommandTokens,
  type CommandToken
} from '../moves/commands';
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

// 選択画面のカーソル順（5列×2行のグリッドの並び）
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

// Record なので10キャラ全員の登録を型が強制する
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

// 選択画面とファイター生成が使う軽量な定義
export const CHARACTER_DEFINITIONS: readonly CharacterDefinition[] =
  CHARACTER_SPEC_ORDER.map(({ id, name, color }) => ({ id, name, color }));

// 型を跨いだ呼び出しに備えて不正IDでは throw する
export const getCharacterSpec = (id: CharacterId): CharacterSpec => {
  const spec = CHARACTER_SPECS[id];
  if (spec === undefined) {
    throw new Error(`Unknown character: ${id}`);
  }
  return spec;
};

// 技IDからフレームデータを引く。見つからなければ呼び出し側が攻撃を打ち切る
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

// 必殺技ならその定義を返す（クールダウンやアニメの設定を読むため）
export const getSpecialMove = (
  id: CharacterId,
  moveId: string
): SpecialMove | undefined =>
  getCharacterSpec(id).specials.find((special) => special.id === moveId);

export type MoveListEntry = {
  id: string;
  name: string;
  // キーごとに分解したコマンド。commandText は読み上げ用の平文
  command: readonly CommandToken[];
  commandText: string;
  damage: string;
};

// 対戦画面の脇に出す技表。スペックから組み立てるので UI 側を書き足す必要がない
export const getMoveList = (id: CharacterId): readonly MoveListEntry[] => {
  const spec = getCharacterSpec(id);
  const describeDamage = (move: MoveSpec): string =>
    move.maxHits > 1 ? `${move.damage}×${move.maxHits}` : `${move.damage}`;
  const describeMove = (
    move: MoveSpec,
    command: readonly CommandToken[]
  ): MoveListEntry => ({
    id: move.id,
    name: move.name,
    command,
    commandText: commandTokensToText(command),
    damage: describeDamage(move)
  });
  const buttonToken = (label: string): readonly CommandToken[] => [
    { kind: 'key', label, note: null }
  ];

  return [
    describeMove(spec.punch, buttonToken('Z')),
    describeMove(spec.kick, buttonToken('X')),
    ...spec.specials.map((special) =>
      describeMove(special, describeCommandTokens(special.command))
    )
  ];
};
