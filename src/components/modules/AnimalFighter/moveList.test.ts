// 技表と選択画面のステータスゲージは CharacterSpec から組み立てている。
// その組み立てが崩れないことを固定する。

import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { CharacterStatsPanel, MoveListPanel } from './AnimalFighter';
import {
  CHARACTER_IDS,
  getCharacterSpec,
  getCharacterStats,
  getMoveList
} from './characters';

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

describe('character stats', () => {
  test('reports the three axes with a real value alongside', () => {
    for (const id of CHARACTER_IDS) {
      const stats = getCharacterStats(id);
      expect(stats.map((stat) => stat.key)).toEqual([
        'power',
        'reach',
        'startup'
      ]);
      for (const stat of stats) {
        // 相対値なので 0〜1 に収まる
        expect(stat.value, `${id}/${stat.key}`).toBeGreaterThanOrEqual(0);
        expect(stat.value, `${id}/${stat.key}`).toBeLessThanOrEqual(1);
        // ゲージだけだと実際の数値が分からないので併記する
        expect(stat.detail).toMatch(/\d/);
      }
    }
  });

  test('puts every axis on the same "longer is stronger" scale', () => {
    const valueOf = (id: 'zangief' | 'dhalsim', key: string): number =>
      getCharacterStats(id).find((stat) => stat.key === key)?.value ?? -1;

    // ザンギエフは威力最大・リーチ最小、ダルシムはその逆
    expect(valueOf('zangief', 'power')).toBe(1);
    expect(valueOf('dhalsim', 'power')).toBe(0);
    expect(valueOf('dhalsim', 'reach')).toBe(1);
    expect(valueOf('zangief', 'reach')).toBe(0);
    // 発生は「小さいほど速い」を反転してあるので、遅いダルシムが 0
    expect(valueOf('dhalsim', 'startup')).toBe(0);
  });

  test('normalizes against the current roster, not a fixed ceiling', () => {
    // 固定の上限を書くとキャラ追加･調整でゲージが振り切れる。
    // どの軸も必ず 0 と 1 のキャラが1体ずつ居るはず
    for (const key of ['power', 'reach', 'startup']) {
      const values = CHARACTER_IDS.map(
        (id) => getCharacterStats(id).find((s) => s.key === key)?.value ?? -1
      );
      expect(Math.min(...values), key).toBe(0);
      expect(Math.max(...values), key).toBe(1);
    }
  });

  test('renders the gauges and the commands on the select panel', () => {
    const markup = renderToStaticMarkup(
      createElement(CharacterStatsPanel, { id: 'zangief', side: 'player' })
    );

    expect(markup).toContain('BURU-DOG ZANGIEF');
    expect(markup).toContain('威力');
    expect(markup).toContain('リーチ');
    expect(markup).toContain('発生');
    // 威力最大なので振り切れる
    expect(markup).toContain('width:100%');
    // リーチ最小でも空にはしない（実際の威力が 0 なわけではない）
    expect(markup).not.toContain('width:0%');
    // 実数値の併記
    expect(markup).toContain('キック 16');
    // 技のコマンドはチップで出す
    expect(markup).toContain('>Z</kbd>');
    expect(markup).toContain('aria-label="BURU-DOG ZANGIEF の性能"');
  });

  test('renders nothing until the cursor lands on a character', () => {
    expect(
      renderToStaticMarkup(
        createElement(CharacterStatsPanel, { id: null, side: 'cpu' })
      )
    ).toBe('');
  });
});
