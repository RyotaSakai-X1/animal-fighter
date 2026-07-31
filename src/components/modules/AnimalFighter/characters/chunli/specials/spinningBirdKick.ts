// スピニングバードキック。逆さに回転しながら低く前進し、着地するまで多段で当たる。
// 実測: 全体74〜82F、頂点191px、前進164px、近距離3段/遠距離1段。

import { CHARGE_REQUIRED_FRAMES } from '../../../moves/commands';
import type { SpecialMove } from '../../../moves/types';

export const SPINNING_BIRD_KICK: SpecialMove = {
  id: 'spinningBirdKick',
  name: 'スピニングバードキック',
  // 地上の溜めと着地硬直はしゃがみポーズ。滞空中は4枚アニメに差し替わる
  pose: 'crouch',
  // 1以上必須。打ち上げは frame === startup のフレームで起きる
  startup: 10,
  // airborneSpin では持続/硬直を moveIsActive と advanceAttack が判定するので未使用
  active: 0,
  recovery: 0,
  damage: 7,
  chipDamage: 1,
  // 上に開いた脚の判定。頭が最下点なので、立ち相手に届くのは高度130px以下の間だけ
  hitbox: { reach: 56, spread: 'both', topOffset: -40, bottomInset: 30 },
  maxHits: 3,
  // ヒットスタン12Fの半分。12Fだと当たる高度にいる13F程度に1段しか入らない
  hitInterval: 6,
  behavior: {
    kind: 'airborneSpin',
    // 通常ジャンプ -15（頂点161px）より少し高い程度に留める
    riseVelocity: -16,
    // 歩き3.0・空中横移動2.5より速くして「低く遠くまで進む技」にする
    drift: 3.5,
    landingRecovery: 14
  },
  command: {
    kind: 'charge',
    charge: 'down',
    chargeFrames: CHARGE_REQUIRED_FRAMES,
    trigger: 'up',
    hold: 'special'
  },
  cooldown: 90,
  // 4枚×3F = 毎秒5回転。着地まで回し続けるので loop
  animation: { frameCount: 4, interval: 3, sequence: null, loop: true }
};
