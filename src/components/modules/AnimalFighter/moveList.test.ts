// 対戦画面の脇に出る技表。キャラごとに技が増えても操作説明を書き足さずに済むよう、
// 表示内容は CharacterSpec から組み立てている。その組み立てが崩れないことを固定する。

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { MoveListPanel } from './AnimalFighter';
import { CHARACTER_IDS, getCharacterSpec, getMoveList } from './characters';

describe('move list', () => {
  test('lists punch, kick, and every special for each character', () => {
    for (const id of CHARACTER_IDS) {
      const spec = getCharacterSpec(id);
      const moves = getMoveList(id);

      expect(moves).toHaveLength(2 + spec.specials.length);
      expect(moves[0]?.command).toBe('Z');
      expect(moves[1]?.command).toBe('X');
      for (const move of moves) {
        expect(move.name.length).toBeGreaterThan(0);
        expect(move.command.length).toBeGreaterThan(0);
        expect(move.damage).toMatch(/^\d+(×\d+)?$/);
      }
    }
  });

  test('spells out the charge command for the spinning bird kick', () => {
    const moves = getMoveList('chunli');
    const special = moves.find((move) => move.id === 'spinningBirdKick');

    expect(special?.name).toBe('スピニングバードキック');
    expect(special?.command).toBe('↓溜め → C+↑');
    // 多段技はダメージ×段数で見せる
    expect(special?.damage).toBe('8×3');
    // 春麗は飛び道具を持たないので C 単押しの技は出ない
    expect(moves.some((move) => move.command === 'C')).toBe(false);
  });

  test('shows the plain special button for the other characters', () => {
    const special = getMoveList('ryu').find(
      (move) => move.id === 'projectile'
    );

    expect(special?.command).toBe('C');
    expect(special?.damage).toBe('12');
  });

  test('reflects per-character damage differences', () => {
    const damageOf = (id: 'zangief' | 'dhalsim', moveId: string): string =>
      getMoveList(id).find((move) => move.id === moveId)?.damage ?? '';

    expect(damageOf('zangief', 'kick')).toBe('16');
    expect(damageOf('dhalsim', 'kick')).toBe('10');
  });

  test('renders the panel with the character name and every command', () => {
    const markup = renderToStaticMarkup(
      createElement(MoveListPanel, { id: 'chunli', side: 'player' })
    );

    expect(markup).toContain('KITSUNE CHUN-LI');
    expect(markup).toContain('1P');
    for (const move of getMoveList('chunli')) {
      expect(markup).toContain(move.name);
    }
    expect(markup).toContain('↓溜め → C+↑');
  });

  test('renders nothing before the fighters are chosen', () => {
    expect(
      renderToStaticMarkup(
        createElement(MoveListPanel, { id: null, side: 'cpu' })
      )
    ).toBe('');
  });
});
