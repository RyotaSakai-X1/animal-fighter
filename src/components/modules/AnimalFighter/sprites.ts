// スプライト選択。どの画像をどの大きさで描くかを決める純ヘルパー。
// アニメのタイミングもここで計算し、レンダラには持たせない。

import { getCharacterSpec, getMoveSpec, getSpecialMove } from './characters';
import type { CharacterId } from './characters/ids';
import type { Fighter, RoundEnd } from './logic';
import { getAnimationFrameIndex } from './moves/animation';
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
 * 攻撃中のポーズは MoveSpec.pose が決めるので、技を差し替えてもここは触らない。
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

// 専用アニメを描くフレームなら {技id, 画像番号} を返す。null なら通常ポーズ経路へ。
// 滞空を要求するのは回転技だけ（地上の溜めと着地硬直は MoveSpec.pose に任せる）。
// 地上技はモーションの頭からアニメを回す
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
  if (special.behavior?.kind === 'airborneSpin') {
    if (fighter.grounded || attack.frame < special.startup) {
      return null;
    }
    // 発生フレームを 0 起点にする（絶対フレームだと離陸直後に循環の途中が1F覗く）
    return {
      moveId: attack.moveId,
      index: getAnimationFrameIndex(
        special.animation,
        attack.frame - special.startup
      )
    };
  }
  return {
    moveId: attack.moveId,
    index: getAnimationFrameIndex(special.animation, attack.frame)
  };
};

// anchorX は画像幅に対する比率で、この列が fighter.x に来る。
// 炎のように片側だけ伸びるスプライトは中心アンカーだと体が逆側へ流れる
export type SpecialSpriteSpec = CombatSpriteSpec & {
  anchorX: number;
  offsetY: number;
};

export const getSpecialSpriteSpec = (moveId: string): SpecialSpriteSpec => {
  // scripts/normalize-sprite-sequence.mjs が出力した 832x324 の4枚に対応する値。
  // 4枚とも立ち位置が同じ列（145/832）・接地が同じ行に揃えてあるので定数1つで足りる
  if (moveId === 'yogaFire') {
    return {
      height: 162,
      width: null,
      anchor: 'ground',
      anchorX: 0.174,
      offsetY: 1
    };
  }
  // 回転画像は脚と軌跡が広いので180px高だと体格が大きく見える（実寸比較で155pxに決めた）。
  // 頭が画像の下端＝最下点なので bottom-center アンカーのままで位置が合う
  return {
    height: 155,
    width: null,
    anchor: 'fighter',
    anchorX: 0.5,
    offsetY: 0
  };
};

// ----------------------------------------------------------------
// 溜めゲージ
// ----------------------------------------------------------------

export type ChargeMeter = {
  progress: number;
  ready: boolean;
  // 完成からの経過を 0.0〜1.0 に正規化。1.0 未満の間だけパルスを描く
  pulse: number;
  onCooldown: boolean;
  color: string;
};

// 足元の溜めゲージの表示値。溜め技を持たないキャラと CPU（溜め免除）は null＝非表示。
// 本家に溜め完了の表示はないが、このゲームでは溜め不足の失敗が完全に無音なので見せる
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
