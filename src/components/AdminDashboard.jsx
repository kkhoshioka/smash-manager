import React, { useState, useEffect } from 'react';
import { Users, Swords, Trophy, Activity, RefreshCw } from 'lucide-react';
import { fighters } from '../data/fighters';

export default function AdminDashboard({ auth }) {
    const [stats, setStats] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const fetchAdminStats = async () => {
        if (!auth || !auth.token) return;
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/admin', {
                headers: {
                    'Authorization': `Bearer ${auth.token}`
                }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to fetch admin stats');
            
            setStats(data.stats);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminStats();
    }, [auth]);

    if (isLoading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                <RefreshCw className="spin" size={32} style={{ marginBottom: '1rem', color: 'var(--smash-yellow)' }} />
                <p>グローバルデータを集計中...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--lose-color)' }}>
                <h3>エラーが発生しました</h3>
                <p>{error}</p>
                <button onClick={fetchAdminStats} className="btn-smash" style={{ marginTop: '1rem' }}>再試行</button>
            </div>
        );
    }

    return (
        <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ backgroundColor: 'rgba(255, 204, 0, 0.1)', border: '1px solid var(--smash-yellow)', padding: '1.5rem', borderRadius: '8px' }}>
                <h2 style={{ color: 'var(--smash-yellow)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
                    <Trophy size={24} /> 管理者ダッシュボード
                </h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    アプリ全体（全ユーザー合算）の戦績データ・統計情報を表示しています。
                </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div className="stat-card" style={{ padding: '1.5rem', borderBottomColor: '#00ccff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#00ccff', marginBottom: '0.5rem' }}>
                        <Users size={20} />
                        <h3 style={{ margin: 0 }}>総ユーザー数</h3>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>
                        {stats?.totalUsers || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>人</span>
                    </div>
                </div>

                <div className="stat-card" style={{ padding: '1.5rem', borderBottomColor: 'var(--win-color)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--win-color)', marginBottom: '0.5rem' }}>
                        <Swords size={20} />
                        <h3 style={{ margin: 0 }}>総記録試合数</h3>
                    </div>
                    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: 'white' }}>
                        {stats?.totalMatches?.toLocaleString() || 0} <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>試合</span>
                    </div>
                </div>
            </div>

            <div className="stat-card" style={{ borderBottomColor: 'var(--smash-yellow)' }}>
                <h2 className="section-title" style={{ borderColor: 'var(--smash-yellow)', marginTop: 0 }}>
                    <Activity size={24} style={{ marginRight: '0.8rem', color: 'var(--smash-yellow)' }} />
                    グローバル使用率ランキング (TOP10)
                </h2>
                <div style={{ padding: '1rem' }}>
                    {stats?.popularFighters?.length > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {stats.popularFighters.map((item, index) => {
                                const fObj = fighters.find(f => f.id === item.fighter) || fighters.find(f => f.name === item.fighter);
                                const displayName = fObj ? fObj.name : item.fighter;
                                const displayImg = fObj ? fObj.imageUrl : `/fighters/${item.fighter}.png`;
                                return (
                                <div key={item.fighter} style={{ 
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                    padding: '0.8rem', backgroundColor: '#1a1e29', borderRadius: '4px',
                                    borderLeft: `4px solid ${index < 3 ? 'var(--smash-yellow)' : '#333'}`
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <span style={{ 
                                            fontWeight: 'bold', 
                                            color: index === 0 ? 'gold' : index === 1 ? 'silver' : index === 2 ? '#cd7f32' : 'var(--text-muted)' 
                                        }}>
                                            #{index + 1}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <img src={displayImg} alt="" style={{ width: '32px', height: '32px', objectFit: 'contain' }} onError={(e) => { e.target.style.display = 'none'; }} />
                                            <span style={{ fontWeight: 'bold', color: 'white' }}>{displayName}</span>
                                        </div>
                                    </div>
                                    <div style={{ fontWeight: 'bold', color: 'var(--text-main)' }}>
                                        {item.count.toLocaleString()} 回
                                    </div>
                                </div>
                            )})}
                        </div>
                    ) : (
                        <p style={{ color: 'var(--text-muted)', textAlign: 'center' }}>データがありません</p>
                    )}
                </div>
            </div>

            <div style={{ textAlign: 'center' }}>
                <button onClick={fetchAdminStats} className="btn-smash" style={{ background: '#333', padding: '0.8rem 2rem' }}>
                    <div style={{ transform: 'skewX(20deg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <RefreshCw size={16} /> 最新データに更新
                    </div>
                </button>
            </div>
        </div>
    );
}
