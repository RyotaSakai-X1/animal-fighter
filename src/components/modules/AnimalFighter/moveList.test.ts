// 技表の表示内容は CharacterSpec から組み立てている。その組み立てが崩れないことを固定する。

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
      expect(moves[0]?.commandText).toBe('Z');
      expect(moves[1]?.commandText).toBe('X');
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
    // キーごとに分解されている（表示は1つずつ <kbd> になる）
    expect(special?.command).toEqual([
      { kind: 'key', label: '↓', note: '溜め' },
      { kind: 'plus' },
      { kind: 'key', label: 'C', note: null },
      { kind: 'plus' },
      { kind: 'key', label: '↑', note: null }
    ]);
    expect(special?.commandText).toBe('↓溜め+C+↑');
    // 多段技はダメージ×段数で見せる
    expect(special?.damage).toBe('7×3');
    // 春麗は飛び道具を持たないので C 単押しの技は出ない
    expect(moves.some((move) => move.commandText === 'C')).toBe(false);
  });

  test('shows the plain special button for the other characters', () => {
    const special = getMoveList('ryu').find(
      (move) => move.id === 'projectile'
    );

    expect(special?.commandText).toBe('C');
    expect(special?.damage).toBe('12');
  });

  test('labels the yoga fire trigger as a relative direction', () => {
    const special = getMoveList('dhalsim').find(
      (move) => move.id === 'yogaFire'
    );

    expect(special?.name).toBe('ヨガファイヤー');
    // 向き相対の入力は矢印にしない。'→' だと「右キーを押す」と読めてしまう
    expect(special?.command).toEqual([
      { kind: 'key', label: '↓', note: '溜め' },
      { kind: 'plus' },
      { kind: 'key', label: 'C', note: null },
      { kind: 'plus' },
      { kind: 'key', label: '前', note: null }
    ]);
    expect(special?.commandText).toBe('↓溜め+C+前');
    // 固有必殺技を持つキャラは汎用の飛び道具を置き換える
    expect(getMoveList('dhalsim').some((move) => move.id === 'projectile')).toBe(
      false
    );
  });

  test('shows the somersault kick as a two-hit charge move', () => {
    const special = getMoveList('guile').find(
      (move) => move.id === 'somersaultKick'
    );

    expect(special?.name).toBe('サマーソルトキック');
    expect(special?.commandText).toBe('↓溜め+C+↑');
    // 多段技はダメージ×段数
    expect(special?.damage).toBe('11×2');
    // 固有必殺技を持つキャラは汎用の飛び道具を置き換える
    expect(getMoveList('guile').some((move) => move.id === 'projectile')).toBe(
      false
    );
  });

  test('never renders a bare arrow for a facing-relative command', () => {
    const markup = renderToStaticMarkup(
      createElement(MoveListPanel, { id: 'dhalsim', side: 'cpu' })
    );

    expect(markup).toContain('>前</kbd>');
    expect(markup).not.toContain('→');
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
    // キーが個別のチップになっていること
    expect(markup).toContain('>↓</kbd>');
    expect(markup).toContain('>C</kbd>');
    expect(markup).toContain('>↑</kbd>');
    expect(markup).toContain('溜め');
    expect(markup).toContain('aria-label="↓溜め+C+↑"');
    // 区切りは '+' だけ。'→' は方向キーと紛れるので使わない
    expect(markup).not.toContain('→');
  });

  test('renders nothing before the fighters are chosen', () => {
    expect(
      renderToStaticMarkup(
        createElement(MoveListPanel, { id: null, side: 'cpu' })
      )
    ).toBe('');
  });
});
