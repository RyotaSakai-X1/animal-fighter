// 必殺技のコマンド入力の認識。溜め状態の管理と、コマンド成立判定の2つを持つ。
// どちらも fighter と入力だけを見るので、ユニットテストから直接叩ける。

import type { Fighter, GameInput, GameKey, InputState } from '../logic';
import type {
  CommandButton,
  CommandDirection,
  CommandSpec,
  SpecialMove
} from './types';

// 溜め時間。本家の溜め技は 55〜60F だが、1ラウンド99秒・体力100 のこのゲームでは
// 40F（0.67秒）でも「溜めた」感触が出て実用に耐える
export const CHARGE_REQUIRED_FRAMES = 40;
// 方向キーを離してから溜めが生き残る猶予。キーボードで ↓→↑ と繋ぐと ↓ の離しが
// ↑ の押しより 2〜5F 先行する（30〜80ms）ので、取りこぼさないよう 10F 確保する。
// 10F では横に 30px しか動けないので「歩いてから必殺技」には転用できない
export const CHARGE_GRACE_FRAMES = 10;
// 溜め完成の瞬間に出すパルス演出の長さ。カウンタの上限をこの分だけ伸ばしておくことで
// 「完成してから何フレーム経ったか」が専用のエフェクト配列なしで分かる
export const CHARGE_PULSE_FRAMES = 8;
export const CHARGE_COUNTER_MAX = CHARGE_REQUIRED_FRAMES + CHARGE_PULSE_FRAMES;

const DIRECTION_KEYS: Record<CommandDirection, GameKey> = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight'
};

const BUTTON_KEYS: Record<CommandButton, GameKey> = {
  punch: 'KeyZ',
  kick: 'KeyX',
  special: 'KeyC'
};

// 押しっぱなし判定に使う InputState のフィールド名。
// special が 'projectile' なのは Ver.6 からのフィールド名を引き継いでいるため
const BUTTON_HELD: Record<CommandButton, keyof InputState> = {
  punch: 'punch',
  kick: 'kick',
  special: 'projectile'
};

const DIRECTION_HELD: Record<CommandDirection, keyof InputState> = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right'
};

// そのキャラが溜めを必要とする方向の一覧。溜めカウンタは1本しか持たないので、
// 別方向を入れ始めたら溜め直しになる
export const getChargeDirections = (
  specials: readonly SpecialMove[]
): readonly CommandDirection[] => {
  const directions: CommandDirection[] = [];
  for (const special of specials) {
    const command = special.command;
    if (command.kind === 'charge' && !directions.includes(command.charge)) {
      directions.push(command.charge);
    }
  }
  return directions;
};

// 溜め状態を1フレーム更新する。溜めが「ちょうど完成した」フレームだけ true を返し、
// 呼び出し側が効果音イベントを積む。攻撃中・ヒットスタン中でも溜め続けられるよう
// updateFighter の early return より前で呼ぶ
export const updateChargeState = (
  fighter: Fighter,
  input: InputState,
  directions: readonly CommandDirection[]
): boolean => {
  if (directions.length === 0) {
    return false;
  }
  const held = directions.find(
    (direction) => input[DIRECTION_HELD[direction]]
  );
  if (held !== undefined) {
    if (fighter.chargeDirection !== held) {
      fighter.chargeDirection = held;
      fighter.chargeFrames = 0;
    }
    fighter.chargeGrace = CHARGE_GRACE_FRAMES;
    if (fighter.chargeFrames >= CHARGE_COUNTER_MAX) {
      return false;
    }
    fighter.chargeFrames += 1;
    return fighter.chargeFrames === CHARGE_REQUIRED_FRAMES;
  }
  // 猶予を1減らすだけで、このフレームの溜めはまだ生きている。溜めの破棄を翌フレームに
  // 遅らせるのが要点。updateChargeState は updatePlayer のコマンド判定より前に走るので、
  // 同じフレームで破棄すると「猶予の最終フレームに入力しても成立しない」ことになる
  if (fighter.chargeGrace > 0) {
    fighter.chargeGrace -= 1;
    return false;
  }
  fighter.chargeFrames = 0;
  fighter.chargeDirection = null;
  return false;
};

const matchesCommand = (
  fighter: Fighter,
  command: CommandSpec,
  input: GameInput
): boolean => {
  if (command.kind === 'buttonOnly') {
    // Ver.6 と同じく、しゃがみ中は単押しの必殺技は出ない
    return (
      !fighter.crouching && input.justPressed.has(BUTTON_KEYS[command.trigger])
    );
  }
  // 溜めコマンド。ボタンを押しっぱなしのまま方向キーを押した瞬間に成立する。
  // しゃがみを条件から外すのは、↓ 溜めがそのまましゃがみ状態になるため
  return (
    fighter.chargeDirection === command.charge &&
    fighter.chargeFrames >= command.chargeFrames &&
    input[BUTTON_HELD[command.hold]] &&
    input.justPressed.has(DIRECTION_KEYS[command.trigger])
  );
};

// コマンドが成立した必殺技を返す。specials の並び順＝優先度で、最初にマッチしたものを採用する
export const matchSpecialCommand = (
  fighter: Fighter,
  specials: readonly SpecialMove[],
  input: GameInput
): SpecialMove | null => {
  for (const special of specials) {
    if (matchesCommand(fighter, special.command, input)) {
      return special;
    }
  }
  return null;
};
