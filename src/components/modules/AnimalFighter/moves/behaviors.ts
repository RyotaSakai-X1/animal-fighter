// 必殺技の挙動カーネル。「その技がどう動くか」をここで型として定義する。
// 実際の適用は logic.ts の applyMoveMotion / resolveAttacks / advanceAttack が行い、
// キャラ別データ（characters/）はこの型のインスタンスを持つだけ。
// 新しい種類の必殺技（上昇技・突進技など）はこのユニオンにメンバーを足して増やす。

export type MoveBehavior =
  | {
      kind: 'projectile';
      // 弾を生成するフレーム（技開始からの相対値）
      spawnFrame: number;
      // 弾の横速度(px/frame)
      speed: number;
      // 弾の発生位置。足元(fighter.y)からの上方向オフセット(px)
      height: number;
      // 弾の発生位置。体の中心から向いている方向へのオフセット(px)
      offsetX: number;
    }
  | {
      kind: 'airborneSpin';
      // 打ち上げ初速(px/frame)。負値が上方向
      riseVelocity: number;
      // 滞空中の前進速度(px/frame)。向いている方向へ進む
      drift: number;
      // 着地硬直(フレーム)。着地を検知してからこの分だけ動けない
      landingRecovery: number;
    };
