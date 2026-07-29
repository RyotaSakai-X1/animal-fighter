import type { FC } from 'react';
import { useAnimalFighter } from './useAnimalFighter';

const CONTROL_KEYS = [
  { key: '← →', label: '移動' },
  { key: '↑', label: 'ジャンプ' },
  { key: '↓', label: 'しゃがみ' },
  { key: 'Z', label: 'パンチ' },
  { key: 'X', label: 'キック' },
  { key: 'C', label: '飛び道具' },
  { key: 'Enter', label: '決定' },
  { key: 'Esc', label: '戻る' }
] as const;

export const AnimalFighter: FC = () => {
  const { canvasRef, canvasError } = useAnimalFighter();

  return (
    <main className='w-full max-w-[900px] rounded-3xl bg-[#111d36] p-4 text-white shadow-2xl shadow-slate-950/30 sm:p-8'>
      <header className='mb-5'>
        <p className='mb-2 text-sm font-semibold uppercase tracking-[0.3em] text-amber-300'>
          対戦型アクション
        </p>
        <h1 className='text-3xl font-bold tracking-tight sm:text-4xl'>
          ANIMAL FIGHTER
        </h1>
        <p className='mt-2 text-sm text-slate-300'>
          ポーズ差分画像で遊ぶ ANIMAL FIGHTER Ver.6
        </p>
      </header>

      <div className='overflow-hidden rounded-xl border-4 border-slate-600 bg-slate-900 shadow-xl shadow-slate-950/40'>
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
      </section>
    </main>
  );
};
