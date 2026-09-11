import vipBorderData from './vipBorder.json';

/**
 * VIPボーダー（VIPマッチに入れる世界戦闘力の目安）。
 *
 * 任天堂が公式に数値を出しているものではないため、コミュニティの集計サイトの
 * 推定値を vipBorder.json に持たせている。値は定期実行のタスクが更新する。
 */
export const vipBorder = vipBorderData;

/**
 * 「2026-09-11」→「9/11」
 * Date を経由するとブラウザのタイムゾーン次第で前日になるので、文字列のまま扱う。
 */
export function formatCheckedAt(iso = vipBorderData.checkedAt) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!m) return iso;
    return `${Number(m[2])}/${Number(m[3])}`;
}

/**
 * 戦闘力とボーダーを比べた表示用の情報を返す。
 * gsp が無いときは null（＝表示しない）。
 */
export function getVipStatus(gsp, border = vipBorderData.border) {
    if (!gsp || !border) return null;

    const diff = gsp - border;
    const reached = diff >= 0;

    // ゲージはボーダーの70%地点を起点にすると、上位帯の伸びが見えやすい
    const floor = border * 0.7;
    const ratio = Math.max(0, Math.min(1, (gsp - floor) / (border - floor)));

    return {
        gsp,
        border,
        diff,
        reached,
        /** 0〜1。到達済みは常に 1 */
        ratio: reached ? 1 : ratio,
        /** 到達までの残り（到達済みは 0） */
        remaining: reached ? 0 : -diff
    };
}

/**
 * 指定ファイターの最新の世界戦闘力を求める。
 * 設定に保存された値を優先し、無ければ履歴の新しい方から探す。
 */
export function getLatestGsp(fighterId, prefs, history) {
    if (!fighterId) return null;

    const saved = prefs?.fighterGsp?.[fighterId];
    if (saved) return saved;

    const recent = (history || []).find(m => m.myFighter === fighterId && m.gsp);
    return recent ? recent.gsp : null;
}
