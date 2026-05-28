import { useState, useEffect, useRef } from 'react';
import restoredData from '../data/restored_data.json';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'smash_logger_history';
const PREFS_KEY = 'smash_logger_prefs';

export function useMatchHistory() {
    const { auth, logout } = useAuth();

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
            if (!parsed.rules) parsed.rules = { stock: 3, time: 7 };
            if (!parsed.fighterGsp) parsed.fighterGsp = {};
            if (!parsed.customKillMoves) parsed.customKillMoves = {};
            return { ...defaultPrefs, ...parsed };
        }

        return defaultPrefs;
    });

    const [isSyncing, setIsSyncing] = useState(false);
    const [syncError, setSyncError] = useState(null);
    const isCloudInitialized = useRef(false);

    const saveToCloud = async (currentAuth, newHistory, newPrefs) => {
        if (!currentAuth || !currentAuth.token) return;
        setIsSyncing(true);
        setSyncError(null);
        try {
            const response = await fetch('/api/save', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${currentAuth.token}`
                },
                body: JSON.stringify({
                    data: { history: newHistory, prefs: newPrefs }
                }),
            });
            const result = await response.json();
            if (!response.ok) {
                if (response.status === 401) logout();
                throw new Error(result.error || 'Sync failed');
            }
        } catch (err) {
            console.error("Cloud Error:", err);
            setSyncError("クラウド保存に失敗しました。");
        } finally {
            setIsSyncing(false);
        }
    };

    const loadFromCloud = async (currentAuth, isInitialLoad = false) => {
        if (!currentAuth || !currentAuth.token) return;
        setIsSyncing(true);
        setSyncError(null);
        try {
            const response = await fetch('/api/load', {
                headers: {
                    'Authorization': `Bearer ${currentAuth.token}`
                }
            });
            const result = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                    alert("認証の有効期限が切れました。再度ログインしてください。");
                    return;
                }
                throw new Error(result.error || 'Load failed');
            }

            if (result.data) {
                if (result.data.history) setHistory(result.data.history);
                if (result.data.prefs) setPrefs(result.data.prefs);
                if (!isInitialLoad) alert("クラウドからデータを読み込みました！");
            } else {
                // No data found in the cloud for this user
                if (!isInitialLoad) {
                    if (history.length > 0) {
                        const wantsToUpload = window.confirm(
                            `このアカウントにはまだデータがありません。\n\n現在の端末にある記録（${history.length}件）をアップロード(引継ぎ)しますか？\n\n【キャンセル】を押すと、現在のデータをリセットし「まっさらな状態」からスタートします。`
                        );
                        if (wantsToUpload) {
                            await saveToCloud(currentAuth, history, prefs);
                            alert("現在のデータをアップロードしました！");
                        } else {
                            setHistory([]);
                            setPrefs({});
                            alert("表示データをリセットしました（新しいアカウントでスタートします）。");
                        }
                    } else {
                        await saveToCloud(currentAuth, history, prefs);
                    }
                } else {
                    // Initial load but no data. If we have local data, we should upload it.
                    if (history.length > 0) {
                        await saveToCloud(currentAuth, history, prefs);
                    }
                }
            }
        } catch (err) {
            console.error("Cloud Error:", err);
            setSyncError("データの読み込みに失敗しました。");
        } finally {
            setIsSyncing(false);
            if (isInitialLoad) isCloudInitialized.current = true;
        }
    };

    // Auto initialize cloud connection when auth changes (e.g. login)
    useEffect(() => {
        if (auth && auth.token) {
            loadFromCloud(auth, true);
        } else {
            isCloudInitialized.current = true;
        }
    }, [auth?.token]); // Dependency on token to trigger load when logging in

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        // Auto sync
        if (auth && auth.token && isCloudInitialized.current && history.length > 0) {
            saveToCloud(auth, history, prefs);
        }
    }, [history]);

    useEffect(() => {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        if (auth && auth.token && isCloudInitialized.current) {
            saveToCloud(auth, history, prefs);
        }
    }, [prefs]);

    const addMatch = (matchData) => {
        const newMatch = {
            id: Date.now().toString(),
            timestamp: new Date().toISOString(),
            ...matchData
        };
        setHistory(prev => [newMatch, ...prev]);

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

    // Remove legacy expansion logic as it depended on syncId.
    // If users need it, they can import JSON manually.

    return {
        history, addMatch, removeMatch, editMatch, prefs, setPrefs, importData,
        isSyncing, syncError,
        auth, logout // Pass these down so UI can use them if needed
    };
}
