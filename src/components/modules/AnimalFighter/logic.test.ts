import { specialSpriteUrls, spriteUrls } from './assets';
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
  getDefenseRate,
  getHitbox,
  getPoseImagePath,
  getSpecialSpriteFrame,
  GROUND_SPEED,
  GROUND_Y,
  HIT_FLASH_FRAMES,
  HITSTOP_FRAMES,
  HITSTUN_SLIDE,
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
  CHARGE_REQUIRED_FRAMES,
  matchSpecialCommand
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
  hitFlash: 0,
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
    // しゃがみ && ガードは crouch より優先（両立するので専用ポーズが要る）
    expect(
      getPoseImagePath(createFighter({ crouching: true }), {
        ...baseContext,
        guarding: true
      })
    ).toBe('crouchGuard');
    expect(
      getPoseImagePath(createFighter({ crouching: true }), baseContext)
    ).toBe('crouch');
    expect(
      getPoseImagePath(createFighter(), { ...baseContext, guarding: true })
    ).toBe('guard');
    expect(getPoseImagePath(createFighter(), baseContext)).toBe('fight');
  });

  test('keeps the crouch guard grounded and shorter than standing', () => {
    const standing = getCombatSpriteSpec('guard');
    const crouchGuard = getCombatSpriteSpec('crouchGuard');
    const crouch = getCombatSpriteSpec('crouch');

    // 立ちより低く、しゃがみよりは高い（膝立ちは深いしゃがみより上体が起きている）
    expect(crouchGuard.height).toBeLessThan(standing.height ?? 0);
    expect(crouchGuard.height).toBeGreaterThan(crouch.height ?? 0);
    // 地面基準でないと、しゃがんだ瞬間に足が浮く
    expect(crouchGuard.anchor).toBe('ground');
  });

  test('launches only with the anti-air, and never on a normal', () => {
    const launching: string[] = [];
    for (const id of CHARACTER_IDS) {
      const spec = getCharacterSpec(id);
      // 通常技が打ち上げると全キャラのバランスが変わる
      expect(spec.punch.launch, `${id} punch`).toBe(0);
      expect(spec.kick.launch, `${id} kick`).toBe(0);
      for (const special of spec.specials) {
        if (special.launch > 0) launching.push(`${id}/${special.id}`);
        // 打ち上げるなら滞空させる必要がある（正の値は下向きで意味を成さない）
        expect(special.launch, `${id}/${special.id}`).toBeGreaterThanOrEqual(0);
      }
    }
    // 対空技はガイルのサマーソルトだけ。増えたら意図した追加か確認する
    expect(launching).toEqual(['guile/somersaultKick']);
  });

  test('gives every character both guard sprites', () => {
    for (const id of CHARACTER_IDS) {
      expect(spriteUrls[id].guard, `${id} guard`).toBeTruthy();
      expect(spriteUrls[id].crouchGuard, `${id} crouchGuard`).toBeTruthy();
      // 同じ画像を使い回していると立ち/しゃがみの区別が付かない
      expect(spriteUrls[id].crouchGuard).not.toBe(spriteUrls[id].guard);
    }
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

  test('discounts damage as the target gets closer to death', () => {
    // 本家スト2の根性値（体力144で残り31から割引）を体力100へ換算した表
    expect(getDefenseRate(100)).toBe(1);
    expect(getDefenseRate(22)).toBe(1);
    expect(getDefenseRate(21)).toBe(0.875);
    expect(getDefenseRate(18)).toBe(0.875);
    expect(getDefenseRate(17)).toBe(0.75);
    expect(getDefenseRate(14)).toBe(0.625);
    expect(getDefenseRate(10)).toBe(0.5);
    expect(getDefenseRate(7)).toBe(0.375);
    expect(getDefenseRate(3)).toBe(0.25);
    expect(getDefenseRate(0)).toBe(0.25);
  });

  test('makes the last stretch of health take more hits than the first', () => {
    // 13ダメージのキックを当て続けたときの必要回数。根性値がなければ
    // 100/13 = 8回で終わるが、終盤が粘るので9回かかる
    const hitsToKill = (damage: number): number => {
      let hp = 100;
      let hits = 0;
      while (hp > 0 && hits < 100) {
        hp = Math.max(0, hp - Math.ceil(damage * getDefenseRate(hp)));
        hits += 1;
      }
      return hits;
    };

    expect(hitsToKill(13)).toBe(9);
    expect(Math.ceil(100 / 13)).toBe(8);
    // 小ダメージの技ほど終盤の粘りが効く
    expect(hitsToKill(5)).toBeGreaterThan(Math.ceil(100 / 5));
  });

  test('does not chip health when a normal attack is guarded', () => {
    // 相手と逆方向（左）を押しっぱなしでガードしながらキックを受ける
    const fight = startActiveFight({ x: 300 }, { x: 356 });
    let state: GameState = {
      ...fight,
      // CPU に近距離からキックを出させる
      cpu: fight.cpu === null ? null : { ...fight.cpu, aiAction: 'kick' }
    };

    let guarded = false;
    for (let index = 0; index < 90; index += 1) {
      state = advanceGame(state, { ...createInput(), left: true });
      if (state.events.includes('guard')) {
        guarded = true;
      }
    }

    expect(guarded).toBe(true);
    // 通常技のガードは削らない（本家スト2と同じ）
    expect(state.player?.hp).toBe(100);
  });

  test('still chips health when a projectile is guarded', () => {
    const fight = startActiveFight({ x: 200 }, { x: 600 });
    let state: GameState = {
      ...fight,
      cpu: fight.cpu === null ? null : { ...fight.cpu, aiAction: 'special' }
    };

    for (let index = 0; index < 120; index += 1) {
      state = advanceGame(state, { ...createInput(), left: true });
      if ((state.player?.hp ?? 100) < 100) {
        break;
      }
    }

    // 飛び道具の削りは3（本家の波動拳と同じ扱い）
    expect(state.player?.hp).toBe(97);
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

  test('rises higher than a normal jump but not so high it skips the strike zone', () => {
    // 通常ジャンプの頂点を実測して比較する（マジックナンバーを置かない）
    let jump = advanceGame(startChunliFight(300, 700), createInput(['ArrowUp']));
    let jumpApex = GROUND_Y;
    for (let index = 0; index < 60; index += 1) {
      jump = advanceGame(jump, createInput());
      jumpApex = Math.min(jumpApex, jump.player?.y ?? GROUND_Y);
    }

    const fired = pressUpWithSpecial(
      holdDown(startChunliFight(300, 700), CHARGE_REQUIRED_FRAMES)
    );
    const { apexY } = runUntilAttackEnds(fired);

    expect(apexY).toBeLessThan(jumpApex);
    // ただし上げすぎない。逆さで脚が上なので、立ち相手に届くのは高度130px以下に
    // いる間だけ。頂点が高すぎるとその区間を一瞬で通り抜けて当たらなくなる
    expect(GROUND_Y - apexY).toBeLessThan(210);
  });

  test('travels forward faster than walking so it reads as a moving move', () => {
    const fired = pressUpWithSpecial(
      holdDown(startChunliFight(300, 700), CHARGE_REQUIRED_FRAMES)
    );
    const startX = fired.player?.x ?? 0;
    const { state: finished } = runUntilAttackEnds(fired);
    const travelled = (finished.player?.x ?? 0) - startX;

    // 通常ジャンプの横移動は 43F × AIR_SPEED 2.5 ≒ 107px。それより遠くまで進む
    expect(travelled).toBeGreaterThan(130);
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
    const spec = getCharacterSpec('chunli').specials[0];
    if (spec === undefined) {
      throw new Error('Chun-Li must have a special.');
    }
    const fired = pressUpWithSpecial(
      holdDown(startChunliFight(), CHARGE_REQUIRED_FRAMES)
    );

    let state = fired;
    let maxHitsSeen = 0;
    for (let index = 0; index < 200 && state.player?.attack != null; index += 1) {
      state = advanceGame(state, createInput());
      maxHitsSeen = Math.max(maxHitsSeen, state.player?.attack?.hitsLanded ?? 0);
    }

    // 近距離では全3段入る（7ダメージ×3）
    expect(maxHitsSeen).toBe(spec.maxHits);
    expect(state.cpu?.hp).toBe(100 - spec.damage * spec.maxHits);
  });

  test('connects from every practical starting distance', () => {
    // 前進が遅かった頃（1.2px/F）は開始距離の半分近くで空振りしていた
    for (const gap of [40, 80, 120, 160, 200, 240]) {
      const fired = pressUpWithSpecial(
        holdDown(startChunliFight(300, 300 + gap), CHARGE_REQUIRED_FRAMES)
      );
      const { state: finished } = runUntilAttackEnds(fired);
      expect(
        finished.cpu?.hp,
        `gap ${gap} must connect`
      ).toBeLessThan(100);
    }
  });

  test('crosses the opponent up at point blank range', () => {
    const fired = pressUpWithSpecial(
      holdDown(startChunliFight(300, 360), CHARGE_REQUIRED_FRAMES)
    );
    const { state: landed } = runUntilAttackEnds(fired);
    // 振り向きは「接地・非攻撃」のニュートラルフレームで再計算されるので、
    // 技が終わった次のフレームまで進める（Ver.6 のサイドスイッチと同じ仕組み）
    const finished = advanceGame(landed, createInput());
    const { player, cpu } = getFighters(finished);

    // 前進165px がノックバックを上回るので相手を追い抜いて裏に着地する。
    // 通り抜けながら当てられるのは hitbox の spread:'both' のおかげ
    expect(player.x).toBeGreaterThan(cpu.x);
    expect(player.facing).toBe(-1);
    expect(cpu.hp).toBeLessThan(100);
  });

  test('cycles the four spin frames every three frames while airborne', () => {
    const spinning = createFighter({
      ...chunliDefinition,
      grounded: false,
      attack: createAttack('spinningBirdKick', { frame: 12 })
    });

    expect(getSpecialSpriteFrame(spinning)).toEqual({
      moveId: 'spinningBirdKick',
      index: 0,
      // 画像自体が回転済みなので描画側では回さない
      rotation: 0
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

  test('keeps airborne spin specs consistent with the engine assumptions', () => {
    for (const id of CHARACTER_IDS) {
      for (const special of getCharacterSpec(id).specials) {
        const behavior = special.behavior;
        if (behavior === null || behavior.kind !== 'airborneSpin') {
          continue;
        }
        // 打ち上げは applyMoveMotion の frame === startup のフレームだけが行うので、
        // 0 だとそのフレームが来ないまま着地判定が成立して技が不発になる
        expect(special.startup).toBeGreaterThanOrEqual(1);
        expect(behavior.riseVelocity).toBeLessThan(0);
        expect(behavior.landingRecovery).toBeGreaterThanOrEqual(0);
        // アニメの枚数が実際の画像枚数と一致していないと、足りない番号で
        // 静かに通常ポーズへフォールバックする
        const frames = specialSpriteUrls[id]?.[special.id];
        expect(frames, `${id}/${special.id} needs sprite frames`).toBeDefined();
        expect(frames).toHaveLength(special.animation?.frameCount ?? 0);
      }
    }
  });

  test('holds the landing recovery for exactly landingRecovery frames', () => {
    const fired = pressUpWithSpecial(
      holdDown(startChunliFight(300, 700), CHARGE_REQUIRED_FRAMES)
    );

    // 着地した最初のフレームまで進める
    let state = fired;
    let guard = 0;
    while (
      guard < 200 &&
      (state.player?.attack?.landingFrames ?? -1) < 0 &&
      state.player?.attack != null
    ) {
      state = advanceGame(state, createInput());
      guard += 1;
    }
    const landingRecovery = 14;
    expect(state.player?.attack?.landingFrames).toBe(landingRecovery);
    expect(state.player?.grounded).toBe(true);

    // ここからちょうど landingRecovery フレームで技が終わる（+1 に伸びていないこと）
    for (let index = 0; index < landingRecovery - 1; index += 1) {
      state = advanceGame(state, createInput());
      expect(state.player?.attack).not.toBeNull();
    }
    state = advanceGame(state, createInput());
    expect(state.player?.attack).toBeNull();
  });

  test('starts the spin animation on the first frame after launch', () => {
    const spec = getCharacterSpec('chunli').specials[0];
    if (spec === undefined) {
      throw new Error('Chun-Li must have a special.');
    }
    const at = (frame: number): number | undefined =>
      getSpecialSpriteFrame(
        createFighter({
          ...chunliDefinition,
          grounded: false,
          attack: createAttack(spec.id, { frame })
        })
      )?.index;

    // 発生フレーム起点で 3F ずつ 0→1→2→3→0 と回る（離陸直後に4枚目が覗かない）
    expect(at(spec.startup)).toBe(0);
    expect(at(spec.startup + 2)).toBe(0);
    expect(at(spec.startup + 3)).toBe(1);
    expect(at(spec.startup + 11)).toBe(3);
    expect(at(spec.startup + 12)).toBe(0);
  });

  test('does not turn a cooldown-blocked command into a jump', () => {
    const charged = holdDown(startChunliFight(300, 700), CHARGE_REQUIRED_FRAMES);
    const onCooldown: GameState = {
      ...charged,
      player:
        charged.player === null
          ? null
          : { ...charged.player, specialCooldown: 40 }
    };
    const attempted = pressUpWithSpecial(onCooldown);

    // 必殺技も出ないが、ジャンプにも化けない
    expect(attempted.player?.attack).toBeNull();
    expect(attempted.player?.grounded).toBe(true);
    expect(attempted.player?.vy).toBe(0);
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

describe('Animal Fighter yoga fire', () => {
  const dhalsimDefinition = CHARACTER_DEFINITIONS[6];
  if (dhalsimDefinition === undefined || dhalsimDefinition.id !== 'dhalsim') {
    throw new Error('Dhalsim must be the seventh character in selection order.');
  }
  const dhalsimSpecials = getCharacterSpec('dhalsim').specials;

  const startDhalsimFight = (playerX = 200, cpuX = 600): GameState =>
    startActiveFight({ ...dhalsimDefinition, x: playerX }, { x: cpuX });

  const holdDown = (state: GameState, frames: number): GameState => {
    let next = state;
    for (let index = 0; index < frames; index += 1) {
      next = advanceGame(next, { ...createInput(), down: true });
    }
    return next;
  };

  // C を押しっぱなしのまま前方向を押す＝ヨガファイヤーの発動入力
  const pressForward = (state: GameState): GameState =>
    advanceGame(state, {
      ...createInput(['ArrowRight']),
      down: true,
      projectile: true
    });

  const runUntilAttackEnds = (state: GameState, limit = 200): GameState => {
    let next = state;
    let frames = 0;
    while (next.player?.attack != null && frames < limit) {
      next = advanceGame(next, createInput());
      frames += 1;
    }
    return next;
  };

  const spriteFrameAt = (frame: number): number | undefined =>
    getSpecialSpriteFrame(
      createFighter({
        ...dhalsimDefinition,
        attack: createAttack('yogaFire', { frame })
      })
    )?.index;

  test('fires after a full down charge and replaces the shared projectile', () => {
    const charged = holdDown(startDhalsimFight(), CHARGE_REQUIRED_FRAMES);
    const fired = pressForward(charged);

    expect(fired.player?.attack?.moveId).toBe('yogaFire');
    expect(dhalsimSpecials.map((special) => special.id)).toEqual(['yogaFire']);
  });

  test('resolves the forward trigger against the facing direction', () => {
    const charge = {
      chargeDirection: 'down' as const,
      chargeFrames: CHARGE_REQUIRED_FRAMES
    };
    const facingRight = createFighter({ ...dhalsimDefinition, ...charge });
    const facingLeft = createFighter({
      ...dhalsimDefinition,
      ...charge,
      facing: -1
    });
    const withRight = { ...createInput(['ArrowRight']), projectile: true };
    const withLeft = { ...createInput(['ArrowLeft']), projectile: true };

    // 2P 側を向いたときに左右が裏返らないこと（絶対方向で持つと壊れる）
    expect(matchSpecialCommand(facingRight, dhalsimSpecials, withRight)?.id).toBe(
      'yogaFire'
    );
    expect(matchSpecialCommand(facingRight, dhalsimSpecials, withLeft)).toBeNull();
    expect(matchSpecialCommand(facingLeft, dhalsimSpecials, withLeft)?.id).toBe(
      'yogaFire'
    );
    expect(matchSpecialCommand(facingLeft, dhalsimSpecials, withRight)).toBeNull();
  });

  test('plays the four images out and back as one flow', () => {
    // 8コマ×6F。1→1→2→3→4→3→2→1 の順で、48F 以降は最終コマのまま止まる
    const frames = [0, 6, 12, 18, 24, 30, 36, 42, 48, 59];
    expect(frames.map(spriteFrameAt)).toEqual([0, 0, 1, 2, 3, 2, 1, 0, 0, 0]);
  });

  test('animates on the ground, unlike the airborne spin', () => {
    // 春麗の grounded ガードに引っかかると1コマも出ない
    expect(spriteFrameAt(24)).toBe(3);
  });

  test('reaches far past the longest normal without spawning a projectile', () => {
    // ダルシムのキックは 95px。弾を飛ばさずに 340px 先へ届く
    const fired = pressForward(
      holdDown(startDhalsimFight(200, 540), CHARGE_REQUIRED_FRAMES)
    );
    const finished = runUntilAttackEnds(fired);

    expect(finished.cpu?.hp).toBeLessThan(100);
    expect(finished.projectiles).toHaveLength(0);
  });

  test('whiffs beyond the flame tip', () => {
    const fired = pressForward(
      holdDown(startDhalsimFight(100, 760), CHARGE_REQUIRED_FRAMES)
    );
    const finished = runUntilAttackEnds(fired);

    expect(finished.cpu?.hp).toBe(100);
  });

  test('has no hitbox while the flame is still winding up', () => {
    let state = pressForward(
      holdDown(startDhalsimFight(300, 366), CHARGE_REQUIRED_FRAMES)
    );
    // 密着でも発生前（コマ0〜1＝reach 0）は当たらない
    for (let index = 0; index < 11; index += 1) {
      state = advanceGame(state, createInput());
      expect(state.cpu?.hp, `frame ${String(index)}`).toBe(100);
    }
  });

  test('knocks the target back much further than a normal', () => {
    const fired = pressForward(
      holdDown(startDhalsimFight(300, 420), CHARGE_REQUIRED_FRAMES)
    );
    const before = getFighters(fired).cpu.x;
    const finished = runUntilAttackEnds(fired);

    // 押し出し110px + ヒットスタン中の3Fスライド18px = 128px（通常技は 6+18=24px）
    expect(getFighters(finished).cpu.x - before).toBe(128);
  });

  test('chips a guarding target', () => {
    // CPU ダルシムに撃たせ、プレイヤーは逆方向（左）を押しっぱなしでガードする
    const fight = startActiveFight(
      { x: 500 },
      { ...dhalsimDefinition, x: 600, aiAction: 'special' }
    );
    let state = fight;
    for (let index = 0; index < 120; index += 1) {
      state = advanceGame(state, { ...createInput(), left: true });
      if ((state.player?.hp ?? 100) < 100) {
        break;
      }
    }

    expect(state.player?.hp).toBe(98);
  });

  test('still shows the full flame after a point blank hit', () => {
    // 密着だと最小の炎（コマ2）で当たるが、そこで技を打ち切ってはいけない。
    // 当たった時点で引っ込めると、大きい炎が一度も出ないまま終わって技に見えなくなる
    let state = pressForward(
      holdDown(startDhalsimFight(300, 366), CHARGE_REQUIRED_FRAMES)
    );
    const seen = new Set<number>();
    while (state.player?.attack != null) {
      const frame = getSpecialSpriteFrame(state.player);
      if (frame !== null) {
        seen.add(frame.index);
      }
      state = advanceGame(state, createInput());
    }

    expect(state.cpu?.hp).toBeLessThan(100);
    // 伸びきった4枚目まで表示される
    expect([...seen].sort()).toEqual([0, 1, 2, 3]);
  });

  test('leaves the opponent room to close the distance', () => {
    const yogaFire = dhalsimSpecials[0];
    if (yogaFire === undefined) {
      throw new Error('Dhalsim must have a special.');
    }
    // クールダウンの間に相手が歩ける距離を吹っ飛ばしが食い潰すと、
    // 撃ち続けるだけで永久に近寄れない詰み状態になる。
    // 半分以下に抑えて、1サイクルごとに必ず間合いが縮むようにする
    const walkPerCycle = yogaFire.cooldown * GROUND_SPEED;
    expect(yogaFire.knockback + HITSTUN_SLIDE).toBeLessThan(walkPerCycle / 2);
  });

  test('blasts the target out of walking-back range', () => {
    const fired = pressForward(
      holdDown(startDhalsimFight(300, 366), CHARGE_REQUIRED_FRAMES)
    );
    const before = getFighters(fired).cpu.x;
    const finished = runUntilAttackEnds(fired);
    const gained = getFighters(finished).cpu.x - before;

    // 技の残り時間で歩いて戻れる距離（約18F×3px）より遠くへ飛ばす。
    // ここが足りないと、当たらなくなった炎の中を素通りして詰められる
    expect(gained).toBeGreaterThan(60);
  });

  test('keeps extending flame reach in step with the animation', () => {
    for (const id of CHARACTER_IDS) {
      for (const special of getCharacterSpec(id).specials) {
        const behavior = special.behavior;
        const animation = special.animation;
        if (behavior === null || behavior.kind !== 'extendingFlame') {
          continue;
        }
        expect(animation, `${id}/${special.id} needs an animation`).not.toBeNull();
        if (animation === null) {
          continue;
        }
        const sequence = animation.sequence ?? [];
        // 長さがずれると絵と判定が静かに食い違う
        expect(behavior.reachByStep).toHaveLength(sequence.length);
        // 画像番号が枚数を超えていると通常ポーズへ黙ってフォールバックする
        expect(Math.max(...sequence)).toBeLessThan(animation.frameCount);
        expect(specialSpriteUrls[id]?.[special.id]).toHaveLength(
          animation.frameCount
        );

        // 判定が出ている区間（startup〜startup+active）と reach 非ゼロの区間が一致すること
        const activeSteps = behavior.reachByStep
          .map((reach, step) => ({ reach, step }))
          .filter((entry) => entry.reach > 0);
        const first = activeSteps[0]?.step ?? -1;
        const last = activeSteps[activeSteps.length - 1]?.step ?? -1;
        expect(first * animation.interval).toBe(special.startup);
        expect((last + 1) * animation.interval).toBe(
          special.startup + special.active
        );
      }
    }
  });
});

describe('Animal Fighter pause', () => {
  const pressSpace = (state: GameState): GameState =>
    advanceGame(state, createInput(['Space']));

  test('freezes the timer and the fighters while paused', () => {
    const paused = pressSpace(startActiveFight({}, {}));
    expect(paused.paused).toBe(true);

    const { player } = getFighters(paused);
    let next = paused;
    for (let index = 0; index < 10; index += 1) {
      next = advanceGame(next, { ...createInput(), right: true });
    }

    expect(next.timeFrames).toBe(paused.timeFrames);
    expect(next.player?.x).toBe(player.x);
    expect(next.paused).toBe(true);
  });

  test('resumes with another Space press', () => {
    const resumed = pressSpace(pressSpace(startActiveFight({}, {})));
    expect(resumed.paused).toBe(false);

    const moved = advanceGame(resumed, { ...createInput(), right: true });
    expect(moved.timeFrames).toBeLessThan(resumed.timeFrames);
  });

  test('moves the cursor and returns to the title', () => {
    const paused = pressSpace(startActiveFight({}, {}));
    expect(paused.pauseIndex).toBe(0);

    const down = advanceGame(paused, createInput(['ArrowDown']));
    expect(down.pauseIndex).toBe(1);
    // 端で折り返す
    expect(advanceGame(down, createInput(['ArrowDown'])).pauseIndex).toBe(0);
    expect(advanceGame(paused, createInput(['ArrowUp'])).pauseIndex).toBe(1);

    const title = advanceGame(down, createInput(['Enter']));
    expect(title.screen).toBe('title');
    expect(title.paused).toBe(false);
    expect(title.player).toBeNull();
  });

  test('resumes when Enter picks the first item', () => {
    const paused = pressSpace(startActiveFight({}, {}));
    const resumed = advanceGame(paused, createInput(['Enter']));

    expect(resumed.paused).toBe(false);
    expect(resumed.screen).toBe('fight');
  });

  test('ignores Space during the KO sequence', () => {
    const fight = startActiveFight({}, {});
    const knockedOut = {
      ...fight,
      roundEnd: { kind: 'ko' as const, winner: fight.player?.id ?? null, frames: 90 }
    };

    expect(pressSpace(knockedOut).paused).toBe(false);
  });

  test('does not pause outside a match', () => {
    const title = setAssetStatus(createInitialGameState(), true, false);
    expect(pressSpace(title).paused).toBe(false);
    expect(pressSpace(title).screen).toBe('title');
  });
});

describe('Animal Fighter somersault kick', () => {
  const guileDefinition = CHARACTER_DEFINITIONS[5];
  if (guileDefinition === undefined || guileDefinition.id !== 'guile') {
    throw new Error('Guile must be the sixth character in selection order.');
  }
  const guileSpecials = getCharacterSpec('guile').specials;

  const startGuileFight = (playerX = 300, cpuX = 366): GameState =>
    startActiveFight({ ...guileDefinition, x: playerX }, { x: cpuX });

  const holdDown = (state: GameState, frames: number): GameState => {
    let next = state;
    for (let index = 0; index < frames; index += 1) {
      next = advanceGame(next, { ...createInput(), down: true });
    }
    return next;
  };

  const pressUp = (state: GameState): GameState =>
    advanceGame(state, {
      ...createInput(['ArrowUp']),
      down: true,
      projectile: true
    });

  const spriteAt = (frame: number, grounded = false) =>
    getSpecialSpriteFrame(
      createFighter({
        ...guileDefinition,
        grounded,
        attack: createAttack('somersaultKick', { frame })
      })
    );

  test('replaces the shared projectile and fires from a down charge', () => {
    expect(guileSpecials.map((special) => special.id)).toEqual([
      'somersaultKick'
    ]);

    const fired = pressUp(holdDown(startGuileFight(), CHARGE_REQUIRED_FRAMES));
    expect(fired.player?.attack?.moveId).toBe('somersaultKick');
  });

  test('plays the windup and landing frames on the ground too', () => {
    // 春麗の airborneOnly と違い、地上の溜め（画像1）と着地（画像5）も見せる。
    // ここが null に落ちると、せっかくの5枚のうち2枚が一度も表示されない
    expect(spriteAt(0, true)?.index).toBe(0);
    expect(spriteAt(60, true)?.index).toBe(4);
  });

  test('rotates the rising frame before cutting to the inverted one', () => {
    // 8コマ: 画像1 → 2 → 2を回す×2 → 3(逆さ) → 4 → 5 → 5
    const steps = [0, 6, 12, 18, 24, 30, 36, 42].map((f) => spriteAt(f));
    expect(steps.map((s) => s?.index)).toEqual([0, 1, 1, 1, 2, 3, 4, 4]);
    // 同じ画像2を角度違いで見せて宙返りに繋ぐ
    expect(steps.map((s) => s?.rotation)).toEqual([
      0, 0, -60, -120, 0, 0, 0, 0
    ]);
  });

  test('holds the last frame through the landing recovery', () => {
    // 着地硬直中は attack.frame が進まないので、最終コマで止まる
    expect(spriteAt(48)?.index).toBe(4);
    expect(spriteAt(200)?.index).toBe(4);
  });

  test('knocks a jumping opponent out of the air', () => {
    // 跳び込んできた相手を落とせるのが対空技の役目。
    // 溜め済みのガイルの目前に、頭上を越えようとする相手を置く
    const charged = holdDown(startGuileFight(300, 380), CHARGE_REQUIRED_FRAMES);
    const jumping: GameState = {
      ...charged,
      cpu:
        charged.cpu === null
          ? null
          : { ...charged.cpu, grounded: false, y: GROUND_Y - 90, vy: -2 }
    };

    let state = pressUp(jumping);
    for (let index = 0; index < 40 && (state.cpu?.hp ?? 0) === 100; index += 1) {
      state = advanceGame(state, createInput());
    }
    expect(state.cpu?.hp).toBeLessThan(100);
  });

  test('launches the opponent into the air', () => {
    const fired = pressUp(holdDown(startGuileFight(), CHARGE_REQUIRED_FRAMES));

    let state = fired;
    let peak = GROUND_Y;
    let landedAfterHit = -1;
    for (let index = 0; index < 140; index += 1) {
      state = advanceGame(state, createInput());
      const cpu = getFighters(state).cpu;
      peak = Math.min(peak, cpu.y);
      if (cpu.hp < 100 && landedAfterHit < 0 && cpu.grounded) {
        landedAfterHit = index;
      }
    }

    // 通常ジャンプの頂点161pxに近いところまで巻き上げる
    expect(GROUND_Y - peak).toBeGreaterThan(120);
    // ちゃんと落ちてくる
    expect(landedAfterHit).toBeGreaterThan(0);
    expect(getFighters(state).cpu.grounded).toBe(true);
  });

  test('keeps the launched opponent helpless until they land', () => {
    const fired = pressUp(holdDown(startGuileFight(), CHARGE_REQUIRED_FRAMES));

    let state = fired;
    // 打ち上がるまで進める
    while ((state.cpu?.grounded ?? true) && (state.cpu?.hp ?? 100) === 100) {
      state = advanceGame(state, createInput());
    }

    // 滞空している間はずっとのけぞったまま。途中で操作可能に戻ると
    // 浮いたまま切り返せてしまい対空技の意味が無くなる
    let airborneFrames = 0;
    while (!(state.cpu?.grounded ?? true) && airborneFrames < 140) {
      expect(state.cpu?.hitstun, `airborne frame ${String(airborneFrames)}`).toBeGreaterThan(0);
      state = advanceGame(state, createInput());
      airborneFrames += 1;
    }
    expect(airborneFrames).toBeGreaterThan(10);
  });

  test('flashes the target and holds a longer hitstop than a normal', () => {
    const fired = pressUp(holdDown(startGuileFight(), CHARGE_REQUIRED_FRAMES));

    let state = fired;
    while ((state.cpu?.hp ?? 0) === 100) {
      state = advanceGame(state, createInput());
    }
    // 被弾の瞬間に白く光り、必殺技なので通常技より長く止まる
    expect(state.cpu?.hitFlash).toBe(HIT_FLASH_FRAMES);
    expect(state.hitStopFrames).toBeGreaterThan(HITSTOP_FRAMES);
  });

  test('keeps rotation and sequence lengths in step for every character', () => {
    for (const id of CHARACTER_IDS) {
      for (const special of getCharacterSpec(id).specials) {
        const animation = special.animation;
        if (animation === null) continue;
        const label = `${id}/${special.id}`;
        if (animation.sequence !== null) {
          // 画像番号が枚数を超えると通常ポーズへ黙ってフォールバックする
          expect(Math.max(...animation.sequence), label).toBeLessThan(
            animation.frameCount
          );
        }
        if (animation.rotationByStep !== null) {
          // ずれると回転が1コマ手前/奥にかかる
          const steps = animation.sequence?.length ?? animation.frameCount;
          expect(animation.rotationByStep, label).toHaveLength(steps);
        }
      }
    }
  });
});
