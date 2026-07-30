// 必殺技の挙動カーネル。適用は logic.ts の applyMoveMotion / advanceAttack が行う。
// 新しい種類の技はこのユニオンにメンバーを足す。

export type MoveBehavior =
  | {
      kind: 'projectile';
      spawnFrame: number;
      speed: number;
      // 発生位置。足元からの高さと、体の中心から前方へのオフセット(px)
      height: number;
      offsetX: number;
    }
  | {
      kind: 'airborneSpin';
      // 打ち上げ初速（負値が上方向）と、滞空中の前進速度(px/frame)
      riseVelocity: number;
      drift: number;
      landingRecovery: number;
    };
