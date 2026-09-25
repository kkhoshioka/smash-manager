/**
 * VIP作戦：履歴から「VIPに入るために何が足りないか」を計算する。
 *
 * 考え方
 * - 世界戦闘力は1戦ごとに一定幅で上下する。勝ちの上げ幅と負けの下げ幅が
 *   分かれば、増減が釣り合う勝率（損益分岐）が出る。
 * - 実際の勝率がそれを下回っていれば、何戦やっても戦闘力は減る。
 *   つまり必要なのは試合数ではなく勝率。
 * - どの相手で負け越しているかは、偶然の範囲かどうかを併せて判定する
 *   （少ない試合数の「勝率30%」は、たいてい偶然）。
 */

/** 差分の外れ値を捨てる倍率（中央値の何倍まで許容するか） */
const OUTLIER_FACTOR = 5;

/** 相手別の判定に必要な最低試合数 */
const MIN_MATCHES_PER_OPPONENT = 15;

/**
 * 確度の目安。相手は80体近くいるので z>=2 だけだと偶然の当たりが混ざる。
 * 切り捨てはせず、影響の大きい順に並べたうえで確度を併記する方針。
 */
const Z_HIGH = 2.5;
const Z_MEDIUM = 1.8;

const median = (arr) => {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0);

const winRate = (wins, total) => (total > 0 ? (wins / total) * 100 : 0);

/**
 * @param {Array} history      1ファイターぶんの対戦履歴（順不同）
 * @param {number} border      VIPボーダー
 * @returns {null | object}    データが足りなければ null
 */
export function buildVipPlan(history, border) {
    if (!Array.isArray(history) || history.length < 20 || !border) return null;

    const chrono = [...history]
        .filter(m => m && m.timestamp)
        .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    const withGsp = chrono.filter(m => Number.isFinite(m.gsp) && m.gsp > 0);
    if (withGsp.length < 20) return null;

    /* ── 1戦あたりの増減 ── */
    const rawDeltas = [];
    for (let i = 1; i < withGsp.length; i++) {
        const d = withGsp[i].gsp - withGsp[i - 1].gsp;
        if (d !== 0) rawDeltas.push({ d, result: withGsp[i].result });
    }
    if (rawDeltas.length < 10) return null;

    // 記録漏れや打ち間違いで飛び抜けた差分が混ざるので、中央値基準で捨てる
    const limit = median(rawDeltas.map(x => Math.abs(x.d))) * OUTLIER_FACTOR;
    const deltas = rawDeltas.filter(x => Math.abs(x.d) <= limit);

    const gains = deltas.filter(x => x.result === 'win' && x.d > 0).map(x => x.d);
    const drops = deltas.filter(x => x.result !== 'win' && x.d < 0).map(x => -x.d);
    if (!gains.length || !drops.length) return null;

    const avgWin = mean(gains);
    const avgLoss = mean(drops);
    const breakeven = (avgLoss / (avgWin + avgLoss)) * 100;

    /* ── 勝率 ── */
    const rateOf = (arr) => winRate(arr.filter(m => m.result === 'win').length, arr.length);
    const rates = {
        overall: rateOf(chrono),
        last100: chrono.length >= 100 ? rateOf(chrono.slice(-100)) : null,
        last50: chrono.length >= 50 ? rateOf(chrono.slice(-50)) : null,
        last20: chrono.length >= 20 ? rateOf(chrono.slice(-20)) : null
    };

    /* ── 現在地 ── */
    const current = withGsp[withGsp.length - 1].gsp;
    const peakMatch = withGsp.reduce((a, b) => (b.gsp > a.gsp ? b : a));
    const remaining = border - current;
    // 差し引き何勝ぶんか（勝ち1回で avgWin 上がり、その1勝は負け1回ぶんも打ち消す）
    const netWinsNeeded = remaining > 0 ? Math.ceil(remaining / avgWin) : 0;

    /* ── 到達見込み ── */
    const project = (targetRate) => {
        const per = (targetRate / 100) * avgWin - (1 - targetRate / 100) * avgLoss;
        if (per <= 0) return { rate: targetRate, perMatch: per, matches: null };
        return { rate: targetRate, perMatch: per, matches: Math.ceil(remaining / per) };
    };
    const projections = remaining > 0
        ? [Math.ceil(breakeven + 3), Math.ceil(breakeven + 8), Math.ceil(breakeven + 13)].map(project)
        : [];

    /* ── 相手別 ── */
    const byOpp = {};
    chrono.forEach(m => {
        if (!m.opponentFighter) return;
        const e = byOpp[m.opponentFighter] || (byOpp[m.opponentFighter] = { total: 0, wins: 0 });
        e.total++;
        if (m.result === 'win') e.wins++;
    });

    const opponents = Object.entries(byOpp)
        .map(([id, e]) => {
            const losses = e.total - e.wins;
            // 勝率50%の二項分布からのズレ。|z|>=2 なら偶然とは考えにくい
            const z = (e.wins - e.total / 2) / Math.sqrt(e.total / 4);
            const abs = Math.abs(z);
            return {
                id,
                total: e.total,
                wins: e.wins,
                losses,
                net: e.wins - losses,
                rate: winRate(e.wins, e.total),
                z,
                /** 'high' | 'medium' | 'low' … 偶然では説明しにくいかの目安 */
                confidence: abs >= Z_HIGH ? 'high' : abs >= Z_MEDIUM ? 'medium' : 'low',
                /**
                 * この相手を五分に戻したときに得られる「差し引き勝ち数」の改善幅。
                 * netWinsNeeded と同じ単位なので、直接くらべられる。
                 */
                swingIfEven: Math.max(0, -(e.wins - losses))
            };
        })
        .filter(o => o.total >= MIN_MATCHES_PER_OPPONENT);

    /*
     * 「対策する価値がある相手」＝負け越している相手を、影響の大きい順に。
     * 有意でないものも落とさず、確度を添えて出す。少ない試合数の
     * 「勝率30%」を鵜呑みにしないための情報は confidence が持つ。
     */
    const drains = opponents
        .filter(o => o.net < 0)
        .sort((a, b) => a.net - b.net);

    /* ── 記録の穴 ── */
    const killMoveRecords = chrono.reduce((s, m) => s + ((m.opponentKillMoves || []).length ? 1 : 0), 0);
    const killMoveCoverage = (killMoveRecords / chrono.length) * 100;

    return {
        matches: chrono.length,
        current,
        peak: peakMatch.gsp,
        peakAt: peakMatch.timestamp,
        border,
        remaining,
        netWinsNeeded,
        avgWin,
        avgLoss,
        breakeven,
        rates,
        projections,
        drains,
        killMoveCoverage,
        /** 直近の勝率が損益分岐を上回っているか */
        trending: (rates.last100 ?? rates.overall) >= breakeven
    };
}
