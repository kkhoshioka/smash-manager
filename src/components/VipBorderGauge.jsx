import React from 'react';
import { Crown, TrendingUp } from 'lucide-react';
import { vipBorder, formatCheckedAt, getVipStatus } from '../data/vipBorder';

/**
 * 現在の世界戦闘力とVIPボーダーの距離を見せるゲージ。
 * gsp が未設定のときはボーダーの数値だけを出す。
 */
export default function VipBorderGauge({ gsp, compact = false }) {
    const status = getVipStatus(gsp);
    const border = vipBorder.border;

    return (
        <div className={`vip-gauge ${compact ? 'vip-gauge--compact' : ''} ${status?.reached ? 'is-vip' : ''}`}>
            <div className="vip-gauge__head">
                <span className="vip-gauge__title">
                    {status?.reached ? <Crown size={16} /> : <TrendingUp size={16} />}
                    VIPボーダー
                </span>
                <span className="vip-gauge__border" title={`${vipBorder.sourceName} の推定値（${vipBorder.checkedAt} 時点）`}>
                    {border.toLocaleString()}
                    <span className="vip-gauge__asof">{formatCheckedAt()}時点</span>
                </span>
            </div>

            {status ? (
                <>
                    <div className="vip-gauge__track">
                        <div className="vip-gauge__fill" style={{ width: `${Math.round(status.ratio * 100)}%` }} />
                        <div className="vip-gauge__marker" />
                    </div>
                    <div className="vip-gauge__foot">
                        <span className="vip-gauge__current">{status.gsp.toLocaleString()}</span>
                        {status.reached ? (
                            <span className="vip-gauge__result is-reached">
                                VIP到達 +{status.diff.toLocaleString()}
                            </span>
                        ) : (
                            <span className="vip-gauge__result">
                                あと <strong>{status.remaining.toLocaleString()}</strong>
                            </span>
                        )}
                    </div>
                </>
            ) : (
                <div className="vip-gauge__foot">
                    <span className="vip-gauge__empty">戦闘力を記録すると、ボーダーまでの距離が出ます</span>
                </div>
            )}
        </div>
    );
}
