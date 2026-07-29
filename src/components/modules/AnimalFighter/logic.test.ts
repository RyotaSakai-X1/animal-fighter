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
  SELECT_SLOT_COUNT,
  setAssetStatus,
  stepCpuIndex,
  type Fighter,
  type GameInput,
  type GameKey
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
