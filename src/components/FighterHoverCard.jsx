import React from 'react';

/**
 * ファイターのアイコンにカーソルを乗せたときに出る成績ポップアップ。
 *
 * 位置はグリッド(position:relative)基準の絶対座標で渡ってくる。
 * mode:
 *   'opponent' … 使用ファイターとの対面成績
 *   'mine'     … そのファイターでの通算成績
 */
export default function FighterHoverCard({ info, matchup, overall, myFighterName }) {
    const { fighter, mode, x, top, bottom, below } = info;

    const style = below
        ? { left: `${x}px`, top: `${bottom + 10}px`, transform: 'translateX(-50%)' }
        : { left: `${x}px`, top: `${top - 10}px`, transform: 'translate(-50%, -100%)' };

    const stats = mode === 'mine' ? overall : matchup;

    return (
        <div className={`fighter-hover-card ${below ? 'is-below' : 'is-above'}`} style={style} role="tooltip">
            <div className="fighter-hover-card__name">{fighter.name}</div>

            {mode === 'opponent' && (
                <div className="fighter-hover-card__label">
                    {myFighterName ? `${myFighterName} で対戦` : '対戦成績'}
                </div>
            )}

            {stats && stats.total > 0 ? (
                <>
                    <div className="fighter-hover-card__record">
                        <span className="fighter-hover-card__total">{stats.total}戦</span>
                        <span className="is-win">{stats.wins}勝</span>
                        <span className="is-lose">{stats.losses}敗</span>
                    </div>

                    <div className="fighter-hover-card__rate">
                        <div className="fighter-hover-card__bar">
                            <div
                                className={`fighter-hover-card__bar-fill ${stats.winRate >= 50 ? 'is-good' : 'is-bad'}`}
                                style={{ width: `${stats.winRate}%` }}
                            />
                        </div>
                        <span className={stats.winRate >= 50 ? 'is-win' : 'is-lose'}>{stats.winRate}%</span>
                    </div>

                    {mode === 'opponent' && stats.recent?.length > 0 && (
                        <div className="fighter-hover-card__form">
                            {stats.recent.map((m, i) => (
                                <span
                                    key={i}
                                    className={`form-pip ${m.result === 'win' ? 'is-win' : 'is-lose'}`}
                                >
                                    {m.result === 'win' ? 'W' : 'L'}
                                </span>
                            ))}
                        </div>
                    )}

                    {mode === 'mine' && stats.gsp && (
                        <div className="fighter-hover-card__gsp">
                            最新 {stats.gsp.toLocaleString()}
                        </div>
                    )}
                </>
            ) : (
                <div className="fighter-hover-card__empty">対戦記録なし</div>
            )}
        </div>
    );
}
