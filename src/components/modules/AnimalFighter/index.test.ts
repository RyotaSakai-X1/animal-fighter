// バレルの公開 API が実際に解決できるか。重複した `export *` は、別々の宣言を指すと
// ES 仕様で「曖昧な名前」として静かに欠落するので実物を触って確かめる。

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
