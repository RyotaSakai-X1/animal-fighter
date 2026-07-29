export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 450;
export const GROUND_Y = 400;
export const MIN_X = 40;
export const MAX_X = 760;
export const FRAME_RATE = 60;
export const ROUND_TIME_SECONDS = 99;
export const ROUND_TIME_FRAMES = ROUND_TIME_SECONDS * FRAME_RATE;
export const INTRO_FRAMES = 60;
export const KO_FRAMES = 90;
export const HITSTOP_FRAMES = 4;
export const BACKGROUND_COUNT = 5;

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

export type CharacterDefinition = {
  id: CharacterId;
  name: string;
  color: string;
};

export const CHARACTER_DEFINITIONS: readonly CharacterDefinition[] = [
  { id: 'ryu', name: 'KUMA-RYU', color: '#8b5a2b' },
  { id: 'ken', name: 'KUMA-KEN', color: '#f0ead6' },
  { id: 'chunli', name: 'KITSUNE CHUN-LI', color: '#e0862f' },
  { id: 'honda', name: 'AKITA-DOG HONDA', color: '#d9a05b' },
  { id: 'zangief', name: 'BURU-DOG ZANGIEF', color: '#c0392b' },
  { id: 'guile', name: 'GORILLA GUILE', color: '#5a7d2a' },
  { id: 'dhalsim', name: 'GIBBON DHALSIM', color: '#d4a017' },
  { id: 'bison', name: 'BISON BUFFALO', color: '#7b2fbe' },
  { id: 'blanka', name: 'SHISHI BLANKA', color: '#58a832' },
  { id: 'vega', name: 'TIGER VEGA', color: '#f28c28' }
];
export const SELECT_SLOT_COUNT = 10;

export const ATTACKS = {
  punch: { startup: 6, active: 4, recovery: 10, damage: 8, reach: 55 },
  kick: { startup: 10, active: 5, recovery: 16, damage: 13, reach: 75 },
  projectile: { startup: 12, active: 1, recovery: 20, damage: 12, reach: 0 }
} as const;

export type AttackType = keyof typeof ATTACKS;

export const CPU_PROBABILITIES = {
  far: [
    ['approach', 0.6],
    ['projectile', 0.2],
    ['idle', 0.2]
  ],
  mid: [
    ['approach', 0.5],
    ['jumpForward', 0.2],
    ['projectile', 0.15],
    ['idle', 0.15]
  ],
  close: [
    ['punch', 0.4],
    ['kick', 0.25],
    ['retreat', 0.2],
    ['jump', 0.15]
  ],
  projectileDodge: 0.4
} as const;

export type CpuAction =
  | 'approach'
  | 'projectile'
  | 'idle'
  | 'jumpForward'
  | 'punch'
  | 'kick'
  | 'retreat'
  | 'jump';

export type AttackState = {
  type: AttackType;
  frame: number;
  hasHit: boolean;
};

export type Fighter = CharacterDefinition & {
  isPlayer: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  grounded: boolean;
  crouching: boolean;
  hp: number;
  roundWins: number;
  facing: -1 | 1;
  attack: AttackState | null;
  hitstun: number;
  hitstunElapsed: number;
  projectileCooldown: number;
  blocking: boolean;
  aiAction: CpuAction;
  aiFrames: number;
};

export type Projectile = {
  owner: CharacterId;
  x: number;
  y: number;
  vx: number;
  frame: number;
  onScreen: boolean;
};

export type HitSpark = { x: number; y: number; frame: number };
export type GuardEffect = { x: number; y: number; frame: number };

export type RoundEnd = {
  kind: 'ko' | 'timeout';
  winner: CharacterId | null;
  frames: number;
};

export type GameScreen =
  | 'title'
  | 'select'
  | 'cpu-select'
  | 'stage-select'
  | 'fight'
  | 'result';
export type RoundPhase = 'intro' | 'fight' | 'active';

export type InputState = {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  punch: boolean;
  kick: boolean;
  projectile: boolean;
  confirm: boolean;
};

export type GameKey =
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'ArrowUp'
  | 'ArrowDown'
  | 'KeyZ'
  | 'KeyX'
  | 'KeyC'
  | 'Enter';

export type GameInput = InputState & {
  justPressed: ReadonlySet<GameKey>;
};

export type SoundEvent = 'hit' | 'guard' | 'projectile' | 'ko';

export type GameState = {
  screen: GameScreen;
  selectedIndex: number;
  cpuSelectedIndex: number;
  player: Fighter | null;
  cpu: Fighter | null;
  roundNumber: number;
  roundPhase: RoundPhase;
  phaseFrames: number;
  timeFrames: number;
  roundEnd: RoundEnd | null;
  backgroundIndex: number;
  hitStopFrames: number;
  projectiles: Projectile[];
  hitSparks: HitSpark[];
  guardEffects: GuardEffect[];
  assetsReady: boolean;
  assetsFailed: boolean;
  input: InputState;
  events: SoundEvent[];
};

export const EMPTY_INPUT: InputState = {
  left: false,
  right: false,
  up: false,
  down: false,
  punch: false,
  kick: false,
  projectile: false,
  confirm: false
};

const cloneFighter = (fighter: Fighter): Fighter => ({
  ...fighter,
  attack: fighter.attack === null ? null : { ...fighter.attack }
});

const cloneState = (state: GameState): GameState => ({
  ...state,
  player: state.player === null ? null : cloneFighter(state.player),
  cpu: state.cpu === null ? null : cloneFighter(state.cpu),
  roundEnd: state.roundEnd === null ? null : { ...state.roundEnd },
  projectiles: state.projectiles.map((projectile) => ({ ...projectile })),
  hitSparks: state.hitSparks.map((spark) => ({ ...spark })),
  guardEffects: state.guardEffects.map((effect) => ({ ...effect })),
  input: { ...state.input },
  events: []
});

export const createInitialGameState = (): GameState => ({
  screen: 'title',
  selectedIndex: 0,
  cpuSelectedIndex: 1,
  player: null,
  cpu: null,
  roundNumber: 1,
  roundPhase: 'intro',
  phaseFrames: INTRO_FRAMES,
  timeFrames: ROUND_TIME_FRAMES,
  roundEnd: null,
  backgroundIndex: 0,
  hitStopFrames: 0,
  projectiles: [],
  hitSparks: [],
  guardEffects: [],
  assetsReady: false,
  assetsFailed: false,
  input: { ...EMPTY_INPUT },
  events: []
});

export const setAssetStatus = (
  state: GameState,
  assetsReady: boolean,
  assetsFailed: boolean
): GameState => ({ ...state, assetsReady, assetsFailed });

const getDefinition = (id: CharacterId): CharacterDefinition => {
  const definition = CHARACTER_DEFINITIONS.find((item) => item.id === id);
  if (definition === undefined) {
    throw new Error(`Unknown character: ${id}`);
  }
  return definition;
};

const createFighter = (id: CharacterId, isPlayer: boolean): Fighter => ({
  ...getDefinition(id),
  isPlayer,
  x: isPlayer ? 230 : 570,
  y: GROUND_Y,
  vx: 0,
  vy: 0,
  grounded: true,
  crouching: false,
  hp: 100,
  roundWins: 0,
  facing: isPlayer ? 1 : -1,
  attack: null,
  hitstun: 0,
  hitstunElapsed: 0,
  projectileCooldown: 0,
  blocking: false,
  aiAction: 'idle',
  aiFrames: 1
});

const resetFighter = (
  fighter: Fighter,
  x: number,
  facing: -1 | 1
): Fighter => ({
  ...fighter,
  x,
  y: GROUND_Y,
  vx: 0,
  vy: 0,
  grounded: true,
  crouching: false,
  hp: 100,
  facing,
  attack: null,
  hitstun: 0,
  hitstunElapsed: 0,
  projectileCooldown: 0,
  blocking: false,
  aiAction: fighter.isPlayer ? fighter.aiAction : 'idle',
  aiFrames: fighter.isPlayer ? fighter.aiFrames : 1
});

const startRound = (state: GameState): GameState => {
  if (state.player === null || state.cpu === null) {
    return state;
  }

  return {
    ...state,
    player: resetFighter(state.player, 230, 1),
    cpu: resetFighter(state.cpu, 570, -1),
    projectiles: [],
    hitSparks: [],
    guardEffects: [],
    hitStopFrames: 0,
    roundPhase: 'intro',
    phaseFrames: INTRO_FRAMES,
    timeFrames: ROUND_TIME_FRAMES,
    roundEnd: null
  };
};

export const getInitialCpuIndex = (playerIndex: number): number =>
  (playerIndex + 1) % CHARACTER_DEFINITIONS.length;

export const stepCpuIndex = (
  currentIndex: number,
  playerIndex: number,
  direction: -1 | 1
): number => {
  const length = CHARACTER_DEFINITIONS.length;
  let next = (currentIndex + direction + length) % length;
  if (next === playerIndex) {
    next = (next + direction + length) % length;
  }
  return next;
};

const beginMatch = (state: GameState): GameState => {
  const playerDefinition = CHARACTER_DEFINITIONS[state.selectedIndex];
  const cpuDefinition = CHARACTER_DEFINITIONS[state.cpuSelectedIndex];
  if (
    playerDefinition === undefined ||
    cpuDefinition === undefined ||
    state.cpuSelectedIndex === state.selectedIndex
  ) {
    return state;
  }

  return startRound({
    ...state,
    player: createFighter(playerDefinition.id, true),
    cpu: createFighter(cpuDefinition.id, false),
    roundNumber: 1,
    screen: 'fight'
  });
};

const resetToTitle = (state: GameState): GameState => ({
  ...state,
  screen: 'title',
  player: null,
  cpu: null,
  roundEnd: null,
  projectiles: [],
  hitSparks: [],
  guardEffects: []
});

const inputDirection = (input: InputState): -1 | 0 | 1 => {
  if (input.left === input.right) {
    return 0;
  }
  return input.right ? 1 : -1;
};

export const directionToOpponent = (
  fighter: Fighter,
  opponent: Fighter
): -1 | 1 => {
  if (opponent.x === fighter.x) {
    return fighter.facing;
  }
  return opponent.x > fighter.x ? 1 : -1;
};

export type Hitbox = {
  left: number;
  right: number;
  top: number;
  bottom: number;
};

export const getHitbox = (fighter: Fighter): Hitbox => {
  const height = fighter.crouching ? 65 : 130;
  const width = 54;
  return {
    left: fighter.x - width / 2,
    right: fighter.x + width / 2,
    top: fighter.y - height,
    bottom: fighter.y
  };
};

export const rectanglesOverlap = (first: Hitbox, second: Hitbox): boolean =>
  first.left < second.right &&
  first.right > second.left &&
  first.top < second.bottom &&
  first.bottom > second.top;

export const isGuarding = (
  target: Fighter,
  attacker: Fighter,
  input: InputState
): boolean => {
  if (target.blocking) {
    return true;
  }
  if (!target.isPlayer || target.attack !== null || !target.grounded) {
    return false;
  }
  const awayFromOpponent = -directionToOpponent(target, attacker);
  return inputDirection(input) === awayFromOpponent;
};

const hasProjectileFor = (state: GameState, fighter: Fighter): boolean =>
  state.projectiles.some(
    (projectile) => projectile.owner === fighter.id && projectile.onScreen
  );

const startAttack = (
  state: GameState,
  fighter: Fighter,
  type: AttackType
): boolean => {
  const attack = ATTACKS[type];
  if (
    fighter.attack !== null ||
    fighter.hitstun > 0 ||
    !fighter.grounded ||
    attack === undefined
  ) {
    return false;
  }
  if (
    type === 'projectile' &&
    (fighter.projectileCooldown > 0 || hasProjectileFor(state, fighter))
  ) {
    return false;
  }
  fighter.attack = { type, frame: 0, hasHit: false };
  fighter.crouching = false;
  fighter.blocking = false;
  if (type === 'projectile') {
    fighter.projectileCooldown = 60;
  }
  return true;
};

export const attackIsActive = (attack: AttackState): boolean => {
  const settings = ATTACKS[attack.type];
  return (
    settings !== undefined &&
    attack.frame >= settings.startup &&
    attack.frame < settings.startup + settings.active
  );
};

const getAttackBox = (fighter: Fighter, attack: AttackState): Hitbox | null => {
  const settings = ATTACKS[attack.type];
  if (settings === undefined || attack.type === 'projectile') {
    return null;
  }
  const body = getHitbox(fighter);
  const topOffset = attack.type === 'kick' ? 35 : 15;
  if (fighter.facing === 1) {
    return {
      left: body.left,
      right: body.right + settings.reach,
      top: body.top + topOffset,
      bottom: body.bottom - 18
    };
  }
  return {
    left: body.left - settings.reach,
    right: body.right,
    top: body.top + topOffset,
    bottom: body.bottom - 18
  };
};

const addHitSpark = (state: GameState, x: number, y: number): void => {
  state.hitSparks.push({ x, y, frame: 0 });
};

const addGuardEffect = (state: GameState, x: number, y: number): void => {
  state.guardEffects.push({ x, y, frame: 0 });
};

type HitOptions = {
  attacker: Fighter;
  target: Fighter;
  damage: number;
  contactX: number;
  contactY: number;
  projectileHit: boolean;
};

const applyHit = (state: GameState, options: HitOptions): void => {
  const { attacker, target, damage, contactX, contactY, projectileHit } =
    options;
  const guarding = isGuarding(target, attacker, state.input);
  const finalDamage = guarding ? Math.max(1, Math.floor(damage / 4)) : damage;
  target.hp = Math.max(0, target.hp - finalDamage);
  const away = directionToOpponent(target, attacker) * -1;
  target.x = Math.max(
    MIN_X,
    Math.min(MAX_X, target.x + away * (guarding ? 4 : 6))
  );

  if (guarding) {
    addGuardEffect(state, contactX, contactY);
    state.events.push('guard');
  } else {
    target.hitstun = 12;
    target.hitstunElapsed = 0;
    target.attack = null;
    target.blocking = false;
    addHitSpark(state, contactX, contactY);
    state.events.push('hit');
  }

  if (!projectileHit && attacker.attack !== null) {
    attacker.attack.hasHit = true;
  }
  state.hitStopFrames = HITSTOP_FRAMES;
};

const spawnProjectile = (state: GameState, fighter: Fighter): void => {
  const direction = fighter.facing;
  state.projectiles.push({
    owner: fighter.id,
    x: fighter.x + direction * 38,
    y: fighter.y - 94,
    vx: direction * 6,
    frame: 0,
    onScreen: true
  });
  state.events.push('projectile');
};

const circleTouchesRectangle = (
  circle: { x: number; y: number; radius: number },
  rectangle: Hitbox
): boolean => {
  const closestX = Math.max(
    rectangle.left,
    Math.min(circle.x, rectangle.right)
  );
  const closestY = Math.max(
    rectangle.top,
    Math.min(circle.y, rectangle.bottom)
  );
  const dx = circle.x - closestX;
  const dy = circle.y - closestY;
  return dx * dx + dy * dy <= circle.radius * circle.radius;
};

const getFighter = (state: GameState, id: CharacterId): Fighter | null => {
  if (state.player?.id === id) {
    return state.player;
  }
  if (state.cpu?.id === id) {
    return state.cpu;
  }
  return null;
};

const resolveAttacks = (
  state: GameState,
  attacker: Fighter,
  target: Fighter
): void => {
  const attack = attacker.attack;
  if (attack === null) {
    return;
  }
  const settings = ATTACKS[attack.type];
  if (settings === undefined) {
    return;
  }

  if (attack.type === 'projectile') {
    if (attack.frame === settings.startup && !attack.hasHit) {
      spawnProjectile(state, attacker);
      attack.hasHit = true;
    }
    return;
  }

  if (attackIsActive(attack) && !attack.hasHit) {
    const box = getAttackBox(attacker, attack);
    const targetBox = getHitbox(target);
    if (box !== null && rectanglesOverlap(box, targetBox)) {
      const contactX = attacker.x + attacker.facing * 32;
      const contactY =
        (Math.max(box.top, targetBox.top) +
          Math.min(box.bottom, targetBox.bottom)) /
        2;
      applyHit(state, {
        attacker,
        target,
        damage: settings.damage,
        contactX,
        contactY,
        projectileHit: false
      });
    }
  }
};

const chooseCpuAction = (state: GameState, random: () => number): CpuAction => {
  if (state.player === null || state.cpu === null) {
    return 'idle';
  }
  const distance = Math.abs(state.player.x - state.cpu.x);
  const playerId = state.player.id;
  const cpuX = state.cpu.x;
  const incomingProjectile = state.projectiles.some(
    (projectile) =>
      projectile.owner === playerId &&
      projectile.onScreen &&
      Math.abs(projectile.x - cpuX) <= 200
  );
  if (incomingProjectile && random() < CPU_PROBABILITIES.projectileDodge) {
    return 'jump';
  }

  const table =
    distance > 300
      ? CPU_PROBABILITIES.far
      : distance >= 150
        ? CPU_PROBABILITIES.mid
        : CPU_PROBABILITIES.close;
  const roll = random();
  let cumulative = 0;
  for (const [action, probability] of table) {
    cumulative += probability;
    if (roll < cumulative) {
      return action as CpuAction;
    }
  }
  const fallback = table[table.length - 1];
  console.warn('[ANIMAL FIGHTER] CPU probability table did not cover roll.', {
    roll,
    table
  });
  return (fallback?.[0] ?? 'idle') as CpuAction;
};

const updateCpuIntent = (state: GameState, random: () => number): void => {
  if (state.cpu === null) {
    return;
  }
  state.cpu.aiFrames -= 1;
  if (state.cpu.aiFrames <= 0) {
    state.cpu.aiAction = chooseCpuAction(state, random);
    state.cpu.aiFrames = 30 + Math.floor(random() * 21) - 10;
  }
};

const applyGravity = (fighter: Fighter): void => {
  if (fighter.grounded) {
    fighter.vy = 0;
    fighter.y = GROUND_Y;
    return;
  }
  fighter.y += fighter.vy;
  fighter.vy += 0.7;
  if (fighter.y >= GROUND_Y) {
    fighter.y = GROUND_Y;
    fighter.vy = 0;
    fighter.grounded = true;
  }
};

type FighterUpdateOptions = {
  fighter: Fighter;
  opponent: Fighter;
  input: GameInput;
};

const updatePlayer = (
  state: GameState,
  options: FighterUpdateOptions
): void => {
  const { fighter, opponent, input } = options;
  const direction = inputDirection(input);
  fighter.crouching = input.down && fighter.grounded;

  if (
    input.justPressed.has('ArrowUp') &&
    fighter.grounded &&
    !fighter.crouching
  ) {
    fighter.vy = -13;
    fighter.grounded = false;
  }

  if (fighter.grounded && !fighter.crouching) {
    if (input.justPressed.has('KeyZ')) {
      startAttack(state, fighter, 'punch');
    } else if (input.justPressed.has('KeyX')) {
      startAttack(state, fighter, 'kick');
    } else if (input.justPressed.has('KeyC')) {
      startAttack(state, fighter, 'projectile');
    }
  }

  if (fighter.attack === null && !fighter.crouching) {
    fighter.vx = direction * (fighter.grounded ? 3 : 2);
    fighter.x += fighter.vx;
  } else {
    fighter.vx = 0;
  }
  fighter.x = Math.max(MIN_X, Math.min(MAX_X, fighter.x));
  fighter.facing = directionToOpponent(fighter, opponent);
};

const updateCpu = (
  state: GameState,
  fighter: Fighter,
  opponent: Fighter
): void => {
  const action = fighter.aiAction;
  if (action === 'projectile') {
    if (!startAttack(state, fighter, 'projectile')) {
      fighter.aiAction = 'approach';
    }
  } else if (action === 'punch') {
    if (!startAttack(state, fighter, 'punch')) {
      fighter.aiAction = 'approach';
    }
  } else if (action === 'kick') {
    if (!startAttack(state, fighter, 'kick')) {
      fighter.aiAction = 'approach';
    }
  }

  if (action === 'jump' || action === 'jumpForward') {
    if (fighter.grounded) {
      fighter.vy = -13;
      fighter.grounded = false;
    }
  }

  let movement: -1 | 0 | 1 = 0;
  const towardOpponent = directionToOpponent(fighter, opponent);
  if (action === 'approach' || action === 'jumpForward') {
    movement = towardOpponent;
  } else if (action === 'retreat') {
    movement = (towardOpponent * -1) as -1 | 1;
    fighter.blocking = true;
  }

  fighter.vx = movement * (fighter.grounded ? 3 : 2);
  fighter.x = Math.max(MIN_X, Math.min(MAX_X, fighter.x + fighter.vx));
};

const updateFighter = (
  state: GameState,
  options: FighterUpdateOptions
): void => {
  const { fighter, opponent, input } = options;
  fighter.facing = directionToOpponent(fighter, opponent);
  fighter.blocking = false;
  if (fighter.projectileCooldown > 0) {
    fighter.projectileCooldown -= 1;
  }

  if (fighter.hitstun > 0) {
    const away = directionToOpponent(fighter, opponent) * -1;
    if (fighter.hitstunElapsed < 3) {
      fighter.x = Math.max(MIN_X, Math.min(MAX_X, fighter.x + away * 6));
      fighter.hitstunElapsed += 1;
    }
    fighter.hitstun -= 1;
    applyGravity(fighter);
    return;
  }

  if (fighter.attack !== null) {
    applyGravity(fighter);
    return;
  }

  if (fighter.isPlayer) {
    updatePlayer(state, { fighter, opponent, input });
  } else {
    updateCpu(state, fighter, opponent);
  }
  applyGravity(fighter);
};

const resolvePushback = (state: GameState): void => {
  if (state.player === null || state.cpu === null) {
    return;
  }
  const first = getHitbox(state.player);
  const second = getHitbox(state.cpu);
  if (!rectanglesOverlap(first, second)) {
    return;
  }
  const overlap = Math.min(
    first.right - second.left,
    second.right - first.left
  );
  const correction = Math.max(0, overlap / 2);
  if (state.player.x <= state.cpu.x) {
    state.player.x = Math.max(MIN_X, state.player.x - correction);
    state.cpu.x = Math.min(MAX_X, state.cpu.x + correction);
  } else {
    state.player.x = Math.min(MAX_X, state.player.x + correction);
    state.cpu.x = Math.max(MIN_X, state.cpu.x - correction);
  }
};

const updateProjectiles = (state: GameState): void => {
  if (state.player === null || state.cpu === null) {
    return;
  }
  for (const projectile of state.projectiles) {
    projectile.x += projectile.vx;
    projectile.frame += 1;
    projectile.onScreen =
      projectile.x > -30 && projectile.x < CANVAS_WIDTH + 30;
    if (!projectile.onScreen) {
      continue;
    }
    const owner = getFighter(state, projectile.owner);
    const target =
      projectile.owner === state.player.id ? state.cpu : state.player;
    if (owner === null) {
      continue;
    }
    if (
      circleTouchesRectangle(
        { x: projectile.x, y: projectile.y, radius: 12 },
        getHitbox(target)
      )
    ) {
      applyHit(state, {
        attacker: owner,
        target,
        damage: ATTACKS.projectile.damage,
        contactX: projectile.x,
        contactY: projectile.y,
        projectileHit: true
      });
      projectile.onScreen = false;
    }
  }
  state.projectiles = state.projectiles.filter(
    (projectile) => projectile.onScreen
  );
};

const updateEffects = (state: GameState): void => {
  state.hitSparks.forEach((spark) => {
    spark.frame += 1;
  });
  state.guardEffects.forEach((effect) => {
    effect.frame += 1;
  });
  state.hitSparks = state.hitSparks.filter((spark) => spark.frame < 8);
  state.guardEffects = state.guardEffects.filter((effect) => effect.frame < 8);
};

const advanceAttack = (fighter: Fighter): void => {
  if (fighter.attack === null) {
    return;
  }
  const settings = ATTACKS[fighter.attack.type];
  if (settings === undefined) {
    fighter.attack = null;
    return;
  }
  fighter.attack.frame += 1;
  const total = settings.startup + settings.active + settings.recovery;
  if (fighter.attack.frame >= total) {
    fighter.attack = null;
  }
};

const finishRound = (state: GameState, kind: 'ko' | 'timeout'): void => {
  if (state.player === null || state.cpu === null || state.roundEnd !== null) {
    return;
  }
  let winner: CharacterId | null = null;
  if (kind === 'timeout') {
    if (state.player.hp > state.cpu.hp) {
      winner = state.player.id;
    } else if (state.cpu.hp > state.player.hp) {
      winner = state.cpu.id;
    }
  } else if (state.player.hp > 0 && state.cpu.hp <= 0) {
    winner = state.player.id;
  } else if (state.cpu.hp > 0 && state.player.hp <= 0) {
    winner = state.cpu.id;
  }

  if (winner === state.player.id) {
    state.player.roundWins += 1;
  } else if (winner === state.cpu.id) {
    state.cpu.roundWins += 1;
  } else {
    state.player.roundWins += 1;
    state.cpu.roundWins += 1;
  }
  state.roundEnd = { kind, winner, frames: KO_FRAMES };
  if (kind === 'ko') {
    state.events.push('ko');
  }
};

const updateRoundEnd = (state: GameState): GameState => {
  if (state.roundEnd === null || state.player === null || state.cpu === null) {
    return state;
  }
  const roundEnd = {
    ...state.roundEnd,
    frames: state.roundEnd.frames - 1
  };
  if (roundEnd.frames > 0) {
    return { ...state, roundEnd };
  }
  if (state.player.roundWins >= 2 || state.cpu.roundWins >= 2) {
    return { ...state, roundEnd, screen: 'result' };
  }
  return startRound({
    ...state,
    roundEnd,
    roundNumber: state.roundNumber + 1
  });
};

const updateFight = (
  state: GameState,
  input: GameInput,
  random: () => number
): GameState => {
  if (state.player === null || state.cpu === null) {
    return state;
  }
  if (state.roundEnd !== null) {
    return updateRoundEnd(state);
  }

  if (state.roundPhase === 'intro' || state.roundPhase === 'fight') {
    state.phaseFrames -= 1;
    if (state.phaseFrames <= 0) {
      if (state.roundPhase === 'intro') {
        state.roundPhase = 'fight';
        state.phaseFrames = INTRO_FRAMES;
      } else {
        state.roundPhase = 'active';
      }
    }
    return state;
  }

  if (state.hitStopFrames > 0) {
    state.hitStopFrames -= 1;
    return state;
  }

  updateCpuIntent(state, random);
  updateFighter(state, { fighter: state.player, opponent: state.cpu, input });
  updateFighter(state, { fighter: state.cpu, opponent: state.player, input });
  resolveAttacks(state, state.player, state.cpu);
  resolveAttacks(state, state.cpu, state.player);
  advanceAttack(state.player);
  advanceAttack(state.cpu);
  updateProjectiles(state);
  resolvePushback(state);
  updateEffects(state);
  state.timeFrames -= 1;

  if (state.player.hp <= 0 || state.cpu.hp <= 0) {
    finishRound(state, 'ko');
  } else if (state.timeFrames <= 0) {
    finishRound(state, 'timeout');
  }
  return state;
};

export type GameAdvanceOptions = {
  random?: () => number;
  backgroundCount?: number;
};

export const advanceGame = (
  state: GameState,
  input: GameInput,
  options: GameAdvanceOptions = {}
): GameState => {
  const random = options.random ?? Math.random;
  const backgroundCount = options.backgroundCount ?? BACKGROUND_COUNT;
  let next = cloneState(state);
  next.input = {
    left: input.left,
    right: input.right,
    up: input.up,
    down: input.down,
    punch: input.punch,
    kick: input.kick,
    projectile: input.projectile,
    confirm: input.confirm
  };

  if (next.screen === 'title') {
    if (input.justPressed.has('Enter') && next.assetsReady) {
      next.screen = 'select';
    }
  } else if (next.screen === 'select') {
    if (input.justPressed.has('ArrowLeft')) {
      next.selectedIndex =
        (next.selectedIndex + CHARACTER_DEFINITIONS.length - 1) %
        CHARACTER_DEFINITIONS.length;
    }
    if (input.justPressed.has('ArrowRight')) {
      next.selectedIndex =
        (next.selectedIndex + 1) % CHARACTER_DEFINITIONS.length;
    }
    if (input.justPressed.has('Enter') && next.assetsReady) {
      next.cpuSelectedIndex = getInitialCpuIndex(next.selectedIndex);
      next.screen = 'cpu-select';
    }
  } else if (next.screen === 'cpu-select') {
    if (input.justPressed.has('ArrowLeft')) {
      next.cpuSelectedIndex = stepCpuIndex(
        next.cpuSelectedIndex,
        next.selectedIndex,
        -1
      );
    }
    if (input.justPressed.has('ArrowRight')) {
      next.cpuSelectedIndex = stepCpuIndex(
        next.cpuSelectedIndex,
        next.selectedIndex,
        1
      );
    }
    if (input.justPressed.has('Enter') && next.assetsReady) {
      next.screen = 'stage-select';
    }
  } else if (next.screen === 'stage-select') {
    if (backgroundCount > 0 && input.justPressed.has('ArrowLeft')) {
      next.backgroundIndex =
        (next.backgroundIndex + backgroundCount - 1) % backgroundCount;
    }
    if (backgroundCount > 0 && input.justPressed.has('ArrowRight')) {
      next.backgroundIndex = (next.backgroundIndex + 1) % backgroundCount;
    }
    if (input.justPressed.has('Enter') && next.assetsReady) {
      next = beginMatch(next);
    }
  } else if (next.screen === 'fight') {
    next = updateFight(next, input, random);
  } else if (next.screen === 'result' && input.justPressed.has('Enter')) {
    next = resetToTitle(next);
  }

  return next;
};

export type CombatPose =
  | 'down'
  | 'punch'
  | 'kick'
  | 'fight'
  | 'jump'
  | 'crouch'
  | 'guard';

export type Pose = 'base' | 'icon' | CombatPose;

export type PoseContext = {
  opponent: Fighter;
  roundEnd: RoundEnd | null;
  guarding: boolean;
};

/**
 * Selects the sprite pose using the gameplay priority order.
 *
 * A KO loser alone uses `down`; attacks take precedence over hitstun, jump,
 * crouch, and guard; hitstun keeps the fighter in the neutral `fight` pose
 * because no separate hurt sprite exists in the asset set.
 */
export const getPoseImagePath = (
  fighter: Fighter,
  context: PoseContext
): CombatPose => {
  let pose: CombatPose = 'fight';
  if (
    context.roundEnd?.kind === 'ko' &&
    context.roundEnd.winner !== null &&
    context.roundEnd.winner !== fighter.id
  ) {
    pose = 'down';
  } else if (
    fighter.attack?.type === 'punch' ||
    fighter.attack?.type === 'projectile'
  ) {
    pose = 'punch';
  } else if (fighter.attack?.type === 'kick') {
    pose = 'kick';
  } else if (fighter.hitstun > 0) {
    pose = 'fight';
  } else if (!fighter.grounded) {
    pose = 'jump';
  } else if (fighter.crouching) {
    pose = 'crouch';
  } else if (context.guarding) {
    pose = 'guard';
  }
  return pose;
};

export const getCharacterImagePath = (_id: CharacterId): Pose => 'base';

export const getCharacterIconPath = (_id: CharacterId): Pose => 'icon';

export type CombatSpriteSpec = {
  height: number | null;
  width: number | null;
  anchor: 'fighter' | 'ground';
};

export const getCombatSpriteSpec = (pose: CombatPose): CombatSpriteSpec => {
  if (pose === 'down') {
    return { height: null, width: 220, anchor: 'ground' };
  }
  if (pose === 'crouch') {
    return { height: 126, width: null, anchor: 'ground' };
  }
  return { height: 180, width: null, anchor: 'fighter' };
};
