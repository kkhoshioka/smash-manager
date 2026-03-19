import { useState, useEffect, useRef } from 'react';
import restoredData from '../data/restored_data.json';

const STORAGE_KEY = 'smash_logger_history';
const PREFS_KEY = 'smash_logger_prefs';

export function useMatchHistory() {
    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? JSON.parse(saved) : [];
    });

    const [prefs, setPrefs] = useState(() => {
        const saved = localStorage.getItem(PREFS_KEY);
        const defaultPrefs = {
            lastMyFighter: null,
            rules: { stock: 3, time: 7 },
            fighterGsp: {}
        };

        if (saved) {
            const parsed = JSON.parse(saved);
            // Ensure rules and fighterGsp exist even on old saves
            if (!parsed.rules) parsed.rules = { stock: 3, time: 7 };
            if (!parsed.fighterGsp) parsed.fighterGsp = {};
            if (!parsed.customKillMoves) parsed.customKillMoves = {};
            return { ...defaultPrefs, ...parsed };
        }

        return defaultPrefs;
    });

    const [syncId, setSyncId] = useState(() => {
        return localStorage.getItem('smash_sync_id') || '';
    });
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(null);
    const isCloudInitialized = useRef(false);

    const saveToCloud = async (currentSyncId, newHistory, newPrefs) => {
        if (!currentSyncId) return;
        setIsSyncing(true);
        setSyncError(null);
        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    syncId: currentSyncId,
                    data: { history: newHistory, prefs: newPrefs }
                }),
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Sync failed');
        } catch (err) {
            console.error("Cloud Error:", err);
            setSyncError("クラウド保存に失敗しました。合言葉が間違っているか、データベース未設定です。");
        } finally {
            setIsSyncing(false);
        }
    };

    const loadFromCloud = async (idToLoad, isInitialLoad = false) => {
        if (!idToLoad) return;
        setIsSyncing(true);
        setSyncError(null);
        try {
            const response = await fetch(`/api/load?syncId=${idToLoad}`);
            const result = await response.json();
            if (!result.success) throw new Error(result.error || 'Load failed');

            if (result.data) {
                if (result.data.history) setHistory(result.data.history);
                if (result.data.prefs) setPrefs(result.data.prefs);
                if (!isInitialLoad) alert("クラウドからデータを読み込みました！");
            } else {
                // No data found, let's create initial data in cloud if not initial load
                if (!isInitialLoad) {
                    await saveToCloud(idToLoad, history, prefs);
                    alert("新しいクラウド同期の合言葉を登録し、現在のデータをアップロードしました！");
                }
            }
        } catch (err) {
            console.error("Cloud Error:", err);
            setSyncError("データの読み込みに失敗しました。合言葉が間違っているか、データベース未設定です。");
        } finally {
            setIsSyncing(false);
            if (isInitialLoad) isCloudInitialized.current = true;
        }
    };

    const handleSetSyncId = (newSyncId) => {
        setSyncId(newSyncId);
        if (newSyncId) {
            localStorage.setItem('smash_sync_id', newSyncId);
            loadFromCloud(newSyncId, false);
        } else {
            localStorage.removeItem('smash_sync_id');
        }
    };

    // Auto initialize cloud connection on app load
    useEffect(() => {
        if (syncId) {
            loadFromCloud(syncId, true);
        } else {
            isCloudInitialized.current = true;
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        // Auto sync if syncId is present and initial cloud fetch has completed
        if (syncId && isCloudInitialized.current && history.length > 0) {
            saveToCloud(syncId, history, prefs);
        }
    }, [history]);

    useEffect(() => {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        if (syncId && isCloudInitialized.current) {
            saveToCloud(syncId, history, prefs);
        }
    }, [prefs]);

    const addMatch = (matchData) => {
        const newMatch = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...matchData
        };
        setHistory(prev => [newMatch, ...prev]);

        // Update preferences if myFighter or rules are set
        setPrefs(p => ({
            ...p,
            lastMyFighter: matchData.myFighter || p.lastMyFighter,
            rules: matchData.rules || p.rules,
            fighterGsp: matchData.gsp ? {
                ...(p.fighterGsp || {}),
                [matchData.myFighter]: matchData.gsp
            } : (p.fighterGsp || {})
        }));
    };

    const removeMatch = (id) => {
        setHistory(prev => prev.filter(m => m.id !== id));
    };

    const editMatch = (id, updatedData) => {
        setHistory(prev => prev.map(m => m.id === id ? { ...m, ...updatedData } : m));
    };

    const importData = (dataString) => {
        try {
            const data = JSON.parse(dataString);
            if (data.history && Array.isArray(data.history)) {
                setHistory(data.history);
            }
            if (data.prefs) {
                setPrefs(data.prefs);
            }
            return true;
        } catch (e) {
            console.error("Failed to import data:", e);
            return false;
        }
    };

    // Temporary restoration logic (FORCED)
    useEffect(() => {
        const expansionFlag = 'smash_expansion_v2_done';
        console.log("Restoration Effect Running. Flag state:", localStorage.getItem(expansionFlag));
        if (localStorage.getItem(expansionFlag)) return;

        console.log("restoredData:", restoredData);
        if (restoredData && restoredData.history && restoredData.history.length > 0) {
            console.log(`Applying match history expansion... Found ${restoredData.history.length} matches.`);
            setHistory(restoredData.history);
            if (restoredData.prefs) setPrefs(prev => ({ ...prev, ...restoredData.prefs }));
            
            // Set the syncId to ensure it pushes to the cloud
            const targetSyncId = "おりぶオリジナル";
            setSyncId(targetSyncId);
            localStorage.setItem('smash_sync_id', targetSyncId);
            
            localStorage.setItem(expansionFlag, 'true');
            // We use a slight delay for the alert to ensure state updates are visible
            setTimeout(() => {
                alert("【履歴拡張】勇者の対戦データを約700試合追加しました。「おりぶオリジナル」としてクラウド同期が行われます。");
            }, 500);
        } else {
            console.warn("Restored data is empty or invalid. History length:", restoredData?.history?.length);
        }
    }, [setHistory, setPrefs, setSyncId]);

    return {
        history, addMatch, removeMatch, editMatch, prefs, setPrefs, importData,
        syncId, handleSetSyncId, isSyncing, syncError
    };
}
