import React, { useState } from 'react';
import { Plus, X, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * 撃墜技をワンタップで記録するチップ。
 *
 * ドロップダウンを人数分開くのは試合間の数十秒では現実的に無理なので、
 * よく出る技を上位に並べたボタンを並べ、押した回数で本数を数える。
 *
 * @param {string[]} moves     表示順に並べた技名（頻度の高い順を想定）
 * @param {Object} counts      { 技名: 本数 }
 * @param {Function} onChange  新しい counts を受け取る
 * @param {number} max         ストック数。合計がこれを超えないようにする
 * @param {'mine'|'opponent'} variant
 */
/** 最初に見せる数。勇者のように技が30個ある相手だと、全部出すと壁になる */
const VISIBLE_LIMIT = 8;

export default function KillMoveChips({ moves, counts, onChange, max, variant = 'mine' }) {
    const [showOther, setShowOther] = useState(false);
    const [otherText, setOtherText] = useState('');
    const [expanded, setExpanded] = useState(false);

    const total = Object.values(counts).reduce((s, v) => s + v, 0);
    const remaining = Math.max(0, max - total);

    const add = (move) => {
        if (remaining <= 0) return;
        onChange({ ...counts, [move]: (counts[move] || 0) + 1 });
    };

    const clear = (move, e) => {
        e.stopPropagation();
        const next = { ...counts };
        delete next[move];
        onChange(next);
    };

    const submitOther = () => {
        const name = otherText.trim();
        if (!name || remaining <= 0) return;
        onChange({ ...counts, [name]: (counts[name] || 0) + 1 });
        setOtherText('');
        setShowOther(false);
    };

    // 一覧にない技（その他で足したもの）も、選択済みなら表示する
    const extras = Object.keys(counts).filter(m => !moves.includes(m));
    const allMoves = [...moves, ...extras];

    // 畳んでいる間も、選択済みのチップは必ず見えるようにする
    const hidden = expanded ? [] : allMoves.slice(VISIBLE_LIMIT).filter(m => !counts[m]);
    const shown = allMoves.filter(m => !hidden.includes(m));

    return (
        <div className={`kmc kmc--${variant}`}>
            <div className="kmc__head">
                <span className="kmc__remaining">
                    {remaining > 0 ? `あと${remaining}本ぶん` : '入力済み'}
                </span>
                {total > 0 && (
                    <button type="button" className="kmc__reset" onClick={() => onChange({})}>
                        クリア
                    </button>
                )}
            </div>

            <div className="kmc__chips">
                {shown.map(move => {
                    const n = counts[move] || 0;
                    return (
                        <button
                            type="button"
                            key={move}
                            className={`kmc__chip ${n > 0 ? 'is-on' : ''}`}
                            onClick={() => add(move)}
                            disabled={n === 0 && remaining <= 0}
                            aria-pressed={n > 0}
                        >
                            <span className="kmc__chip-name">{move}</span>
                            {n > 1 && <span className="kmc__chip-count">×{n}</span>}
                            {n > 0 && (
                                <span
                                    className="kmc__chip-clear"
                                    role="button"
                                    tabIndex={-1}
                                    aria-label={`${move} を取り消す`}
                                    onClick={(e) => clear(move, e)}
                                >
                                    <X size={14} />
                                </span>
                            )}
                        </button>
                    );
                })}

                {hidden.length > 0 && (
                    <button
                        type="button"
                        className="kmc__chip kmc__chip--more"
                        onClick={() => setExpanded(true)}
                    >
                        <ChevronDown size={14} /> ほか{hidden.length}件
                    </button>
                )}

                {expanded && allMoves.length > VISIBLE_LIMIT && (
                    <button
                        type="button"
                        className="kmc__chip kmc__chip--more"
                        onClick={() => setExpanded(false)}
                    >
                        <ChevronUp size={14} /> 畳む
                    </button>
                )}

                {!showOther && (
                    <button
                        type="button"
                        className="kmc__chip kmc__chip--other"
                        onClick={() => setShowOther(true)}
                        disabled={remaining <= 0}
                    >
                        <Plus size={14} /> その他
                    </button>
                )}
            </div>

            {showOther && (
                <div className="kmc__other">
                    <input
                        type="text"
                        value={otherText}
                        onChange={e => setOtherText(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); submitOther(); }
                            if (e.key === 'Escape') { setShowOther(false); setOtherText(''); }
                        }}
                        placeholder="技名を入力..."
                        autoFocus
                    />
                    <button type="button" className="kmc__other-add" onClick={submitOther}>追加</button>
                    <button type="button" className="kmc__other-cancel" onClick={() => { setShowOther(false); setOtherText(''); }}>
                        やめる
                    </button>
                </div>
            )}
        </div>
    );
}
