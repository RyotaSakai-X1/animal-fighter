# ANIMAL FIGHTER

ポーズ差分画像で遊ぶブラウザ対戦アクションゲーム（Ver.5）。
React + Vite + Canvas 2D 製。動物たちが 10 キャラ満枠で戦います。

## 遊び方

```bash
npm install
npm run dev
```

ブラウザで表示されたら、ゲーム画面をクリックしてキーボードで操作します。

| キー | 操作 |
| --- | --- |
| ← → | 移動 |
| ↑ | ジャンプ |
| ↓ | しゃがみ |
| Z | パンチ |
| X | キック |
| C | 飛び道具 |
| Enter | 決定 |

画面フロー: タイトル → キャラクター選択（10体）→ CPU キャラ選択（ミラーマッチ禁止）→ ステージ選択 → 対戦。

## 開発

```bash
npm test        # ゲームロジックのユニットテスト（vitest）
npm run build   # 型チェック + プロダクションビルド
npm run preview # ビルド結果の確認
```

ゲーム本体は `src/components/modules/AnimalFighter/` にあります。

- `logic.ts` — 依存ゼロの純粋なゲームロジック（状態遷移・当たり判定・CPU 思考）
- `useAnimalFighter.ts` — Canvas 描画とキー入力を担う React フック
- `assets.ts` — キャラクター/背景画像のビルド時 import
- `AnimalFighter.tsx` — ゲーム画面の React コンポーネント

## 出典

[x-point-1/x-point-1-supervisor](https://github.com/x-point-1/x-point-1-supervisor) PR #1319（ANIMAL FIGHTER Ver.5）からゲーム部分を単体アプリとして切り出したものです。
