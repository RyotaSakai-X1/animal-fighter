// キャラクターIDの単独定義。このファイルだけは他モジュールへの依存を持たない。
// moves/ 側の型定義が CharacterId を必要とし、characters/ 側が moves/ の型を必要とするため、
// IDだけを切り出して相互参照を断ち切っている。

export const CHARACTER_IDS = [
  'ryu',
  'ken',
  'chunli',
  'honda',
  'zangief',
  'guile',
  'dhalsim',
  'bison',
  'blanka',
  'vega'
] as const;

export type CharacterId = (typeof CHARACTER_IDS)[number];
