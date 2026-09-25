import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useMatchHistory } from '../hooks/useMatchHistory';
import { fighters } from '../data/fighters';
import { Crown, Skull, ChevronDown, ChevronUp, User, Swords, Settings, Search, Crosshair, Flame, AlertTriangle } from 'lucide-react';
import VipBorderGauge from './VipBorderGauge';
import FighterHoverCard from './FighterHoverCard';
import KillMoveChips from './KillMoveChips';
import { countsToList, rankMoves } from '../data/killMoves';
import { getLatestGsp } from '../data/vipBorder';
import { checkGsp, describeGspWarning } from '../data/gspCheck';


/**
 * ファイター選択グリッド。
 *
 * MatchLogger の中で定義するとレンダーごとに別のコンポーネント型になり、
 * ホバーで state が変わるたびにグリッド全体（86体ぶんの img）が
 * 作り直されてしまうため、モジュールスコープに置いている。
 */
function FighterGrid({
    fighters: gridFighters,
    frequentOpponents,
    fighterSearch,
    onSelect,
    selectedId,
    showRecent = false,
    mode = 'opponent',
    onIconEnter,
    onIconLeave,
    hoveredFighter,
    matchupByOpponent,
    statsByMyFighter,
    myFighterName
}) {
    const handleImgError = (e, f) => {
        e.target.style.display = 'none';
        e.target.parentElement.textContent = f.name.substring(0, 2);
    };

    return (
        <div className="fighter-grid" onMouseLeave={onIconLeave}>
            {showRecent && !fighterSearch && frequentOpponents.map(f => (
                <button
                    key={`freq-${f.id}`}
                    className={`fighter-icon-btn ${selectedId === f.id ? 'selected' : ''}`}
                    onClick={() => onSelect(f)}
                    onMouseEnter={(e) => onIconEnter(e, f, mode)}
                    onFocus={(e) => onIconEnter(e, f, mode)}
                    onBlur={onIconLeave}
                    aria-label={f.name}
                    style={selectedId === f.id ? { borderColor: 'var(--smash-yellow)' } : { borderColor: 'var(--smash-red)' }}
                >
                    <img src={f.imageUrl} alt={f.name} loading="lazy" onError={(e) => handleImgError(e, f)} />
                    <div className="fighter-hot-badge">HOT</div>
                </button>
            ))}

            {showRecent && !fighterSearch && frequentOpponents.length > 0 && (
                <div className="fighter-grid__divider" />
            )}

            {gridFighters.map(f => (
                <button
                    key={f.id}
                    className={`fighter-icon-btn ${selectedId === f.id ? 'selected' : ''}`}
                    onClick={() => onSelect(f)}
                    onMouseEnter={(e) => onIconEnter(e, f, mode)}
                    onFocus={(e) => onIconEnter(e, f, mode)}
                    onBlur={onIconLeave}
                    aria-label={f.name}
                >
                    <img src={f.imageUrl} alt={f.name} loading="lazy" onError={(e) => handleImgError(e, f)} />
                </button>
            ))}

            {hoveredFighter && (
                <FighterHoverCard
                    info={hoveredFighter}
                    matchup={matchupByOpponent[hoveredFighter.fighter.id]}
                    overall={statsByMyFighter[hoveredFighter.fighter.id]}
                    myFighterName={myFighterName}
                />
            )}
        </div>
    );
}

export default function MatchLogger() {
    const { addMatch, prefs, setPrefs, history } = useMatchHistory();
    const [selectedOpponent, setSelectedOpponent] = useState(null);

    const [showExtras, setShowExtras] = useState(true);
    const [gsp, setGsp] = useState('');
    const [notes, setNotes] = useState('');
    const [rules, setRules] = useState(prefs.rules || { stock: 3, time: 7, stage: '戦場タイプ' });
    const [fighterSearch, setFighterSearch] = useState('');

    // { 技名: 本数 }。チップを押した回数で数える
    const [myKillCounts, setMyKillCounts] = useState({});
    const [opponentKillCounts, setOpponentKillCounts] = useState({});

    const [isSelectingMine, setIsSelectingMine] = useState(!prefs.lastMyFighter);
    const myFighterObj = fighters.find(f => f.id === prefs.lastMyFighter);

    useEffect(() => {
        setGsp('');
    }, [prefs.lastMyFighter]);

    // アイコンにカーソルを乗せたときの成績ポップアップ
    const [hoveredFighter, setHoveredFighter] = useState(null);

    const [isEditingMyKillMoves, setIsEditingMyKillMoves] = useState(false);
    const [newCustomKillMove, setNewCustomKillMove] = useState('');

    const handleAddCustomKillMove = () => {
        if (!newCustomKillMove.trim() || !prefs.lastMyFighter) return;
        const currentCustom = prefs.customKillMoves?.[prefs.lastMyFighter] || [];
        if (!currentCustom.includes(newCustomKillMove.trim())) {
            setPrefs(p => ({
                ...p,
                customKillMoves: {
                    ...(p.customKillMoves || {}),
                    [prefs.lastMyFighter]: [...currentCustom, newCustomKillMove.trim()]
                }
            }));
        }
        setNewCustomKillMove('');
    };

    const handleRemoveCustomKillMove = (move) => {
        if (!prefs.lastMyFighter) return;
        const currentCustom = prefs.customKillMoves?.[prefs.lastMyFighter] || [];
        setPrefs(p => ({
            ...p,
            customKillMoves: {
                ...(p.customKillMoves || {}),
                [prefs.lastMyFighter]: currentCustom.filter(m => m !== move)
            }
        }));
    };

    const myCombinedKillMoves = useMemo(() => {
        if (!myFighterObj) return [];
        const defaults = myFighterObj.killMoves || [];
        const customs = prefs.customKillMoves?.[prefs.lastMyFighter] || [];
        return [...new Set([...defaults, ...customs])];
    }, [myFighterObj, prefs.customKillMoves, prefs.lastMyFighter]);

    const opponentCombinedKillMoves = useMemo(() => {
        if (!selectedOpponent) return [];
        const defaults = selectedOpponent.killMoves || [];
        const customs = prefs.customKillMoves?.[selectedOpponent.id] || [];
        return [...new Set([...defaults, ...customs])];
    }, [selectedOpponent, prefs.customKillMoves]);

    /** 自分のファイターで、実際に決めている技の回数 */
    const myMoveFreq = useMemo(() => {
        const f = {};
        history.forEach(m => {
            if (m.myFighter !== prefs.lastMyFighter) return;
            (m.myKillMoves || []).forEach(v => { if (v) f[v] = (f[v] || 0) + 1; });
        });
        return f;
    }, [history, prefs.lastMyFighter]);

    /**
     * この相手にやられている技の回数。
     * 全相手ぶんで代用すると、別キャラの技（クルール戦にDKの技など）が
     * 候補に混ざってしまうので、必ずこの相手の記録だけを使う。
     */
    const opponentMoveFreq = useMemo(() => {
        if (!selectedOpponent) return {};
        const freq = {};
        history.forEach(m => {
            if (m.opponentFighter !== selectedOpponent.id) return;
            (m.opponentKillMoves || []).forEach(v => { if (v) freq[v] = (freq[v] || 0) + 1; });
        });
        return freq;
    }, [history, selectedOpponent]);

    const latestGspPlaceholder = useMemo(() => {
        if (!prefs.lastMyFighter) return "例: 14,000,000";

        // Check if there is an actively saved GSP in preferences
        if (prefs.fighterGsp?.[prefs.lastMyFighter]) {
            return prefs.fighterGsp[prefs.lastMyFighter].toLocaleString();
        }

        // Fallback: newest match with a GSP for this fighter (history is newest-first)
        const recentMatch = history.find(m => m.myFighter === prefs.lastMyFighter && m.gsp);
        if (recentMatch) {
            return recentMatch.gsp.toLocaleString();
        }

        return "例: 14,000,000";
    }, [prefs.lastMyFighter, prefs.fighterGsp, history]);

    /**
     * 前回（直近の記録）の戦闘力。
     * prefs.fighterGsp は入力途中で書き換わるので、比較には履歴の値を使う。
     */
    const previousGsp = useMemo(() => {
        if (!prefs.lastMyFighter) return null;
        const recent = history.find(m => m.myFighter === prefs.lastMyFighter && m.gsp);
        return recent ? recent.gsp : null;
    }, [history, prefs.lastMyFighter]);

    /** 入力された戦闘力が前回から離れすぎていないか */
    const gspWarning = useMemo(() => checkGsp(gsp, previousGsp), [gsp, previousGsp]);

    // 入力中はその値を、未入力なら保存済みの最新戦闘力をゲージに使う
    const gaugeGsp = useMemo(() => {
        const typed = gsp ? parseInt(gsp, 10) : null;
        if (typed) return typed;
        return getLatestGsp(prefs.lastMyFighter, prefs, history);
    }, [gsp, prefs, history]);

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

    const streakInfo = useMemo(() => {
        if (!prefs.lastMyFighter) return { count: 0, type: null };
        const myFighterHistory = history.filter(m => m.myFighter === prefs.lastMyFighter);
        if (myFighterHistory.length === 0) return { count: 0, type: null };

        const type = myFighterHistory[0].result; // 'win' or 'lose'
        let count = 0;
        for (const m of myFighterHistory) {
            if (m.result === type) {
                count++;
                if (m.notes && m.notes.includes('追加された700試合') && count > 10) {
                    count = 10;
                }
            } else {
                break;
            }
        }
        return { count, type };
    }, [history, prefs.lastMyFighter]);

    /**
     * 使用ファイター視点での、相手ファイター別の対戦成績。
     * ホバー表示のたびに history を走査しないよう、一度だけまとめて作る。
     * history は新しい順なので、recent も新しい順で入る。
     */
    const matchupByOpponent = useMemo(() => {
        const map = {};
        if (!prefs.lastMyFighter) return map;

        history.forEach(m => {
            if (m.myFighter !== prefs.lastMyFighter || !m.opponentFighter) return;
            const entry = map[m.opponentFighter] || (map[m.opponentFighter] = { total: 0, wins: 0, losses: 0, recent: [] });
            entry.total += 1;
            if (m.result === 'win') entry.wins += 1;
            else entry.losses += 1;
            if (entry.recent.length < 5) entry.recent.push(m);
        });

        Object.values(map).forEach(e => {
            e.winRate = e.total > 0 ? Math.round((e.wins / e.total) * 100) : 0;
            // 左が古く右が新しくなるよう並べ替える
            e.recent.reverse();
        });
        return map;
    }, [history, prefs.lastMyFighter]);

    /** 自分のファイター別の通算成績（使用ファイター選択時のホバー用） */
    const statsByMyFighter = useMemo(() => {
        const map = {};
        history.forEach(m => {
            if (!m.myFighter) return;
            const entry = map[m.myFighter] || (map[m.myFighter] = { total: 0, wins: 0, losses: 0, gsp: null });
            entry.total += 1;
            if (m.result === 'win') entry.wins += 1;
            else entry.losses += 1;
            if (entry.gsp === null && m.gsp) entry.gsp = m.gsp;
        });
        Object.entries(map).forEach(([id, e]) => {
            e.winRate = e.total > 0 ? Math.round((e.wins / e.total) * 100) : 0;
            if (!e.gsp && prefs.fighterGsp?.[id]) e.gsp = prefs.fighterGsp[id];
        });
        return map;
    }, [history, prefs.fighterGsp]);

    const matchupStats = useMemo(() => {
        if (!prefs.lastMyFighter || !selectedOpponent) return null;
        const matches = history.filter(m => m.myFighter === prefs.lastMyFighter && m.opponentFighter === selectedOpponent.id);
        const wins = matches.filter(m => m.result === 'win').length;
        const total = matches.length;
        const losses = total - wins;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;
        // history は新しい順。slice(-5) だと「最も古い5件」になってしまうので
        // 先頭から5件取り、左が古く右が新しくなるよう反転する。
        const recent = matches.slice(0, 5).reverse();

        return { total, wins, losses, winRate, recent };
    }, [history, prefs.lastMyFighter, selectedOpponent]);

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

        // 桁の打ち間違いはここで止める（詳細設定を閉じていると警告が見えないため）
        if (gspWarning) {
            const ok = window.confirm(
                `世界戦闘力が ${gspWarning.value.toLocaleString()} になっています。\n` +
                `${describeGspWarning(gspWarning)}\n\n` +
                'このまま記録しますか？'
            );
            if (!ok) return;
        }

        const finalMyKillMoves = countsToList(myKillCounts);
        const finalOpponentKillMoves = countsToList(opponentKillCounts);

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
        setPrefs(p => ({ ...p, currentOpponentForObs: null }));
        setFighterSearch('');
        // Clear input so the updated placeholder shows the new latest GSP
        setGsp('');
        setNotes('');
        setMyKillCounts({});
        setOpponentKillCounts({});
    };

    /**
     * ボタンの位置をグリッド内の座標で拾ってポップアップを出す。
     * position:fixed だと backdrop-filter を持つ祖先が包含ブロックになって
     * ずれるため、グリッド(position:relative)基準の absolute で配置する。
     */
    const handleIconEnter = useCallback((e, fighter, mode) => {
        const btn = e.currentTarget;
        const gridWidth = btn.offsetParent ? btn.offsetParent.offsetWidth : 0;
        const x = btn.offsetLeft + btn.offsetWidth / 2;
        setHoveredFighter({
            fighter,
            mode,
            // 端で見切れないよう左右をクランプする
            x: gridWidth ? Math.min(Math.max(x, 96), gridWidth - 96) : x,
            top: btn.offsetTop,
            bottom: btn.offsetTop + btn.offsetHeight,
            // 上に出すとカード(約130px)が見切れる位置なら下に出す
            below: btn.offsetTop < 140
        });
    }, []);

    const clearHover = useCallback(() => setHoveredFighter(null), []);

    return (
        <div className="match-logger animate-enter">

            {/* 画面が広いときは、この塊が左カラムになる */}
            <div className="logger-main">

            <div className="logger-top">
                {/* My Fighter Section */}
                <div className="logger-fighter is-mine">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                        <h2 className="section-title" style={{ borderColor: 'var(--smash-yellow)', margin: 0 }}>
                            <User size={24} style={{ marginRight: '0.5rem', color: 'var(--smash-yellow)' }} />
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
                            <div className="search-field">
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="キャラクターを検索..."
                                    value={fighterSearch}
                                    onChange={(e) => setFighterSearch(e.target.value)}
                                />
                            </div>
                            <FighterGrid
                                mode="mine"
                                fighters={filteredFighters}
                                frequentOpponents={frequentOpponents}
                                fighterSearch={fighterSearch}
                                onIconEnter={handleIconEnter}
                                onIconLeave={clearHover}
                                hoveredFighter={hoveredFighter}
                                matchupByOpponent={matchupByOpponent}
                                statsByMyFighter={statsByMyFighter}
                                myFighterName={myFighterObj?.name}
                                selectedId={prefs.lastMyFighter}
                                onSelect={(f) => {
                                    setPrefs(p => ({ ...p, lastMyFighter: f.id }));
                                    setIsSelectingMine(false);
                                    setFighterSearch('');
                                    setMyKillCounts({});
                                }}
                            />
                        </div>
                    ) : (
                        <div className="vs-badge-container" style={{ border: '2px solid var(--smash-yellow)' }}>
                            <img className="fighter-portrait" src={myFighterObj?.imageUrl} alt={myFighterObj?.name} onError={(e) => e.target.style.display = 'none'} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span className="fighter-name">
                                    {myFighterObj?.name || '未選択'}
                                </span>
                                {streakInfo.count > 0 && (
                                    <span style={{
                                        color: streakInfo.type === 'win'
                                            ? (streakInfo.count >= 5 ? '#ff00ff' : streakInfo.count >= 2 ? '#ffcc00' : 'var(--win-color)')
                                            : (streakInfo.count >= 5 ? '#ff3300' : streakInfo.count >= 2 ? '#ff6666' : 'var(--lose-color)'),
                                        fontWeight: '900',
                                        fontSize: streakInfo.count >= 10 ? 'clamp(1.4rem, 6vw, 2.6rem)' : streakInfo.count >= 5 ? 'clamp(1.25rem, 5vw, 2.1rem)' : 'clamp(1.05rem, 4vw, 1.6rem)',
                                        marginTop: '0.2rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.4rem',
                                        lineHeight: 1.2,
                                        flexWrap: 'wrap',
                                        animation: streakInfo.count >= 5 ? 'pulse 0.5s infinite' : streakInfo.count >= 2 ? 'pulse 1s infinite' : 'pulse 2s infinite',
                                        textShadow: streakInfo.type === 'win'
                                            ? (streakInfo.count >= 5 ? '0 0 10px #ff00ff, 2px 2px 0 #000' : streakInfo.count >= 2 ? '0 0 10px #ffcc00, 2px 2px 0 #000' : '2px 2px 0 #000')
                                            : (streakInfo.count >= 5 ? '0 0 10px #ff3300, 2px 2px 0 #000' : streakInfo.count >= 2 ? '0 0 10px #ff6666, 2px 2px 0 #000' : '2px 2px 0 #000'),
                                        transition: 'all 0.3s'
                                    }}>
                                        {streakInfo.type === 'win' ? (
                                            <>
                                                <Flame size={streakInfo.count >= 5 ? 32 : streakInfo.count >= 2 ? 28 : 24}
                                                    color={streakInfo.count >= 5 ? '#ff00ff' : streakInfo.count >= 2 ? '#ffcc00' : 'var(--win-color)'} />
                                                現在 {streakInfo.count} 連勝中！
                                            </>
                                        ) : (
                                            <>
                                                <Skull size={streakInfo.count >= 5 ? 32 : streakInfo.count >= 2 ? 28 : 24}
                                                    color={streakInfo.count >= 5 ? '#ff3300' : streakInfo.count >= 2 ? '#ff6666' : 'var(--lose-color)'} />
                                                現在 {streakInfo.count} 連敗中！
                                            </>
                                        )}
                                    </span>
                                )}
                            </div>
                        </div>
                    )}

                    {!isSelectingMine && myFighterObj && (
                        <VipBorderGauge gsp={gaugeGsp} />
                    )}
                </div>

                {/* Action Buttons */}
                {!isSelectingMine && (
                    <div className={`action-btn-container ${selectedOpponent ? 'is-ready' : ''}`}>
                        <button
                            className="btn-smash action-btn-styled"
                            onClick={() => saveMatch('win')}
                            style={{
                                background: 'var(--win-color)',
                                opacity: selectedOpponent ? 1 : 0.3,
                                pointerEvents: selectedOpponent ? 'auto' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transform: 'skewX(20deg)' }}>
                                <Crown size={28} /> WIN
                            </div>
                        </button>
                        <button
                            className="btn-smash action-btn-styled"
                            onClick={() => saveMatch('lose')}
                            style={{
                                background: 'var(--lose-color)',
                                opacity: selectedOpponent ? 1 : 0.3,
                                pointerEvents: selectedOpponent ? 'auto' : 'none'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', transform: 'skewX(20deg)' }}>
                                <Skull size={28} /> LOSE
                            </div>
                        </button>
                    </div>
                )}

                {/* Opponent Section */}
                <div className="logger-fighter is-opponent">
                    <h2 className="section-title" style={{ margin: 0, marginBottom: '1rem' }}>
                        <Swords size={24} style={{ marginRight: '0.5rem', color: 'var(--smash-red)' }} />
                        対戦相手
                    </h2>

                    {selectedOpponent ? (
                        <div className="animate-enter vs-badge-container" style={{ justifyContent: 'space-between', border: '2px solid var(--smash-red)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', minWidth: 0 }}>
                                <img className="fighter-portrait" src={selectedOpponent.imageUrl} alt={selectedOpponent.name} onError={(e) => e.target.style.display = 'none'} />
                                <span className="fighter-name">{selectedOpponent.name}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setSelectedOpponent(null);
                                    setPrefs(p => ({ ...p, currentOpponentForObs: null }));
                                }}
                                style={{ color: 'var(--smash-red)', fontSize: '1rem', textDecoration: 'underline', padding: '0 1rem' }}
                            >
                                変更
                            </button>
                        </div>
                    ) : (
                        <div className="animate-enter">
                            <div className="search-field">
                                <Search size={18} className="search-icon" />
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder="対戦相手を検索..."
                                    value={fighterSearch}
                                    onChange={(e) => setFighterSearch(e.target.value)}
                                    autoFocus={!isSelectingMine}
                                />
                            </div>
                            <FighterGrid
                                showRecent={true}
                                fighters={filteredFighters}
                                frequentOpponents={frequentOpponents}
                                fighterSearch={fighterSearch}
                                onIconEnter={handleIconEnter}
                                onIconLeave={clearHover}
                                hoveredFighter={hoveredFighter}
                                matchupByOpponent={matchupByOpponent}
                                statsByMyFighter={statsByMyFighter}
                                myFighterName={myFighterObj?.name}
                                selectedId={null}
                                onSelect={(f) => {
                                    setSelectedOpponent(f);
                                    setPrefs(p => ({ ...p, currentOpponentForObs: f.id }));
                                    setFighterSearch('');
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Matchup Stats */}
            {matchupStats && (
                <div className="logger-matchup animate-enter">
                    <div className="matchup-stats-box">
                        <div className="matchup-stats-title">
                            過去の対戦成績
                        </div>
                        {matchupStats.total > 0 ? (
                            <>
                                <div className="matchup-stats-main">
                                    <span>
                                        {matchupStats.total}戦 <span style={{ color: 'var(--win-color)' }}>{matchupStats.wins}勝</span> <span style={{ color: 'var(--lose-color)' }}>{matchupStats.losses}敗</span>
                                    </span>
                                    <span className="matchup-stats-winrate">
                                        勝率 <span style={{ color: matchupStats.winRate >= 50 ? 'var(--win-color)' : 'var(--lose-color)' }}>{matchupStats.winRate}%</span>
                                    </span>
                                </div>

                                {/* 勝敗の比率をそのまま横幅で見せる */}
                                <div className="matchup-bar" title={`${matchupStats.wins}勝 ${matchupStats.losses}敗`}>
                                    <div className="matchup-bar__win" style={{ width: `${matchupStats.winRate}%` }} />
                                    <div className="matchup-bar__lose" style={{ width: `${100 - matchupStats.winRate}%` }} />
                                </div>

                                {matchupStats.recent && matchupStats.recent.length > 0 && (
                                    <div className="matchup-form">
                                        <span className="matchup-form__label">
                                            直近{matchupStats.recent.length}戦
                                        </span>
                                        <div className="matchup-form__pips">
                                            <span className="matchup-form__edge">古</span>
                                            {matchupStats.recent.map((m, i) => {
                                                const d = new Date(m.timestamp);
                                                const isLatest = i === matchupStats.recent.length - 1;
                                                return (
                                                    <span
                                                        key={i}
                                                        className={`form-pip is-lg ${m.result === 'win' ? 'is-win' : 'is-lose'} ${isLatest ? 'is-latest' : ''}`}
                                                        title={`${d.getMonth() + 1}/${d.getDate()} ${m.result === 'win' ? 'WIN' : 'LOSE'}`}
                                                    >
                                                        {m.result === 'win' ? 'W' : 'L'}
                                                    </span>
                                                );
                                            })}
                                            <span className="matchup-form__edge is-new">最新</span>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="matchup-stats-empty">
                                この組み合わせでの対戦はまだありません
                            </div>
                        )}
                    </div>
                </div>
            )}

            </div>{/* /logger-main */}

            <div className="smash-divider logger-divider" />

            {/* Extras & Rules Dropdown */}
            <div className="logger-extras">
                <button
                    className="extras-toggle"
                    onClick={() => setShowExtras(!showExtras)}
                >
                    {showExtras ? <ChevronUp size={20} /> : <Settings size={20} />}
                    {showExtras ? '詳細設定を閉じる' : 'ルール・戦闘力・撃墜技'}
                </button>

                {showExtras && (
                    <div className="animate-enter stat-card" style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>

                        {/* Rules */}
                        <div style={{ display: 'flex', gap: '1.5rem', gridColumn: '1 / -1', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '100px' }}>
                                <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>ストック数</label>
                                <select
                                    value={rules.stock}
                                    onChange={e => setRules({ ...rules, stock: isNaN(e.target.value) ? e.target.value : parseInt(e.target.value) })}
                                    style={{ width: '100%', fontSize: '1.1rem' }}
                                >
                                    <option value={1}>1</option>
                                    <option value={2}>2</option>
                                    <option value={3}>3</option>
                                    <option value="タイム制">タイム制</option>
                                    <option value="体力制">体力制</option>
                                </select>
                            </div>
                            <div style={{ flex: 1, minWidth: '100px' }}>
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
                            <div style={{ flex: 1, minWidth: '150px' }}>
                                <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>ステージ</label>
                                <select
                                    value={rules.stage || '戦場タイプ'}
                                    onChange={e => setRules({ ...rules, stage: e.target.value })}
                                    style={{ width: '100%', fontSize: '1.1rem' }}
                                >
                                    <option value="戦場タイプ">戦場タイプ</option>
                                    <option value="終点タイプ">終点タイプ</option>
                                    <option value="その他">その他</option>
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
                                    // 入力途中の値（"1" や "13" など）で上書きしないよう、
                                    // 戦闘力としてありえる桁数になってから保存する
                                    const typed = parseInt(e.target.value, 10);
                                    if (typed >= 1000000 && prefs.lastMyFighter) {
                                        setPrefs(p => ({
                                            ...p,
                                            fighterGsp: {
                                                ...(p.fighterGsp || {}),
                                                [prefs.lastMyFighter]: typed
                                            }
                                        }));
                                    }
                                }}
                                placeholder={latestGspPlaceholder}
                                className={`gsp-input ${gspWarning ? 'has-warning' : ''}`}
                                style={{ width: '100%', fontSize: '1.25rem', padding: '0.8rem' }}
                            />

                            {gspWarning && (
                                <div className="gsp-warning animate-enter">
                                    <AlertTriangle size={18} className="gsp-warning__icon" />
                                    <div className="gsp-warning__body">
                                        <span>{describeGspWarning(gspWarning)}</span>
                                        {gspWarning.suggestion && (
                                            <button
                                                type="button"
                                                className="gsp-warning__fix"
                                                onClick={() => {
                                                    setGsp(String(gspWarning.suggestion));
                                                    if (prefs.lastMyFighter) {
                                                        setPrefs(p => ({
                                                            ...p,
                                                            fighterGsp: {
                                                                ...(p.fighterGsp || {}),
                                                                [prefs.lastMyFighter]: gspWarning.suggestion
                                                            }
                                                        }));
                                                    }
                                                }}
                                            >
                                                {gspWarning.suggestion.toLocaleString()} に直す
                                            </button>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* 撃墜技。分析価値の高い「やられた技」を先に置く */}
                        <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            {/* Opponent Kill Moves */}
                            {selectedOpponent && (
                                <div className="killmove-panel is-opponent">
                                    <label className="killmove-panel__title is-opponent">
                                        <Skull size={20} /> 相手に撃墜された技
                                    </label>
                                    <KillMoveChips
                                        variant="opponent"
                                        moves={rankMoves(opponentCombinedKillMoves, opponentMoveFreq)}
                                        counts={opponentKillCounts}
                                        onChange={setOpponentKillCounts}
                                        max={typeof rules.stock === 'number' ? rules.stock : 3}
                                    />
                                </div>
                            )}

                            {/* My Kill Moves */}
                            {myFighterObj && (
                                <div className="killmove-panel is-mine">
                                    <div className="killmove-panel__head">
                                        <label className="killmove-panel__title">
                                            <Crosshair size={20} color="var(--smash-yellow)" /> 自分が撃墜した技
                                        </label>
                                        <button onClick={() => setIsEditingMyKillMoves(!isEditingMyKillMoves)} className="killmove-panel__edit">
                                            {isEditingMyKillMoves ? '完了' : '技を編集'}
                                        </button>
                                    </div>

                                    {isEditingMyKillMoves && (
                                        <div className="killmove-editor">
                                            <div className="killmove-editor__label">カスタム撃墜技の追加</div>
                                            <div className="killmove-editor__row">
                                                <input
                                                    type="text"
                                                    value={newCustomKillMove}
                                                    onChange={e => setNewCustomKillMove(e.target.value)}
                                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustomKillMove(); } }}
                                                    placeholder="新しい撃墜技を入力..."
                                                />
                                                <button onClick={handleAddCustomKillMove}>追加</button>
                                            </div>
                                            {(prefs.customKillMoves?.[prefs.lastMyFighter] || []).length > 0 && (
                                                <div className="killmove-editor__list">
                                                    {(prefs.customKillMoves?.[prefs.lastMyFighter] || []).map(m => (
                                                        <span key={m} className="killmove-editor__item">
                                                            {m}
                                                            <button onClick={() => handleRemoveCustomKillMove(m)}>×</button>
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    <KillMoveChips
                                        variant="mine"
                                        moves={rankMoves(myCombinedKillMoves, myMoveFreq)}
                                        counts={myKillCounts}
                                        onChange={setMyKillCounts}
                                        max={typeof rules.stock === 'number' ? rules.stock : 3}
                                    />
                                </div>
                            )}
                        </div>

                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '0.5rem', fontWeight: 'bold' }}>メモ</label>
                            <textarea
                                value={notes}
                                onChange={e => setNotes(e.target.value)}
                                placeholder="立ち回りの反省点、相手の癖など..."
                                className="notes-input"
                                style={{ width: '100%', background: '#111', border: '2px solid #444', color: '#fff', padding: '1rem', minHeight: '80px', resize: 'vertical', fontFamily: 'var(--font-jp)', outline: 'none' }}
                            />
                        </div>
                    </div>
                )}
            </div>

        </div>
    );
}
