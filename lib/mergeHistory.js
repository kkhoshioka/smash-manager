/**
 * 端末ごとの対戦履歴を「1件ずつ」合体させる。
 * 以前は保存のたびに端末側の配列でクラウドを丸ごと上書きしていたため、
 * 古いデータを持った端末が保存すると、別の端末で入れた記録が消えていた。
 *
 * - 同じ id は1件にまとめる。updatedAt が新しい方を採用、同じなら primary 側を採用
 * - deletedIds(削除済みの id)に入っている記録は、どちらにあっても除外する
 * - 新しい順(timestamp 降順)に並べ直す
 */
export function mergeHistories(primary, secondary, deletedIds = []) {
    const deleted = new Set(deletedIds);
    const byId = new Map();
    for (const m of Array.isArray(secondary) ? secondary : []) {
        if (m && m.id != null && !deleted.has(m.id)) byId.set(m.id, m);
    }
    for (const m of Array.isArray(primary) ? primary : []) {
        if (!m || m.id == null || deleted.has(m.id)) continue;
        const other = byId.get(m.id);
        if (!other || (m.updatedAt || '') >= (other.updatedAt || '')) byId.set(m.id, m);
    }
    return [...byId.values()].sort((a, b) => String(b.timestamp || '').localeCompare(String(a.timestamp || '')));
}

export function mergeDeletedIds(a, b) {
    return [...new Set([...(a?.deletedIds || []), ...(b?.deletedIds || [])])];
}

/** primary 側の設定を優先しつつ、削除済み id だけは両方を足し合わせる */
export function mergePrefs(primary, secondary) {
    return { ...(secondary || {}), ...(primary || {}), deletedIds: mergeDeletedIds(primary, secondary) };
}

/** 中身(id と updatedAt)が同じ履歴かどうか */
export function sameHistory(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i]?.id !== b[i]?.id || (a[i]?.updatedAt || '') !== (b[i]?.updatedAt || '')) return false;
    }
    return true;
}
