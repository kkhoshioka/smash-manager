# スマブラSPマネージャー(SMASH LOGGER) プロジェクトコンテキスト

このプロジェクトは、Boss(ユーザー)の秘書AI「ぼたん」(`C:\secretary\CLAUDE.md`のメインスレッド)が2026-09-09に専用スレッド用の下準備をした既存アプリ。このスレッドはメイン秘書スレッドとは別セッションなので、まずこのファイルで概要を把握すること。

## 何のアプリか
スマブラSP(大乱闘スマッシュブラザーズ SPECIAL)の対戦結果を記録・集計するWebアプリ「SMASH LOGGER」。使用ファイター/対戦相手を選んで勝敗を記録し、戦績・対面相性などを見られる。Bossの趣味(スマブラ週1ペース、[[user_daily_schedule]]参照)のためのツール。

## 経緯
- Bossから「スマッシュロガーをちょっと修正したい」と依頼があり、ぼたんが2026-09-09に環境準備。まだ具体的な修正内容の詳細ヒアリングはこれから(このスレッドで直接Bossに聞くこと)。
- 対象は恐らく `src/components/MatchLogger.jsx`(記録画面、654行)だが、要確認。

## 技術構成
- **フロントエンド**: React 19 + Vite 7。`npm run dev`で `http://localhost:5173`。動作確認済み(2026-09-09)。
- **バックエンド**: Vercelのサーバーレス関数(`api/*.js`)。認証はJWT(`api/login.js`, `api/signup.js`)、データ保存はUpstash Redis(KV)を`api/save.js`/`api/load.js`経由で使用。ユーザーごとに`smash_data_<userId>`キーで保存、JST日付ベースの日次バックアップも自動で取ってる(`smash_data_<userId>_backup_<date>`)。
- **管理**: `api/admin.js`が別途存在。

## デプロイについて
- GitHub: `kkhoshioka/smash-manager`(origin/main)
- Vercel: `npx vercel --prod --yes` で本番デプロイ
- **`deploy.ps1`のコミットメッセージは使わないこと。** 過去の特定の変更用に書かれた固定文言("Update UI: Add official Final Destination background...")がそのまま残っており、今の変更内容と関係ない。`git add` → 内容に即したコミットメッセージで`git commit` → `git push` → `npx vercel --prod --yes` を手動で行うこと。
- 他の`deploy_*.ps1`群も同様に、特定の過去タスク用に作られた使い捨てスクリプトの可能性が高いので、中身を確認せずに実行しないこと。
- ces-managerと同様「都度pushの許可を聞かずにcommit→pushまでやる」方針を適用してよいか(CLAUDE.md §⑧参照)は、**このプロジェクトではまだBossに明示的に確認していない**。念のため初回は確認してから進めるとよい。

## 直近の変更履歴(参考)
- アイコン画像を外部CDN(jsdelivr)依存からローカル読み込みに変更(429エラー対策)
- クラウド上の履歴データが古いローカルデータで上書きされないようにする修正
- バックエンドをUpstashからjsonblobへ移行 → 元に戻す、という試行錯誤があった形跡(git logに複数のRevertコミット)。現状は**Upstash Redis(KV)に戻っている**のが最新状態。

## 開発時の確認事項
- `.claude/launch.json`を用意済み。`preview_start`で`smash-manager-dev`を指定すればdevサーバーを起動できる(このスレッドの作業ディレクトリがこのプロジェクト直下である前提)。
- npm installは2026-09-09時点で最新化済み(492パッケージ、脆弱性18件は個人プロジェクトなので優先度低)。
