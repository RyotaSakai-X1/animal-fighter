import {
  advanceGame,
  ATTACKS,
  BACKGROUND_COUNT,
  CHARACTER_IDS,
  CHARACTER_DEFINITIONS,
  createInitialGameState,
  EMPTY_INPUT,
  getCharacterIconPath,
  getCharacterImagePath,
  getCombatSpriteSpec,
  getInitialCpuIndex,
  getHitbox,
  getPoseImagePath,
  isGuarding,
  rectanglesOverlap,
  SELECT_SLOT_COUNT,
  setAssetStatus,
  stepCpuIndex,
  type Fighter,
  type GameInput,
  type GameKey,
  type GameState
} from './logic';

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
  projectileCooldown: 0,
  blocking: false,
  aiAction: 'idle',
  aiFrames: 1,
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
        createFighter({ attack: { type: 'punch', frame: 12, hasHit: false } }),
        baseContext
      )
    ).toBe('punch');
    expect(
      getPoseImagePath(
        createFighter({
          attack: { type: 'projectile', frame: 20, hasHit: true }
        }),
        baseContext
      )
    ).toBe('punch');
    expect(
      getPoseImagePath(
        createFighter({ attack: { type: 'kick', frame: 12, hasHit: false } }),
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

  test('jumps over the opponent, lands behind, and both fighters turn around', () => {
    let state = startActiveFight({ x: 300 }, { x: 354 });
    state = advanceGame(state, { ...createInput(['ArrowUp']), right: true });
    for (let frame = 0; frame < 45; frame += 1) {
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

  test('keeps the Ver.1 attack frame data and crouch hitbox', () => {
    expect(ATTACKS).toEqual({
      punch: { startup: 6, active: 4, recovery: 10, damage: 8, reach: 55 },
      kick: { startup: 10, active: 5, recovery: 16, damage: 13, reach: 75 },
      projectile: {
        startup: 12,
        active: 1,
        recovery: 20,
        damage: 12,
        reach: 0
      }
    });
    const standing = createFighter();
    const crouching = createFighter({ crouching: true });
    expect(getHitbox(standing).top).toBe(270);
    expect(getHitbox(crouching).top).toBe(335);
    expect(isGuarding(standing, opponent, { ...EMPTY_INPUT, left: true })).toBe(
      true
    );
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
