// スピニングバードキック。逆さまに回転しながら打ち上がり、着地するまで多段で当たる。
//
// 本家（初代）の弱バードキックは 24→5, 17→3, 6→2, 3→1, 3→1, 4→1, 4→2, 7→3, 6→5, 19 で
// 全体約116F・9段だが、体力100・ヒットスタン12F のこのゲームには長すぎるので、
// 「発生10F → 滞空中ずっと回って最大3段 → 着地硬直14F」に詰めている。
// 実測: 全体77F、頂点240px（通常ジャンプは161px）、前進64px。
//
// 持続を固定フレームにせず「滞空中ずっと」にしているのがこの技の要点。固定にすると
// 空中で技が終わって落ちるか、着地して地上で回り続けるかのどちらかが必ず破綻する。
// 副産物として「高く飛べば長く回る＝多く当たる」という性質が付く。

import { CHARGE_REQUIRED_FRAMES } from '../../../moves/commands';
import type { SpecialMove } from '../../../moves/types';

export const SPINNING_BIRD_KICK: SpecialMove = {
  id: 'spinningBirdKick',
  name: 'スピニングバードキック',
  // 地上の溜めモーションと着地硬直はしゃがみポーズ。滞空中は専用の4枚アニメに差し替わる
  pose: 'crouch',
  // 発生は 1 以上でなければならない。打ち上げは applyMoveMotion が
  // frame === startup のフレームで行うので、0 だとそのフレームが来ないまま
  // 着地判定が成立してしまう（airborneSpin 共通の前提。テストで固定してある）
  startup: 10,
  // airborneSpin では持続を moveIsActive が「滞空中ずっと」、硬直を advanceAttack が
  // 「着地してから landingRecovery」で判定するため、この2つは読まれない。
  // MoveSpec 共通の必須フィールドなので 0 で埋めている
  active: 0,
  recovery: 0,
  // 平均2.3段・最大3段（実測。開始距離40〜260pxを10px刻みで試行）。
  // 春麗のキックが11ダメージ・全体33Fなのに対し、全体72Fで完全無防備な分だけ強い
  damage: 7,
  // 多段技なので1段あたりの削りは小さく。全段ガードで3ダメージ
  chipDamage: 1,
  // 当たるのは上に開いた脚。体の上端より40px上まで伸ばし、左右両側（spread:'both'）に出す。
  // 逆さで頭が最下点なので、脚が立ち相手の身体（地上270〜400）に届くのは高度130px以下に
  // いる間だけ。つまり「上昇しながら」「下降しながら」当てる技で、頂点では当たらない
  hitbox: { reach: 56, spread: 'both', topOffset: -40, bottomInset: 30 },
  maxHits: 3,
  // ヒットスタン12Fの半分。相手が硬直から復帰する前に次が入る＝本当の多段になる。
  // 12F にすると当たる高度にいる時間（前後で13F程度）に1段しか入らず、
  // どう頑張っても2段で止まってしまう
  hitInterval: 6,
  behavior: {
    kind: 'airborneSpin',
    // 通常ジャンプ -15（頂点161px・滞空43F）に対し、頂点191px・滞空46F。
    // 「他のジャンプより少し高く」がこのくらい。-18（頂点241px）だと高すぎて、
    // 当たる高度を一瞬で通り抜けてしまう
    riseVelocity: -16,
    // 本家と同じ「低く遠くまで進む技」にするための要。歩き3.0・通常ジャンプの
    // 空中横移動2.5 より速い3.5にして、46Fで164px 進む（通常ジャンプは107px）。
    // 1.2 だと歩きより遅く、その場で浮いているように見えて当たりもしなかった
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
  // 4枚×3F = 12F/回転 = 毎秒5回転
  animation: { frameCount: 4, interval: 3 }
};
