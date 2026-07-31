// ヨガファイヤー。口から炎が伸びて引っ込むまでが一つの流れで、弾は飛ばさない。
// 本家初代は 14F発生 / 39F硬直（弱中強の差なし）の飛び道具だが、
// このゲームでは絵に合わせて「伸びている炎そのものが判定」の置き技にしている。

import { CHARGE_REQUIRED_FRAMES } from '../../../moves/commands';
import type { SpecialMove } from '../../../moves/types';

export const YOGA_FIRE: SpecialMove = {
  id: 'yogaFire',
  name: 'ヨガファイヤー',
  // アニメが出ない硬直中の受け皿。前傾なのでしゃがみが一番近い
  pose: 'crouch',
  // アニメのコマ区切り(6F)に合わせて 12F。本家の 14F 発生に一番近い区切り
  startup: 12,
  // 炎が出ている f12-41。reachByStep の非ゼロ区間とちょうど重なる
  active: 30,
  // 合計60F。本家は 14+39=53F だが、置き判定なので硬直を厚くする
  recovery: 18,
  damage: 10,
  chipDamage: 2,
  // reach は最大値。実際の判定はコマごとに reachByStep から引く。
  // 炎は口の高さの帯だが、しゃがみ(66px)にも当たるよう下端を余らせる
  hitbox: { reach: 317, spread: 'forward', topOffset: 20, bottomInset: 40 },
  maxHits: 1,
  hitInterval: 0,
  behavior: {
    kind: 'extendingFlame',
    // アニメの各コマでの到達距離。画像の実測値（立ち位置から炎の先端まで
    // 0/157/268/343px）から体の半幅26pxを引いた値。
    // getAttackBox が体の端から伸ばすので、引かないと判定が見た目より26px長くなる
    reachByStep: [0, 0, 131, 242, 317, 242, 131, 0]
  },
  command: {
    kind: 'charge',
    charge: 'down',
    chargeFrames: CHARGE_REQUIRED_FRAMES,
    // 向き相対。絶対の左右で持つと 2P 側を向いた瞬間に裏返る
    trigger: 'forward',
    hold: 'special'
  },
  cooldown: 90,
  // 画像1を2コマ分ためてから伸ばし、同じ順で引っ込める（1→2→3→4→3→2→1）。
  // 8コマ×6F = 48F で、残り12Fは画像1のまま硬直
  animation: {
    frameCount: 4,
    interval: 6,
    sequence: [0, 0, 1, 2, 3, 2, 1, 0],
    loop: false
  }
};
