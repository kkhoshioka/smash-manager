import React, { useMemo, useState, useRef } from 'react';
import { useMatchHistory } from '../hooks/useMatchHistory';
import { fighters } from '../data/fighters';
import { Trash2, Target, BarChart3, Clock, Edit2, Filter, Crosshair, Download, Upload, Cloud } from 'lucide-react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart } from 'recharts';

export default function Stats() {
    const { history, removeMatch, editMatch, prefs, importData, syncId, handleSetSyncId, isSyncing, syncError } = useMatchHistory();
    const fileInputRef = useRef(null);

    const [editingMatchId, setEditingMatchId] = useState(null);
    const [editForm, setEditForm] = useState({});

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

    const handleExport = () => {
        const data = { history, prefs };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smash_logger_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const success = importData(event.target.result);
            if (success) {
                alert('データの読み込み（復元）が完了しました！');
            } else {
                alert('エラー：データの読み込みに失敗しました。正しいバックアップファイル形式か確認してください。');
            }
        };
        reader.readAsText(file);
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
            .slice(0, 5);
    }, [filteredHistory]);

    return (
        <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Fighter Filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.5rem', backgroundColor: '#111', clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)', border: '2px solid #444' }}>
                <Filter size={24} color="var(--smash-red)" />
                <span style={{ fontWeight: '900', color: 'var(--text-main)', fontSize: '1.2rem', fontFamily: 'var(--font-jp)' }}>
                    TARGET:
                </span>
                <select
                    value={selectedMyFighter}
                    onChange={(e) => setSelectedMyFighter(e.target.value)}
                    style={{ padding: '0.8rem', backgroundColor: '#222', color: 'white', border: '2px solid var(--smash-red)', flex: 1, cursor: 'pointer', outline: 'none', fontSize: '1.1rem', fontWeight: 'bold' }}
                >
                    <option value="all">ALL FIGHTERS</option>
                    {myFightersPlayed.map(f => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                </select>
            </div>

            {/* Overview Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="stat-card" style={{ textAlign: 'center', borderBottomColor: '#444' }}>
                    <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-en)' }}>TOTAL MATCHES</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '900', color: 'var(--text-main)', textShadow: '4px 4px 0 #000', fontFamily: 'var(--font-en)' }}>{totalMatches}</div>
                </div>
                <div className="stat-card" style={{ textAlign: 'center', borderBottomColor: 'var(--smash-yellow)' }}>
                    <div style={{ fontSize: '1.2rem', color: 'var(--smash-yellow)', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-en)' }}>WIN RATE</div>
                    <div style={{ fontSize: '3.5rem', fontWeight: '900', color: 'var(--smash-yellow)', textShadow: '4px 4px 0 #000', fontFamily: 'var(--font-en)' }}>
                        {totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0}%
                    </div>
                </div>
            </div>

            <div className="smash-divider" />

            {/* GSP History Chart */}
            {gspChartData.length > 0 && (
                <div className="stat-card" style={{ borderBottomColor: 'var(--win-color)', padding: '2rem' }}>
                    <h2 className="section-title" style={{ borderColor: 'var(--win-color)', marginTop: 0 }}>GSP HISTORY</h2>
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
                                <Line type="monotone" dataKey="GSP" stroke="var(--win-color)" strokeWidth={4} dot={{ r: 5, fill: '#111', strokeWidth: 3 }} activeDot={{ r: 8, fill: 'var(--win-color)' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            {/* Fighter Matchups */}
            {opponentStats.length > 0 && (
                <>
                    <h2 className="section-title">MATCHUPS</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                        {/* Best Matchups */}
                        <div className="stat-card" style={{ borderBottomColor: 'var(--win-color)', padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--win-color)', marginBottom: '1.5rem', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-en)' }}>FAVORITE OPPONENTS</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[...opponentStats].sort((a, b) => b.winRate - a.winRate || b.total - a.total).slice(0, 5).map((stat, i) => (
                                    <div key={`best-${stat.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', backgroundColor: 'rgba(0, 204, 255, 0.1)', borderLeft: '4px solid var(--win-color)', clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ fontWeight: '900', color: 'var(--win-color)', width: '20px', fontFamily: 'var(--font-en)' }}>{i + 1}</span>
                                            <img src={stat.fighterObj?.imageUrl} alt={stat.fighterObj?.name} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} onError={(e) => e.target.style.display = 'none'} />
                                            <span style={{ fontWeight: '900', textShadow: '2px 2px 0 #000' }}>{stat.fighterObj?.name || 'Unknown'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>{stat.total} MATCH</span>
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
                            <h3 style={{ fontSize: '1.4rem', color: 'var(--lose-color)', marginBottom: '1.5rem', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-en)' }}>TOUGH OPPONENTS</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {[...opponentStats].sort((a, b) => a.winRate - b.winRate || b.total - a.total).slice(0, 5).map((stat, i) => (
                                    <div key={`worst-${stat.id}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', backgroundColor: 'rgba(255, 51, 51, 0.1)', borderLeft: '4px solid var(--lose-color)', clipPath: 'polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                            <span style={{ fontWeight: '900', color: 'var(--lose-color)', width: '20px', fontFamily: 'var(--font-en)' }}>{i + 1}</span>
                                            <img src={stat.fighterObj?.imageUrl} alt={stat.fighterObj?.name} style={{ width: '40px', height: '40px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} onError={(e) => e.target.style.display = 'none'} />
                                            <span style={{ fontWeight: '900', textShadow: '2px 2px 0 #000' }}>{stat.fighterObj?.name || 'Unknown'}</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                            <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontWeight: 'bold' }}>{stat.total} MATCH</span>
                                            <span style={{ fontWeight: '900', fontFamily: 'var(--font-en)', width: '60px', textAlign: 'right', color: 'var(--lose-color)', fontSize: '1.2rem' }}>
                                                {stat.winRate}%
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Kill Move Rankings */}
                    {myKillMoveRanking.length > 0 && (
                        <div className="stat-card" style={{ borderBottomColor: 'var(--smash-yellow)', marginTop: '2rem' }}>
                            <h3 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', color: 'var(--smash-yellow)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-en)' }}>
                                <Crosshair size={24} /> TOP KILL MOVES
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {myKillMoveRanking.map((item, i) => (
                                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#111', padding: '1rem 1.5rem', border: '2px solid #444', clipPath: 'polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)' }}>
                                        <span style={{ color: 'var(--text-main)', fontWeight: 'bold', fontSize: '1.1rem' }}>{i + 1}. {item.name}</span>
                                        <span style={{ color: 'var(--smash-yellow)', fontWeight: '900', fontSize: '1.3rem', fontFamily: 'var(--font-en)' }}>{item.count} KO</span>
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
                    RECENT MATCHES
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
                                        backgroundColor: '#111',
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
                                                    <div style={{ backgroundColor: 'var(--bg-panel-light)', padding: '0.5rem 1.5rem', border: '2px solid #555', clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)', textAlign: 'center' }}>
                                                        <div style={{ fontSize: '0.8rem', color: 'var(--smash-yellow)', fontWeight: 'bold' }}>GSP</div>
                                                        <div style={{ fontFamily: 'var(--font-en)', fontSize: '1.5rem', fontWeight: '900', color: 'var(--text-main)' }}>
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
                                                    <span>{match.rules.stock} STOCKS / {match.rules.time}:00</span>
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

            <div className="smash-divider" />

            {/* Config & Data Section */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '2rem' }}>
                {/* Cloud Sync */}
                <div className="stat-card" style={{ borderBottomColor: 'var(--win-color)' }}>
                    <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--win-color)', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-en)' }}>
                        <Cloud size={24} /> CLOUD SYNC
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                        合言葉を設定して、スマートフォンとPC間でデータを同期します。
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input
                            type="text"
                            placeholder="合言葉（4文字以上）"
                            defaultValue={syncId}
                            onBlur={(e) => handleSetSyncId(e.target.value)}
                            style={{ padding: '1rem', fontSize: '1.1rem', textAlign: 'center' }}
                        />
                        <button
                            onClick={() => {
                                const val = document.querySelector('input[placeholder="合言葉（4文字以上）"]').value;
                                handleSetSyncId(val);
                            }}
                            disabled={isSyncing}
                            className="btn-smash"
                            style={{ padding: '1rem', fontSize: '1.2rem', background: isSyncing ? '#555' : 'var(--win-color)', width: '100%', clipPath: 'none' }}
                        >
                            {isSyncing ? '通信中...' : (syncId ? 'UPDATE SYNC ID' : 'START SYNC')}
                        </button>
                        {syncId && <div style={{ color: 'var(--win-color)', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' }}>✓ 同期オン: {syncId}</div>}
                        {syncError && <div style={{ color: 'var(--smash-red)', fontSize: '0.9rem', fontWeight: 'bold', textAlign: 'center' }}>⚠ {syncError}</div>}
                    </div>
                </div>

                {/* Local Backup */}
                <div className="stat-card" style={{ borderBottomColor: 'var(--text-muted)' }}>
                    <h2 style={{ fontSize: '1.4rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.8rem', color: 'var(--text-main)', fontWeight: '900', fontStyle: 'italic', fontFamily: 'var(--font-en)' }}>
                        <Download size={24} /> BACKUP
                    </h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', fontWeight: 'bold' }}>
                        ファイル形式でデータを直接ダウンロード、または復元します。
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <button onClick={handleExport} className="btn-smash" style={{ padding: '1rem', fontSize: '1.2rem', background: '#333', color: '#fff', width: '100%', clipPath: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Download size={20} /> EXPORT (SAVE)</div>
                        </button>
                        <input type="file" accept=".json" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} />
                        <button onClick={handleImportClick} className="btn-smash" style={{ padding: '1rem', fontSize: '1.2rem', background: '#333', color: '#fff', width: '100%', clipPath: 'none' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}><Upload size={20} /> IMPORT (LOAD)</div>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
