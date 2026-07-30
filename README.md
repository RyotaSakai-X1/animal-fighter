<div align="center">

<img src="src/assets/animal-fighter/title-logo.png" alt="ANIMAL FIGHTER" width="480" />

**ポーズ差分画像で遊ぶブラウザ対戦格闘ゲーム（Ver.7）**

React 18 × Vite × TypeScript × Canvas 2D

</div>

---

## 🎮 ゲーム紹介

動物たちのストリートファイト。10体のファイターから1体を選び、CPU との 99 秒 × 2 本先取のラウンド制バトルに挑みます。

- **パンチ・キック・必殺技**。発生・持続・硬直・ダメージ・リーチは**キャラごとに違います**（スト2初代のフレームデータを参考）
- **ガード**は相手と逆方向に入力。**通常技はガードすればダメージ0**で、削られるのは飛び道具などの必殺技だけです（本家スト2と同じ）
- **根性値**: 体力が残り22を切ると、減るほどダメージが割り引かれます（87.5% → 75% → 62.5% → 50% → 37.5% → 25%）。本家スト2は体力144で残り31から割引が始まるので、それを体力100へ換算した表です。終盤が粘るので逆転の余地があります
- **回り込み（Ver.6）**: ジャンプで相手を飛び越えて裏に回れます。着地の瞬間に自動で振り向いて正対
- **必殺技（Ver.7）**: 春麗だけコマンド技の**スピニングバードキック**を持ちます（`↓` を溜めて `C` を押しながら `↑`）。通常ジャンプより高く舞い上がり、逆さに回転しながら着地するまで多段でヒット。溜まり具合は足元のリングゲージで見えます
- CPU は距離に応じて性格が変わる確率ドリブン AI（遠いと接近、近いと打撃、飛び道具は見てから回避、近距離では飛び越えて裏を取る「めくり」も）。抽選表もキャラごとで、CPU 春麗は中〜近距離でバードキックを撃ってきます

## 🐾 ファイター

<table>
  <tr>
    <td align="center"><img src="src/assets/animal-fighter/ryu/icon.png" width="96" /><br/><b>KUMA-RYU</b></td>
    <td align="center"><img src="src/assets/animal-fighter/ken/icon.png" width="96" /><br/><b>KUMA-KEN</b></td>
    <td align="center"><img src="src/assets/animal-fighter/chunli/icon.png" width="96" /><br/><b>KITSUNE CHUN-LI</b></td>
    <td align="center"><img src="src/assets/animal-fighter/honda/icon.png" width="96" /><br/><b>AKITA-DOG HONDA</b></td>
    <td align="center"><img src="src/assets/animal-fighter/zangief/icon.png" width="96" /><br/><b>BURU-DOG ZANGIEF</b></td>
  </tr>
  <tr>
    <td align="center"><img src="src/assets/animal-fighter/guile/icon.png" width="96" /><br/><b>GORILLA GUILE</b></td>
    <td align="center"><img src="src/assets/animal-fighter/dhalsim/icon.png" width="96" /><br/><b>GIBBON DHALSIM</b></td>
    <td align="center"><img src="src/assets/animal-fighter/bison/icon.png" width="96" /><br/><b>BISON BUFFALO</b></td>
    <td align="center"><img src="src/assets/animal-fighter/blanka/icon.png" width="96" /><br/><b>SHISHI BLANKA</b></td>
    <td align="center"><img src="src/assets/animal-fighter/vega/icon.png" width="96" /><br/><b>TIGER VEGA</b></td>
  </tr>
</table>

※ Ver.7 からキャラごとに通常技のフレームデータ・威力・リーチ・やられ判定の大きさが違います。固有の必殺技を持つのは今のところ春麗だけで、他9キャラは共通の飛び道具のままです。

## 🕹️ 操作方法

ゲーム画面をクリックしてフォーカスしてから操作します。

| キー | バトル中 | メニュー |
| --- | --- | --- |
| ← → | 移動（相手と逆方向でガード） | カーソル移動 |
| ↑ | ジャンプ | カーソル移動（上の行へ） |
| ↓ | しゃがみ | カーソル移動（下の行へ） |
| Z | パンチ | — |
| X | キック | — |
| C | 必殺技（他9キャラは飛び道具・春麗は単押しでは出ない） | — |
| Enter | — | 決定 |
| Esc | — | 前の画面に戻る |

キャラ固有の必殺技コマンドは操作説明には書きません（技が増えるほど膨れ上がるため）。対戦中は**画面の左右・各キャラ側の余白に技表**が出て、技名・コマンド・ダメージが一覧で見えます。内容は `CharacterSpec` から組み立てているので、キャラに技を足しても UI は触らずに反映されます。

画面フロー: **タイトル → キャラ選択 → CPU キャラ選択（ミラーマッチ禁止）→ ステージ選択 → 対戦 → リザルト**。Esc で逆順に戻れます。

## 🚀 セットアップ

```bash
pnpm install
pnpm dev        # 開発サーバー起動
pnpm test       # ゲームロジックのユニットテスト（vitest）
pnpm build      # 型チェック + プロダクションビルド
pnpm preview    # ビルド結果の確認
```

## 📁 プロジェクト構成

```
animal-fighter/
├── index.html                        エントリ HTML（#root のみ）
├── vite.config.ts                    Vite + vitest 設定（@ → ./src エイリアス）
├── package.json
├── pnpm-lock.yaml                    依存バージョンの固定（常にコミットする）
└── src/
    ├── main.tsx                      React エントリポイント
    ├── App.tsx                       AnimalFighter を中央配置するだけの薄いラッパー
    ├── index.css                     Tailwind ディレクティブ
    ├── assets/animal-fighter/
    │   ├── title-logo.png            タイトルロゴ
    │   ├── backgrounds/              ステージ背景 5 種
    │   └── <キャラ名>/               キャラごとのポーズ差分画像
    │                                 （icon / fight / punch / kick / jump / crouch / guard / down）
    │       └── spinning-bird-kick/   春麗の必殺技アニメ 4 枚
    └── components/modules/AnimalFighter/
        ├── index.ts                  再エクスポート
        ├── AnimalFighter.tsx         ゲーム画面の React コンポーネント（canvas + 操作説明 UI）
        ├── useAnimalFighter.ts       Canvas 描画・キー入力・rAF ループ（DOM に触るのはここだけ）
        ├── assets.ts                 画像のビルド時 import と URL 解決
        ├── logic.ts                  ⭐ ゲームロジック本体（DOM 非依存の純関数）
        ├── sprites.ts                ポーズ選択・必殺技アニメ・溜めゲージの表示値
        ├── moves/                    技のデータ型・コマンド認識・挙動カーネル
        ├── characters/               キャラごとのフレームデータ・判定・必殺技・CPU抽選表
        └── logic.test.ts             ロジックのユニットテスト（vitest）
```

### アーキテクチャの要点

ロジックと描画が完全に分離されています。`logic.ts` の `advanceGame(state, input, options)` が「現在の状態 + 1フレーム分の入力 → 次の状態」を返す純関数で、`useAnimalFighter.ts` が requestAnimationFrame で毎フレームこれを呼んで canvas に描画します。乱数も外から注入するため、CPU の挙動含めてすべてユニットテストで再現できます。

### logic.ts の中身ガイド

ファイル内はセクションコメント（`// ---- セクション名 ----`）で区切られています。上から順に:

| セクション | 内容 |
| --- | --- |
| 基本定数 | 画面サイズ・ラウンド時間などのゲーム全体の定数 |
| 選択画面のグリッド | 選択スロット数と列数（キャラのデータ自体は `characters/`） |
| 型定義 | ファイター・画面・入力・ゲーム状態の型 |
| 状態の生成と複製 | 初期状態・フレームごとのクローン |
| 選択画面のカーソル操作 | ミラーマッチ回避を含むカーソル移動 |
| 当たり判定と幾何ヘルパー | やられ判定（キャラ別）・矩形交差・ガード判定 |
| 根性値 | 残り体力に応じたダメージ割引（`getDefenseRate`） |
| 攻撃システム | 攻撃の開始条件・攻撃判定の矩形・多段ヒット・ヒット/ガード処理 |
| 飛び道具とヒット解決 | 弾の生成・打撃のヒット判定 |
| CPU 思考ルーチン | 約0.5秒ごとの行動抽選と実行（抽選表はキャラ別） |
| ファイターの毎フレーム更新 | 溜め管理・コマンド判定・入力/CPU行動の反映・物理 |
| フィールド上のオブジェクト更新 | 押し戻し・弾・エフェクト・攻撃モーション進行 |
| ラウンド終了と勝敗 | KO / タイムアップ判定、2本先取 |
| 対戦中の1フレーム更新パイプライン | `updateFight`（処理順が仕様） |
| エントリポイント | `advanceGame`（画面遷移と入力の振り分け） |

### キャラ別データの置き場所（Ver.7）

技のフレームデータ・当たり判定・必殺技・CPU 抽選表はキャラごとに分かれています。1キャラ1フォルダで、固有必殺技は `specials/` に1技1ファイルです。

```
characters/
├── index.ts              レジストリ（getCharacterSpec / getMoveSpec）
├── ids.ts                CharacterId のみ。依存ゼロ（moves/ との相互参照を断つため）
├── shared/               共通ベース（判定・通常技ヘルパー・飛び道具・CPU抽選表）
├── chunli/
│   ├── index.ts          春麗のスペック
│   ├── cpu.ts            固有の CPU 抽選表
│   └── specials/spinningBirdKick.ts
└── <他9キャラ>/index.ts + specials/
moves/
├── types.ts              MoveSpec / SpecialMove / CommandSpec / CharacterSpec
├── commands.ts           溜め状態の管理とコマンド成立判定
└── behaviors.ts          挙動カーネル（projectile / airborneSpin）
sprites.ts                ポーズ選択・必殺技アニメのフレーム番号・溜めゲージ
```

新しい必殺技を足すときは `characters/<id>/specials/<技名>.ts` を作り、`index.ts` の `specials` 配列に並べます（配列順＝コマンド判定の優先度）。挙動が既存の種類で足りない場合だけ `moves/behaviors.ts` にメンバーを追加します。

## 🗺️ ロードマップ

- [x] 選択画面の上下キー移動・Esc で前の画面に戻る
- [x] **Ver.6**: ジャンプで相手を飛び越えて裏へ回り込むサイドスイッチ（振り向きはニュートラル時のみ）+ CPU のめくり行動
- [x] **Ver.7**: キャラごとの必殺技（春麗のスピニングバードキック / 溜めコマンド・多段・4枚アニメ）、キャラ別フレームデータ・当たり判定・CPU 抽選表
- [ ] 残り9キャラの固有必殺技（波動拳・昇龍拳・ソニックブーム・ヨガファイア など）
- [ ] 気功拳を追加して春麗を2技持ちにする（`specials` 配列の優先度判定の実運用）
- [ ] 気絶（ピヨり）値の導入
- [ ] キャラごとの体力差（本家では体力にもキャラ差がある）
- [ ] 固定タイムステップ化（現在は rAF 1回 = 1フレーム前提なので 120Hz 環境では倍速になる）

## 📜 出典

[x-point-1/x-point-1-supervisor](https://github.com/x-point-1/x-point-1-supervisor) PR #1319（ANIMAL FIGHTER Ver.5）からゲーム部分を単体アプリとして切り出したものです。
