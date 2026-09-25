/**
 * 撃墜技の記録まわりの小さなヘルパー。
 *
 * コンポーネントと同じファイルに置くと Fast Refresh が効かなくなるので分けている。
 */

/**
 * { 技名: 本数 } を保存用の配列に展開する。
 * 例: { '空後': 2, '横スマ': 1 } → ['空後', '空後', '横スマ']
 */
export function countsToList(counts) {
    return Object.entries(counts || {})
        .flatMap(([move, n]) => Array.from({ length: n }, () => move));
}

/**
 * 技を「実際によく出ている順」に並べ替える。
 * 記録が貯まるほど、上位数個を押すだけで済むようになる。
 */
export function rankMoves(candidates = [], freq = {}) {
    const extras = Object.keys(freq).filter(m => !candidates.includes(m));
    return [...candidates, ...extras].sort((a, b) => (freq[b] || 0) - (freq[a] || 0));
}
