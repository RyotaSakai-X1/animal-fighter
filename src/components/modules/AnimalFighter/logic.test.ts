import { getCharacterSpec } from './characters';
import {
  advanceGame,
  BACKGROUND_COUNT,
  CHARACTER_IDS,
  CHARACTER_DEFINITIONS,
  createInitialGameState,
  EMPTY_INPUT,
  getCharacterIconPath,
  getCharacterImagePath,
  getChargeMeter,
  getCombatSpriteSpec,
  getInitialCpuIndex,
  getHitbox,
  getPoseImagePath,
  getSpecialSpriteFrame,
  GROUND_Y,
  isGuarding,
  rectanglesOverlap,
  SELECT_SLOT_COUNT,
  setAssetStatus,
  stepCpuIndex,
  type AttackState,
  type Fighter,
  type GameInput,
  type GameKey,
  type GameState
} from './logic';
import {
  CHARGE_GRACE_FRAMES,
  CHARGE_REQUIRED_FRAMES
} from './moves/commands';

const ryuDefinition = CHARACTER_DEFINITIONS[0];
const kenDefinition = CHARACTER_DEFINITIONS[1];
if (ryuDefinition === undefined || kenDefinition === undefined) {
  throw new Error('Test character definitions are incomplete.');
}

const createFighter = (overrides: Partial<Fighter> = {}): Fighter => ({
  ...ryuDefinition,
  isPlayer: true,
  x: 230,
  y: 400,
  vx: 0,
  vy: 0,
  grounded: true,
  crouching: false,
  hp: 100,
  roundWins: 0,
  facing: 1,
  attack: null,
  hitstun: 0,
  hitstunElapsed: 0,
  specialCooldown: 0,
  chargeDirection: null,
  chargeFrames: 0,
  chargeGrace: 0,
  blocking: false,
  aiAction: 'idle',
  aiFrames: 1,
  ...overrides
});

// 進行中の攻撃。AttackState にフィールドが増えてもテスト側の記述が増えないよう
// ここで既定値を集約する
const createAttack = (
  moveId: string,
  overrides: Partial<AttackState> = {}
): AttackState => ({
  moveId,
  frame: 0,
  hitsLanded: 0,
  hitCooldown: 0,
  projectileSpawned: false,
  landingFrames: -1,
  ...overrides
});

const createInput = (justPressed: GameKey[] = []): GameInput => ({
  ...EMPTY_INPUT,
  justPressed: new Set(justPressed)
});

const startFight = () => {
  const ready = setAssetStatus(createInitialGameState(), true, false);
  const select = advanceGame(ready, createInput(['Enter']));
  const cpuSelect = advanceGame(select, createInput(['Enter']));
  const stageSelect = advanceGame(cpuSelect, createInput(['Enter']));
  return advanceGame(stageSelect, createInput(['Enter']));
};

// intro をスキップして戦闘可能な状態にし、CPU は動かないよう固定する
const startActiveFight = (
  playerOverrides: Partial<Fighter>,
  cpuOverrides: Partial<Fighter>
): GameState => {
  const fight = startFight();
  return {
    ...fight,
    roundPhase: 'active' as const,
    player:
      fight.player === null ? null : { ...fight.player, ...playerOverrides },
    cpu:
      fight.cpu === null
        ? null
        : {
            ...fight.cpu,
            aiAction: 'idle' as const,
            aiFrames: 9999,
            ...cpuOverrides
          }
  };
};

const getFighters = (state: GameState): { player: Fighter; cpu: Fighter } => {
  if (state.player === null || state.cpu === null) {
    throw new Error('Fight state is missing fighters.');
  }
  return { player: state.player, cpu: state.cpu };
};

describe('Animal Fighter image selection', () => {
  const opponent = createFighter({
    ...kenDefinition,
    isPlayer: false,
    x: 570,
    facing: -1
  });

  test('follows every pose priority branch', () => {
    const baseContext = {
      opponent,
      roundEnd: null,
      guarding: false
    };

    expect(
      getPoseImagePath(createFighter(), {
        ...baseContext,
        roundEnd: { kind: 'ko', winner: 'ken', frames: 90 }
      })
    ).toBe('down');
    expect(
      getPoseImagePath(
        createFighter({ attack: createAttack('punch', { frame: 12 }) }),
        baseContext
      )
    ).toBe('punch');
    expect(
      getPoseImagePath(
        createFighter({
          attack: createAttack('projectile', {
            frame: 20,
            projectileSpawned: true
          })
        }),
        baseContext
      )
    ).toBe('punch');
    expect(
      getPoseImagePath(
        createFighter({ attack: createAttack('kick', { frame: 12 }) }),
        baseContext
      )
    ).toBe('kick');
    expect(getPoseImagePath(createFighter({ hitstun: 4 }), baseContext)).toBe(
      'fight'
    );
    expect(
      getPoseImagePath(createFighter({ grounded: false }), baseContext)
    ).toBe('jump');
    expect(
      getPoseImagePath(createFighter({ crouching: true }), baseContext)
    ).toBe('crouch');
    expect(
      getPoseImagePath(createFighter(), { ...baseContext, guarding: true })
    ).toBe('guard');
    expect(getPoseImagePath(createFighter(), baseContext)).toBe('fight');
  });

  test('keeps KO down exclusive to the defeated fighter', () => {
    const roundEnd = {
      kind: 'ko' as const,
      winner: 'ken' as const,
      frames: 90
    };

    expect(
      getPoseImagePath(createFighter(), {
        opponent,
        roundEnd,
        guarding: false
      })
    ).toBe('down');
    expect(
      getPoseImagePath(createFighter({ ...kenDefinition, isPlayer: false }), {
        opponent: createFighter(),
        roundEnd,
        guarding: false
      })
    ).not.toBe('down');
  });
});

describe('Animal Fighter game logic', () => {
  const opponent = createFighter({
    ...kenDefinition,
    isPlayer: false,
    x: 570,
    facing: -1
  });

  test('uses the required combat sprite scaling rules', () => {
    expect(getCombatSpriteSpec('fight')).toEqual({
      height: 180,
      width: null,
      anchor: 'fighter'
    });
    expect(getCombatSpriteSpec('crouch')).toEqual({
      height: 126,
      width: null,
      anchor: 'ground'
    });
    expect(getCombatSpriteSpec('down')).toEqual({
      height: null,
      width: 220,
      anchor: 'ground'
    });
    expect(getCharacterImagePath('ken')).toBe('base');
    expect(getCharacterIconPath('ryu')).toBe('icon');
  });

  test('defines ten unique characters in selection order', () => {
    const ids = CHARACTER_DEFINITIONS.map(({ id }) => id);

    expect(CHARACTER_DEFINITIONS).toHaveLength(10);
    expect(CHARACTER_DEFINITIONS).toHaveLength(SELECT_SLOT_COUNT);
    expect(ids).toEqual([...CHARACTER_IDS]);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('transitions through player, CPU, and stage selection into a round', () => {
    const ready = setAssetStatus(createInitialGameState(), true, false);
    const select = advanceGame(ready, createInput(['Enter']));
    expect(select.screen).toBe('select');

    const selected = advanceGame(select, createInput(['ArrowRight']));
    expect(selected.selectedIndex).toBe(1);

    const cpuSelect = advanceGame(selected, createInput(['Enter']));
    expect(cpuSelect.screen).toBe('cpu-select');
    expect(cpuSelect.cpuSelectedIndex).toBe(2);

    const stageSelect = advanceGame(cpuSelect, createInput(['Enter']));
    expect(stageSelect.screen).toBe('stage-select');

    const fight = advanceGame(stageSelect, createInput(['Enter']));
    expect(fight.screen).toBe('fight');
    expect(fight.player?.id).toBe('ken');
    expect(fight.cpu?.id).toBe('chunli');
    expect(fight.roundPhase).toBe('intro');
    expect(fight.backgroundIndex).toBe(0);
  });

  test('wraps the player cursor across all ten characters', () => {
    const ready = setAssetStatus(createInitialGameState(), true, false);
    const select = advanceGame(ready, createInput(['Enter']));
    const wrappedLeft = advanceGame(select, createInput(['ArrowLeft']));
    let wrappedRight = select;
    for (let index = 0; index < CHARACTER_DEFINITIONS.length; index += 1) {
      wrappedRight = advanceGame(wrappedRight, createInput(['ArrowRight']));
    }

    expect(wrappedLeft.selectedIndex).toBe(9);
    expect(wrappedRight.selectedIndex).toBe(0);
  });

  test('toggles the player cursor row with the vertical keys', () => {
    const ready = setAssetStatus(createInitialGameState(), true, false);
    const select = advanceGame(ready, createInput(['Enter']));
    const second = advanceGame(select, createInput(['ArrowRight']));
    const lowerRow = advanceGame(second, createInput(['ArrowDown']));
    const wrapped = advanceGame(lowerRow, createInput(['ArrowDown']));
    const upperRow = advanceGame(wrapped, createInput(['ArrowUp']));

    expect(second.selectedIndex).toBe(1);
    expect(lowerRow.selectedIndex).toBe(6);
    expect(wrapped.selectedIndex).toBe(1);
    expect(upperRow.selectedIndex).toBe(6);
  });

  test('moves the CPU cursor vertically and blocks a mirror above or below', () => {
    expect(stepCpuIndex(1, 0, 5)).toBe(6);
    expect(stepCpuIndex(1, 6, 5)).toBe(1);
    expect(stepCpuIndex(6, 1, -5)).toBe(6);

    const ready = setAssetStatus(createInitialGameState(), true, false);
    const select = advanceGame(ready, createInput(['Enter']));
    const cpuSelect = advanceGame(select, createInput(['Enter']));
    expect(cpuSelect.selectedIndex).toBe(0);
    expect(cpuSelect.cpuSelectedIndex).toBe(1);
    expect(
      advanceGame(cpuSelect, createInput(['ArrowDown'])).cpuSelectedIndex
    ).toBe(6);

    const blocked = advanceGame(
      { ...cpuSelect, selectedIndex: 6, cpuSelectedIndex: 1 },
      createInput(['ArrowDown'])
    );
    expect(blocked.cpuSelectedIndex).toBe(1);
  });

  test('returns to the previous screen with Escape while keeping selections', () => {
    const ready = setAssetStatus(createInitialGameState(), true, false);
    const select = advanceGame(ready, createInput(['Enter']));
    const moved = advanceGame(select, createInput(['ArrowRight']));
    const cpuSelect = advanceGame(moved, createInput(['Enter']));
    const stageSelect = advanceGame(cpuSelect, createInput(['Enter']));
    const stageMoved = advanceGame(stageSelect, createInput(['ArrowRight']));

    const backToCpu = advanceGame(stageMoved, createInput(['Escape']));
    expect(backToCpu.screen).toBe('cpu-select');
    expect(backToCpu.backgroundIndex).toBe(1);
    expect(backToCpu.cpuSelectedIndex).toBe(2);

    const backToSelect = advanceGame(backToCpu, createInput(['Escape']));
    expect(backToSelect.screen).toBe('select');
    expect(backToSelect.selectedIndex).toBe(1);

    const backToTitle = advanceGame(backToSelect, createInput(['Escape']));
    expect(backToTitle.screen).toBe('title');
    expect(backToTitle.selectedIndex).toBe(1);
  });

  test('re-enters CPU selection from the new player choice after going back', () => {
    const ready = setAssetStatus(createInitialGameState(), true, false);
    const select = advanceGame(ready, createInput(['Enter']));
    const cpuSelect = advanceGame(select, createInput(['Enter']));
    const back = advanceGame(cpuSelect, createInput(['Escape']));
    const moved = advanceGame(back, createInput(['ArrowRight']));
    const reentered = advanceGame(moved, createInput(['Enter']));

    expect(reentered.screen).toBe('cpu-select');
    expect(reentered.cpuSelectedIndex).toBe(2);
  });

  test('ignores Escape on the title, fight, and result screens', () => {
    const ready = setAssetStatus(createInitialGameState(), true, false);
    expect(advanceGame(ready, createInput(['Escape'])).screen).toBe('title');

    const fight = startFight();
    expect(advanceGame(fight, createInput(['Escape'])).screen).toBe('fight');

    const result = { ...fight, screen: 'result' as const };
    expect(advanceGame(result, createInput(['Escape'])).screen).toBe('result');
  });

  test('prefers Escape over Enter when both are pressed together', () => {
    const ready = setAssetStatus(createInitialGameState(), true, false);
    const select = advanceGame(ready, createInput(['Enter']));
    const both = advanceGame(select, createInput(['Escape', 'Enter']));

    expect(both.screen).toBe('title');
  });

  test('initializes and advances the CPU cursor without allowing a mirror', () => {
    expect(getInitialCpuIndex(2)).toBe(3);
    expect(stepCpuIndex(2, 0, 1)).toBe(3);
    expect(stepCpuIndex(1, 0, -1)).toBe(9);
    expect(getInitialCpuIndex(9)).toBe(0);
    expect(stepCpuIndex(9, 0, 1)).toBe(1);

    const ready = setAssetStatus(createInitialGameState(), true, false);
    const select = advanceGame(ready, createInput(['Enter']));
    const cpuSelect = advanceGame(select, createInput(['Enter']));
    expect(cpuSelect.cpuSelectedIndex).not.toBe(cpuSelect.selectedIndex);
    expect(
      advanceGame(cpuSelect, createInput(['ArrowRight'])).cpuSelectedIndex
    ).toBe(2);
  });

  test('starts a match with the fourth character, Honda', () => {
    const ready = setAssetStatus(createInitialGameState(), true, false);
    let state = advanceGame(ready, createInput(['Enter']));
    for (let index = 0; index < 3; index += 1) {
      state = advanceGame(state, createInput(['ArrowRight']));
    }
    state = advanceGame(state, createInput(['Enter']));
    state = advanceGame(state, createInput(['Enter']));
    state = advanceGame(state, createInput(['Enter']));

    expect(state.screen).toBe('fight');
    expect(state.player?.id).toBe('honda');
    expect(state.cpu?.id).not.toBe('honda');
  });

  test('wraps the stage cursor and uses the selected stage for the match', () => {
    const ready = setAssetStatus(createInitialGameState(), true, false);
    const stageSelect = advanceGame(
      advanceGame(
        advanceGame(ready, createInput(['Enter'])),
        createInput(['Enter'])
      ),
      createInput(['Enter'])
    );
    const previous = advanceGame(stageSelect, createInput(['ArrowLeft']), {
      backgroundCount: BACKGROUND_COUNT
    });
    const fight = advanceGame(previous, createInput(['Enter']));

    expect(stageSelect.screen).toBe('stage-select');
    expect(previous.backgroundIndex).toBe(BACKGROUND_COUNT - 1);
    expect(fight.screen).toBe('fight');
    expect(fight.backgroundIndex).toBe(BACKGROUND_COUNT - 1);
  });

  test('keeps the selected background between rounds', () => {
    const fight = startFight();
    const nextRound = advanceGame(
      {
        ...fight,
        roundEnd: { kind: 'timeout', winner: 'ryu', frames: 1 },
        player:
          fight.player === null ? null : { ...fight.player, roundWins: 1 },
        cpu: fight.cpu === null ? null : { ...fight.cpu, roundWins: 0 }
      },
      createInput([])
    );

    expect(fight.backgroundIndex).toBe(0);
    expect(nextRound.roundNumber).toBe(2);
    expect(nextRound.backgroundIndex).toBe(0);
  });

  test('never creates a mirror match for any player selection', () => {
    for (
      let selectedIndex = 0;
      selectedIndex < CHARACTER_DEFINITIONS.length;
      selectedIndex += 1
    ) {
      let state = setAssetStatus(createInitialGameState(), true, false);
      state = advanceGame(state, createInput(['Enter']));
      for (let index = 0; index < selectedIndex; index += 1) {
        state = advanceGame(state, createInput(['ArrowRight']));
      }
      state = advanceGame(state, createInput(['Enter']));
      state = advanceGame(state, createInput(['Enter']));
      state = advanceGame(state, createInput(['Enter']));
      expect(state.screen).toBe('fight');
      expect(state.cpu?.id).not.toBe(state.player?.id);
    }
  });

  test('jump arc clears the height of a standing opponent', () => {
    let state = startActiveFight({ x: 300 }, { x: 700 });
    state = advanceGame(state, createInput(['ArrowUp']));
    let apexY = GROUND_Y;
    for (let frame = 0; frame < 50; frame += 1) {
      state = advanceGame(state, createInput());
      apexY = Math.min(apexY, state.player?.y ?? GROUND_Y);
    }

    const { player, cpu } = getFighters(state);
    expect(player.grounded).toBe(true);
    expect(apexY).toBeLessThan(getHitbox(cpu).top);
  });

  test('jumps over the opponent, lands behind, and both fighters turn around', () => {
    let state = startActiveFight({ x: 300 }, { x: 354 });
    state = advanceGame(state, { ...createInput(['ArrowUp']), right: true });
    for (let frame = 0; frame < 50; frame += 1) {
      state = advanceGame(state, { ...createInput(), right: true });
    }

    const { player, cpu } = getFighters(state);
    expect(player.grounded).toBe(true);
    expect(player.x).toBeGreaterThan(cpu.x);
    expect(player.facing).toBe(-1);
    expect(cpu.facing).toBe(1);
  });

  test('grounded fighters cannot walk through each other', () => {
    let state = startActiveFight({ x: 300 }, { x: 354 });
    for (let frame = 0; frame < 60; frame += 1) {
      state = advanceGame(state, { ...createInput(), right: true });
    }

    const { player, cpu } = getFighters(state);
    expect(player.grounded).toBe(true);
    expect(player.x).toBeLessThan(cpu.x);
  });

  test('keeps facing locked while an attack is active', () => {
    let state = startActiveFight({ x: 400 }, { x: 500 });
    state = advanceGame(state, createInput(['KeyZ']));
    expect(state.player?.attack).not.toBeNull();

    state = {
      ...state,
      cpu: state.cpu === null ? null : { ...state.cpu, x: 200 }
    };
    state = advanceGame(state, createInput());
    expect(state.player?.attack).not.toBeNull();
    expect(state.player?.facing).toBe(1);

    for (let frame = 0; frame < 25; frame += 1) {
      state = advanceGame(state, createInput());
    }
    expect(state.player?.attack).toBeNull();
    expect(state.player?.facing).toBe(-1);
  });

  test('separates fighters when landing directly on the opponent', () => {
    let state = startActiveFight(
      { x: 354, y: 300, grounded: false, vy: 8 },
      { x: 354 }
    );
    for (let frame = 0; frame < 12; frame += 1) {
      state = advanceGame(state, createInput());
    }

    const { player, cpu } = getFighters(state);
    expect(player.grounded).toBe(true);
    expect(rectanglesOverlap(getHitbox(player), getHitbox(cpu))).toBe(false);
  });

  test('keeps the baseline frame data and crouch hitbox on Ryu', () => {
    // リュウは全キャラの基準。Ver.6 の 54x130（しゃがみ65）を維持する
    const ryu = getCharacterSpec('ryu');
    expect(ryu.hurtbox).toEqual({ width: 54, height: 130, crouchHeight: 65 });
    expect(ryu.punch).toMatchObject({
      startup: 4,
      active: 4,
      recovery: 10,
      damage: 8
    });
    expect(ryu.punch.hitbox).toEqual({
      reach: 55,
      spread: 'forward',
      topOffset: 15,
      bottomInset: 18
    });
    expect(ryu.kick.hitbox).toMatchObject({
      reach: 75,
      spread: 'forward',
      topOffset: 35
    });
    // 単発技は Ver.6 の hasHit ラッチと同じ挙動になる設定
    expect(ryu.punch.maxHits).toBe(1);
    expect(ryu.kick.maxHits).toBe(1);

    const standing = createFighter();
    const crouching = createFighter({ crouching: true });
    expect(getHitbox(standing).top).toBe(270);
    expect(getHitbox(crouching).top).toBe(335);
    expect(isGuarding(standing, opponent, { ...EMPTY_INPUT, left: true })).toBe(
      true
    );
  });

  test('gives every character a hurtbox that preserves the Ver.6 side switch', () => {
    for (const id of CHARACTER_IDS) {
      const { hurtbox } = getCharacterSpec(id);
      // ジャンプ頂点は約161px。これを超える高さだと頭に引っかかって飛び越えられない
      expect(hurtbox.height).toBeLessThanOrEqual(155);
      expect(hurtbox.crouchHeight).toBeLessThan(hurtbox.height);
      // 密着から相手の中心を越えるのに必要な移動量は (自幅+相手幅)/2。
      // 滞空43F × 横速度2.5 = 107.5px 動けるので、最も太い組でも収まる必要がある
      expect(hurtbox.width).toBeLessThanOrEqual(70);
    }
    const widest = CHARACTER_IDS.map(
      (id) => getCharacterSpec(id).hurtbox.width
    ).sort((first, second) => second - first);
    const worstPair = ((widest[0] ?? 0) + (widest[1] ?? 0)) / 2;
    expect(worstPair).toBeLessThan(107.5);
  });

  test('differentiates frame data across characters', () => {
    const chunli = getCharacterSpec('chunli');
    const zangief = getCharacterSpec('zangief');
    const dhalsim = getCharacterSpec('dhalsim');

    // 春麗は発生が早く硬直が短い
    expect(chunli.punch.recovery).toBeLessThan(
      getCharacterSpec('ryu').punch.recovery
    );
    // ザンギエフは最高威力・最短リーチ
    expect(zangief.kick.damage).toBe(16);
    expect(zangief.punch.hitbox.reach).toBe(48);
    // ダルシムは最長リーチ・低威力
    expect(dhalsim.kick.hitbox.reach).toBe(95);
    expect(dhalsim.kick.damage).toBe(10);

    const reaches = CHARACTER_IDS.map(
      (id) => getCharacterSpec(id).kick.hitbox.reach
    );
    expect(new Set(reaches).size).toBeGreaterThan(1);
  });

  test('awards a timeout round to the fighter with more health', () => {
    const fight = startFight();
    const active = {
      ...fight,
      roundPhase: 'active' as const,
      timeFrames: 1,
      player: fight.player === null ? null : { ...fight.player, hp: 80 },
      cpu: fight.cpu === null ? null : { ...fight.cpu, hp: 40 }
    };
    const result = advanceGame(active, createInput([]), { random: () => 0.9 });

    expect(result.roundEnd?.kind).toBe('timeout');
    expect(result.player?.roundWins).toBe(1);
    expect(result.cpu?.roundWins).toBe(0);
  });
});

// ----------------------------------------------------------------
// Ver.7: キャラ別の必殺技（春麗のスピニングバードキック）
// ----------------------------------------------------------------

describe('Animal Fighter special moves', () => {
  const opponent = createFighter({
    ...kenDefinition,
    isPlayer: false,
    x: 570,
    facing: -1
  });
  const chunliDefinition = CHARACTER_DEFINITIONS[2];
  if (chunliDefinition === undefined || chunliDefinition.id !== 'chunli') {
    throw new Error('Chun-Li must be the third character in selection order.');
  }

  // 春麗をプレイヤーにした戦闘可能状態。CPU（ケン）は動かないよう固定される
  const startChunliFight = (playerX = 300, cpuX = 366): GameState =>
    startActiveFight({ ...chunliDefinition, x: playerX }, { x: cpuX });

  const holdDown = (state: GameState, frames: number): GameState => {
    let next = state;
    for (let index = 0; index < frames; index += 1) {
      next = advanceGame(next, { ...createInput(), down: true });
    }
    return next;
  };

  // C を押しっぱなしのまま ↑ を押す＝スピニングバードキックの発動入力
  const pressUpWithSpecial = (state: GameState, down = true): GameState =>
    advanceGame(state, {
      ...createInput(['ArrowUp']),
      down,
      projectile: true
    });

  const runUntilAttackEnds = (
    state: GameState,
    limit = 200
  ): { state: GameState; frames: number; apexY: number } => {
    let next = state;
    let frames = 0;
    let apexY = GROUND_Y;
    while (next.player?.attack != null && frames < limit) {
      next = advanceGame(next, createInput());
      frames += 1;
      apexY = Math.min(apexY, next.player?.y ?? GROUND_Y);
    }
    return { state: next, frames, apexY };
  };

  test('fires the spinning bird kick after a full down charge', () => {
    const charged = holdDown(startChunliFight(), CHARGE_REQUIRED_FRAMES);
    expect(charged.player?.chargeFrames).toBe(CHARGE_REQUIRED_FRAMES);
    expect(charged.player?.chargeDirection).toBe('down');

    const fired = pressUpWithSpecial(charged);
    expect(fired.player?.attack?.moveId).toBe('spinningBirdKick');
  });

  test('consumes the up press so no normal jump comes out', () => {
    const fired = pressUpWithSpecial(
      holdDown(startChunliFight(), CHARGE_REQUIRED_FRAMES)
    );

    // 通常ジャンプなら初速 JUMP_VELOCITY が入って離陸しているはず
    expect(fired.player?.vy).toBe(0);
    expect(fired.player?.grounded).toBe(true);
  });

  test('does nothing at all when the charge is too short', () => {
    const short = pressUpWithSpecial(holdDown(startChunliFight(), 20));

    expect(short.player?.attack).toBeNull();
    expect(short.player?.vy).toBe(0);
    expect(short.player?.grounded).toBe(true);
  });

  test('keeps the charge alive through the grace window after releasing down', () => {
    const charged = holdDown(startChunliFight(), CHARGE_REQUIRED_FRAMES);

    // ↓ を離してから CHARGE_GRACE_FRAMES 枚目のフレームまでは発動できる。
    // ここでは 9F 空回ししてから 10F 目に入力する
    let released = charged;
    for (let index = 0; index < CHARGE_GRACE_FRAMES - 1; index += 1) {
      released = advanceGame(released, createInput());
    }
    expect(pressUpWithSpecial(released, false).player?.attack?.moveId).toBe(
      'spinningBirdKick'
    );

    // 猶予を1フレーム超えると溜めが破棄される
    let expired = charged;
    for (let index = 0; index < CHARGE_GRACE_FRAMES + 1; index += 1) {
      expired = advanceGame(expired, createInput());
    }
    expect(expired.player?.chargeFrames).toBe(0);
    expect(expired.player?.chargeDirection).toBeNull();
    // 溜めが切れているので ↑ は通常ジャンプになる
    const jumped = pressUpWithSpecial(expired, false);
    expect(jumped.player?.attack).toBeNull();
    expect(jumped.player?.grounded).toBe(false);
  });

  test('pushes the charge sound once, on the completing frame only', () => {
    const almost = holdDown(startChunliFight(), CHARGE_REQUIRED_FRAMES - 1);
    expect(almost.events).not.toContain('charge');

    const completed = holdDown(almost, 1);
    expect(completed.events).toContain('charge');

    // 押し続けても鳴り続けない
    const held = holdDown(completed, 5);
    expect(held.events).not.toContain('charge');
  });

  test('rises higher than a normal jump', () => {
    const fired = pressUpWithSpecial(
      holdDown(startChunliFight(300, 700), CHARGE_REQUIRED_FRAMES)
    );
    const { apexY } = runUntilAttackEnds(fired);

    // 通常ジャンプの頂点は約 161px（GROUND_Y - 239）
    expect(apexY).toBeLessThan(GROUND_Y - 200);
  });

  test('stays airborne and active until landing, then plays the landing recovery', () => {
    const fired = pressUpWithSpecial(
      holdDown(startChunliFight(300, 700), CHARGE_REQUIRED_FRAMES)
    );
    const { state: finished, frames } = runUntilAttackEnds(fired);

    // 発生10F + 滞空 + 着地硬直14F。滞空時間に合わせて伸びるので固定値ではない
    expect(frames).toBeGreaterThan(60);
    expect(frames).toBeLessThan(100);
    expect(finished.player?.attack).toBeNull();
    expect(finished.player?.grounded).toBe(true);
    expect(finished.player?.y).toBe(GROUND_Y);
  });

  test('lands multiple hits without exceeding maxHits', () => {
    const fired = pressUpWithSpecial(
      holdDown(startChunliFight(), CHARGE_REQUIRED_FRAMES)
    );

    let state = fired;
    let maxHitsSeen = 0;
    for (let index = 0; index < 200 && state.player?.attack != null; index += 1) {
      state = advanceGame(state, createInput());
      maxHitsSeen = Math.max(maxHitsSeen, state.player?.attack?.hitsLanded ?? 0);
    }

    // 立ち相手には上昇時と下降時で2段入る（8ダメージ×2）
    expect(maxHitsSeen).toBe(2);
    expect(state.cpu?.hp).toBe(84);
  });

  test('cycles the four spin frames every three frames while airborne', () => {
    const spinning = createFighter({
      ...chunliDefinition,
      grounded: false,
      attack: createAttack('spinningBirdKick', { frame: 12 })
    });

    expect(getSpecialSpriteFrame(spinning)).toEqual({
      moveId: 'spinningBirdKick',
      index: 0
    });
    const indexes = [12, 15, 18, 21, 24].map(
      (frame) =>
        getSpecialSpriteFrame(
          createFighter({
            ...chunliDefinition,
            grounded: false,
            attack: createAttack('spinningBirdKick', { frame })
          })
        )?.index
    );
    expect(indexes).toEqual([0, 1, 2, 3, 0]);
  });

  test('shows no spin animation on the ground or before launch', () => {
    const windup = createFighter({
      ...chunliDefinition,
      attack: createAttack('spinningBirdKick', { frame: 4 })
    });
    const landing = createFighter({
      ...chunliDefinition,
      attack: createAttack('spinningBirdKick', { frame: 63, landingFrames: 8 })
    });

    expect(getSpecialSpriteFrame(windup)).toBeNull();
    expect(getSpecialSpriteFrame(landing)).toBeNull();
    // 地上フェーズはしゃがみポーズに落ちる
    expect(
      getPoseImagePath(windup, {
        opponent,
        roundEnd: null,
        guarding: false
      })
    ).toBe('crouch');
  });

  test('gives Chun-Li nothing on a plain special press', () => {
    const plain = advanceGame(startChunliFight(), {
      ...createInput(['KeyC']),
      projectile: true
    });

    expect(plain.player?.attack).toBeNull();
    expect(plain.projectiles).toHaveLength(0);
  });

  test('keeps the projectile unchanged for the other characters', () => {
    // プレイヤーはリュウ（デフォルトの飛び道具持ち）
    const fight = startActiveFight({}, {});
    const fired = advanceGame(fight, {
      ...createInput(['KeyC']),
      projectile: true
    });
    expect(fired.player?.attack?.moveId).toBe('projectile');
    expect(fired.player?.specialCooldown).toBe(60);

    // Ver.6 と同じく発生12Fで弾が出る
    let state = fired;
    for (let index = 0; index < 12; index += 1) {
      state = advanceGame(state, createInput());
    }
    expect(state.projectiles).toHaveLength(1);
    expect(state.projectiles[0]?.vx).toBe(6);
    expect(state.projectiles[0]?.y).toBe(GROUND_Y - 94);
  });

  test('keeps every CPU probability table summing to 1.0', () => {
    // Ver.6 では合計1.0がコメントでしか保証されていなかった。崩れると
    // chooseCpuAction がフォールバック経路（console.warn）に落ちる
    for (const id of CHARACTER_IDS) {
      const { cpu } = getCharacterSpec(id);
      for (const band of [cpu.far, cpu.mid, cpu.close]) {
        const total = band.reduce((sum, [, weight]) => sum + weight, 0);
        expect(total).toBeCloseTo(1, 5);
      }
    }
  });

  test('lets a CPU Chun-Li use the spinning bird kick without a charge', () => {
    // CPU 春麗を近距離に置き、close 帯で special を引く乱数を与える。
    // punch 0.3 + kick 0.2 = 0.5 の次が special 0.15 なので 0.55 で当たる
    const fight = startActiveFight(
      { x: 300 },
      { ...chunliDefinition, x: 360, aiFrames: 1 }
    );
    const rolled = advanceGame(fight, createInput(), { random: () => 0.55 });

    expect(rolled.cpu?.aiAction).toBe('special');
    expect(rolled.cpu?.attack?.moveId).toBe('spinningBirdKick');
    // 溜めは免除だが、クールダウンはプレイヤーと同じように効く
    expect(rolled.cpu?.specialCooldown).toBe(90);
    expect(rolled.cpu?.chargeFrames).toBe(0);
  });

  test('never makes a CPU Chun-Li throw a projectile at long range', () => {
    const fight = startActiveFight(
      { x: 60 },
      { ...chunliDefinition, x: 740, aiFrames: 1 }
    );
    // far 帯は approach 0.7 / idle 0.3 のみ。どの乱数でも special は出ない
    for (const roll of [0.05, 0.35, 0.69, 0.71, 0.95]) {
      const rolled = advanceGame(fight, createInput(), { random: () => roll });
      expect(rolled.cpu?.aiAction).not.toBe('special');
      expect(rolled.projectiles).toHaveLength(0);
    }
  });

  test('reports the charge meter only for a charging player with a charge move', () => {
    const noCharge = createFighter({ ...chunliDefinition });
    expect(getChargeMeter(noCharge)).toBeNull();

    const halfway = createFighter({
      ...chunliDefinition,
      chargeDirection: 'down',
      chargeFrames: CHARGE_REQUIRED_FRAMES / 2
    });
    expect(getChargeMeter(halfway)?.progress).toBeCloseTo(0.5);
    expect(getChargeMeter(halfway)?.ready).toBe(false);

    const ready = createFighter({
      ...chunliDefinition,
      chargeDirection: 'down',
      chargeFrames: CHARGE_REQUIRED_FRAMES
    });
    expect(getChargeMeter(ready)?.ready).toBe(true);
    expect(getChargeMeter(ready)?.progress).toBe(1);

    // 溜め技を持たないキャラと CPU（溜め免除）は非表示
    const ryuCharging = createFighter({
      chargeDirection: 'down',
      chargeFrames: CHARGE_REQUIRED_FRAMES
    });
    const cpuChunli = createFighter({
      ...chunliDefinition,
      isPlayer: false,
      chargeDirection: 'down',
      chargeFrames: CHARGE_REQUIRED_FRAMES
    });
    expect(getChargeMeter(ryuCharging)).toBeNull();
    expect(getChargeMeter(cpuChunli)).toBeNull();
  });
});
