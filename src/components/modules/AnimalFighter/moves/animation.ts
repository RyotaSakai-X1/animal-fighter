// 必殺技アニメのコマ送り計算。
// 当たり判定（logic.ts）と描画（sprites.ts）が同じコマ番号を見ないと絵と判定がずれるので、
// どちらからも参照できるここに置く（sprites.ts は logic.ts に依存しているので逆流させられない）。

import type { AnimationSpec } from './types';

const getSequenceLength = (animation: AnimationSpec): number =>
  animation.sequence?.length ?? animation.frameCount;

// 経過フレームから再生順の何番目かを返す。loop=false なら最終コマで止まる
export const getAnimationStep = (
  animation: AnimationSpec,
  elapsed: number
): number => {
  const length = getSequenceLength(animation);
  const step = Math.floor(Math.max(0, elapsed) / animation.interval);
  return animation.loop ? step % length : Math.min(step, length - 1);
};

// 実際に描く画像の番号
export const getAnimationFrameIndex = (
  animation: AnimationSpec,
  elapsed: number
): number => {
  const step = getAnimationStep(animation, elapsed);
  if (animation.sequence === null) {
    return step;
  }
  return animation.sequence[step] ?? 0;
};

// そのコマの回転角（度）。同じ画像を角度違いで使い回す
export const getAnimationRotation = (
  animation: AnimationSpec,
  elapsed: number
): number => {
  if (animation.rotationByStep === null) {
    return 0;
  }
  return animation.rotationByStep[getAnimationStep(animation, elapsed)] ?? 0;
};
