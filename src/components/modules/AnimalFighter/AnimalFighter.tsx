import type { FC } from 'react';
import { getCharacterSpec, getMoveList } from './characters';
import type { CharacterId } from './characters/ids';
import type { CommandToken } from './moves/commands';
import { useAnimalFighter } from './useAnimalFighter';

// キャラ固有の必殺技コマンドはここに書かない（MoveListPanel で見せる）
const CONTROL_KEYS = [
  { key: '← →', label: '移動' },
  { key: '↑', label: 'ジャンプ' },
  { key: '↓', label: 'しゃがみ' },
  { key: 'Z', label: 'パンチ' },
  { key: 'X', label: 'キック' },
  { key: 'C', label: '必殺技' },
  { key: 'Enter', label: '決定' },
  { key: 'Esc', label: '戻る' }
] as const;

// コマンドはキーを1つずつチップで出す（1本の文字列だと読みづらい）
const CommandTokenView: FC<{ token: CommandToken }> = ({ token }) => {
  if (token.kind === 'then') {
    return <span className='text-[11px] text-slate-500'>→</span>;
  }
  if (token.kind === 'plus') {
    return <span className='text-[11px] font-bold text-slate-500'>+</span>;
  }
  return (
    <span className='inline-flex items-center gap-0.5'>
      <kbd className='inline-block min-w-[22px] rounded border border-slate-600 bg-slate-900 px-1.5 py-0.5 text-center text-xs font-bold text-amber-200'>
        {token.label}
      </kbd>
      {token.note !== null && (
        <span className='text-[10px] text-slate-400'>{token.note}</span>
      )}
    </span>
  );
};

type MoveListPanelProps = {
  id: CharacterId | null;
  side: 'player' | 'cpu';
  className?: string;
};

// 対戦中に出る技表。中身は CharacterSpec から組み立てる
export const MoveListPanel: FC<MoveListPanelProps> = ({
  id,
  side,
  className
}) => {
  if (id === null) {
    return null;
  }
  const spec = getCharacterSpec(id);
  const moves = getMoveList(id);

  return (
    <aside
      className={`rounded-2xl bg-slate-800/70 p-3 ${className ?? ''}`}
      aria-label={`${spec.name} の技一覧`}
    >
      <p className='mb-1 text-[11px] font-bold uppercase tracking-widest text-slate-400'>
        {side === 'player' ? '1P' : 'CPU'}
      </p>
      <p
        className='mb-2 text-sm font-bold leading-tight'
        style={{ color: spec.color }}
      >
        {spec.name}
      </p>
      <ul className='space-y-2'>
        {moves.map((move) => (
          <li key={move.id}>
            <div className='flex items-baseline justify-between gap-2'>
              <span className='text-[13px] font-semibold leading-tight text-slate-200'>
                {move.name}
              </span>
              <span className='shrink-0 text-[11px] tabular-nums text-slate-400'>
                {move.damage}
              </span>
            </div>
            <div
              className='mt-1 flex flex-wrap items-center gap-x-1 gap-y-1'
              aria-label={move.commandText}
            >
              {move.command.map((token, index) => (
                <CommandTokenView
                  key={`${move.id}-${String(index)}`}
                  token={token}
                />
              ))}
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
};

export const AnimalFighter: FC = () => {
  const { canvasRef, canvasError, match } = useAnimalFighter();
  const inMatch = match.screen === 'fight' || match.screen === 'result';

  return (
    <main className='w-full max-w-[1240px] rounded-3xl bg-[#111d36] p-4 text-white shadow-2xl shadow-slate-950/30 sm:p-8'>
      <header className='mb-5'>
        <p className='mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-amber-300'>
          対戦型アクション
        </p>
        <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
          ANIMAL FIGHTER
        </h1>
        <p className='mt-2 text-sm text-slate-300'>
          ポーズ差分画像で遊ぶ ANIMAL FIGHTER Ver.7
        </p>
      </header>

      {/* 列は常に確保して、対戦開始時に canvas の幅が変わらないようにする */}
      <div className='flex items-start justify-center gap-3'>
        <div
          className={`hidden w-[176px] shrink-0 lg:block ${inMatch ? '' : 'invisible'}`}
        >
          <MoveListPanel id={match.playerId} side='player' />
        </div>

        <div className='min-w-0 flex-1 overflow-hidden rounded-xl border-4 border-slate-600 bg-slate-900 shadow-xl shadow-slate-950/40'>
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            className='block h-auto w-full'
            tabIndex={0}
            onPointerDown={(event) => event.currentTarget.focus()}
            aria-label='ANIMAL FIGHTER のゲーム画面'
          />
        </div>

        <div
          className={`hidden w-[176px] shrink-0 lg:block ${inMatch ? '' : 'invisible'}`}
        >
          <MoveListPanel id={match.cpuId} side='cpu' />
        </div>
      </div>

      {/* 狭い画面では canvas の下に並べる */}
      {inMatch && (
        <div className='mt-3 grid grid-cols-2 gap-3 lg:hidden'>
          <MoveListPanel id={match.playerId} side='player' />
          <MoveListPanel id={match.cpuId} side='cpu' />
        </div>
      )}

      {canvasError && (
        <p
          className='mt-4 rounded-lg bg-red-950/70 p-3 text-sm text-red-100'
          role='alert'
        >
          Canvas 2D を利用できないためゲームを表示できません。
        </p>
      )}

      <section className='mt-5 rounded-2xl bg-slate-800/80 p-4'>
        <h2 className='mb-3 text-sm font-bold text-slate-200'>操作方法</h2>
        <ul className='flex flex-wrap gap-2 text-sm text-slate-300'>
          {CONTROL_KEYS.map(({ key, label }) => (
            <li key={key} className='flex items-center gap-2'>
              <kbd className='rounded-md border border-slate-600 bg-slate-900 px-2 py-1 text-xs font-bold text-amber-200'>
                {key}
              </kbd>
              <span>{label}</span>
            </li>
          ))}
        </ul>
        <p className='mt-3 text-xs text-slate-400'>
          キャラごとの必殺技コマンドは、対戦中に画面の左右に出る技表に表示されます。
        </p>
      </section>
    </main>
  );
};
