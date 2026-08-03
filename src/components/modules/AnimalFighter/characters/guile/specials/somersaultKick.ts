// サマーソルトキック。しゃがみ溜めから宙返りしながら蹴り上げる対空技。
// 本家初代の「サマー」弱: 5→4→2→2→4→26 = 発生5F・攻撃4Fと2Fの2段・着地硬直26F。
// 発生の速さが持ち味なので startup はそのまま 5F にしてある。

import { CHARGE_REQUIRED_FRAMES } from '../../../moves/commands';
import type { SpecialMove } from '../../../moves/types';

export const SOMERSAULT_KICK: SpecialMove = {
  id: 'somersaultKick',
  name: 'サマーソルトキック',
  // アニメが出ない場合の受け皿。溜めはしゃがみ姿勢
  pose: 'crouch',
  // 本家どおり。1以上必須（打ち上げは frame === startup で起きる）
  startup: 5,
  // airborneSpin では持続/硬直を moveIsActive と advanceAttack が判定するので未使用
  active: 0,
  recovery: 0,
  damage: 11,
  chipDamage: 2,
  // 多段なので1段ずつ大きく押すと相手が飛んでいく。通常技と同じに留める
  knockback: 6,
  // 対空技なので当てた相手を巻き上げる。2段とも当たると
  // 1段目で浮いた相手に8F後もう一度かかり、そのぶん高く飛ぶ
  launch: 11,
  // 打ち上げの瞬間を見せたいので通常技(4F)より長く止める
  hitStop: 8,
  // 蹴り上げなので体の上へ大きく張り出す。対空として機能させるための形
  hitbox: { reach: 58, spread: 'forward', topOffset: -50, bottomInset: 20 },
  // 本家も2段（4F と 2F）
  maxHits: 2,
  hitInterval: 8,
  behavior: {
    kind: 'airborneSpin',
    // 滞空 約48F。春麗の -16 より少し高く跳ぶ
    riseVelocity: -17,
    // ほぼその場で回る。春麗のバードキック(3.5)と違い前進する技ではない
    drift: 0.5,
    // 本家初代の着地硬直。対空を外すと手痛く反撃される
    landingRecovery: 26
  },
  command: {
    kind: 'charge',
    charge: 'down',
    chargeFrames: CHARGE_REQUIRED_FRAMES,
    trigger: 'up',
    hold: 'special'
  },
  cooldown: 90,
  // 画像1(溜め) → 2(蹴り上げ) → 2を回して宙返りへ繋ぐ → 3(逆さ) → 4(回転) → 5(着地)。
  // 8コマ×6F=48F で滞空時間とほぼ一致し、着地時には最終コマ（着地絵）で止まる。
  // 地上の溜めと着地も見せたいので airborneOnly は false
  animation: {
    frameCount: 5,
    interval: 6,
    sequence: [0, 1, 1, 1, 2, 3, 4, 4],
    rotationByStep: [0, 0, -60, -120, 0, 0, 0, 0],
    loop: false,
    airborneOnly: false
  }
};
