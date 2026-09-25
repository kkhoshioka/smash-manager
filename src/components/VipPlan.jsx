import React, { useMemo } from 'react';
import { Target, TrendingUp, TrendingDown, Swords, NotebookPen } from 'lucide-react';
import { fighters } from '../data/fighters';
import { buildVipPlan } from '../data/vipPlan';
import { vipBorder } from '../data/vipBorder';

const fmt = n => Math.round(n).toLocaleString();
const nameOf = id => fighters.find(f => f.id === id)?.name || '不明';

/**
 * VIP作戦。
 * 「何が足りなくて、どれを直せば届くのか」を1枚にまとめる。
 * ファイターを1体に絞っているときだけ表示する。
 */
export default function VipPlan({ history }) {
    const plan = useMemo(() => buildVipPlan(history, vipBorder.border), [history]);

    if (!plan) return null;

    const {
        current, peak, remaining, netWinsNeeded, avgWin, avgLoss,
        breakeven, rates, projections, drains, killMoveCoverage, trending
    } = plan;

    const reached = remaining <= 0;
    const recent = rates.last100 ?? rates.overall;
    const shortfall = breakeven - recent;

    /*
     * 勝率バーは 40〜60% を拡大して描く。
     * 0〜100% のままだと、勝率と損益分岐の 1ポイント差が目視できないため。
     */
    const SCALE_MIN = 40;
    const SCALE_MAX = 60;
    const toScale = v => Math.max(0, Math.min(100, ((v - SCALE_MIN) / (SCALE_MAX - SCALE_MIN)) * 100));

    return (
        <div className="vip-plan">
            <h3 className="vip-plan__title">
                <Target size={20} /> VIP作戦
            </h3>

            {/* 現在地 */}
            <div className="vip-plan__row">
                <div className="vip-plan__stat">
                    <span className="vip-plan__label">ボーダーまで</span>
                    <span className={`vip-plan__value ${reached ? 'is-good' : ''}`}>
                        {reached ? 'VIP到達' : fmt(remaining)}
                    </span>
                    {!reached && (
                        <span className="vip-plan__sub">差し引き <strong>{netWinsNeeded}勝</strong>ぶん</span>
                    )}
                </div>
                <div className="vip-plan__stat">
                    <span className="vip-plan__label">自己最高</span>
                    <span className="vip-plan__value">{fmt(peak)}</span>
                    <span className="vip-plan__sub">現在 {fmt(current)}</span>
                </div>
            </div>

            {/* 損益分岐 */}
            <div className="vip-plan__breakeven">
                <div className="vip-plan__be-head">
                    <span>1戦の重み</span>
                    <span>
                        勝ち <strong className="is-good">+{fmt(avgWin)}</strong>
                        {' / '}
                        負け <strong className="is-bad">-{fmt(avgLoss)}</strong>
                    </span>
                </div>

                <div className="vip-plan__be-bar" title={`${SCALE_MIN}%〜${SCALE_MAX}% を拡大表示`}>
                    <div className="vip-plan__be-fill" style={{ width: `${toScale(recent)}%` }} />
                    <div className="vip-plan__be-mark" style={{ left: `${toScale(breakeven)}%` }} />
                    <span className="vip-plan__be-tick is-start">{SCALE_MIN}%</span>
                    <span className="vip-plan__be-tick is-end">{SCALE_MAX}%</span>
                </div>

                <div className="vip-plan__be-foot">
                    <span>直近100戦の勝率 <strong>{recent.toFixed(1)}%</strong></span>
                    <span>損益分岐 <strong>{breakeven.toFixed(1)}%</strong></span>
                </div>

                <p className={`vip-plan__verdict ${trending ? 'is-good' : 'is-bad'}`}>
                    {trending ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                    <span>
                        {trending
                            ? '分岐点を上回っています。この調子なら上がります。'
                            : <>勝率が <strong>{shortfall.toFixed(1)}ポイント</strong> 足りません。今のペースでは、やるほど減ります。</>}
                    </span>
                </p>
            </div>

            {/* 到達見込み */}
            {!reached && projections.length > 0 && (
                <div className="vip-plan__block">
                    <div className="vip-plan__block-title">到達までの目安</div>
                    <div className="vip-plan__proj">
                        {projections.map(p => (
                            <div key={p.rate} className="vip-plan__proj-item">
                                <span className="vip-plan__proj-rate">勝率 {p.rate}%</span>
                                <span className="vip-plan__proj-val">
                                    {p.matches ? `約${p.matches}戦` : '届きません'}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 対策する相手 */}
            <div className="vip-plan__block">
                <div className="vip-plan__block-title">
                    <Swords size={16} /> 直すならこの相手
                </div>
                {drains.length > 0 ? (
                    <>
                        <ul className="vip-plan__drains">
                            {drains.slice(0, 4).map(o => (
                                <li key={o.id} className={`vip-plan__drain is-${o.confidence}`}>
                                    <span className="vip-plan__drain-name">
                                        {nameOf(o.id)}
                                        <span className={`vip-plan__conf is-${o.confidence}`} title={`z = ${o.z.toFixed(2)}`}>
                                            {o.confidence === 'high' ? '確度 高' : o.confidence === 'medium' ? '確度 中' : '参考'}
                                        </span>
                                    </span>
                                    <span className="vip-plan__drain-rate">{o.rate.toFixed(0)}%</span>
                                    <span className="vip-plan__drain-meta">{o.total}戦</span>
                                    <span className="vip-plan__drain-swing">五分で +{o.swingIfEven}</span>
                                </li>
                            ))}
                        </ul>
                        {drains[0].swingIfEven >= netWinsNeeded && !reached && drains[0].confidence !== 'low' && (
                            <p className="vip-plan__note is-highlight">
                                {nameOf(drains[0].id)}を五分に戻すだけで、必要な {netWinsNeeded}勝ぶんを超えます。
                            </p>
                        )}
                        <p className="vip-plan__note">
                            影響の大きい順です。「参考」は試合数が少なく、偶然の可能性が残るもの。
                        </p>
                    </>
                ) : (
                    <p className="vip-plan__note">
                        負け越している相手はいません。今のところ苦手キャラは見当たりません。
                    </p>
                )}
            </div>

            {/* 記録の穴 */}
            {killMoveCoverage < 30 && (
                <p className="vip-plan__note is-warn">
                    <NotebookPen size={16} />
                    「相手に撃墜された技」の記録が {killMoveCoverage.toFixed(0)}% しかありません。
                    しばらく入力すると、何で倒されているかを特定できます。
                </p>
            )}
        </div>
    );
}
