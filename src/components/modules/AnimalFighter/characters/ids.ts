// ID だけを切り出して moves/ と characters/ の相互参照を断つ。依存を持たせないこと。

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
