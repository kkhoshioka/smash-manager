# ぼたんちゃん bot.js 修正パッチ集（PC 側で適用する用）

このフォルダは **`C:\secretary\bot.js` を直す人（＝Boss の PC 上で動く Claude、
あるいは Boss 本人）向けの材料置き場**です。

クラウド側の Claude Code セッションは Linux コンテナ内で
`kkhoshioka/smash-manager` リポジトリしか見えず、`C:\secretary` には一切アクセスできません。
そのため実ファイルの書き換えは PC 側で行う必要があります。

手順書の原本: `docs/botan-discord-bot-setup.md`
（ブランチ `claude/discord-bot-claude-code-permissions-7u8ee7`）

---

## 手順0.5: 最小復旧（まずこれだけやれば bot は起動する）

`C:\secretary\bot.js` の `askClaude()`（198行目付近）で組み立てている引数配列から、
次の **2要素を削除**する。

```js
// 削除する2要素（この2行を消すだけ）
'--disallowedTools',
DISALLOWED_TOOLS,
```

`DISALLOWED_TOOLS` 定数の宣言そのものも未使用になるので、併せて削除してよい。

この引数は付いていると CLI が引数解析の段階で必ず落ちるため、
**拒否ルールは一度も実際に機能していない**。削除で失われる機能はない。
恒久版は下の「手順3」で `bot-settings.json` として復活させる。

保存後、**bot の再起動が必要**（Node は起動時に bot.js を読み込むため）。

---

## 手順1: 起動先の実在確認（PC 上でのみ実行可能）

PowerShell で:

```powershell
Get-ChildItem "$env:APPDATA\npm\node_modules\@anthropic-ai\claude-code\" -Recurse -Include *.exe,cli.js |
  Select-Object FullName
```

- `claude.exe` が出た → **パターンA**
- `cli.js` しか出ない → **パターンB**

見つかった絶対パスを控えておく。

---

## 手順2: shell を外す

### パターンA

```js
const CLAUDE_CMD = 'C:\\Users\\pipip\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\bin\\claude.exe';
// ↑ 手順1で実際に見つけたパスに置き換える

execFile(CLAUDE_CMD, args, { cwd: WORKDIR /* shell: true は削除 */ }, cb);
```

### パターンB

```js
const CLI_JS_PATH = 'C:\\Users\\pipip\\AppData\\Roaming\\npm\\node_modules\\@anthropic-ai\\claude-code\\cli.js';
// ↑ 手順1で実際に見つけたパスに置き換える

execFile(process.execPath, [CLI_JS_PATH, ...args], { cwd: WORKDIR, shell: false }, cb);
```

`.cmd` / `.bat` は Node 18.20.2+ / 20.12.2+ では `shell: false` だと `EINVAL` で
起動できない。だから `shell` を外すなら起動先を `.exe` か `node + cli.js` にする必要がある。

shell を経由しなくなると、配列の各要素がそのまま argv として子プロセスへ渡るので、
`( ) * /` やスペースによるエスケープ事故は原理的に起きなくなる。

---

## 手順3: 拒否ルールを JSON に移す

1. このフォルダの [`bot-settings.json`](./bot-settings.json) を
   `C:\secretary\bot-settings.json` にコピーする。
2. `bot.js` からは `--disallowedTools` とその値を削除したまま、代わりに次を渡す。

```js
'--settings', 'C:\\secretary\\bot-settings.json',
```

`deny` ルールは `bypassPermissions` モードでも評価される
（判定順は フック → deny → ask → パーミッションモード → allow）ので安全網は保たれる。
先頭ワイルドカード（`Bash(*Remove-Item*)` など）は前方一致にならず効かないため、
リストは全て前方一致の形にしてある。

---

## 手順4: `--add-dir` を絞る

`C:\Users\pipip` は SSH 秘密鍵・ブラウザ保存パスワード・各種トークンを含むため、
`bypassPermissions` との併用は危険。次の2つに置き換える。

```js
'--add-dir', 'C:\\secretary',
'--add-dir', 'C:\\Antigravity_Projects\\シーイーエス',
```

---

## 手順5: CLAUDE.md に再発防止ルールを書く

`C:\secretary\CLAUDE.md` の冒頭付近に貼る。

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

## 手順6: 送信者チェック（セキュリティ上必須）

`bypassPermissions` で動いている以上、そのチャンネルに書ける人は誰でも
Boss の PC で任意コマンドを実行できる。メッセージ受信ハンドラの**先頭**に入れる。

```js
// TODO: ここに Boss の Discord ユーザーIDを入れる（開発者モード → ユーザー右クリック → 「IDをコピー」）
const ALLOWED_USER_IDS = ['PUT_BOSS_DISCORD_USER_ID_HERE'];

client.on('messageCreate', async (message) => {
  if (message.author.bot) return;
  if (!ALLOWED_USER_IDS.includes(message.author.id)) return;
  // ...既存の処理...
});
```

**ID の入力が必要。** 空のままだと bot は誰にも応答しなくなる。

---

## 手順7: セッション継続（記憶が消える問題）

`--session-id` は「そのIDで**新規**セッションを作る」フラグで、既存の会話は再開しない。
2回目以降は `--resume` を使う。

```js
const { randomUUID } = require('node:crypto');

const sessions = new Map(); // channelId -> sessionId

function buildSessionArgs(channelId) {
  const known = sessions.get(channelId);
  if (known) {
    return ['--resume', known];
  }
  const id = randomUUID();
  sessions.set(channelId, id);
  return ['--session-id', id];
}
```

`askClaude()` 内では、毎回 UUID を生成していた箇所を
`...buildSessionArgs(channelId)` に置き換える。

リセットコマンド:

```js
if (message.content.trim() === '/new') {
  sessions.delete(message.channel.id);
  await message.reply('記憶をリセットしました');
  return;
}
```

`sessions` はプロセス内 Map なので、bot 再起動で記憶は切れる。
永続化したい場合は JSON ファイルに保存する。

---

## 完成後のコマンドライン（パターンB / 手順3・4適用後の想定）

```
node C:\Users\pipip\AppData\Roaming\npm\node_modules\@anthropic-ai\claude-code\cli.js
  -p <プロンプト>
  --output-format text
  --permission-mode bypassPermissions
  --settings C:\secretary\bot-settings.json
  --allowedTools Read Write Edit Glob Grep Bash WebSearch WebFetch <MCP ツール群>
  --add-dir C:\secretary
  --add-dir C:\Antigravity_Projects\シーイーエス
  --session-id <uuid>      # 初回のみ
  --resume <uuid>          # 2回目以降（--session-id とは排他）
```

---

## 動作確認

bot 再起動後、Discord で順に:

1. `git status を実行して` → Bash が通る
2. `さっき何を実行した？` → 記憶が繋がっている
3. `/new` → 記憶がリセットされる

## やってはいけないこと

- `bot-settings.json` の `deny` リストを短くしない
- `--add-dir` を `C:\Users\pipip` に戻さない
- `--permission-mode` の変更は必ず Boss に確認
- 送信者チェック（手順6）を省略しない
