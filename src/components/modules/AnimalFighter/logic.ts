// ANIMAL FIGHTER のゲームロジック本体。
// DOM / Canvas に依存しない純関数のみで構成され、唯一の入口 advanceGame() が
// 「現在の状態 + 1フレーム分の入力 → 次の状態」を返す。
// 描画・キー入力・requestAnimationFrame の配線は useAnimalFighter.ts が担当する。
// キャラ別データは characters/、技の挙動は moves/behaviors.ts、
// コマンド入力の認識は moves/commands.ts（Ver.7）。

import {
  CHARACTER_DEFINITIONS,
  getCharacterSpec,
  getMoveSpec,
  getSpecialMove
} from './characters';
import type { CharacterId } from './characters/ids';
import { getAnimationStep } from './moves/animation';
import {
  getChargeDirections,
  matchSpecialCommand,
  updateChargeState
} from './moves/commands';
import type {
  CharacterDefinition,
  CommandDirection,
  CpuAction,
  MoveSpec
} from './moves/types';

export { CHARACTER_DEFINITIONS, CHARACTER_IDS } from './characters';
export type { CharacterId } from './characters/ids';
export type {
  CharacterDefinition,
  CpuAction,
  HurtboxSpec,
  MoveSpec,
  SpecialMove
} from './moves/types';

// ----------------------------------------------------------------
// 基本定数（座標は canvas 内部解像度 800x450、時間は 60fps のフレーム数）
// ----------------------------------------------------------------

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
// のけぞり中のずり下がり。技ごとの MoveSpec.knockback とは別に、全ヒット共通で乗る
export const HITSTUN_SLIDE_FRAMES = 3;
export const HITSTUN_SLIDE_PER_FRAME = 6;
export const HITSTUN_SLIDE =
  HITSTUN_SLIDE_FRAMES * HITSTUN_SLIDE_PER_FRAME;
export const BACKGROUND_COUNT = 5;
export const GROUND_SPEED = 3;
// 空中横速度。滞空 ~43F × 2.5 ≒ 横107px 動けるので体幅 54px を余裕を持って飛び越えられる
export const AIR_SPEED = 2.5;
// ジャンプ初速。頂点の高さ ~161px となり、立ち状態の相手（やられ判定の高さ 130px）を
// 足元が確実に越えられる。-13 だと頂点 ~121px で相手の頭に引っかかっていた
export const JUMP_VELOCITY = -15;

// ----------------------------------------------------------------
// 選択画面のグリッド
// キャラクター定義・技のフレームデータ・当たり判定・CPU抽選表は characters/ にある
// ----------------------------------------------------------------

export const SELECT_SLOT_COUNT = 10;
export const SELECT_COLUMNS = 5;

// ----------------------------------------------------------------
// 型定義（ファイター・画面・入力・ゲーム全体の状態）
// ----------------------------------------------------------------

// 技の実体は moveId でキャラのスペックから引く。
// Ver.6 の hasHit が多段ラッチと「弾を生成済みか」を兼用していたので役割ごとに分離した
export type AttackState = {
  moveId: string;
  frame: number;
  hitsLanded: number;
  // 次に当てられるまでの残りフレーム（多段技の間隔）
  hitCooldown: number;
  projectileSpawned: boolean;
  // 空中技の着地硬直の残り。-1 = まだ着地していない
  landingFrames: number;
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
  specialCooldown: number;
  // 溜めコマンドの状態。溜め技を持たないキャラでは常に null / 0
  chargeDirection: CommandDirection | null;
  chargeFrames: number;
  chargeGrace: number;
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
  // 弾は技より長生きするので、発生時のダメージ・削り・押し戻しを持たせる
  damage: number;
  chipDamage: number;
  knockback: number;
  launch: number;
  hitStop: number;
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
  | 'Enter'
  | 'Escape'
  | 'Space';

// 対戦中のポーズメニュー。ラベルと項目数がずれないよう1か所で持つ
export const PAUSE_MENU_ITEMS: readonly string[] = ['再開', 'タイトルへ'];
const PAUSE_MENU_RETURN_TO_TITLE = 1;

export type GameInput = InputState & {
  justPressed: ReadonlySet<GameKey>;
};

export type SoundEvent = 'hit' | 'guard' | 'projectile' | 'ko' | 'charge';

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
  // 対戦中の一時停止。rAF は止めず updateFight を呼ばないことで進行だけ凍らせる
  paused: boolean;
  pauseIndex: number;
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

// ----------------------------------------------------------------
// 状態の生成と複製
// ----------------------------------------------------------------

const cloneFighter = (fighter: Fighter): Fighter => ({
  ...fighter,
  attack: fighter.attack === null ? null : { ...fighter.attack }
});

// advanceGame が毎フレーム最初に呼ぶ複製。events は「そのフレームで起きた効果音イベント」なので空で始める
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
  paused: false,
  pauseIndex: 0,
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

// スペック本体は毎フレーム複製したくないので、必要なときにレジストリから引く
const getDefinition = (id: CharacterId): CharacterDefinition => {
  const { name, color } = getCharacterSpec(id);
  return { id, name, color };
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
  specialCooldown: 0,
  chargeDirection: null,
  chargeFrames: 0,
  chargeGrace: 0,
  blocking: false,
  aiAction: 'idle',
  aiFrames: 1
});

// ラウンド間の初期化。createFighter と違い roundWins を持ち越す
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
  specialCooldown: 0,
  // 溜めはラウンドをまたいで持ち越さない
  chargeDirection: null,
  chargeFrames: 0,
  chargeGrace: 0,
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
    roundEnd: null,
    // ラウンドや試合をまたいでポーズが残らないようにする
    paused: false,
    pauseIndex: 0
  };
};

// ----------------------------------------------------------------
// 選択画面のカーソル操作（CPU 選択は P1 と同じキャラ＝ミラーマッチを避ける）
// ----------------------------------------------------------------

export const getInitialCpuIndex = (playerIndex: number): number =>
  (playerIndex + 1) % CHARACTER_DEFINITIONS.length;

// CPU 選択カーソルを delta 分移動（±1=左右, ±SELECT_COLUMNS=上下）。
// 移動先が P1 と重なる場合は同方向へもう一度進める（上下移動では結果的にその場に留まる）
export const stepCpuIndex = (
  currentIndex: number,
  playerIndex: number,
  delta: number
): number => {
  const length = CHARACTER_DEFINITIONS.length;
  let next = (currentIndex + delta + length) % length;
  if (next === playerIndex) {
    next = (next + delta + length) % length;
  }
  return next;
};

// ステージ選択で決定 → 両ファイターを生成して対戦開始
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
  paused: false,
  pauseIndex: 0,
  projectiles: [],
  hitSparks: [],
  guardEffects: []
});

// ----------------------------------------------------------------
// 当たり判定と幾何ヘルパー
// ----------------------------------------------------------------

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

// やられ判定の矩形。寸法はキャラごと（characters/<id>/index.ts の hurtbox）
export const getHitbox = (fighter: Fighter): Hitbox => {
  const { width, height, crouchHeight } = getCharacterSpec(fighter.id).hurtbox;
  const currentHeight = fighter.crouching ? crouchHeight : height;
  return {
    left: fighter.x - width / 2,
    right: fighter.x + width / 2,
    top: fighter.y - currentHeight,
    bottom: fighter.y
  };
};

export const rectanglesOverlap = (first: Hitbox, second: Hitbox): boolean =>
  first.left < second.right &&
  first.right > second.left &&
  first.top < second.bottom &&
  first.bottom > second.top;

// ガード判定。プレイヤーは「地上で相手と逆方向に入力」、CPU は retreat 中の blocking フラグ
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

// ----------------------------------------------------------------
// 攻撃システム（開始条件 → 発生/持続/硬直の進行 → ヒット解決）
// ----------------------------------------------------------------

const hasProjectileFor = (state: GameState, fighter: Fighter): boolean =>
  state.projectiles.some(
    (projectile) => projectile.owner === fighter.id && projectile.onScreen
  );

// 攻撃を開始できたら true。攻撃中・硬直中・空中、必殺技はクールダウン中も不可。
// 飛び道具はさらに自分の弾が画面内に残っていれば不可
const startAttack = (
  state: GameState,
  fighter: Fighter,
  moveId: string
): boolean => {
  const spec = getMoveSpec(fighter.id, moveId);
  if (
    fighter.attack !== null ||
    fighter.hitstun > 0 ||
    !fighter.grounded ||
    spec === undefined
  ) {
    return false;
  }
  const special = getSpecialMove(fighter.id, moveId);
  if (special !== undefined && fighter.specialCooldown > 0) {
    return false;
  }
  if (
    spec.behavior?.kind === 'projectile' &&
    hasProjectileFor(state, fighter)
  ) {
    return false;
  }
  fighter.attack = {
    moveId,
    frame: 0,
    hitsLanded: 0,
    hitCooldown: 0,
    projectileSpawned: false,
    landingFrames: -1
  };
  fighter.crouching = false;
  fighter.blocking = false;
  if (special !== undefined) {
    fighter.specialCooldown = special.cooldown;
  }
  return true;
};

// 攻撃判定が出ている（発生後〜持続終了前の）フレームか
export const attackIsActive = (
  attack: AttackState,
  spec: MoveSpec
): boolean =>
  attack.frame >= spec.startup && attack.frame < spec.startup + spec.active;

// 単発技は1回当てた時点で上限に達するので Ver.6 の hasHit ラッチと同じ挙動になる
const canLandHit = (attack: AttackState, spec: MoveSpec): boolean =>
  attack.hitCooldown === 0 && attack.hitsLanded < spec.maxHits;

// 空中回転技は持続を固定フレームにせず「打ち上がってから着地するまで」とする
const moveIsActive = (fighter: Fighter, spec: MoveSpec): boolean => {
  const attack = fighter.attack;
  if (attack === null) {
    return false;
  }
  const behavior = spec.behavior;
  if (behavior !== null && behavior.kind === 'airborneSpin') {
    return attack.frame >= spec.startup && !fighter.grounded;
  }
  return attackIsActive(attack, spec);
};

// 伸縮する炎は絵と判定を一致させたいので、アニメのコマごとにリーチが変わる。
// 炎が描かれていないコマは 0 で、そのフレームは判定なし
const getMoveReach = (fighter: Fighter, spec: MoveSpec): number => {
  const behavior = spec.behavior;
  if (behavior === null || behavior.kind !== 'extendingFlame') {
    return spec.hitbox.reach;
  }
  const attack = fighter.attack;
  const special = getSpecialMove(fighter.id, spec.id);
  if (attack === null || special === undefined || special.animation === null) {
    return spec.hitbox.reach;
  }
  const step = getAnimationStep(special.animation, attack.frame);
  return behavior.reachByStep[step] ?? 0;
};

// 打撃の攻撃判定矩形。体の矩形を hitbox の設定ぶん広げる。
// maxHits=0 の技は打撃判定を持たない（弾だけで当てる）ので null
const getAttackBox = (fighter: Fighter, spec: MoveSpec): Hitbox | null => {
  if (spec.maxHits === 0) {
    return null;
  }
  const shape = spec.hitbox;
  const reach = getMoveReach(fighter, spec);
  // リーチ0を体の矩形のまま返すと、密着しているだけで当たってしまう
  if (reach <= 0) {
    return null;
  }
  const body = getHitbox(fighter);
  const top = body.top + shape.topOffset;
  const bottom = body.bottom - shape.bottomInset;
  if (shape.spread === 'both') {
    return {
      left: body.left - reach,
      right: body.right + reach,
      top,
      bottom
    };
  }
  if (fighter.facing === 1) {
    return { left: body.left, right: body.right + reach, top, bottom };
  }
  return { left: body.left - reach, right: body.right, top, bottom };
};

const addHitSpark = (state: GameState, x: number, y: number): void => {
  state.hitSparks.push({ x, y, frame: 0 });
};

const addGuardEffect = (state: GameState, x: number, y: number): void => {
  state.guardEffects.push({ x, y, frame: 0 });
};

// ----------------------------------------------------------------
// 根性値（体力が減ると防御力が上がる）
// ----------------------------------------------------------------

// 本家は体力144で残り31から割引が始まるので、144:100 で換算して残り22から。
// これがないと最後の一撃も最初と同じ威力で入り、決着が唐突になる
const DEFENSE_BANDS: readonly { minHp: number; rate: number }[] = [
  { minHp: 22, rate: 1 },
  { minHp: 18, rate: 0.875 },
  { minHp: 15, rate: 0.75 },
  { minHp: 11, rate: 0.625 },
  { minHp: 8, rate: 0.5 },
  { minHp: 4, rate: 0.375 },
  { minHp: 0, rate: 0.25 }
];

// 被弾側の残り体力（ヒット前）から決まるダメージ率
export const getDefenseRate = (hp: number): number => {
  const band = DEFENSE_BANDS.find((entry) => hp >= entry.minHp);
  return band?.rate ?? 0.25;
};

type HitOptions = {
  attacker: Fighter;
  target: Fighter;
  damage: number;
  chipDamage: number;
  knockback: number;
  launch: number;
  hitStop: number;
  contactX: number;
  contactY: number;
  projectileHit: boolean;
};

// ヒット/ガードの共通処理。ガードなら技の削り（通常技は0）+ 小ノックバック、
// 素通しならヒットスタン付与。どちらも根性値で割り引かれる
const applyHit = (state: GameState, options: HitOptions): void => {
  const {
    attacker,
    target,
    damage,
    chipDamage,
    knockback,
    launch,
    hitStop,
    contactX,
    contactY,
    projectileHit
  } = options;
  const guarding = isGuarding(target, attacker, state.input);
  const baseDamage = guarding ? chipDamage : damage;
  // 端数はダメージ側を切り上げる（本家の「割引値としては切り捨て」と同じ）
  const finalDamage =
    baseDamage === 0
      ? 0
      : Math.ceil(baseDamage * getDefenseRate(target.hp));
  target.hp = Math.max(0, target.hp - finalDamage);
  const away = directionToOpponent(target, attacker) * -1;
  // ガードは 2/3（通常技なら 6→4 で Ver.6 と同じ）
  const distance = guarding ? Math.round((knockback * 2) / 3) : knockback;
  target.x = Math.max(MIN_X, Math.min(MAX_X, target.x + away * distance));

  if (guarding) {
    addGuardEffect(state, contactX, contactY);
    state.events.push('guard');
  } else {
    target.hitstun = 12;
    target.hitstunElapsed = 0;
    target.attack = null;
    target.blocking = false;
    // 対空技は相手を巻き上げる。既に浮いている相手にもう一度当たると
    // 速度が入れ直されるので、多段技は当てるほど高く上がる
    if (launch > 0) {
      target.vy = -launch;
      target.grounded = false;
    }
    addHitSpark(state, contactX, contactY);
    state.events.push('hit');
  }

  if (!projectileHit && attacker.attack !== null) {
    const spec = getMoveSpec(attacker.id, attacker.attack.moveId);
    attacker.attack.hitsLanded += 1;
    attacker.attack.hitCooldown = spec?.hitInterval ?? 0;
  }
  state.hitStopFrames = hitStop;
};

// ----------------------------------------------------------------
// 飛び道具とヒット解決
// ----------------------------------------------------------------

const spawnProjectile = (
  state: GameState,
  fighter: Fighter,
  spec: MoveSpec,
  behavior: { speed: number; height: number; offsetX: number }
): void => {
  const direction = fighter.facing;
  state.projectiles.push({
    owner: fighter.id,
    x: fighter.x + direction * behavior.offsetX,
    y: fighter.y - behavior.height,
    vx: direction * behavior.speed,
    frame: 0,
    onScreen: true,
    damage: spec.damage,
    chipDamage: spec.chipDamage,
    knockback: spec.knockback,
    launch: spec.launch,
    hitStop: spec.hitStop
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

// 打撃は canLandHit が許すフレームでヒット判定、飛び道具は発生フレームで弾を生成する
const resolveAttacks = (
  state: GameState,
  attacker: Fighter,
  target: Fighter
): void => {
  const attack = attacker.attack;
  if (attack === null) {
    return;
  }
  const settings = getMoveSpec(attacker.id, attack.moveId);
  if (settings === undefined) {
    return;
  }

  const behavior = settings.behavior;
  if (behavior !== null && behavior.kind === 'projectile') {
    if (attack.frame === behavior.spawnFrame && !attack.projectileSpawned) {
      spawnProjectile(state, attacker, settings, behavior);
      attack.projectileSpawned = true;
    }
    return;
  }

  if (moveIsActive(attacker, settings) && canLandHit(attack, settings)) {
    const box = getAttackBox(attacker, settings);
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
        chipDamage: settings.chipDamage,
        knockback: settings.knockback,
        launch: settings.launch,
        hitStop: settings.hitStop,
        contactX,
        contactY,
        projectileHit: false
      });
    }
  }
};

// ----------------------------------------------------------------
// CPU 思考ルーチン（学習・先読みなしの確率ドリブン）
// ----------------------------------------------------------------

// 次の行動を抽選する。飛び道具が近づいていれば一定確率で回避ジャンプ、
// それ以外は距離帯（far/mid/close）のテーブルからルーレット選択
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
  // 抽選表はキャラごと
  const probabilities = getCharacterSpec(state.cpu.id).cpu;
  if (incomingProjectile && random() < probabilities.projectileDodge) {
    return 'jump';
  }

  const table =
    distance > 300
      ? probabilities.far
      : distance >= 150
        ? probabilities.mid
        : probabilities.close;
  const roll = random();
  let cumulative = 0;
  for (const [action, probability] of table) {
    cumulative += probability;
    if (roll < cumulative) {
      return action;
    }
  }
  const fallback = table[table.length - 1];
  console.warn('[ANIMAL FIGHTER] CPU probability table did not cover roll.', {
    roll,
    table
  });
  return fallback?.[0] ?? 'idle';
};

// 20〜40 フレーム（約0.3〜0.7秒）ごとに行動を再抽選し、決めた行動はその間持続させる
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

// ----------------------------------------------------------------
// ファイターの毎フレーム更新（プレイヤー=キー入力、CPU=aiAction の実行）
// ----------------------------------------------------------------

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

// 通常技は攻撃中に動かない。空中回転技だけ発生フレームで打ち上がり、滞空中は前進する
const applyMoveMotion = (fighter: Fighter): void => {
  const attack = fighter.attack;
  if (attack === null) {
    return;
  }
  const spec = getMoveSpec(fighter.id, attack.moveId);
  const behavior = spec?.behavior;
  if (
    spec === undefined ||
    behavior === undefined ||
    behavior === null ||
    behavior.kind !== 'airborneSpin'
  ) {
    return;
  }
  if (attack.frame === spec.startup && fighter.grounded) {
    fighter.vy = behavior.riseVelocity;
    fighter.grounded = false;
  }
  if (!fighter.grounded) {
    fighter.x = Math.max(
      MIN_X,
      Math.min(MAX_X, fighter.x + fighter.facing * behavior.drift)
    );
  }
};

type FighterUpdateOptions = {
  fighter: Fighter;
  opponent: Fighter;
  input: GameInput;
};

// キー入力を移動・ジャンプ・攻撃開始に変換する
const updatePlayer = (
  state: GameState,
  options: FighterUpdateOptions
): void => {
  const { fighter, input } = options;
  const direction = inputDirection(input);
  fighter.crouching = input.down && fighter.grounded;

  // ジャンプより先に判定して justPressed('ArrowUp') を消費する（ジャンプの暴発防止）。
  // 成立したら startAttack が失敗してもジャンプには落とさない
  const special = matchSpecialCommand(
    fighter,
    getCharacterSpec(fighter.id).specials,
    input
  );
  if (special !== null) {
    startAttack(state, fighter, special.id);
    fighter.vx = 0;
    return;
  }

  if (
    input.justPressed.has('ArrowUp') &&
    fighter.grounded &&
    !fighter.crouching
  ) {
    fighter.vy = JUMP_VELOCITY;
    fighter.grounded = false;
  }

  if (fighter.grounded && !fighter.crouching) {
    if (input.justPressed.has('KeyZ')) {
      startAttack(state, fighter, 'punch');
    } else if (input.justPressed.has('KeyX')) {
      startAttack(state, fighter, 'kick');
    }
  }

  if (fighter.attack === null && !fighter.crouching) {
    fighter.vx = direction * (fighter.grounded ? GROUND_SPEED : AIR_SPEED);
    fighter.x += fighter.vx;
  } else {
    fighter.vx = 0;
  }
  fighter.x = Math.max(MIN_X, Math.min(MAX_X, fighter.x));
};

// 現在の aiAction を実行する。攻撃を開始できなければ approach にフォールバック、
// retreat は後退しながらガード（blocking）になる。移動速度はプレイヤーと同一
const updateCpu = (
  state: GameState,
  fighter: Fighter,
  opponent: Fighter
): void => {
  const action = fighter.aiAction;
  if (action === 'special') {
    // CPU は溜め免除で直接発動する（抽選間隔20〜40Fと cooldown が抑制になる）
    const special = getCharacterSpec(fighter.id).specials[0];
    if (special === undefined || !startAttack(state, fighter, special.id)) {
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
      fighter.vy = JUMP_VELOCITY;
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

  fighter.vx = movement * (fighter.grounded ? GROUND_SPEED : AIR_SPEED);
  fighter.x = Math.max(MIN_X, Math.min(MAX_X, fighter.x + fighter.vx));
};

// プレイヤー/CPU 共通の更新。ヒットスタン中と攻撃モーション中は一切操作できない
// （この制約は CPU にも同じように効く）。
// 振り向きは「接地・非攻撃・非ヒットスタン」のニュートラル時のみ＝
// ジャンプ中・攻撃中は向きを固定し、相手を飛び越えた後は着地の瞬間に正対する（Ver.6）
const updateFighter = (
  state: GameState,
  options: FighterUpdateOptions
): void => {
  const { fighter, opponent, input } = options;
  fighter.blocking = false;
  if (fighter.specialCooldown > 0) {
    fighter.specialCooldown -= 1;
  }

  // 溜めはヒットスタン中・攻撃中でも積む。CPU は入力を持たない＝溜め免除なので対象外
  if (fighter.isPlayer) {
    const charged = updateChargeState(
      fighter,
      input,
      getChargeDirections(getCharacterSpec(fighter.id).specials)
    );
    if (charged) {
      state.events.push('charge');
    }
  }

  if (fighter.hitstun > 0) {
    const away = directionToOpponent(fighter, opponent) * -1;
    if (fighter.hitstunElapsed < HITSTUN_SLIDE_FRAMES) {
      fighter.x = Math.max(
        MIN_X,
        Math.min(MAX_X, fighter.x + away * HITSTUN_SLIDE_PER_FRAME)
      );
      fighter.hitstunElapsed += 1;
    }
    // 空中では減らさない。打ち上げられた相手が滞空の途中で操作可能に戻ると、
    // 浮いたまま切り返せてしまい対空技の意味が無くなる
    if (fighter.grounded) {
      fighter.hitstun -= 1;
    }
    applyGravity(fighter);
    return;
  }

  if (fighter.attack !== null) {
    applyMoveMotion(fighter);
    applyGravity(fighter);
    return;
  }

  if (fighter.isPlayer) {
    updatePlayer(state, { fighter, opponent, input });
  } else {
    updateCpu(state, fighter, opponent);
  }
  applyGravity(fighter);
  if (fighter.grounded && fighter.attack === null) {
    fighter.facing = directionToOpponent(fighter, opponent);
  }
};

// ----------------------------------------------------------------
// フィールド上のオブジェクト更新（体の押し戻し・弾・エフェクト・攻撃の進行）
// ----------------------------------------------------------------

// 2体が重なったら重なり分の半分ずつ左右に押し戻す（めり込み防止）。
// 体当たり判定は両者接地時のみ＝ジャンプ中は相手を飛び越えて裏へ回り込める（Ver.6）。
// 相手の真上に着地した場合もこの処理が着地フレームで左右に分離する
const resolvePushback = (state: GameState): void => {
  if (state.player === null || state.cpu === null) {
    return;
  }
  if (!state.player.grounded || !state.cpu.grounded) {
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

// 弾の移動・被弾判定・画面外の掃除
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
        damage: projectile.damage,
        chipDamage: projectile.chipDamage,
        knockback: projectile.knockback,
        launch: projectile.launch,
        hitStop: projectile.hitStop,
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

// 攻撃モーションを1フレーム進め、発生+持続+硬直を消化したら攻撃終了
const advanceAttack = (fighter: Fighter): void => {
  if (fighter.attack === null) {
    return;
  }
  const settings = getMoveSpec(fighter.id, fighter.attack.moveId);
  if (settings === undefined) {
    fighter.attack = null;
    return;
  }
  const attack = fighter.attack;
  if (attack.hitCooldown > 0) {
    attack.hitCooldown -= 1;
  }

  // 着地するまで frame を進め続け（アニメが回り判定も出続ける）、接地後に着地硬直へ
  const behavior = settings.behavior;
  if (behavior !== null && behavior.kind === 'airborneSpin') {
    if (attack.landingFrames >= 0) {
      attack.landingFrames -= 1;
      if (attack.landingFrames <= 0) {
        fighter.attack = null;
      }
      return;
    }
    attack.frame += 1;
    if (fighter.grounded && attack.frame > settings.startup) {
      attack.landingFrames = behavior.landingRecovery;
    }
    return;
  }

  attack.frame += 1;
  const total = settings.startup + settings.active + settings.recovery;
  if (attack.frame >= total) {
    fighter.attack = null;
  }
};

// ----------------------------------------------------------------
// ラウンド終了と勝敗（2本先取でリザルトへ。引き分け＝同HPタイムアップや相打ちKOは両者に1本）
// ----------------------------------------------------------------

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

// ----------------------------------------------------------------
// 対戦中の1フレーム更新パイプライン
// intro/fight 演出 → ヒットストップ → CPU思考 → 両者更新 → ヒット解決 →
// 攻撃進行 → 弾 → 押し戻し → エフェクト → 残り時間 → KO/タイムアップ判定（この順序が仕様）
// ----------------------------------------------------------------

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

// ----------------------------------------------------------------
// ポーズ
// ----------------------------------------------------------------

// Space でトグルし、ポーズ中は updateFight を呼ばない。
// intro/hitstop/roundEnd と同じく rAF は回したままにする（止めるとオーバーレイも固まり、
// justPressed が溜まって解除の瞬間に暴発する）
const updatePause = (state: GameState, input: GameInput): GameState => {
  if (!state.paused) {
    // KO 演出中は受け付けない（リザルトへの遷移が止まってしまう）
    if (state.roundEnd === null && input.justPressed.has('Space')) {
      state.paused = true;
      state.pauseIndex = 0;
    }
    return state;
  }

  if (input.justPressed.has('Space')) {
    state.paused = false;
    return state;
  }
  const length = PAUSE_MENU_ITEMS.length;
  if (input.justPressed.has('ArrowUp')) {
    state.pauseIndex = (state.pauseIndex + length - 1) % length;
  }
  if (input.justPressed.has('ArrowDown')) {
    state.pauseIndex = (state.pauseIndex + 1) % length;
  }
  if (input.justPressed.has('Enter')) {
    if (state.pauseIndex === PAUSE_MENU_RETURN_TO_TITLE) {
      return resetToTitle(state);
    }
    state.paused = false;
  }
  return state;
};

// ----------------------------------------------------------------
// エントリポイント（画面ごとの入力処理と遷移）
// title → select → cpu-select → stage-select → fight → result。Escape で逆順に戻る
// ----------------------------------------------------------------

// random と backgroundCount を注入可能にしてテストを決定的にする
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
    if (input.justPressed.has('ArrowUp')) {
      next.selectedIndex =
        (next.selectedIndex + CHARACTER_DEFINITIONS.length - SELECT_COLUMNS) %
        CHARACTER_DEFINITIONS.length;
    }
    if (input.justPressed.has('ArrowDown')) {
      next.selectedIndex =
        (next.selectedIndex + SELECT_COLUMNS) % CHARACTER_DEFINITIONS.length;
    }
    if (input.justPressed.has('Escape')) {
      next.screen = 'title';
    } else if (input.justPressed.has('Enter') && next.assetsReady) {
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
    if (input.justPressed.has('ArrowUp')) {
      next.cpuSelectedIndex = stepCpuIndex(
        next.cpuSelectedIndex,
        next.selectedIndex,
        -SELECT_COLUMNS
      );
    }
    if (input.justPressed.has('ArrowDown')) {
      next.cpuSelectedIndex = stepCpuIndex(
        next.cpuSelectedIndex,
        next.selectedIndex,
        SELECT_COLUMNS
      );
    }
    if (input.justPressed.has('Escape')) {
      next.screen = 'select';
    } else if (input.justPressed.has('Enter') && next.assetsReady) {
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
    if (input.justPressed.has('Escape')) {
      next.screen = 'cpu-select';
    } else if (input.justPressed.has('Enter') && next.assetsReady) {
      next = beginMatch(next);
    }
  } else if (next.screen === 'fight') {
    next = updatePause(next, input);
    if (next.screen === 'fight' && !next.paused) {
      next = updateFight(next, input, random);
    }
  } else if (next.screen === 'result' && input.justPressed.has('Enter')) {
    next = resetToTitle(next);
  }

  return next;
};

// スプライト選択は sprites.ts に移動（Ver.7）。互換のため再公開する

export {
  getCharacterIconPath,
  getCharacterImagePath,
  getChargeMeter,
  getCombatSpriteSpec,
  getPoseImagePath,
  getSpecialSpriteFrame,
  getSpecialSpriteSpec
} from './sprites';
export type {
  ChargeMeter,
  CombatPose,
  CombatSpriteSpec,
  Pose,
  PoseContext,
  SpecialSpriteFrame,
  SpecialSpriteSpec
} from './sprites';
