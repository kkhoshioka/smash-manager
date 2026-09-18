/**
 * 世界戦闘力の入力ミス（特に桁の打ち間違い）を検出する。
 *
 * 前回の記録から離れすぎている値は、たいてい打ち間違い。
 * 1400万前後の値で 0 を1つ多く/少なく打つと1桁ずれるので、
 * その場合は「直す候補」も返して、ワンタップで修正できるようにする。
 */

/** これ以上離れていたら警告する（前回との差） */
export const GSP_WARNING_THRESHOLD = 2000000;

/** 桁ずれとみなす許容範囲。候補が前回値のこの割合以内なら「桁ずれ」と判断する */
const DIGIT_SLIP_TOLERANCE = 0.3;

/**
 * @param {number|string|null} value    入力された戦闘力
 * @param {number|null} previous        前回（直近の記録）の戦闘力
 * @returns {null | {
 *   value: number,
 *   previous: number,
 *   diff: number,        // 差（符号つき）
 *   absDiff: number,
 *   suggestion: number|null,  // 桁ずれを直した候補
 *   reason: 'too-many-digits' | 'too-few-digits' | 'far'
 * }}
 *   警告不要なら null。
 */
export function checkGsp(value, previous) {
    const current = typeof value === 'string' ? parseInt(value, 10) : value;
    if (!current || !previous) return null;

    const diff = current - previous;
    const absDiff = Math.abs(diff);
    if (absDiff < GSP_WARNING_THRESHOLD) return null;

    const isNear = (candidate) => Math.abs(candidate - previous) <= previous * DIGIT_SLIP_TOLERANCE;

    // 0 を1つ多く打った（前回の10倍前後になっている）
    if (current % 10 === 0 && isNear(current / 10)) {
        return { value: current, previous, diff, absDiff, suggestion: Math.round(current / 10), reason: 'too-many-digits' };
    }

    // 0 を1つ少なく打った（前回の1/10前後になっている）
    if (isNear(current * 10)) {
        return { value: current, previous, diff, absDiff, suggestion: current * 10, reason: 'too-few-digits' };
    }

    return { value: current, previous, diff, absDiff, suggestion: null, reason: 'far' };
}

/** 確認ダイアログや警告文に使う説明 */
export function describeGspWarning(check) {
    if (!check) return '';
    const move = check.diff > 0 ? '増えて' : '減って';
    const base = `前回の記録 ${check.previous.toLocaleString()} から ${check.absDiff.toLocaleString()} ${move}います。`;

    if (check.reason === 'too-many-digits') {
        return `${base}桁がひとつ多いかもしれません（${check.suggestion.toLocaleString()} では？）。`;
    }
    if (check.reason === 'too-few-digits') {
        return `${base}桁がひとつ少ないかもしれません（${check.suggestion.toLocaleString()} では？）。`;
    }
    return base;
}
