// スプライト選択。描画側 useAnimalFighter.ts から使う純ヘルパーで、
// 「どの画像を、どの大きさで、どこを基準に描くか」だけを決める。
// タイミング（アニメの何枚目か）もここで計算し、レンダラには持たせない。

import { getCharacterSpec, getMoveSpec, getSpecialMove } from './characters';
import type { CharacterId } from './characters/ids';
import type { Fighter, RoundEnd } from './logic';
import {
  CHARGE_PULSE_FRAMES,
  CHARGE_REQUIRED_FRAMES,
  getChargeDirections
} from './moves/commands';

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
 *
 * 攻撃中のポーズは技のスペック（MoveSpec.pose）が決めるので、キャラごとに
 * 技を差し替えてもこの関数を触らずに済む。
 */
export const getPoseImagePath = (
  fighter: Fighter,
  context: PoseContext
): CombatPose => {
  let pose: CombatPose = 'fight';
  const attackPose =
    fighter.attack === null
      ? undefined
      : getMoveSpec(fighter.id, fighter.attack.moveId)?.pose;
  if (
    context.roundEnd?.kind === 'ko' &&
    context.roundEnd.winner !== null &&
    context.roundEnd.winner !== fighter.id
  ) {
    pose = 'down';
  } else if (attackPose !== undefined) {
    pose = attackPose;
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

// ----------------------------------------------------------------
// 必殺技の専用アニメ
// ----------------------------------------------------------------

export type SpecialSpriteFrame = { moveId: string; index: number };

/**
 * 必殺技の専用アニメを描くフレームなら {技id, 画像番号} を返す。null なら
 * 呼び出し側は通常の getPoseImagePath 経路にフォールバックする。
 *
 * 回っているのは滞空中だけで、地上の溜めモーションと着地硬直は通常ポーズ
 * （MoveSpec.pose）に任せる。
 */
export const getSpecialSpriteFrame = (
  fighter: Fighter
): SpecialSpriteFrame | null => {
  const attack = fighter.attack;
  if (attack === null) {
    return null;
  }
  const special = getSpecialMove(fighter.id, attack.moveId);
  if (special === undefined || special.animation === null) {
    return null;
  }
  if (fighter.grounded || attack.frame < special.startup) {
    return null;
  }
  const { frameCount, interval } = special.animation;
  // 発生フレームを 0 起点にする。技の絶対フレームで割ると、離陸した瞬間に
  // 循環の途中（例: 4枚目）が1フレームだけ表示されてしまう
  const spinFrame = attack.frame - special.startup;
  return {
    moveId: attack.moveId,
    index: Math.floor(spinFrame / interval) % frameCount
  };
};

export type SpecialSpriteSpec = CombatSpriteSpec & { offsetY: number };

/**
 * 必殺技アニメの描画サイズ。
 *
 * 逆さスピニングバードキックの画像（386x291）は脚と回転の軌跡が広い範囲を占めるので、
 * 立ちポーズと同じ 180px 高で描くとキャラ自体が一段大きく見えてしまう。
 * 立ち fight.png を 180px 高、回転画像を各サイズで実寸レンダリングして頭の大きさを
 * 見比べた結果、155px 高（幅205px）で立ちポーズと同じ体格に見える。
 *
 * 頭が画像の下端＝身体の最下点なので、bottom-center アンカーを fighter.y に
 * 合わせるだけで位置は合う（オフセット不要）。
 */
export const getSpecialSpriteSpec = (_moveId: string): SpecialSpriteSpec => ({
  height: 155,
  width: null,
  anchor: 'fighter',
  offsetY: 0
});

// ----------------------------------------------------------------
// 溜めゲージ
// ----------------------------------------------------------------

export type ChargeMeter = {
  // 0.0〜1.0 が溜め中、1.0 で完成
  progress: number;
  ready: boolean;
  // 完成した瞬間からの経過フレームを 0.0〜1.0 に正規化した値。
  // 1.0 未満の間だけ広がって消えるパルスを描く
  pulse: number;
  // クールダウン中は暗く描き、「溜まっているのに出ない」状態を見せる
  onCooldown: boolean;
  color: string;
};

/**
 * 足元の溜めゲージの表示値。溜め技を持たないキャラと CPU（溜め免除なので
 * カウンタが動かない）は null＝非表示。
 *
 * 本家 SF2 のタメ技には溜め完了の表示が一切ないが、このゲームでは溜め不足の失敗が
 * 完全に無音（しゃがみがジャンプを抑制するので何も起きない）なので、
 * 何が起きているかを見せるために可視化している。
 */
export const getChargeMeter = (fighter: Fighter): ChargeMeter | null => {
  const spec = getCharacterSpec(fighter.id);
  if (!fighter.isPlayer || getChargeDirections(spec.specials).length === 0) {
    return null;
  }
  if (fighter.chargeFrames === 0) {
    return null;
  }
  const ready = fighter.chargeFrames >= CHARGE_REQUIRED_FRAMES;
  const elapsed = fighter.chargeFrames - CHARGE_REQUIRED_FRAMES;
  return {
    progress: Math.min(1, fighter.chargeFrames / CHARGE_REQUIRED_FRAMES),
    ready,
    pulse: ready ? Math.min(1, elapsed / CHARGE_PULSE_FRAMES) : 1,
    onCooldown: fighter.specialCooldown > 0,
    color: spec.color
  };
};
