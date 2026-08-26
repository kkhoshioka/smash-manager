# ぼたんちゃん セットアップ手順書

**この文書を読んでいるあなたへ。** あなたは「ぼたんちゃん」です。Discord経由で呼び出されて動いています。
あなたはメッセージごとに記憶がリセットされるため、この手順書には前提を全て書いてあります。
過去の会話を思い出そうとする必要はありません。この文書だけで完結します。

この作業はBossの許可済みです。上から順に実行してください。

---

## 0. まず最初にやること

この手順書を `C:\secretary\docs\botan-setup.md` に保存してください。
作業が中断しても、次回のあなたがこのファイルを読めば続きから再開できます。

---

## 0.5 緊急復旧【bot が完全停止している場合はここから】

**症状**: Discord にどんなメッセージを送っても、次のエラーが返る。

```
実行エラー: Command failed: ...\claude.cmd ... --disallowedTools Bash(rm -rf /*),...
error: unknown option '--force*),Bash(git'
```

**意味**: `bot.js` に埋め込まれた `--disallowedTools` の文字列が壊れているため、
Claude CLI が引数の解析段階で失敗し、**すべての呼び出しが起動前に死んでいます**。
この状態のぼたんちゃんは自分自身を修理できません。PC 側から直す必要があります。

**最小の復旧手順**: `C:\secretary\bot.js` を開き、Claude CLI に渡す引数配列から
`--disallowedTools` とその直後の値（`Bash(rm -rf /*),...` の長い文字列）の
**2要素を削除**して保存し、bot を再起動してください。

**この削除で失われるものはありません。** この引数は付いていると必ず起動が失敗するため、
拒否ルールは一度も実際に機能したことがありません。削除しても安全性は下がりません。
恒久的な拒否ルールは、後述の手順3で `bot-settings.json` として正しく復活させます。

復旧したら、この手順書の第1章から順に進めてください。

---

## 1. あなたの動作構造（前提知識）

- あなたの本体は `C:\secretary\bot.js` です。
- `bot.js` は Discord からメッセージを受け取ると、`child_process` 経由で
  Claude Code の CLI を `-p`（headless）モードで起動します。
- そのコマンドライン引数を組み立てているのが `askClaude()` 関数（198行目付近）です。
- 作業ディレクトリ（WORKDIR）は `C:\secretary` で、そこの `CLAUDE.md` に
  あなたの人格設定が書かれています。

現在あなたに許可されているツールは以下です（`--allowedTools`）:
`Read, Write, Edit, Glob, Grep, Bash, WebSearch, WebFetch`、および
Google Drive / Gmail の MCP ツール群。

---

## 2. 解決すべき問題は2つあります

### 問題A: 引数が壊れて CLI が起動しない

実際に発生したエラー:

```
error: unknown option '--force*),Bash(git'
```

**原因**: `askClaude()` が `claude.cmd` を `execFile(..., { shell: true })` で起動しています。
`shell: true` を挟むと Node.js は引数を適切にエスケープせず、cmd.exe に文字列として渡します。
`--disallowedTools` の値には `Bash(git push --force*)` のように
`(` `)` `*` `/` やスペースといった cmd.exe の特殊文字が大量に含まれるため、
cmd.exe がこれを誤解釈して引数が分割・破壊されます。

**重要**: これは過去2回発生している再発事故です。
1回目は `feedback-no-paid-apis` の時に「`claude.cmd` を `shell:true` で叩くと
引数の引用符で事故る。exe を直接 spawn して shell を挟まないこと」と学習済みでした。
2回目は 8/27 の Bash 解禁の変更時に、その学習が失われて元に戻ってしまいました。
今回で3回目を防ぐため、後述の手順5（CLAUDE.md への恒久ルール追記）を必ず実施してください。

### 問題B: メッセージごとに記憶が消える

**原因**: `bot.js` がメッセージのたびに新しい UUID を生成して `--session-id` に渡しています。
`--session-id` は「**そのIDで新規セッションを作る**」フラグであり、既存の会話を再開しません。
既存の会話を継続するには `--resume <session-id>` を使う必要があります。

---

## 3. 手順1: 起動先の実在を確認する

Windows では `.cmd` / `.bat` ファイルは `shell: false` では起動できません
（Node 18.20.2+ / 20.12.2+ のセキュリティ修正以降、`EINVAL` で失敗します）。
したがって `shell: true` を外すなら、`.cmd` 以外の起動先が必須です。

次のフォルダの中身を確認してください:

```
%APPDATA%\npm\node_modules\@anthropic-ai\claude-code\
```

どちらのパターンかを判定します:

- **パターンA**: `claude.exe` のようなネイティブ実行ファイルがある
- **パターンB**: `cli.js` のような Node スクリプトしかない

**判定結果を必ず報告してください。** 見つかったファイルの絶対パスも添えてください。

---

## 4. 手順2: 起動方法を修正する（shell を外す）

### パターンA だった場合

```js
const CLAUDE_CMD = 'C:\\Users\\pipip\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe';
// ↑ 手順1で実際に見つけたパスに置き換えること

execFile(CLAUDE_CMD, args, { /* shell: true を削除 */ });
```

### パターンB だった場合

`claude.exe` が無いので、Node 自身に実行させます。

```js
const CLI_JS_PATH = 'C:\\Users\\pipip\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js';
// ↑ 手順1で実際に見つけたパスに置き換えること

execFile(process.execPath, [CLI_JS_PATH, ...args], { shell: false });
```

**どちらの場合も共通**: `shell` を一切経由しなくなるため、配列の各要素がそのまま
argv として子プロセスに渡ります。特殊文字のエスケープ事故は原理的に起きなくなります。

---

## 5. 手順3: 壊れやすい文字列を設定ファイルに移す

手順2で shell を外せば `--disallowedTools` のカンマ連結文字列も動作します。
しかしこの形は将来また同じ事故を招くため、設定ファイルに移して恒久的に排除します。

### 5-1. `C:\secretary\bot-settings.json` を新規作成

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "deny": [
      "Bash(rm -rf *)",
      "Bash(rm -fr *)",
      "Bash(format *)",
      "Bash(shutdown *)",
      "Bash(git push --force *)",
      "Bash(git push -f *)",
      "Bash(rd /s *)",
      "Bash(del /f /s /q *)",
      "Bash(diskpart *)",
      "Bash(reg delete *)",
      "Bash(taskkill /f *)",
      "Bash(Stop-Process *)",
      "Bash(Remove-Item *)"
    ]
  }
}
```

### 5-2. `bot.js` を修正

- `--disallowedTools` とその値を**まるごと削除**する
- 代わりに `--settings C:\secretary\bot-settings.json` を渡す

**補足**: `deny` ルールは `bypassPermissions` モードでも必ず評価されます。
Claude Code の権限判定は「フック → deny ルール → ask ルール → パーミッションモード →
allow ルール」の順で、deny はモード判定より前に効くためです。安全網は保たれます。

**補足2**: 先頭がワイルドカードのルール（例: `Bash(*Remove-Item*)`）は
前方一致が基本のため機能しません。上記リストは全て前方一致の形にしてあります。

---

## 6. 手順4: `--add-dir` の範囲を絞る

現在 `--add-dir C:\Users\pipip` が指定されています。
これはユーザーフォルダ全体であり、SSH秘密鍵・ブラウザの保存パスワード・
各種認証トークンまで読み書き対象に含まれます。
`--permission-mode bypassPermissions` との併用は危険です。

以下の2つに絞ってください:

```
--add-dir C:\secretary
--add-dir C:\Antigravity_Projects\シーイーエス
```

他に業務上必要なフォルダがあれば、追加せずに Boss に確認してください。

---

## 7. 手順5: 再発防止ルールを CLAUDE.md に書く【最重要】

`C:\secretary\CLAUDE.md` の**目立つ位置**（ファイル冒頭付近）に、以下を追記してください。
あなたは記憶がリセットされるため、このファイルだけが唯一の引き継ぎ手段です。

```markdown
## 絶対ルール: claude 起動時に shell を挟まない

bot.js の askClaude() で Claude CLI を起動する際、
`shell: true` を使ってはいけない。また `.cmd` を起動先にしてはいけない。

理由: 引数に含まれる特殊文字 `( ) * /` やスペースが cmd.exe に誤解釈され、
`error: unknown option` で実行が壊れる。

起動先は次のいずれかにする:
- claude.exe を直接 execFile する
- process.execPath（node）+ cli.js を execFile する

過去に2回発生している再発事故:
1回目 feedback-no-paid-apis の時 / 2回目 8-27 の Bash 解禁の変更時。
権限まわりを触るときは必ずこの項目を先に読むこと。

## 権限設定の置き場所

Bash の拒否ルールは bot.js のコマンドライン引数に書かず、
C:\secretary\bot-settings.json に JSON として記述し、
`--settings C:\secretary\bot-settings.json` で渡す。
理由: 引数に特殊文字を含めないため。
```

---

## 8. 手順6: 送信者チェックを入れる【セキュリティ上必須】

現在 `--permission-mode bypassPermissions` で動作しています。
これは **Discord のそのチャンネルに書き込める人なら誰でも、
Boss の PC で任意のコマンドを実行できる**状態を意味します。

Discord のメッセージ受信ハンドラの**先頭**に、送信者IDの照合が入っているか確認してください。
無ければ追加します:

```js
const ALLOWED_USER_IDS = ['ここにBossのDiscordユーザーIDを入れる'];
if (!ALLOWED_USER_IDS.includes(message.author.id)) return;
```

Boss の Discord ユーザーIDはまだ未確定です。仮の定数と
「ここにIDを入れてください」というコメントを置いた上で、
報告時に「IDの入力が必要」と明記してください。

---

## 9. 手順7: 記憶が消える問題を直す（問題B の対処）

`askClaude()` のセッション管理を、初回は新規作成・2回目以降は再開する形に変更します。

### 9-1. チャンネルごとにセッションIDを保持する

```js
const sessions = new Map(); // channelId -> sessionId
```

### 9-2. コマンド組み立てを分岐させる

- **そのチャンネルが `sessions` に未登録の場合**
  - 新しい UUID を生成して `--session-id <uuid>` を付ける
  - その UUID を `sessions` に保存する
- **既に登録済みの場合**
  - `--session-id` は付けない
  - 代わりに `--resume <保存したUUID>` を付ける

### 9-3. リセット用コマンドを用意する

メッセージ本文が `/new` だった場合、そのチャンネルのエントリを `sessions` から削除し、
「記憶をリセットしました」と返信する。

---

## 10. 完了報告のフォーマット

作業が終わったら、以下を Discord に報告してください。
2000文字を超える場合は要点のみに絞って構いません。

1. **手順1の判定結果** — パターンA / B のどちらだったか、見つかったファイルの絶対パス
2. **変更したファイルの一覧** — bot.js / bot-settings.json / CLAUDE.md など
3. **完成したコマンドライン全体** — 実際に組み立てられる引数列
4. **送信者チェックの状態** — 追加したか、既にあったか。IDの入力が必要かどうか
5. **再起動の要否** — Boss が bot を手動再起動する必要があるか

---

## 11. 動作確認の方法

Boss が bot を再起動したあと、Discord で次を順に試します。

1. `git status を実行して` → Bash が通ることの確認
2. 続けて `さっき何を実行した？` → 記憶が繋がっていることの確認
3. `/new` → 記憶がリセットされることの確認

---

## 補足: やってはいけないこと

- `bot-settings.json` の `deny` リストを短くしないでください。安全網です。
- `--add-dir` を `C:\Users\pipip` に戻さないでください。
- `--permission-mode` を変更する場合は必ず Boss に確認してください。
- 送信者チェック（手順6）を省略しないでください。
