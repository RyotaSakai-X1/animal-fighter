// 必殺技のコマンド入力の認識。溜め状態の管理とコマンド成立判定。

import type { Fighter, GameInput, GameKey, InputState } from '../logic';
import type {
  CommandButton,
  CommandDirection,
  CommandSpec,
  SpecialMove
} from './types';

// 本家の溜め技は 55〜60F だが、このゲームでは 40F（0.67秒）で足りる
export const CHARGE_REQUIRED_FRAMES = 40;
// 方向キーを離してからの猶予。↓→↑ と繋ぐと離しが 2〜5F 先行するため
export const CHARGE_GRACE_FRAMES = 10;
// 完成パルスの長さ。上限をこの分伸ばすと「完成からの経過」が専用の状態なしで分かる
export const CHARGE_PULSE_FRAMES = 8;
export const CHARGE_COUNTER_MAX = CHARGE_REQUIRED_FRAMES + CHARGE_PULSE_FRAMES;

// forward/back を facing で実キーへ落としてから引く
type AbsoluteDirection = Extract<
  CommandDirection,
  'up' | 'down' | 'left' | 'right'
>;

const resolveDirection = (
  direction: CommandDirection,
  facing: -1 | 1
): AbsoluteDirection => {
  if (direction === 'forward') {
    return facing === 1 ? 'right' : 'left';
  }
  if (direction === 'back') {
    return facing === 1 ? 'left' : 'right';
  }
  return direction;
};

const DIRECTION_KEYS: Record<AbsoluteDirection, GameKey> = {
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

// 押しっぱなし判定用。special が 'projectile' なのは Ver.6 のフィールド名を引き継いでいる
const BUTTON_HELD: Record<CommandButton, keyof InputState> = {
  punch: 'punch',
  kick: 'kick',
  special: 'projectile'
};

const DIRECTION_HELD: Record<AbsoluteDirection, keyof InputState> = {
  up: 'up',
  down: 'down',
  left: 'left',
  right: 'right'
};

// forward/back は矢印にしない。向きで指すキーが変わるので、'前'/'後ろ' の方が誤解がない
const DIRECTION_LABELS: Record<CommandDirection, string> = {
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
  forward: '前',
  back: '後ろ'
};

const BUTTON_LABELS: Record<CommandButton, string> = {
  punch: 'Z',
  kick: 'X',
  special: 'C'
};

// 技表の表示用トークン。キーを1つずつ <kbd> で出せるよう分解する。
// 区切りは '+' だけにする。'→' は方向キーそのものなので、順次入力の意味で使うと
// 「→を押す」と読めてしまう。順番は key の note（'溜め' など）が表している
export type CommandToken =
  | { kind: 'key'; label: string; note: string | null }
  | { kind: 'plus' };

export const describeCommandTokens = (
  command: CommandSpec
): readonly CommandToken[] => {
  if (command.kind === 'buttonOnly') {
    return [{ kind: 'key', label: BUTTON_LABELS[command.trigger], note: null }];
  }
  return [
    { kind: 'key', label: DIRECTION_LABELS[command.charge], note: '溜め' },
    { kind: 'plus' },
    { kind: 'key', label: BUTTON_LABELS[command.hold], note: null },
    { kind: 'plus' },
    { kind: 'key', label: DIRECTION_LABELS[command.trigger], note: null }
  ];
};

// 読み上げ用の平文。トークンから作るので表示とズレない
export const commandTokensToText = (
  tokens: readonly CommandToken[]
): string =>
  tokens
    .map((token) =>
      token.kind === 'plus' ? '+' : `${token.label}${token.note ?? ''}`
    )
    .join('');

// 溜めカウンタは1本だけなので、別方向を入れ始めたら溜め直しになる
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

// 溜めを1フレーム進め、ちょうど完成したフレームだけ true を返す（呼び出し側がSEを鳴らす）
export const updateChargeState = (
  fighter: Fighter,
  input: InputState,
  directions: readonly CommandDirection[]
): boolean => {
  if (directions.length === 0) {
    return false;
  }
  const held = directions.find(
    (direction) =>
      input[DIRECTION_HELD[resolveDirection(direction, fighter.facing)]]
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
  // 破棄は翌フレームに遅らせる。コマンド判定より前に走るので、同フレームで破棄すると
  // 猶予の最終フレームの入力を取りこぼす
  if (fighter.chargeGrace > 0) {
    fighter.chargeGrace -= 1;
    // 猶予中も上限まで進める。離しても完成パルスが進み切るように
    if (
      fighter.chargeFrames >= CHARGE_REQUIRED_FRAMES &&
      fighter.chargeFrames < CHARGE_COUNTER_MAX
    ) {
      fighter.chargeFrames += 1;
    }
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
    // Ver.6 と同じくしゃがみ中は出ない
    return (
      !fighter.crouching && input.justPressed.has(BUTTON_KEYS[command.trigger])
    );
  }
  // ボタンを押しっぱなしで方向キーを押した瞬間に成立。↓溜めはしゃがみ状態なので除外しない
  return (
    fighter.chargeDirection === command.charge &&
    fighter.chargeFrames >= command.chargeFrames &&
    input[BUTTON_HELD[command.hold]] &&
    input.justPressed.has(
      DIRECTION_KEYS[resolveDirection(command.trigger, fighter.facing)]
    )
  );
};

// specials の並び順＝優先度。最初にマッチしたものを返す
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
