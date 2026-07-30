// バレル（index.ts）の公開 API が実際に解決できることを確認する。
// index.ts は ./logic と ./sprites / ./characters を重ねて `export *` しており、
// logic.ts が sprites / characters を再公開しているため名前が重複する。
// 同じ宣言を指している限り問題ないが、片方が別の宣言に差し替わると
// ES モジュールの仕様で「曖昧な名前」として静かに欠落するので、実物を触って確かめる。

import * as AnimalFighterModule from './index';

describe('AnimalFighter barrel exports', () => {
  test('resolves the engine, character, and sprite entry points', () => {
    const api: Record<string, unknown> = AnimalFighterModule;

    for (const name of [
      'AnimalFighter',
      'useAnimalFighter',
      'advanceGame',
      'createInitialGameState',
      'getHitbox',
      'getPoseImagePath',
      'getCombatSpriteSpec',
      'getSpecialSpriteFrame',
      'getSpecialSpriteSpec',
      'getChargeMeter',
      'getCharacterSpec',
      'getMoveSpec',
      'CHARACTER_DEFINITIONS',
      'CHARACTER_IDS'
    ]) {
      expect(api[name], `${name} must be exported from the barrel`).toBeDefined();
    }
  });

  test('exposes a single consistent character list', () => {
    const { CHARACTER_DEFINITIONS, CHARACTER_IDS, getCharacterSpec } =
      AnimalFighterModule;

    expect(CHARACTER_DEFINITIONS).toHaveLength(CHARACTER_IDS.length);
    for (const id of CHARACTER_IDS) {
      expect(getCharacterSpec(id).id).toBe(id);
    }
  });
});
