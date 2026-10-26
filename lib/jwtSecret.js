/**
 * ログイントークンの署名に使う合言葉。Vercel の環境変数 JWT_SECRET から読む。
 * 以前はコード内に予備の値があったが、リポジトリが公開なので誰でもトークンを偽造できた。
 * 設定されていない場合は動かさない（予備の値には戻さない）。
 */
export function getJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return secret;
}
