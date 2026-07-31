// 技とキャラのデータ定義。単位は時間=フレーム(60fps)、距離=canvas内部解像度のpx。

import type { CharacterId } from '../characters/ids';
import type { MoveBehavior } from './behaviors';

// ----------------------------------------------------------------
// 攻撃判定の形
// ----------------------------------------------------------------

// spread: forward=向いている方向のみ / both=左右両方（回転技）
// topOffset は負値なら体より上へ伸びる。bottomInset は下端からの上げ幅
export type HitboxShape = {
  reach: number;
  spread: 'forward' | 'both';
  topOffset: number;
  bottomInset: number;
};

// ----------------------------------------------------------------
// 技
// ----------------------------------------------------------------

// 固有アニメを持つ技は sprites.ts 側で差し替わる
export type MovePose = 'punch' | 'kick' | 'crouch' | 'fight';

export type MoveSpec = {
  id: string;
  name: string;
  pose: MovePose;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  // ガードされたときのダメージ。本家スト2と同じく通常技は 0
  chipDamage: number;
  hitbox: HitboxShape;
  // maxHits=1 が単発技、0 は打撃判定を持たない技（弾だけで当てる）
  maxHits: number;
  hitInterval: number;
  behavior: MoveBehavior | null;
};

export type CommandButton = 'punch' | 'kick' | 'special';
// forward/back は向き相対。左右を絶対で持つと 2P 側を向いた瞬間にコマンドが裏返る
export type CommandDirection =
  | 'up'
  | 'down'
  | 'left'
  | 'right'
  | 'forward'
  | 'back';

// 順次入力（↓↓+C など）を足すときはメンバーと commands.ts の分岐を1つ増やす
export type CommandSpec =
  | { kind: 'buttonOnly'; trigger: CommandButton }
  | {
      kind: 'charge';
      charge: CommandDirection;
      chargeFrames: number;
      trigger: CommandDirection;
      hold: CommandButton;
    };

// interval フレームごとに sequence の順で画像を切り替える。
// sequence が null なら 0..frameCount-1 の並び。loop=false は最終コマで停止する。
// frameCount は画像の枚数なので、sequence の最大値はこれ未満でなければならない
export type AnimationSpec = {
  frameCount: number;
  interval: number;
  sequence: readonly number[] | null;
  loop: boolean;
};

export type SpecialMove = MoveSpec & {
  command: CommandSpec;
  cooldown: number;
  animation: AnimationSpec | null;
};

// ----------------------------------------------------------------
// CPU の行動抽選
// ----------------------------------------------------------------

// 'special' はそのキャラの specials[0] を出す指示（技の中身は抽選表が知らなくてよい）
export type CpuAction =
  | 'approach'
  | 'special'
  | 'idle'
  | 'jumpForward'
  | 'punch'
  | 'kick'
  | 'retreat'
  | 'jump';

export type CpuWeight = readonly [CpuAction, number];

// 距離帯ごとの重み付き抽選テーブル。各表の合計は 1.0。難易度調整はここ
export type CpuProbabilityTable = {
  far: readonly CpuWeight[];
  mid: readonly CpuWeight[];
  close: readonly CpuWeight[];
  projectileDodge: number;
};

// ----------------------------------------------------------------
// キャラクター
// ----------------------------------------------------------------

export type HurtboxSpec = {
  width: number;
  height: number;
  crouchHeight: number;
};

export type CharacterSpec = {
  id: CharacterId;
  name: string;
  color: string;
  hurtbox: HurtboxSpec;
  punch: MoveSpec;
  kick: MoveSpec;
  // 優先度順。コマンドが厳しいものを先に並べ、最初にマッチしたものを発動する
  specials: readonly SpecialMove[];
  cpu: CpuProbabilityTable;
};

// 選択画面とファイター生成が使う最小情報。Fighter がスペック全体を複製しないよう射影する
export type CharacterDefinition = Pick<CharacterSpec, 'id' | 'name' | 'color'>;
