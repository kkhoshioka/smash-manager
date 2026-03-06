import React, { useState, useMemo, useEffect } from 'react';
import { useMatchHistory } from '../hooks/useMatchHistory';
import { fighters } from '../data/fighters';
import { Crown, Skull, ChevronDown, ChevronUp, User, Swords, Settings, Search, Crosshair } from 'lucide-react';

export default function MatchLogger() {
    const { addMatch, prefs, setPrefs, history } = useMatchHistory();
    const [selectedOpponent, setSelectedOpponent] = useState(null);

    const [showExtras, setShowExtras] = useState(true);
    const [gsp, setGsp] = useState('');
    const [notes, setNotes] = useState('');
    const [rules, setRules] = useState(prefs.rules || { stock: 3, time: 7 });
    const [fighterSearch, setFighterSearch] = useState('');

    const [myKillMoves, setMyKillMoves] = useState([]);
    const [opponentKillMoves, setOpponentKillMoves] = useState([]);
    const [customMyKillMoves, setCustomMyKillMoves] = useState({});
    const [customOpponentKillMoves, setCustomOpponentKillMoves] = useState({});

    const [isSelectingMine, setIsSelectingMine] = useState(!prefs.lastMyFighter);
    const myFighterObj = fighters.find(f => f.id === prefs.lastMyFighter);

    useEffect(() => {
        setGsp('');
    }, [prefs.lastMyFighter]);

    const latestGspPlaceholder = prefs.lastMyFighter && prefs.fighterGsp?.[prefs.lastMyFighter]
        ? prefs.fighterGsp[prefs.lastMyFighter].toString()
        : "例: 14000000";

    const frequentOpponents = useMemo(() => {
        const counts = {};
        history.forEach(m => {
            counts[m.opponentFighter] = (counts[m.opponentFighter] || 0) + 1;
        });
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .map(entry => fighters.find(f => f.id === entry[0]))
            .filter(f => f)
            .slice(0, 8);
    }, [history]);

    const filteredFighters = useMemo(() => {
        if (!fighterSearch) return fighters;
        return fighters.filter(f =>
            f.name.includes(fighterSearch) ||
            f.name.toLowerCase().includes(fighterSearch.toLowerCase())
        );
    }, [fighterSearch]);

    const saveMatch = (result) => {
        if (!prefs.lastMyFighter) {
            alert('自分のファイターを選択してください');
            setIsSelectingMine(true);
            return;
        }
        if (!selectedOpponent) {
            alert('相手ファイターを選択してください');
            return;
        }

        const finalMyKillMoves = myKillMoves.map((move, i) => move === 'custom_input' ? (customMyKillMoves[i] || '') : move).filter(Boolean);
        const finalOpponentKillMoves = opponentKillMoves.map((move, i) => move === 'custom_input' ? (customOpponentKillMoves[i] || '') : move).filter(Boolean);

        addMatch({
            myFighter: prefs.lastMyFighter,
            opponentFighter: selectedOpponent.id,
            result,
            gsp: gsp ? parseInt(gsp, 10) : null,
            notes,
            rules,
            myKillMoves: finalMyKillMoves,
            opponentKillMoves: finalOpponentKillMoves
        });

        // Ensure we save the latest GSP immediately.
        if (gsp) {
            setPrefs(p => ({
                ...p,
                fighterGsp: {
                    ...(p.fighterGsp || {}),
                    [prefs.lastMyFighter]: parseInt(gsp, 10)
                }
            }));
        }

        setSelectedOpponent(null);
        setFighterSearch('');
        // Clear input so the updated placeholder shows the new latest GSP
        setGsp('');
        setNotes('');
        setMyKillMoves([]);
        setOpponentKillMoves([]);
        setCustomMyKillMoves({});
        setCustomOpponentKillMoves({});
    };

    const FighterGrid = ({ onSelect, selectedId, showRecent = false }) => (
        <div className="fighter-grid">
            {showRecent && !fighterSearch && frequentOpponents.map(f => (
                <button
                    key={`freq-${f.id}`}
                    className={`fighter-icon-btn ${selectedId === f.id ? 'selected' : ''}`}
                    onClick={() => onSelect(f)}
                    title={f.name}
                    style={selectedId === f.id ? { borderColor: 'var(--smash-yellow)' } : { borderColor: 'var(--smash-red)' }}
                >
                    <img src={f.imageUrl} alt={f.name} loading="lazy" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = f.name.substring(0, 2); }} />
                    <div style={{ position: 'absolute', bottom: 0, width: '100%', background: 'rgba(0,0,0,0.8)', fontSize: '0.65rem', textAlign: 'center', padding: '2px 0', fontFamily: 'var(--font-jp)' }}>
                        {f.name.substring(0, 6)}
                    </div>
                </button>
            ))}

            {showRecent && !fighterSearch && frequentOpponents.length > 0 && (
                <div style={{ gridColumn: '1 / -1', height: '2px', background: '#333', margin: '0.5rem 0' }} />
            )}

            {filteredFighters.map(f => (
                <button
                    key={f.id}
                    className={`fighter-icon-btn ${selectedId === f.id ? 'selected' : ''}`}
                    onClick={() => onSelect(f)}
                    title={f.name}
                >
                    <img src={f.imageUrl} alt={f.name} loading="lazy" onError={(e) => { e.target.style.display = 'none'; e.target.parentElement.textContent = f.name.substring(0, 2); }} />
                </button>
            ))}
        </div>
    );

    return (
        <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

            <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                {/* My Fighter Section */}
                <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 className="section-title" style={{ borderColor: 'var(--smash-yellow)', margin: 0 }}>
                            <User size={28} style={{ marginRight: '0.8rem', color: 'var(--smash-yellow)' }} />
                            使用ファイター
                        </h2>
                        {myFighterObj && !isSelectingMine && (
                            <button
                                onClick={() => setIsSelectingMine(true)}
                                style={{ color: 'var(--text-muted)', fontSize: '1rem', textDecoration: 'underline' }}
                            >
                                変更
                            </button>
                        )}
                    </div>

                    {isSelectingMine ? (
                        <div className="animate-enter">
                            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                <Search size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="キャラクターを検索..."
                                    value={fighterSearch}
                                    onChange={(e) => setFighterSearch(e.target.value)}
                                    style={{ width: '100%', paddingLeft: '45px' }}
                                />
                            </div>
                            <FighterGrid
                                selectedId={prefs.lastMyFighter}
                                onSelect={(f) => {
                                    setPrefs(p => ({ ...p, lastMyFighter: f.id }));
                                    setIsSelectingMine(false);
                                    setFighterSearch('');
                                    setMyKillMoves([]);
                                }}
                            />
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', backgroundColor: '#111', padding: '1rem', border: '2px solid var(--smash-yellow)', clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)' }}>
                            <img src={myFighterObj?.imageUrl} alt={myFighterObj?.name} style={{ width: '80px', height: '80px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} onError={(e) => e.target.style.display = 'none'} />
                            <span style={{ fontSize: '2rem', fontWeight: '900', fontStyle: 'italic', textShadow: '3px 3px 0 #000' }}>
                                {myFighterObj?.name || '未選択'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Action Buttons */}
                {!isSelectingMine && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flex: '0 0 auto', justifyContent: 'center' }}>
                        <button
                            className="btn-smash"
                            onClick={() => saveMatch('win')}
                            style={{
                                background: 'var(--win-color)',
                                opacity: selectedOpponent ? 1 : 0.3,
                                pointerEvents: selectedOpponent ? 'auto' : 'none',
                                minWidth: '220px',
                                textShadow: '2px 2px 0 #000',
                                color: '#fff'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transform: 'skewX(20deg)' }}>
                                <Crown size={28} /> WIN
                            </div>
                        </button>
                        <button
                            className="btn-smash"
                            onClick={() => saveMatch('lose')}
                            style={{
                                background: 'var(--lose-color)',
                                opacity: selectedOpponent ? 1 : 0.3,
                                pointerEvents: selectedOpponent ? 'auto' : 'none',
                                minWidth: '220px',
                                textShadow: '2px 2px 0 #000',
                                color: '#fff'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transform: 'skewX(20deg)' }}>
                                <Skull size={28} /> LOSE
                            </div>
                        </button>
                    </div>
                )}

                {/* Opponent Section */}
                <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                    <h2 className="section-title" style={{ margin: 0, marginBottom: '1rem' }}>
                        <Swords size={28} style={{ marginRight: '0.8rem', color: 'var(--smash-red)' }} />
                        対戦相手
                    </h2>

                    {selectedOpponent ? (
                        <div className="animate-enter" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', backgroundColor: '#111', border: '2px solid var(--smash-red)', clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                                <img src={selectedOpponent.imageUrl} alt={selectedOpponent.name} style={{ width: '80px', height: '80px', objectFit: 'contain', filter: 'drop-shadow(2px 2px 0 #000)' }} onError={(e) => e.target.style.display = 'none'} />
                                <span style={{ fontSize: '2rem', fontWeight: '900', fontStyle: 'italic', textShadow: '3px 3px 0 #000' }}>{selectedOpponent.name}</span>
                            </div>
                            <button
                                onClick={() => setSelectedOpponent(null)}
                                style={{ color: 'var(--smash-red)', fontSize: '1rem', textDecoration: 'underline', padding: '0 1rem' }}
                            >
                                変更
                            </button>
                        </div>
                    ) : (
                        <div className="animate-enter">
                            <div style={{ position: 'relative', marginBottom: '1rem' }}>
                                <Search size={20} style={{ position: 'absolute', left: '15px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="対戦相手を検索..."
                                    value={fighterSearch}
                                    onChange={(e) => setFighterSearch(e.target.value)}
                                    style={{ width: '100%', paddingLeft: '45px' }}
                                    autoFocus={!isSelectingMine}
                                />
                            </div>
                            <FighterGrid
                                showRecent={true}
                                selectedId={null}
                                onSelect={(f) => {
                                    setSelectedOpponent(f);
                                    setFighterSearch('');
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            <div className="smash-divider" />

            {/* Extras & Rules Dropdown */}
            <div>
                <button
                    onClick={() => setShowExtras(!showExtras)}
                    style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                        color: 'var(--text-main)', fontSize: '1.2rem', width: '100%', padding: '1rem',
                        backgroundColor: '#111', border: '2px solid #555', cursor: 'pointer',
                        clipPath: 'polygon(15px 0, 100% 0, calc(100% - 15px) 100%, 0 100%)',
                        fontFamily: 'var(--font-jp)', fontWeight: 'bold'
                    }}
                >
                    {showExtras ? <ChevronUp size={20} /> : <Settings size={20} />}
                    {showExtras ? '詳細設定を閉じる' : 'ルール・戦闘力・撃墜技'}
                </button>

                {showExtras && (
                    <div className="animate-enter stat-card" style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>

                        {/* Rules */}
                        <div style={{ display: 'flex', gap: '1.5rem', gridColumn: '1 / -1' }}>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>ストック数</label>
                                <select
                                    value={rules.stock}
                                    onChange={e => setRules({ ...rules, stock: parseInt(e.target.value) })}
                                    style={{ width: '100%', fontSize: '1.1rem' }}
                                >
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                    <option value={3}>3</option>
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>タイム</label>
                                <select
                                    value={rules.time}
                                    onChange={e => setRules({ ...rules, time: parseInt(e.target.value) })}
                                    style={{ width: '100%', fontSize: '1.1rem' }}
                                >
                                    <option value={3}>3:00</option>
                                    <option value={5}>5:00</option>
                                    <option value={7}>7:00</option>
                                </select>
                            </div>
                        </div>

                        {/* GSP */}
                        <div style={{ gridColumn: '1 / -1', marginTop: '0.5rem' }}>
                            <label style={{ display: 'block', fontSize: '1.2rem', color: 'var(--smash-yellow)', marginBottom: '0.5rem', fontWeight: 'bold', fontStyle: 'italic', fontFamily: 'var(--font-jp)' }}>世界戦闘力</label>
                            <input
                                type="number"
                                value={gsp}
                                onChange={e => {
                                    setGsp(e.target.value);
                                    if (e.target.value && prefs.lastMyFighter) {
                                        // Automatically update the preference when typing so we don't lose it
                                        setPrefs(p => ({
                                            ...p,
                                            fighterGsp: {
                                                ...(p.fighterGsp || {}),
                                                [prefs.lastMyFighter]: parseInt(e.target.value, 10)
                                            }
                                        }));
                                    }
                                }}
                                placeholder={latestGspPlaceholder}
                                style={{ width: '100%', fontSize: '1.5rem', padding: '1rem' }}
                            />
                        </div>

                        {/* Kill Move Selection (Dependent on My Fighter and Opponent) */}
                        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            {/* My Kill Moves */}
                            {myFighterObj && (
                                <div style={{ backgroundColor: '#111', padding: '1.5rem', borderLeft: '4px solid var(--smash-yellow)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.1rem', color: 'var(--text-main)', marginBottom: '1rem', fontWeight: 'bold' }}>
                                        <Crosshair size={20} color="var(--smash-yellow)" /> 自分が撃墜した技
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {Array.from({ length: rules.stock }).map((_, index) => (
                                            <div key={`my-kill-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span style={{ fontSize: '1rem', color: 'var(--smash-yellow)', width: '20px', fontWeight: '900', fontFamily: 'var(--font-en)' }}>{index + 1}</span>
                                                <select
                                                    value={myKillMoves[index] === 'custom_input' ? 'custom_input' : (myKillMoves[index] || '')}
                                                    onChange={(e) => {
                                                        const newMoves = [...myKillMoves];
                                                        newMoves[index] = e.target.value;
                                                        setMyKillMoves(newMoves);
                                                    }}
                                                    style={{ flex: 1 }}
                                                >
                                                    <option value="">指定なし</option>
                                                    {myFighterObj.killMoves && myFighterObj.killMoves.map((move, mIndex) => (
                                                        <option key={mIndex} value={move}>{move}</option>
                                                    ))}
                                                    {myKillMoves[index] && (!myFighterObj.killMoves || !myFighterObj.killMoves.includes(myKillMoves[index])) && myKillMoves[index] !== 'custom_input' && (
                                                        <option value={myKillMoves[index]}>{myKillMoves[index]}</option>
                                                    )}
                                                    <option value="custom_input">その他...</option>
                                                </select>
                                                {myKillMoves[index] === 'custom_input' && (
                                                    <input
                                                        type="text"
                                                        placeholder="技名"
                                                        value={customMyKillMoves?.[index] || ''}
                                                        onChange={(e) => setCustomMyKillMoves(prev => ({ ...(prev || {}), [index]: e.target.value }))}
                                                        style={{ flex: 1 }}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Opponent Kill Moves */}
                            {selectedOpponent && (
                                <div style={{ backgroundColor: '#2a0000', padding: '1.5rem', borderLeft: '4px solid var(--smash-red)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '1.1rem', color: 'var(--smash-red)', marginBottom: '1rem', fontWeight: 'bold' }}>
                                        <Skull size={20} /> 相手に撃墜された技
                                    </label>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                        {Array.from({ length: rules.stock }).map((_, index) => (
                                            <div key={`opp-kill-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <span style={{ fontSize: '1rem', color: 'var(--smash-red)', width: '20px', fontWeight: '900', fontFamily: 'var(--font-en)' }}>{index + 1}</span>
                                                <select
                                                    value={opponentKillMoves[index] === 'custom_input' ? 'custom_input' : (opponentKillMoves[index] || '')}
                                                    onChange={(e) => {
                                                        const newMoves = [...opponentKillMoves];
                                                        newMoves[index] = e.target.value;
                                                        setOpponentKillMoves(newMoves);
                                                    }}
                                                    style={{ flex: 1, borderColor: 'var(--smash-red)' }}
                                                >
                                                    <option value="">指定なし</option>
                                                    {selectedOpponent.killMoves && selectedOpponent.killMoves.map((move, mIndex) => (
                                                        <option key={mIndex} value={move}>{move}</option>
                                                    ))}
                                                    {opponentKillMoves[index] && (!selectedOpponent.killMoves || !selectedOpponent.killMoves.includes(opponentKillMoves[index])) && opponentKillMoves[index] !== 'custom_input' && (
                                                        <option value={opponentKillMoves[index]}>{opponentKillMoves[index]}</option>
                                                    )}
                                                    <option value="custom_input">その他...</option>
                                                </select>
                                                {opponentKillMoves[index] === 'custom_input' && (
                                                    <input
                                                        type="text"
                                                        placeholder="技名"
                                                        value={customOpponentKillMoves?.[index] || ''}
                                                        onChange={(e) => setCustomOpponentKillMoves(prev => ({ ...(prev || {}), [index]: e.target.value }))}
                                                        style={{ flex: 1, borderColor: 'var(--smash-red)' }}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>メモ</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="立ち回りの反省点、相手の癖など..."
                                style={{ width: '100%', background: '#111', border: '2px solid #444', color: '#fff', padding: '1rem', minHeight: '80px', resize: 'vertical', fontFamily: 'var(--font-jp)', outline: 'none' }}
                            />
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
