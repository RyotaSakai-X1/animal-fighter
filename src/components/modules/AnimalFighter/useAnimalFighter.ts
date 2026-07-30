import { useEffect, useRef, useState } from 'react';
import {
  MENU_BACKGROUND_URL,
  specialSpriteUrls,
  spriteUrls,
  STAGE_DEFINITIONS,
  titleLogoUrl
} from './assets';
import {
  advanceGame,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  CHARACTER_DEFINITIONS,
  createInitialGameState,
  getCharacterIconPath,
  getCharacterImagePath,
  getChargeMeter,
  getCombatSpriteSpec,
  getPoseImagePath,
  getSpecialSpriteFrame,
  getSpecialSpriteSpec,
  GROUND_Y,
  isGuarding,
  SELECT_COLUMNS,
  SELECT_SLOT_COUNT,
  setAssetStatus,
  type CharacterId,
  type Fighter,
  type GameInput,
  type GameKey,
  type GameScreen,
  type GameState,
  type SoundEvent
} from './logic';

/* Canvas drawing helpers intentionally keep their rendering context arguments together. */
/* eslint-disable max-params */

const COLORS = {
  skyTop: '#75b9d5',
  skyBottom: '#d7e9df',
  health: '#f4d03f',
  healthLost: '#c0392b',
  white: '#fffdf5',
  ink: '#172438'
};

const IMAGE_PATHS = Array.from(
  new Set([
    ...Object.values(spriteUrls).flatMap((sprites) => Object.values(sprites)),
    // キャラ固有の必殺技アニメもここに載せないと Vite がバンドルせず、
    // assetsReady のカウントも合わなくなる
    ...Object.values(specialSpriteUrls).flatMap((moves) =>
      Object.values(moves ?? {}).flat()
    ),
    ...STAGE_DEFINITIONS.map((stage) => stage.url),
    titleLogoUrl
  ])
);

const GAME_KEYS: readonly GameKey[] = [
  'ArrowLeft',
  'ArrowRight',
  'ArrowUp',
  'ArrowDown',
  'KeyZ',
  'KeyX',
  'KeyC',
  'Enter',
  'Escape'
];

const SOUND_SETTINGS: Record<
  SoundEvent,
  {
    type: OscillatorType;
    start: number;
    end: number;
    duration: number;
    volume: number;
  }
> = {
  hit: { type: 'square', start: 180, end: 90, duration: 0.08, volume: 0.08 },
  guard: {
    type: 'triangle',
    start: 280,
    end: 180,
    duration: 0.12,
    volume: 0.07
  },
  projectile: {
    type: 'sine',
    start: 220,
    end: 700,
    duration: 0.2,
    volume: 0.06
  },
  ko: { type: 'sawtooth', start: 180, end: 55, duration: 0.55, volume: 0.1 },
  // 溜め完成の合図。上昇音＝準備完了。溜め直すたびに鳴るので音量は控えめにする
  charge: { type: 'triangle', start: 660, end: 990, duration: 0.09, volume: 0.05 }
};

const isGameKey = (code: string): code is GameKey =>
  GAME_KEYS.includes(code as GameKey);

const getInput = (
  keys: ReadonlySet<GameKey>,
  justPressed: ReadonlySet<GameKey>
): GameInput => ({
  left: keys.has('ArrowLeft'),
  right: keys.has('ArrowRight'),
  up: keys.has('ArrowUp'),
  down: keys.has('ArrowDown'),
  punch: keys.has('KeyZ'),
  kick: keys.has('KeyX'),
  projectile: keys.has('KeyC'),
  confirm: keys.has('Enter'),
  justPressed
});

type DrawImageOptions = {
  height: number | null;
  width: number | null;
  anchorY: number;
  flip: boolean;
};

const getLoadedImage = (
  images: ReadonlyMap<string, HTMLImageElement>,
  path: string
): HTMLImageElement | null => {
  const image = images.get(path);
  if (
    image === undefined ||
    !image.complete ||
    image.naturalWidth === 0 ||
    image.naturalHeight === 0
  ) {
    return null;
  }
  return image;
};

const getSpriteUrl = (
  id: Fighter['id'],
  pose: ReturnType<typeof getCharacterImagePath>
): string => spriteUrls[id][pose];

const drawImageAnchored = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  path: string,
  x: number,
  options: DrawImageOptions
): void => {
  const image = getLoadedImage(images, path);
  if (image === null) {
    return;
  }

  let width = options.width;
  let height = options.height;
  if (width === null && height !== null) {
    width = (image.naturalWidth / image.naturalHeight) * height;
  }
  if (height === null && width !== null) {
    height = (image.naturalHeight / image.naturalWidth) * width;
  }
  if (width === null || height === null) {
    return;
  }

  ctx.save();
  ctx.translate(x, options.anchorY);
  if (options.flip) {
    ctx.scale(-1, 1);
  }
  ctx.drawImage(image, -width / 2, -height, width, height);
  ctx.restore();
};

const drawText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color = COLORS.white,
  align: CanvasTextAlign = 'center',
  maxWidth?: number
): void => {
  ctx.save();
  ctx.font = `700 ${String(size)}px Trebuchet MS, Yu Gothic, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.strokeStyle = '#101827aa';
  ctx.lineWidth = Math.max(2, size / 10);
  ctx.strokeText(text, x, y, maxWidth);
  ctx.fillText(text, x, y, maxWidth);
  ctx.restore();
};

const drawBackground = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  url: string
): void =>
  drawBackgroundInRect(ctx, images, url, {
    x: 0,
    y: 0,
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT
  });

type BackgroundRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const drawBackgroundInRect = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  url: string,
  rect: BackgroundRect
): void => {
  const image = getLoadedImage(images, url);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.width, rect.height);
  ctx.clip();
  if (image === null) {
    const fallback = ctx.createLinearGradient(
      rect.x,
      rect.y,
      rect.x,
      rect.y + rect.height
    );
    fallback.addColorStop(0, COLORS.skyTop);
    fallback.addColorStop(1, COLORS.skyBottom);
    ctx.fillStyle = fallback;
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
    return;
  }
  const scale = Math.max(
    rect.width / image.naturalWidth,
    rect.height / image.naturalHeight
  );
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  ctx.drawImage(
    image,
    rect.x + (rect.width - width) / 2,
    rect.y + (rect.height - height) / 2,
    width,
    height
  );
  ctx.restore();
};

const drawHealthBar = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  fighter: Fighter,
  x: number,
  align: 'left' | 'right'
): void => {
  const width = 300;
  const y = 18;
  ctx.fillStyle = COLORS.healthLost;
  ctx.fillRect(x, y, width, 20);
  ctx.fillStyle = COLORS.health;
  const healthWidth = (width * Math.max(0, fighter.hp)) / 100;
  if (align === 'right') {
    ctx.fillRect(x + width - healthWidth, y, healthWidth, 20);
  } else {
    ctx.fillRect(x, y, healthWidth, 20);
  }
  ctx.strokeStyle = COLORS.white;
  ctx.lineWidth = 3;
  ctx.strokeRect(x, y, width, 20);
  drawImageAnchored(
    ctx,
    images,
    getSpriteUrl(fighter.id, getCharacterIconPath(fighter.id)),
    align === 'left' ? 24 : 776,
    {
      height: 48,
      width: 48,
      anchorY: 52,
      flip: false
    }
  );
  drawText(
    ctx,
    fighter.name,
    align === 'right' ? x + width : x,
    51,
    14,
    COLORS.white,
    align === 'right' ? 'right' : 'left'
  );
  const dotStart = align === 'right' ? x + width - 34 : x + 34;
  for (let index = 0; index < 2; index += 1) {
    ctx.beginPath();
    ctx.arc(
      dotStart + (align === 'right' ? -index * 22 : index * 22),
      73,
      6,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = index < fighter.roundWins ? COLORS.health : '#ffffff42';
    ctx.fill();
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
};

const drawHud = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  state: GameState
): void => {
  if (state.player === null || state.cpu === null) {
    return;
  }
  drawHealthBar(ctx, images, state.player, 52, 'left');
  drawHealthBar(ctx, images, state.cpu, 448, 'right');
  const count = Math.max(0, Math.ceil(state.timeFrames / 60));
  drawText(ctx, String(count).padStart(2, '0'), CANVAS_WIDTH / 2, 35, 26);
  drawText(
    ctx,
    `ROUND ${String(state.roundNumber)}`,
    CANVAS_WIDTH / 2,
    72,
    12,
    COLORS.ink
  );
};

// 足元の溜めゲージ。溜め中は円弧が伸び、完成すると満円＋広がるパルス、
// 完成後は満円が脈打って残る。クールダウン中は暗くする。
// 頭上はガードの弧が使っているので足元に置く（溜め中はしゃがみで背が低い）
const drawChargeMeter = (
  ctx: CanvasRenderingContext2D,
  fighter: Fighter
): void => {
  const meter = getChargeMeter(fighter);
  if (meter === null) {
    return;
  }
  const radius = 26;
  ctx.save();
  ctx.globalAlpha = meter.onCooldown ? 0.25 : 0.85;
  ctx.strokeStyle = meter.color;
  ctx.lineWidth = 4;
  ctx.beginPath();
  if (meter.ready) {
    // 完成後はゆっくり脈打つ満円
    const breath = 1 + Math.sin(meter.pulse * Math.PI) * 0.08;
    ctx.arc(fighter.x, GROUND_Y - 6, radius * breath, 0, Math.PI * 2);
  } else {
    // 真上から時計回りに伸びる円弧
    const start = -Math.PI / 2;
    ctx.arc(
      fighter.x,
      GROUND_Y - 6,
      radius,
      start,
      start + Math.PI * 2 * meter.progress
    );
  }
  ctx.stroke();

  if (meter.ready && meter.pulse < 1) {
    ctx.globalAlpha = (1 - meter.pulse) * 0.7;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fighter.x, GROUND_Y - 6, radius + meter.pulse * 26, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
};

const drawFighter = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  state: GameState,
  fighter: Fighter
): void => {
  const opponent = fighter.isPlayer ? state.cpu : state.player;
  if (opponent === null) {
    return;
  }
  drawChargeMeter(ctx, fighter);

  const guarding = isGuarding(fighter, opponent, state.input);
  const pose = getPoseImagePath(fighter, {
    opponent,
    roundEnd: state.roundEnd,
    guarding
  });
  // 必殺技の専用アニメがあるフレームはそちらを優先する。ただし KO ポーズには譲る
  // （タイムアップで空中必殺技中の敗者が down にならないのを防ぐ）
  const specialFrame = pose === 'down' ? null : getSpecialSpriteFrame(fighter);
  const specialUrl =
    specialFrame === null
      ? undefined
      : specialSpriteUrls[fighter.id]?.[specialFrame.moveId]?.[
          specialFrame.index
        ];
  if (specialFrame !== null && specialUrl !== undefined) {
    const spec = getSpecialSpriteSpec(specialFrame.moveId);
    const anchor = spec.anchor === 'ground' ? GROUND_Y : fighter.y;
    drawImageAnchored(ctx, images, specialUrl, fighter.x, {
      height: spec.height,
      width: spec.width,
      anchorY: anchor + spec.offsetY,
      flip: fighter.facing < 0
    });
    return;
  }

  const sprite = getCombatSpriteSpec(pose);
  const anchorY = sprite.anchor === 'ground' ? GROUND_Y : fighter.y;
  drawImageAnchored(ctx, images, getSpriteUrl(fighter.id, pose), fighter.x, {
    ...sprite,
    anchorY,
    flip: fighter.facing < 0
  });

  if (guarding) {
    ctx.save();
    ctx.strokeStyle = COLORS.white;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(fighter.x, fighter.y - 94, 38, Math.PI * 0.7, Math.PI * 1.3);
    ctx.stroke();
    ctx.restore();
  }
};

const drawProjectiles = (
  ctx: CanvasRenderingContext2D,
  state: GameState
): void => {
  for (const projectile of state.projectiles) {
    const owner =
      state.player?.id === projectile.owner ? state.player : state.cpu;
    if (owner === null) {
      continue;
    }
    for (let index = 5; index >= 1; index -= 1) {
      ctx.globalAlpha = 0.1 + (6 - index) * 0.04;
      ctx.fillStyle = owner.color;
      ctx.beginPath();
      ctx.arc(
        projectile.x - projectile.vx * index * 1.5,
        projectile.y,
        4 + (6 - index),
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    const glow = ctx.createRadialGradient(
      projectile.x - 4,
      projectile.y - 4,
      1,
      projectile.x,
      projectile.y,
      12
    );
    glow.addColorStop(0, COLORS.white);
    glow.addColorStop(0.45, COLORS.white);
    glow.addColorStop(1, owner.color);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(projectile.x, projectile.y, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
};

const drawEffects = (ctx: CanvasRenderingContext2D, state: GameState): void => {
  state.hitSparks.forEach((spark) => {
    const progress = spark.frame / 8;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = COLORS.health;
    ctx.lineWidth = 3;
    for (let index = 0; index < 8; index += 1) {
      const angle = (index * Math.PI) / 4;
      const inner = 5 + progress * 8;
      const outer = 18 + progress * 18;
      ctx.beginPath();
      ctx.moveTo(
        spark.x + Math.cos(angle) * inner,
        spark.y + Math.sin(angle) * inner
      );
      ctx.lineTo(
        spark.x + Math.cos(angle) * outer,
        spark.y + Math.sin(angle) * outer
      );
      ctx.stroke();
    }
    ctx.restore();
  });
  state.guardEffects.forEach((effect) => {
    const progress = effect.frame / 8;
    ctx.save();
    ctx.globalAlpha = 1 - progress;
    ctx.strokeStyle = COLORS.white;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, 12 + progress * 20, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  });
};

const drawRoundOverlay = (
  ctx: CanvasRenderingContext2D,
  state: GameState
): void => {
  if (state.roundEnd !== null) {
    drawText(
      ctx,
      state.roundEnd.kind === 'ko' ? 'K.O.' : 'TIME UP',
      CANVAS_WIDTH / 2,
      205,
      48
    );
    return;
  }
  if (state.roundPhase === 'intro') {
    drawText(
      ctx,
      `ROUND ${String(state.roundNumber)}`,
      CANVAS_WIDTH / 2,
      205,
      42
    );
  } else if (state.roundPhase === 'fight') {
    drawText(ctx, 'FIGHT!', CANVAS_WIDTH / 2, 205, 48, COLORS.health);
  }
};

const drawFight = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  state: GameState
): void => {
  const background =
    STAGE_DEFINITIONS[state.backgroundIndex]?.url ??
    STAGE_DEFINITIONS[0]?.url ??
    MENU_BACKGROUND_URL;
  drawBackground(ctx, images, background);
  drawHud(ctx, images, state);
  if (state.player !== null && state.cpu !== null) {
    drawFighter(ctx, images, state, state.player);
    drawFighter(ctx, images, state, state.cpu);
    drawProjectiles(ctx, state);
    drawEffects(ctx, state);
  }
  drawRoundOverlay(ctx, state);
};

const drawTitle = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  state: GameState
): void => {
  drawBackground(ctx, images, MENU_BACKGROUND_URL);
  ctx.fillStyle = '#10182799';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawImageAnchored(ctx, images, titleLogoUrl, CANVAS_WIDTH / 2, {
    height: null,
    width: 520,
    anchorY: 285,
    flip: false
  });
  if (state.assetsFailed) {
    drawText(
      ctx,
      '画像を読み込めませんでした',
      CANVAS_WIDTH / 2,
      325,
      18,
      '#ffb4a9'
    );
  } else if (!state.assetsReady) {
    drawText(ctx, '画像を読み込み中…', CANVAS_WIDTH / 2, 325, 18);
  } else {
    drawText(ctx, 'PRESS ENTER', CANVAS_WIDTH / 2, 325, 24);
  }
  drawText(
    ctx,
    '← → SELECT　　Z / X / C ATTACK',
    CANVAS_WIDTH / 2,
    405,
    13,
    '#d7e9df'
  );
};

type CharacterSelectionMode = 'player' | 'cpu';

const drawCharacterSelection = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  state: GameState,
  mode: CharacterSelectionMode
): void => {
  drawBackground(ctx, images, MENU_BACKGROUND_URL);
  ctx.fillStyle = '#101827aa';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawText(
    ctx,
    mode === 'player' ? 'SELECT YOUR FIGHTER' : 'SELECT CPU FIGHTER',
    CANVAS_WIDTH / 2,
    28,
    26
  );
  const columns = SELECT_COLUMNS;
  const slotWidth = 120;
  const slotHeight = 145;
  const gap = 10;
  const gridWidth = columns * slotWidth + (columns - 1) * gap;
  const startX = (CANVAS_WIDTH - gridWidth) / 2;
  CHARACTER_DEFINITIONS.forEach((definition, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = startX + column * (slotWidth + gap) + slotWidth / 2;
    const y = 48 + row * (slotHeight + gap);
    const unavailable = mode === 'cpu' && state.selectedIndex === index;
    const active =
      !unavailable &&
      (mode === 'player'
        ? state.selectedIndex === index
        : state.cpuSelectedIndex === index);
    ctx.fillStyle = active ? '#f4d03f44' : '#10182766';
    ctx.strokeStyle = active ? COLORS.health : '#ffffff66';
    ctx.lineWidth = active ? 4 : 2;
    ctx.fillRect(x - slotWidth / 2, y, slotWidth, slotHeight);
    ctx.strokeRect(x - slotWidth / 2, y, slotWidth, slotHeight);
    drawImageAnchored(
      ctx,
      images,
      getSpriteUrl(definition.id, getCharacterIconPath(definition.id)),
      x,
      {
        height: 96,
        width: 96,
        anchorY: y + 103,
        flip: false
      }
    );
    drawText(
      ctx,
      definition.name,
      x,
      y + 122,
      12,
      active ? COLORS.health : COLORS.white,
      'center',
      slotWidth - 8
    );
    if (active) {
      drawText(ctx, 'SELECTED', x, y + 138, 10);
    }
    if (unavailable) {
      ctx.fillStyle = '#101827b0';
      ctx.fillRect(x - slotWidth / 2, y, slotWidth, slotHeight);
      drawText(
        ctx,
        'P1',
        x - slotWidth / 2 + 8,
        y + 14,
        11,
        COLORS.health,
        'left'
      );
    }
  });
  for (
    let index = CHARACTER_DEFINITIONS.length;
    index < SELECT_SLOT_COUNT;
    index += 1
  ) {
    const column = index % columns;
    const row = Math.floor(index / columns);
    const x = startX + column * (slotWidth + gap) + slotWidth / 2;
    const y = 48 + row * (slotHeight + gap);
    ctx.fillStyle = '#101827cc';
    ctx.strokeStyle = '#ffffff44';
    ctx.lineWidth = 2;
    ctx.fillRect(x - slotWidth / 2, y, slotWidth, slotHeight);
    ctx.strokeRect(x - slotWidth / 2, y, slotWidth, slotHeight);
    drawText(ctx, '?', x, y + slotHeight / 2, 42, '#ffffff88');
  }
  drawText(
    ctx,
    '←→↑↓ えらぶ　ENTER で決定　ESC で戻る',
    CANVAS_WIDTH / 2,
    435,
    15
  );
};

const drawStageSelection = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  state: GameState
): void => {
  const selectedStage = STAGE_DEFINITIONS[state.backgroundIndex];
  if (selectedStage === undefined) {
    return;
  }
  drawBackground(ctx, images, selectedStage.url);
  ctx.fillStyle = '#10182799';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  drawText(ctx, 'SELECT STAGE', CANVAS_WIDTH / 2, 28, 26);

  const thumbnailWidth = 140;
  const thumbnailHeight = 78;
  const gap = 10;
  const totalWidth =
    thumbnailWidth * STAGE_DEFINITIONS.length +
    gap * (STAGE_DEFINITIONS.length - 1);
  const startX = (CANVAS_WIDTH - totalWidth) / 2;
  STAGE_DEFINITIONS.forEach((stage, index) => {
    const x = startX + index * (thumbnailWidth + gap);
    const y = 92;
    drawBackgroundInRect(ctx, images, stage.url, {
      x,
      y,
      width: thumbnailWidth,
      height: thumbnailHeight
    });
    ctx.strokeStyle =
      state.backgroundIndex === index ? COLORS.health : '#ffffff66';
    ctx.lineWidth = state.backgroundIndex === index ? 4 : 2;
    ctx.strokeRect(x, y, thumbnailWidth, thumbnailHeight);
  });

  drawText(ctx, selectedStage.name, CANVAS_WIDTH / 2, 280, 24, COLORS.health);
  drawText(
    ctx,
    '← → えらぶ　ENTER で決定　ESC で戻る',
    CANVAS_WIDTH / 2,
    435,
    15
  );
};

const drawResult = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  state: GameState
): void => {
  drawBackground(ctx, images, MENU_BACKGROUND_URL);
  ctx.fillStyle = '#101827aa';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (state.player === null || state.cpu === null) {
    return;
  }
  const playerWon = state.player.roundWins > state.cpu.roundWins;
  const winner = playerWon ? state.player : state.cpu;
  drawImageAnchored(
    ctx,
    images,
    getSpriteUrl(winner.id, getCharacterImagePath(winner.id)),
    CANVAS_WIDTH / 2,
    {
      height: 180,
      width: null,
      anchorY: 365,
      flip: false
    }
  );
  drawText(
    ctx,
    playerWon ? 'YOU WIN' : 'YOU LOSE',
    CANVAS_WIDTH / 2,
    105,
    58,
    playerWon ? COLORS.health : '#ffb4a9'
  );
  drawText(
    ctx,
    `${state.player.name}  ${String(state.player.roundWins)} - ${String(state.cpu.roundWins)}  ${state.cpu.name}`,
    CANVAS_WIDTH / 2,
    395,
    18
  );
  drawText(ctx, 'PRESS ENTER TO RETURN', CANVAS_WIDTH / 2, 430, 16);
};

const drawGame = (
  ctx: CanvasRenderingContext2D,
  images: ReadonlyMap<string, HTMLImageElement>,
  state: GameState
): void => {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  if (state.screen === 'title') {
    drawTitle(ctx, images, state);
  } else if (state.screen === 'select') {
    drawCharacterSelection(ctx, images, state, 'player');
  } else if (state.screen === 'cpu-select') {
    drawCharacterSelection(ctx, images, state, 'cpu');
  } else if (state.screen === 'stage-select') {
    drawStageSelection(ctx, images, state);
  } else if (state.screen === 'fight') {
    drawFight(ctx, images, state);
  } else {
    drawResult(ctx, images, state);
  }
};

const getAudioContextConstructor = (): typeof AudioContext | undefined => {
  const windowWithWebkitAudio = window as Window & {
    webkitAudioContext?: typeof AudioContext;
  };
  return window.AudioContext ?? windowWithWebkitAudio.webkitAudioContext;
};

// React 側へ渡す「対戦の見出し情報」。毎フレームの状態は React 境界を越えさせないが、
// 技表の表示にはどのキャラが出ているかだけ必要なので、画面遷移とキャラ確定の
// タイミングだけ setState する（60fps では再描画を起こさない）
export type MatchSummary = {
  screen: GameScreen;
  playerId: CharacterId | null;
  cpuId: CharacterId | null;
};

const EMPTY_MATCH: MatchSummary = {
  screen: 'title',
  playerId: null,
  cpuId: null
};

export const useAnimalFighter = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [canvasError, setCanvasError] = useState(false);
  const [match, setMatch] = useState<MatchSummary>(EMPTY_MATCH);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const ctx = canvas.getContext('2d');
    if (ctx === null) {
      console.error('[ANIMAL FIGHTER] Failed to get 2D context from canvas.');
      setCanvasError(true);
      return;
    }

    const images = new Map<string, HTMLImageElement>();
    const keys = new Set<GameKey>();
    const justPressed = new Set<GameKey>();
    let gameState: GameState = createInitialGameState();
    let loadedAssets = 0;
    let animationId: number | null = null;
    let disposed = false;
    let audioContext: AudioContext | null = null;
    let matchKey = `${EMPTY_MATCH.screen}||`;

    // 値が変わったフレームだけ setState する。ここで毎フレーム呼ぶと
    // 60fps で React ツリーが再描画されてしまうので、必ず差分を見る
    const syncMatchSummary = (state: GameState): void => {
      const playerId = state.player?.id ?? null;
      const cpuId = state.cpu?.id ?? null;
      const key = `${state.screen}|${playerId ?? ''}|${cpuId ?? ''}`;
      if (key === matchKey) {
        return;
      }
      matchKey = key;
      setMatch({ screen: state.screen, playerId, cpuId });
    };

    const updateAssetStatus = (): void => {
      if (loadedAssets === IMAGE_PATHS.length) {
        gameState = setAssetStatus(gameState, true, false);
      }
    };

    IMAGE_PATHS.forEach((path) => {
      const image = new Image();
      image.onload = () => {
        loadedAssets += 1;
        updateAssetStatus();
      };
      image.onerror = () => {
        gameState = setAssetStatus(gameState, false, true);
        console.error(`[ANIMAL FIGHTER] Failed to load image: ${path}`);
      };
      images.set(path, image);
      image.src = path;
    });

    const resumeAudio = (): void => {
      if (audioContext === null) {
        const AudioContextConstructor = getAudioContextConstructor();
        if (AudioContextConstructor === undefined) {
          console.warn('[ANIMAL FIGHTER] WebAudio is not supported.');
          return;
        }
        try {
          audioContext = new AudioContextConstructor();
        } catch (error) {
          console.warn(
            '[ANIMAL FIGHTER] Failed to initialize AudioContext.',
            error
          );
          return;
        }
      }
      if (audioContext.state === 'suspended') {
        audioContext.resume().catch((error: unknown) => {
          console.warn(
            '[ANIMAL FIGHTER] Failed to resume AudioContext.',
            error
          );
        });
      }
    };

    const playSound = (kind: SoundEvent): void => {
      if (audioContext === null || audioContext.state === 'closed') {
        return;
      }
      try {
        const settings = SOUND_SETTINGS[kind];
        const now = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.type = settings.type;
        oscillator.frequency.setValueAtTime(settings.start, now);
        oscillator.frequency.exponentialRampToValueAtTime(
          settings.end,
          now + settings.duration
        );
        gain.gain.setValueAtTime(settings.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + settings.duration);
        oscillator.start(now);
        oscillator.stop(now + settings.duration);
      } catch (error) {
        console.warn(`[ANIMAL FIGHTER] Failed to play sound: ${kind}.`, error);
      }
    };

    const handleKeyDown = (event: KeyboardEvent): void => {
      if (!isGameKey(event.code) || document.activeElement !== canvas) {
        return;
      }
      event.preventDefault();
      resumeAudio();
      if (!keys.has(event.code)) {
        justPressed.add(event.code);
      }
      keys.add(event.code);
    };

    const handleKeyUp = (event: KeyboardEvent): void => {
      if (isGameKey(event.code)) {
        keys.delete(event.code);
      }
    };

    const handleBlur = (): void => {
      keys.clear();
      justPressed.clear();
    };

    const frame = (): void => {
      if (disposed) {
        return;
      }
      const input = getInput(keys, new Set(justPressed));
      gameState = advanceGame(gameState, input, {
        random: Math.random,
        backgroundCount: STAGE_DEFINITIONS.length
      });
      gameState.events.forEach(playSound);
      drawGame(ctx, images, gameState);
      syncMatchSummary(gameState);
      justPressed.clear();
      animationId = window.requestAnimationFrame(frame);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    frame();

    return () => {
      disposed = true;
      if (animationId !== null) {
        window.cancelAnimationFrame(animationId);
      }
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
      keys.clear();
      justPressed.clear();
      images.clear();
      if (audioContext !== null) {
        audioContext.close().catch((error: unknown) => {
          console.warn('[ANIMAL FIGHTER] Failed to close AudioContext.', error);
        });
      }
    };
  }, []);

  return { canvasRef, canvasError, match };
};
