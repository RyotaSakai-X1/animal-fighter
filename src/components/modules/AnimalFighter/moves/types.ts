// 技とキャラクターのデータ定義。キャラ別データ（characters/）とエンジン（logic.ts）の
// 共通語彙になる。数値の単位は時間=フレーム(60fps)、距離=canvas内部解像度のpx。

import type { CharacterId } from '../characters/ids';
import type { MoveBehavior } from './behaviors';

// ----------------------------------------------------------------
// 攻撃判定の形
// ----------------------------------------------------------------

// spread: forward=向いている方向のみ（通常技）/ both=左右両方（回転技）
// topOffset: 体の矩形の上端からの下げ幅。負値なら体より上へ伸びる（頭上に出る判定）
// bottomInset: 体の矩形の下端からの上げ幅
export type HitboxShape = {
  reach: number;
  spread: 'forward' | 'both';
  topOffset: number;
  bottomInset: number;
};

// ----------------------------------------------------------------
// 技
// ----------------------------------------------------------------

// 描画に使うポーズ。固有アニメを持つ技は sprites.ts 側で差し替わる
export type MovePose = 'punch' | 'kick' | 'crouch' | 'fight';

export type MoveSpec = {
  id: string;
  name: string;
  pose: MovePose;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  hitbox: HitboxShape;
  // maxHits=1 / hitInterval=0 が単発技（Ver.6 の hasHit ラッチと同じ挙動）。
  // maxHits=0 は打撃判定を持たない技＝弾だけで当てる飛び道具
  maxHits: number;
  hitInterval: number;
  behavior: MoveBehavior | null;
};

export type CommandButton = 'punch' | 'kick' | 'special';
export type CommandDirection = 'up' | 'down' | 'left' | 'right';

// 必殺技のコマンド。判別可能ユニオンなので、順次入力（↓↓+C など）を足すときは
// メンバーを1つと commands.ts の分岐を1つ増やすだけで済む
export type CommandSpec =
  | { kind: 'buttonOnly'; trigger: CommandButton }
  | {
      kind: 'charge';
      charge: CommandDirection;
      chargeFrames: number;
      trigger: CommandDirection;
      hold: CommandButton;
    };

// ぱらぱら漫画アニメ。interval フレームごとに frameCount 枚を循環させる
export type AnimationSpec = { frameCount: number; interval: number };

export type SpecialMove = MoveSpec & {
  command: CommandSpec;
  cooldown: number;
  animation: AnimationSpec | null;
};

// ----------------------------------------------------------------
// CPU の行動抽選
// ----------------------------------------------------------------

export type CpuAction =
  | 'approach'
  | 'projectile'
  | 'idle'
  | 'jumpForward'
  | 'punch'
  | 'kick'
  | 'retreat'
  | 'jump';

export type CpuWeight = readonly [CpuAction, number];

// プレイヤーとの距離帯ごとの重み付き抽選テーブル。各表の合計は 1.0。
// 難易度・性格の調整はこの数値をいじる
export type CpuProbabilityTable = {
  far: readonly CpuWeight[];
  mid: readonly CpuWeight[];
  close: readonly CpuWeight[];
  projectileDodge: number;
};

// ----------------------------------------------------------------
// キャラクター
// ----------------------------------------------------------------

// やられ判定の寸法。キャラの体格に合わせて調整する
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

// 選択画面とファイター生成が使う最小情報。CharacterSpec の射影で、
// Fighter がスペック全体を抱えて毎フレーム複製されるのを避けるためにこの形で持つ
export type CharacterDefinition = Pick<CharacterSpec, 'id' | 'name' | 'color'>;
