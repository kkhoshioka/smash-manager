import React, { useMemo, useEffect, useState } from 'react';
import { fighters } from '../data/fighters';

export default function ObsOverlay() {
    const [history, setHistory] = useState([]);
    const [prefs, setPrefs] = useState({ lastMyFighter: null, fighterGsp: {} });

    useEffect(() => {
        // 初期ロード & 定期取得 (クラウド対応)
        const loadLocal = async () => {
            // URLから合言葉パラメータを取得 (?obs=true&syncId=xxxx)
            const params = new URLSearchParams(window.location.search);
            const urlSyncId = params.get('syncId') || params.get('sync');

            if (urlSyncId) {
                // クラウドからデータ取得 (OBSのキャッシュを回避するためにタイムスタンプを付与)
                try {
                    const response = await fetch(`/api/load?syncId=${encodeURIComponent(urlSyncId)}&t=${Date.now()}`);
                    const result = await response.json();
                    if (result.success && result.data) {
                        if (result.data.history) setHistory(result.data.history);
                        if (result.data.prefs) setPrefs(result.data.prefs);
                    }
                } catch (err) {
                    console.error("OBS Cloud Sync Error:", err);
                }
            } else {
                // ローカル環境からの取得 (同一ブラウザ用)
                const savedHistory = localStorage.getItem('smash_logger_history');
                const savedPrefs = localStorage.getItem('smash_logger_prefs');
                
                if (savedHistory) setHistory(JSON.parse(savedHistory));
                if (savedPrefs) setPrefs(JSON.parse(savedPrefs));
            }
        };
        
        loadLocal();

        // 別タブからの更新検知 (ローカル用)
        const handleStorageChange = (e) => {
            if (e.key === 'smash_logger_history' || e.key === 'smash_logger_prefs') {
                loadLocal();
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // ポーリング (クラウド/ローカル更新兼用)
        const intervalId = setInterval(loadLocal, 3000);

        // 背景を透過にするためにbodyのスタイルを上書き
        document.body.style.backgroundColor = 'transparent';
        document.body.style.backgroundImage = 'none';
        document.documentElement.style.setProperty('--bg-image', 'none');
        document.body.classList.add('obs-mode-body');

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(intervalId);
            document.body.style.backgroundColor = '';
            document.body.classList.remove('obs-mode-body');
        };
    }, []);

    const currentMyFighter = prefs.lastMyFighter;
    const myFighterObj = currentMyFighter ? fighters.find(f => f.id === currentMyFighter) : null;

    const filteredHistory = useMemo(() => {
        const filtered = currentMyFighter ? history.filter(m => m.myFighter === currentMyFighter) : history;
        return [...filtered].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
    }, [history, currentMyFighter]);

    const latestGsp = useMemo(() => {
        if (!currentMyFighter) return null;
        const latestWithGsp = filteredHistory.find(m => m.gsp);
        if (latestWithGsp) return latestWithGsp.gsp;
        return prefs.fighterGsp?.[currentMyFighter] || null;
    }, [filteredHistory, currentMyFighter, prefs.fighterGsp]);

    const highestGsp = useMemo(() => {
        if (!currentMyFighter) return null;
        let max = 0;
        filteredHistory.forEach(m => {
            if (m.gsp && m.gsp > max) max = m.gsp;
        });
        return max > 0 ? max : null;
    }, [filteredHistory, currentMyFighter]);

    const todaysStats = useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let wins = 0;
        let total = 0;
        let currentStreak = 0;

        filteredHistory.forEach(m => {
            const mDate = new Date(m.timestamp);
            if (mDate >= today) {
                total++;
                if (m.result === 'win') wins++;
            }
        });

        let streakType = null;
        for (let i = 0; i < filteredHistory.length; i++) {
            if (i === 0) streakType = filteredHistory[i].result;
            
            if (filteredHistory[i].result === streakType) {
                currentStreak++;
                if (filteredHistory[i].notes && filteredHistory[i].notes.includes('追加された700試合') && currentStreak > 10) {
                    currentStreak = 10;
                }
            } else {
                break;
            }
        }

        return { wins, losses: total - wins, total, currentStreak, streakType };
    }, [filteredHistory]);

    const currentOpponentFighter = useMemo(() => {
        return prefs.currentOpponentForObs ? fighters.find(f => f.id === prefs.currentOpponentForObs) : null;
    }, [prefs.currentOpponentForObs]);

    const currentMatchupStats = useMemo(() => {
        if (!currentOpponentFighter || !currentMyFighter) return null;
        const matches = filteredHistory.filter(m => m.opponentFighter === currentOpponentFighter.id);
        const wins = matches.filter(m => m.result === 'win').length;
        const total = matches.length;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        return { wins, losses: total - wins, total, winRate };
    }, [filteredHistory, currentOpponentFighter, currentMyFighter]);

    const recent3Matches = useMemo(() => {
        if (currentOpponentFighter) return [];
        return filteredHistory.slice(0, 3).map(m => {
            const opponentFighter = fighters.find(f => f.id === m.opponentFighter);
            const matches = filteredHistory.filter(mh => mh.opponentFighter === m.opponentFighter);
            const wins = matches.filter(mh => mh.result === 'win').length;
            const total = matches.length;
            const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
            return { ...m, opponentFighterObj: opponentFighter, stats: { wins, losses: total - wins, total, winRate } };
        });
    }, [filteredHistory, currentOpponentFighter]);

    if (!myFighterObj) {
        return (
            <div className="obs-overlay" style={{ alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'var(--text-muted)', fontWeight: 'bold' }}>待機中...</div>
            </div>
        );
    }

    return (
        <div className="obs-overlay">
            {/* Header: Player Info */}
            <div className="obs-section" style={{ borderBottom: '3px solid var(--smash-red)' }}>
                <div className="obs-subtitle">現在のファイター</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.5rem' }}>
                    <img src={myFighterObj.imageUrl} alt={myFighterObj.name} style={{ width: '45px', height: '45px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} onError={(e) => e.target.style.display = 'none'} />
                    <div style={{ fontSize: '1.4rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '2px 2px 0 #000' }}>
                        {myFighterObj.name}
                    </div>
                </div>
            </div>

            {/* Current & Highest GSP */}
            <div className="obs-section" style={{ borderBottom: '3px solid var(--smash-yellow)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <div className="obs-subtitle" style={{ color: 'var(--text-muted)' }}>現在の世界戦闘力</div>
                        <div className="obs-value" style={{ color: 'var(--smash-yellow)' }}>
                            {latestGsp ? latestGsp.toLocaleString() : '-'}
                        </div>
                    </div>
                    <div>
                        <div className="obs-subtitle" style={{ color: 'var(--text-muted)' }}>最高世界戦闘力</div>
                        <div className="obs-value" style={{ color: 'var(--win-color)', fontSize: '1.4rem' }}>
                            {highestGsp ? highestGsp.toLocaleString() : '-'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Today's Stats */}
            <div className="obs-section" style={{ borderBottom: '3px solid #00ccff' }}>
                <div className="obs-subtitle">本日の戦績</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '0.5rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', fontWeight: '900', fontSize: '1.5rem', fontFamily: 'var(--font-en)' }}>
                        <span style={{ color: 'var(--win-color)' }}>{todaysStats.wins}勝</span>
                        <span style={{ color: 'var(--text-muted)' }}>-</span>
                        <span style={{ color: 'var(--lose-color)' }}>{todaysStats.losses}敗</span>
                    </div>
                </div>
                {todaysStats.currentStreak >= 1 && todaysStats.streakType && (
                    <div style={{ marginTop: '0.5rem', color: todaysStats.streakType === 'win' ? 'var(--smash-red)' : '#00ccff', fontWeight: '900', fontStyle: 'italic', fontSize: '1.1rem', background: '#222', padding: '0.2rem 0.5rem', display: 'inline-block', clipPath: 'polygon(5px 0, 100% 0, calc(100% - 5px) 100%, 0 100%)' }}>
                        {todaysStats.streakType === 'win' ? '🔥' : '💀'} {todaysStats.currentStreak}{todaysStats.streakType === 'win' ? '連勝中!' : '連敗中...'}
                    </div>
                )}
            </div>

            {/* Opponent Section */}
            {(currentOpponentFighter || recent3Matches.length > 0) && (
                <div className="obs-section" style={{ borderBottom: '3px solid var(--text-muted)' }}>
                    <div className="obs-subtitle">{currentOpponentFighter ? '選択中の対戦相手' : '直近の対戦相手 (3試合)'}</div>
                    
                    {currentOpponentFighter ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: '0.5rem' }}>
                            <img 
                                src={currentOpponentFighter.imageUrl} 
                                alt={currentOpponentFighter.name} 
                                style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} 
                                onError={(e) => e.target.style.display = 'none'} 
                            />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '2px 2px 0 #000' }}>
                                    {currentOpponentFighter.name}
                                </span>
                                
                                {currentMatchupStats && (
                                    <div style={{ fontSize: '0.95rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                        {currentMatchupStats.total > 0 ? (
                                            <>
                                                <span style={{color: 'var(--win-color)', fontFamily: 'var(--font-en)', fontSize: '1.2rem'}}>{currentMatchupStats.wins}<span style={{fontSize:'0.8rem',fontFamily:'var(--font-jp)'}}>勝</span></span>
                                                <span style={{margin:'0 4px'}}>-</span>
                                                <span style={{color: 'var(--lose-color)', fontFamily: 'var(--font-en)', fontSize: '1.2rem'}}>{currentMatchupStats.losses}<span style={{fontSize:'0.8rem',fontFamily:'var(--font-jp)'}}>敗</span></span>
                                                <span style={{marginLeft: '0.5rem', fontFamily: 'var(--font-en)', fontSize: '1rem'}}>({currentMatchupStats.winRate}%)</span>
                                            </>
                                        ) : <span style={{fontSize: '0.9rem', color: 'var(--smash-yellow)'}}>初対戦！</span>}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
                            {recent3Matches.map((match, i) => match.opponentFighterObj && (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                                    <img 
                                        src={match.opponentFighterObj.imageUrl} 
                                        alt={match.opponentFighterObj.name} 
                                        style={{ width: '30px', height: '30px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} 
                                        onError={(e) => e.target.style.display = 'none'} 
                                    />
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                            <span style={{ fontSize: '1rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '2px 2px 0 #000', lineHeight: 1 }}>
                                                {match.opponentFighterObj.name}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', fontWeight: 'bold', backgroundColor: match.result === 'win' ? 'var(--win-color)' : 'var(--lose-color)', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontFamily: 'var(--font-en)', lineHeight: 1 }}>
                                                {match.result === 'win' ? 'W' : 'L'}
                                            </span>
                                        </div>
                                        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: 'var(--text-muted)' }}>
                                            <span style={{color: 'var(--win-color)', fontFamily: 'var(--font-en)'}}>{match.stats.wins}勝</span>
                                            <span style={{margin:'0 3px'}}>-</span>
                                            <span style={{color: 'var(--lose-color)', fontFamily: 'var(--font-en)'}}>{match.stats.losses}敗</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
