import React, { useMemo, useState, useRef } from 'react';
import { useMatchHistory } from '../hooks/useMatchHistory';
import { fighters } from '../data/fighters';
import { Trash2, Target, BarChart3, Clock, Edit2, Filter, Crosshair, Flame, CalendarDays, Sun, Moon, Calendar } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart } from 'recharts';

export default function Stats() {
    const { history, removeMatch, editMatch, prefs } = useMatchHistory();

    const [editingMatchId, setEditingMatchId] = useState(null);
    const [editForm, setEditForm] = useState({});
    const [showAllMatchups, setShowAllMatchups] = useState(false);

    const handleEditClick = (match) => {
        setEditingMatchId(match.id);
        setEditForm({
            result: match.result || 'win',
            gsp: match.gsp || '',
            myKillMoves: match.myKillMoves ? match.myKillMoves.join(', ') : (match.killMove || ''),
            opponentKillMoves: match.opponentKillMoves ? match.opponentKillMoves.join(', ') : '',
            notes: match.notes || ''
        });
    };

    const handleSaveEdit = () => {
        if (editingMatchId) {
            const finalEditForm = {
                ...editForm,
                gsp: editForm.gsp ? parseInt(editForm.gsp, 10) : null,
                myKillMoves: editForm.myKillMoves && typeof editForm.myKillMoves === 'string' ? editForm.myKillMoves.split(',').map(s => s.trim()).filter(Boolean) : [],
                opponentKillMoves: editForm.opponentKillMoves && typeof editForm.opponentKillMoves === 'string' ? editForm.opponentKillMoves.split(',').map(s => s.trim()).filter(Boolean) : [],
                killMove: null
            };
            editMatch(editingMatchId, finalEditForm);
            setEditingMatchId(null);
        }
    };

    const handleCancelEdit = () => {
        setEditingMatchId(null);
    };

    const handleEditChange = (e) => {
        const { name, value } = e.target;
        setEditForm(prev => ({ ...prev, [name]: value }));
    };


    const [selectedMyFighter, setSelectedMyFighter] = useState(prefs.lastMyFighter || 'all');

    const myFightersPlayed = useMemo(() => {
        const uniqueIds = [...new Set(history.map(m => m.myFighter))].filter(Boolean);
        if (selectedMyFighter !== 'all' && !uniqueIds.includes(selectedMyFighter)) {
            uniqueIds.push(selectedMyFighter);
        }
        return uniqueIds.map(id => fighters.find(f => f.id === id)).filter(Boolean);
    }, [history, selectedMyFighter]);

    const filteredHistory = useMemo(() => {
        if (selectedMyFighter === 'all') return history;
        return history.filter(m => m.myFighter === selectedMyFighter);
    }, [history, selectedMyFighter]);

    const totalMatches = filteredHistory.length;
    const wins = filteredHistory.filter(m => m.result === 'win').length;
    const winRate = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

    // Latest GSP for selected fighter
    const latestGsp = useMemo(() => {
        if (selectedMyFighter !== 'all' && prefs.fighterGsp?.[selectedMyFighter]) {
            return prefs.fighterGsp[selectedMyFighter];
        }
        return null;
    }, [selectedMyFighter, prefs.fighterGsp]);

    const opponentStats = useMemo(() => {
        const stats = {};
        filteredHistory.forEach(m => {
            const opp = m.opponentFighter;
            if (!stats[opp]) stats[opp] = { total: 0, wins: 0 };
            stats[opp].total += 1;
            if (m.result === 'win') stats[opp].wins += 1;
        });

        return Object.entries(stats)
            .map(([id, data]) => ({
                id,
                fighterObj: fighters.find(f => f.id === id),
                total: data.total,
                winRate: Math.round((data.wins / data.total) * 100)
            }))
            .sort((a, b) => b.total - a.total);
    }, [filteredHistory]);

    const opponentChartData = useMemo(() => {
        return opponentStats.slice(0, 15).map(stat => ({
            name: stat.fighterObj?.name || '不明',
            '対戦回数': stat.total,
            '勝率(%)': stat.winRate
        }));
    }, [opponentStats]);

    const gspChartData = useMemo(() => {
        const sortedHistory = [...filteredHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        return sortedHistory
            .filter(m => m.gsp)
            .map((m, i) => {
                const dateObj = new Date(m.timestamp);
                return {
                    index: i + 1,
                    uniqueId: `${dateObj.getTime()}-${i}`,
                    date: dateObj.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
                    time: dateObj.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
                    GSP: Number(m.gsp),
                    opponent: fighters.find(f => f.id === m.opponentFighter)?.name || 'Unknown',
                    result: m.result
                };
            });
    }, [filteredHistory]);

    const myKillMoveRanking = useMemo(() => {
        const counts = {};
        filteredHistory.forEach(m => {
            const moves = m.myKillMoves || (m.killMove ? [m.killMove] : []);
            moves.forEach(move => {
                if (move) counts[move] = (counts[move] || 0) + 1;
            });
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(([name, count]) => ({ name, count }))
            .slice(0, 10);
    }, [filteredHistory]);

    const advancedStats = useMemo(() => {
        if (filteredHistory.length === 0) return null;

        const chronologicalHistory = [...filteredHistory].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

        let currentStreak = 0;
        let maxStreak = 0;
        let currentLossStreak = 0;
        let maxLossStreak = 0;

        const timeStats = {
            morning: { label: '朝', icon: <Sun size={20} />, total: 0, wins: 0 },
            afternoon: { label: '昼', icon: <Sun size={20} />, total: 0, wins: 0 },
            evening: { label: '夜', icon: <Moon size={20} />, total: 0, wins: 0 },
            night: { label: '深夜', icon: <Moon size={20} />, total: 0, wins: 0 },
        };

        const dailyMap = {};

        chronologicalHistory.forEach(m => {
            // Streaks
            if (m.result === 'win') {
                currentStreak++;
                currentLossStreak = 0;
                if (currentStreak > maxStreak) maxStreak = currentStreak;
            } else {
                currentLossStreak++;
                currentStreak = 0;
                if (currentLossStreak > maxLossStreak) maxLossStreak = currentLossStreak;
            }

            const dateObj = new Date(m.timestamp);
            const hour = dateObj.getHours();

            // Time of day
            if (hour >= 6 && hour < 12) { timeStats.morning.total++; if (m.result === 'win') timeStats.morning.wins++; }
            else if (hour >= 12 && hour < 18) { timeStats.afternoon.total++; if (m.result === 'win') timeStats.afternoon.wins++; }
            else if (hour >= 18 && hour <= 23) { timeStats.evening.total++; if (m.result === 'win') timeStats.evening.wins++; }
            else { timeStats.night.total++; if (m.result === 'win') timeStats.night.wins++; }

            // Daily Stats
            const dateStr = dateObj.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
            if (!dailyMap[dateStr]) {
                dailyMap[dateStr] = { date: dateStr, total: 0, wins: 0, startGsp: m.gsp || null, endGsp: m.gsp || null };
            }
            dailyMap[dateStr].total++;
            if (m.result === 'win') dailyMap[dateStr].wins++;
            if (m.gsp) {
                if (dailyMap[dateStr].startGsp === null) dailyMap[dateStr].startGsp = m.gsp;
                dailyMap[dateStr].endGsp = m.gsp;
            }
        });

        const recentDays = Object.values(dailyMap).slice(-7).reverse();

        const getWinRate = (wins, total) => total > 0 ? Math.round((wins / total) * 100) : 0;

        const bestTime = Object.values(timeStats)
            .filter(t => t.total >= 3)
            .sort((a, b) => getWinRate(b.wins, b.total) - getWinRate(a.wins, a.total))[0];

        return {
            maxStreak,
            maxLossStreak,
            currentStreak,
            timeStats,
            bestTime,
            recentDays
        };
    }, [filteredHistory]);

    return (
        <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Fighter Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', backgroundColor: '#111', clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)', border: '2px solid #444' }}>
                <Filter size={24} color="var(--smash-red)" />
                <span style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '1.2rem', fontFamily: 'var(--font-jp)' }}>
                    分析対象:
                </span>
                <select
                    value={selectedMyFighter}
                    onChange={(e) => setSelectedMyFighter(e.target.value)}
                    style={{ padding: '0.8rem', backgroundColor: '#222', color: 'white', border: '2px solid var(--smash-red)', flex: 1, cursor: 'pointer', outline: 'none', fontSize: '1.1rem', fontWeight: 'bold' }}
                >
                    <option value="all">全ファイター</option>
                    {myFightersPlayed.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
            </div>

            {/* Overview Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="stat-card" style={{ textAlign: 'center', borderBottomColor: '#444' }}>
                    <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-jp)' }}>総試合数</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '4px 4px 0 #000', fontFamily: 'var(--font-en)' }}>{totalMatches}</div>
                </div>
                <div className="stat-card" style={{ textAlign: 'center', borderBottomColor: 'var(--smash-yellow)' }}>
                    <div style={{ fontSize: '1.2rem', color: 'var(--smash-yellow)', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-jp)' }}>勝率</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '900', color: 'var(--smash-yellow)', textShadow: '4px 4px 0 #000', fontFamily: 'var(--font-en)' }}>
                        {totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0}%
                    </div>
                </div>
                {selectedMyFighter !== 'all' && latestGsp && (
                    <div className="stat-card" style={{ textAlign: 'center', borderBottomColor: 'var(--win-color)' }}>
                        <div style={{ fontSize: '1.2rem', color: 'var(--win-color)', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-jp)' }}>最新戦闘力</div>
                        <div style={{ fontSize: '3.5rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '4px 4px 0 #000', fontFamily: 'var(--font-en)' }}>
                            {latestGsp.toLocaleString()}
                        </div>
                    </div>
                )}
            </div>

            <div className="smash-divider" />

            {/* Advanced Stats */}
            {advancedStats && (
                <>
                    <h2 className="section-title">詳細データ分析</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                        {/* 1. Win Streak */}
                        <div className="stat-card" style={{ borderBottomColor: 'var(--smash-red)', padding: '1.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--smash-red)', marginBottom: '1rem', fontWeight: '900', fontStyle: 'italic', fontSize: '1.2rem' }}>
                                <Flame size={20} /> 連勝記録
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>最大連勝</span>
                                <span style={{ fontSize: '1.8rem', fontWeight: '900', fontFamily: 'var(--font-en)' }}>{advancedStats.maxStreak}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>現在の連勝</span>
                                <span style={{ fontSize: '1.8rem', fontWeight: '900', fontFamily: 'var(--font-en)', color: advancedStats.currentStreak > 0 ? 'var(--smash-yellow)' : 'inherit' }}>{advancedStats.currentStreak}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>最大連敗</span>
                                <span style={{ fontSize: '1.2rem', fontWeight: 'bold', fontFamily: 'var(--font-en)', color: 'var(--lose-color)' }}>{advancedStats.maxLossStreak}</span>
                            </div>
                        </div>

                        {/* 2. Best Time to Play */}
                        {advancedStats.bestTime && (
                            <div className="stat-card" style={{ borderBottomColor: 'var(--smash-yellow)', padding: '1.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--smash-yellow)', marginBottom: '1rem', fontWeight: '900', fontStyle: 'italic', fontSize: '1.2rem' }}>
                                    <Clock size={20} /> 勝率の最も高い時間帯
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ backgroundColor: '#222', padding: '0.8rem', borderRadius: '50%', color: 'var(--smash-yellow)' }}>
                                        {advancedStats.bestTime.icon}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.5rem', fontWeight: '900', fontFamily: 'var(--font-jp)' }}>{advancedStats.bestTime.label}</div>
                                        <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>勝率: {Math.round((advancedStats.bestTime.wins / advancedStats.bestTime.total) * 100)}% ({advancedStats.bestTime.total}戦)</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* 3. Daily Performance */}
                    {advancedStats.recentDays.length > 0 && (
                        <div className="stat-card" style={{ borderBottomColor: 'var(--text-main)', padding: '1.5rem', marginBottom: '2rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)', marginBottom: '1.5rem', fontWeight: '900', fontStyle: 'italic', fontSize: '1.2rem' }}>
                                <CalendarDays size={20} /> 最近の日毎データ (直近7日)
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', minWidth: '600px' }}>
                                    <thead>
                                        <tr style={{ backgroundColor: '#1a1a1a', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <th style={{ padding: '0.8rem', borderBottom: '2px solid #444' }}>日付</th>
                                            <th style={{ padding: '0.8rem', borderBottom: '2px solid #444' }}>試合数</th>
                                            <th style={{ padding: '0.8rem', borderBottom: '2px solid #444' }}>勝率</th>
                                            <th style={{ padding: '0.8rem', borderBottom: '2px solid #444' }}>戦闘力 最終推移</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {advancedStats.recentDays.map((day, i) => {
                                            const winRate = day.total > 0 ? Math.round((day.wins / day.total) * 100) : 0;
                                            const gspDiff = (day.endGsp && day.startGsp) ? day.endGsp - day.startGsp : 0;
                                            const gspColor = gspDiff > 0 ? 'var(--win-color)' : (gspDiff < 0 ? 'var(--lose-color)' : 'var(--text-muted)');
                                            return (
                                                <tr key={i} style={{ borderBottom: '1px solid #333', backgroundColor: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                                                    <td style={{ padding: '1rem', fontWeight: 'bold' }}>{day.date}</td>
                                                    <td style={{ padding: '1rem', fontFamily: 'var(--font-en)', fontWeight: 'bold' }}>{day.total} 戦</td>
                                                    <td style={{ padding: '1rem', fontFamily: 'var(--font-en)', fontWeight: 'bold', color: winRate >= 60 ? 'var(--smash-yellow)' : 'inherit' }}>{winRate}%</td>
                                                    <td style={{ padding: '1rem', fontFamily: 'var(--font-en)', fontWeight: 'bold', color: gspColor }}>
                                                        {gspDiff > 0 ? '+' : ''}{gspDiff !== 0 ? gspDiff.toLocaleString() : '-'}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    <div className="smash-divider" />
                </>
            )}

            {/* GSP History Chart */}
            {gspChartData.length > 0 && (
                <div className="stat-card" style={{ borderBottomColor: 'var(--win-color)', padding: '2rem' }}>
                    <h2 className="section-title" style={{ borderColor: 'var(--win-color)', marginTop: 0 }}>世界戦闘力(GSP) 推移</h2>
                    <div style={{ width: '100%', height: 300, marginTop: '2rem' }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={gspChartData} margin={{ top: 20, right: 10, bottom: 20, left: 10 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                                <XAxis
                                    dataKey="uniqueId"
                                    stroke="var(--text-muted)"
                                    fontSize={12}
                                    fontWeight="bold"
                                    tickFormatter={(value) => {
                                        const point = gspChartData.find(d => d.uniqueId === value);
                                        return point ? point.date : value;
                                    }}
                                />
                                <YAxis stroke="var(--text-muted)" fontSize={12} fontWeight="bold" domain={['dataMin - 50000', 'dataMax + 50000']} tickFormatter={(value) => (value / 10000).toFixed(0) + '万'} />
                                <Tooltip
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            const data = payload[0].payload;
                                            return (
                                                <div style={{ backgroundColor: '#111', border: '2px solid var(--win-color)', padding: '15px', color: 'white', clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}>
                                                    <p style={{ margin: 0, fontWeight: 'bold', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{data.date} {data.time}</p>
                                                    <p style={{ margin: '8px 0', fontSize: '1.4rem', fontWeight: '900', color: 'var(--win-color)', fontFamily: 'var(--font-en)' }}>
                                                        GSP: {data.GSP.toLocaleString()}
                                                    </p>
                                                    <p style={{ margin: 0, fontSize: '1rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold' }}>
                                                        <span style={{ color: data.result === 'win' ? 'var(--win-color)' : 'var(--lose-color)', fontFamily: 'var(--font-en)', fontStyle: 'italic' }}>
                                                            {data.result === 'win' ? 'WIN' : 'LOSE'}
                                                        </span>
                                                        vs {data.opponent}
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                />
                                <Legend wrapperStyle={{ paddingTop: '15px' }} />
                                <Line type="monotone" dataKey="GSP" stroke="var(--win-color)" strokeWidth={4} dot={{ r: 2, fill: '#111', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'var(--win-color)' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Fighter Matchups */}
            {opponentStats.length > 0 && (
                <>
                    <h2 className="section-title">対戦カード分析</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>

                        {/* Frequent Matchups */}
                        <div className="stat-card" style={{ borderBottomColor: 'var(--text-muted)', padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-main)', marginBottom: '1.5rem', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-jp)' }}>よく戦う相手</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[...opponentStats].sort((a, b) => b.total - a.total).slice(0, showAllMatchups ? undefined : 5).map((stat, i) => (
                                    <div key={`freq-${stat.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', backgroundColor: '#111', borderLeft: '4px solid var(--text-muted)', clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ fontWeight: '900', color: 'var(--text-muted)', width: '20px', fontFamily: 'var(--font-en)' }}>{i + 1}</span>
                                            <img src={stat.fighterObj?.imageUrl} alt={stat.fighterObj?.name} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} onError={(e) => e.target.style.display = 'none'} />
                                            <span style={{ fontWeight: '900', textShadow: '2px 2px 0 #000' }}>{stat.fighterObj?.name || '不明'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>{stat.total} 戦</span>
                                            <span style={{ fontWeight: '900', fontFamily: 'var(--font-en)', width: '60px', textAlign: 'right', color: 'var(--text-muted)', fontSize: '1.2rem' }}>
                                                {stat.winRate}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Best Matchups */}
                        <div className="stat-card" style={{ borderBottomColor: 'var(--win-color)', padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--win-color)', marginBottom: '1.5rem', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-jp)' }}>得意な相手</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[...opponentStats].sort((a, b) => b.winRate - a.winRate || b.total - a.total).slice(0, showAllMatchups ? undefined : 5).map((stat, i) => (
                                    <div key={`best-${stat.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', backgroundColor: 'rgba(0, 204, 255, 0.1)', borderLeft: '4px solid var(--win-color)', clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ fontWeight: '900', color: 'var(--win-color)', width: '20px', fontFamily: 'var(--font-en)' }}>{i + 1}</span>
                                            <img src={stat.fighterObj?.imageUrl} alt={stat.fighterObj?.name} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} onError={(e) => e.target.style.display = 'none'} />
                                            <span style={{ fontWeight: '900', textShadow: '2px 2px 0 #000' }}>{stat.fighterObj?.name || '不明'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>{stat.total} 戦</span>
                                            <span style={{ fontWeight: '900', fontFamily: 'var(--font-en)', width: '60px', textAlign: 'right', color: 'var(--win-color)', fontSize: '1.2rem' }}>
                                                {stat.winRate}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Worst Matchups */}
                        <div className="stat-card" style={{ borderBottomColor: 'var(--lose-color)', padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--lose-color)', marginBottom: '1.5rem', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-jp)' }}>苦手な相手</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[...opponentStats].sort((a, b) => a.winRate - b.winRate || b.total - a.total).slice(0, showAllMatchups ? undefined : 5).map((stat, i) => (
                                    <div key={`worst-${stat.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', backgroundColor: 'rgba(255, 51, 51, 0.1)', borderLeft: '4px solid var(--lose-color)', clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ fontWeight: '900', color: 'var(--lose-color)', width: '20px', fontFamily: 'var(--font-en)' }}>{i + 1}</span>
                                            <img src={stat.fighterObj?.imageUrl} alt={stat.fighterObj?.name} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} onError={(e) => e.target.style.display = 'none'} />
                                            <span style={{ fontWeight: '900', textShadow: '2px 2px 0 #000' }}>{stat.fighterObj?.name || '不明'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>{stat.total} 戦</span>
                                            <span style={{ fontWeight: '900', fontFamily: 'var(--font-en)', width: '60px', textAlign: 'right', color: 'var(--lose-color)', fontSize: '1.2rem' }}>
                                                {stat.winRate}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Show All Matchups Button */}
                    {opponentStats.length > 5 && (
                        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                            <button
                                onClick={() => setShowAllMatchups(!showAllMatchups)}
                                style={{
                                    backgroundColor: 'transparent',
                                    color: 'var(--smash-yellow)',
                                    border: '2px solid var(--smash-yellow)',
                                    padding: '0.8rem 2rem',
                                    fontSize: '1.1rem',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)',
                                    transition: 'all 0.2s',
                                    fontFamily: 'var(--font-jp)'
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--smash-yellow)';
                                    e.currentTarget.style.color = '#000';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'transparent';
                                    e.currentTarget.style.color = 'var(--smash-yellow)';
                                }}
                            >
                                {showAllMatchups ? '▲ 一部のみ表示 (TOP 5)' : '▼ すべてのファイターを表示'}
                            </button>
                        </div>
                    )}

                    {/* Kill Move Rankings */}
                    {myKillMoveRanking.length > 0 && (
                        <div className="stat-card" style={{ borderBottomColor: 'var(--smash-yellow)', marginTop: '2rem' }}>
                            <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', color: 'var(--smash-yellow)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-jp)' }}>
                                <Crosshair size={24} /> よく使う撃墜技
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {myKillMoveRanking.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: '1rem 1.5rem', border: '2px solid #444', clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}>
                                        <span style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '1.1rem' }}>{i + 1}. {item.name}</span>
                                        <span style={{ color: 'var(--smash-yellow)', fontWeight: '900', fontSize: '1.3rem', fontFamily: 'var(--font-en)' }}>{item.count} 回</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            <div className="smash-divider" />

            {/* Recent History */}
            <div className="animate-enter" style={{ animationDelay: '0.2s' }}>
                <h2 className="section-title">
                    直近の履歴
                </h2>
                {filteredHistory.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '3rem', backgroundColor: '#111', border: '2px dashed #444', fontWeight: 'bold' }}>
                        まだ対戦記録がありません。「記録する」タブから最初の試合を登録しましょう！
                    </p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredHistory.slice(0, 50).map((match, index) => {
                            const myFighter = fighters.find(f => f.id === match.myFighter);
                            const opponent = fighters.find(f => f.id === match.opponentFighter);
                            const isWin = match.result === 'win';
                            const date = new Date(match.timestamp);

                            return (
                                <div
                                    key={index}
                                    style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '1rem',
                                        padding: '1.5rem',
                                        backgroundColor: isWin ? 'rgba(0, 204, 255, 0.1)' : 'rgba(255, 51, 51, 0.1)',
                                        border: `2px solid ${isWin ? 'var(--win-color)' : 'var(--lose-color)'}`,
                                        borderLeftWidth: '8px',
                                        clipPath: 'polygon(0 0, 100% 0, calc(100% - 15px) 100%, 0 100%)',
                                        position: 'relative'
                                    }}
                                >
                                    {editingMatchId === match.id ? (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                            <div style={{ fontWeight: '900', color: 'var(--smash-yellow)', fontSize: '1.2rem' }}>記録の編集</div>
                                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 'bold' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>勝敗</span>
                                                    <select name="result" value={editForm.result} onChange={handleEditChange} style={{ padding: '0.8rem', fontSize: '1rem' }}>
                                                        <option value="win">WIN</option>
                                                        <option value="lose">LOSE</option>
                                                    </select>
                                                </label>
                                                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 'bold' }}>
                                                    <span style={{ color: 'var(--text-muted)' }}>世界戦闘力(GSP)</span>
                                                    <input type="number" name="gsp" value={editForm.gsp} onChange={handleEditChange} style={{ padding: '0.8rem', fontSize: '1rem' }} />
                                                </label>
                                            </div>
                                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 'bold' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>自分の撃墜技 (カンマ区切り)</span>
                                                <input type="text" name="myKillMoves" value={editForm.myKillMoves} onChange={handleEditChange} style={{ padding: '0.8rem', fontSize: '1rem' }} />
                                            </label>
                                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 'bold' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>相手の撃墜技 (カンマ区切り)</span>
                                                <input type="text" name="opponentKillMoves" value={editForm.opponentKillMoves} onChange={handleEditChange} style={{ padding: '0.8rem', fontSize: '1rem' }} />
                                            </label>
                                            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 'bold' }}>
                                                <span style={{ color: 'var(--text-muted)' }}>メモ</span>
                                                <textarea name="notes" value={editForm.notes} onChange={handleEditChange} rows="2" style={{ padding: '0.8rem', fontSize: '1rem', background: '#222', color: '#fff', border: '2px solid #555' }} />
                                            </label>
                                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                                <button onClick={handleSaveEdit} className="btn-smash" style={{ padding: '1rem', flex: 1, fontSize: '1.2rem' }}><div>保存</div></button>
                                                <button onClick={handleCancelEdit} style={{ padding: '1rem', flex: 1, backgroundColor: 'transparent', color: 'var(--text-main)', border: '2px solid #555', fontWeight: 'bold' }}>キャンセル</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                                    <span style={{
                                                        fontWeight: '900',
                                                        fontFamily: 'var(--font-en)',
                                                        fontStyle: 'italic',
                                                        color: isWin ? 'var(--win-color)' : 'var(--lose-color)',
                                                        fontSize: '2.5rem',
                                                        textShadow: '3px 3px 0 #000'
                                                    }}>
                                                        {isWin ? 'WIN' : 'LOSE'}
                                                    </span>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', backgroundColor: '#222', padding: '0.5rem 1.5rem', clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)' }}>
                                                        <img src={myFighter?.imageUrl} alt={myFighter?.name} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} onError={(e) => e.target.style.display = 'none'} />
                                                        <span style={{ fontSize: '1.2rem', fontWeight: '900', color: 'var(--smash-red)', fontStyle: 'italic', fontFamily: 'var(--font-en)' }}>VS</span>
                                                        <img src={opponent?.imageUrl} alt={opponent?.name} style={{ width: '50px', height: '50px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} onError={(e) => e.target.style.display = 'none'} />
                                                        <span style={{ fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '2px 2px 0 #000' }}>{opponent?.name}</span>
                                                    </div>
                                                </div>

                                                {/* GSP Box */}
                                                {match.gsp && (
                                                    <div style={{ backgroundColor: '#111', padding: '0.5rem 1.5rem', border: '2px solid #555', clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.9rem', color: 'var(--smash-yellow)', fontWeight: 'bold' }}>GSP</div>
                                                        <div style={{ fontFamily: 'var(--font-en)', fontSize: '2.2rem', fontWeight: '900', color: 'var(--text-main)' }}>
                                                            {match.gsp.toLocaleString()}
                                                        </div>
                                                    </div>
                                                )}

                                                <div style={{ display: 'flex', gap: '1rem' }}>
                                                    <button onClick={() => handleEditClick(match)} style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} title="編集" onMouseEnter={(e) => e.currentTarget.style.color = 'var(--win-color)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
                                                        <Edit2 size={24} />
                                                    </button>
                                                    <button onClick={() => removeMatch(match.id)} style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} title="削除" onMouseEnter={(e) => e.currentTarget.style.color = 'var(--smash-red)'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}>
                                                        <Trash2 size={24} />
                                                    </button>
                                                </div>
                                            </div>

                                            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: 'bold' }}>
                                                <span>{date.toLocaleDateString('ja-JP')} {date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</span>
                                                {match.rules && (
                                                    <span>{match.rules.stock} ストック / {match.rules.time}:00</span>
                                                )}
                                                {(match.myKillMoves?.length > 0 || match.killMove) && (
                                                    <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>自KO:</span>
                                                        {(match.myKillMoves || [match.killMove]).filter(Boolean).map((m, i) => (
                                                            <span key={`my-${i}`} style={{ backgroundColor: '#222', color: 'var(--smash-yellow)', padding: '2px 8px', border: '1px solid var(--smash-yellow)', fontWeight: 'bold' }}>
                                                                {m}
                                                            </span>
                                                        ))}
                                                    </span>
                                                )}
                                                {match.opponentKillMoves?.length > 0 && (
                                                    <span style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                                        <span style={{ color: 'var(--text-muted)' }}>被KO:</span>
                                                        {match.opponentKillMoves.map((m, i) => (
                                                            <span key={`opp-${i}`} style={{ backgroundColor: '#222', color: 'var(--smash-red)', padding: '2px 8px', border: '1px solid var(--smash-red)', fontWeight: 'bold' }}>
                                                                {m}
                                                            </span>
                                                        ))}
                                                    </span>
                                                )}
                                            </div>

                                            {match.notes && (
                                                <div style={{ marginTop: '0.5rem', fontSize: '1rem', color: 'var(--text-main)', backgroundColor: '#0a0a0a', borderLeft: '4px solid var(--text-muted)', padding: '1rem', fontWeight: 'bold' }}>
                                                    {match.notes}
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
