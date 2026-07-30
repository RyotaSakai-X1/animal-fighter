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
  // 立ち相手には上昇時と下降時で2段当たるのが標準（16ダメージ）。全3段が入るのは
  // 相手が空中にいるか高い位置にいる場合で、最大24ダメージ。
  // 春麗のキックが11ダメージ・全体33Fなのに対し、全体77Fで完全無防備な分だけ強い
  damage: 8,
  // 当たるのは上に開いた脚。体の上端より40px上まで伸ばし、左右両側（spread:'both'）に出す。
  // 頂点付近では判定が高すぎて立ち相手には当たらないので、上昇時と下降時に当てる対空技になる。
  // 両側判定が効くのは「相手が自分の背後に来た状態で当てる」場面。ヒットのノックバックで
  // 相手が離れていくため、前進62pxで相手を追い抜く「めくり」は密着や画面端でしか成立しない
  hitbox: { reach: 46, spread: 'both', topOffset: -40, bottomInset: 30 },
  maxHits: 3,
  // ヒットスタン12Fと揃える。相手が復帰した瞬間に次が入る
  hitInterval: 12,
  behavior: {
    kind: 'airborneSpin',
    // 通常ジャンプ -15（頂点161px・滞空43F）に対し、実測で頂点240px・滞空約53F
    riseVelocity: -18,
    // 実測で64px 前進。相手を追い抜くには足りない場面が多いが、
    // 「近づきながら打ち上げる」ぶんの前進はある
    drift: 1.2,
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
