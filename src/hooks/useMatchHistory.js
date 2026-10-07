import { useState, useEffect, useRef } from 'react';
import restoredData from '../data/restored_data.json';
import { useAuth } from './useAuth';

const STORAGE_KEY = 'smash_logger_history';
const PREFS_KEY = 'smash_logger_prefs';

/**
 * 読み込んだ履歴の型を揃える。
 * 古い記録に gsp が文字列で入っているものがあり、そのままだと
 * 差分計算（"123" - 100 は動くが "123" + 100 は文字列連結）で壊れるため、
 * 入口で数値に正規化しておく。数値にできない値は null 扱い。
 */
function normalizeHistory(list) {
    if (!Array.isArray(list)) return [];
    return list.map(m => {
        if (m == null || typeof m !== 'object') return m;
        if (m.gsp === null || m.gsp === undefined || m.gsp === '') {
            return m.gsp === undefined ? m : { ...m, gsp: null };
        }
        const n = Number(m.gsp);
        if (typeof m.gsp === 'number' && Number.isFinite(m.gsp)) return m;
        return { ...m, gsp: Number.isFinite(n) ? n : null };
    });
}

export function useMatchHistory() {
    const { auth, logout } = useAuth();

    const [history, setHistory] = useState(() => {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved ? normalizeHistory(JSON.parse(saved)) : [];
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

    // Latest values for event listeners (avoid stale closures)
    const historyRef = useRef(history);
    const prefsRef = useRef(prefs);
    historyRef.current = history;
    prefsRef.current = prefs;
    const pendingSaves = useRef(0);
    const lastSaveFailed = useRef(false);
    const isRefreshing = useRef(false);
    // JSON of the last state known to match the cloud; used to skip echo saves
    const cloudSnapshot = useRef(null);

    const saveToCloud = async (currentAuth, newHistory, newPrefs) => {
        if (!currentAuth || !currentAuth.token) return;
        pendingSaves.current += 1;
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
            lastSaveFailed.current = false;
            cloudSnapshot.current = JSON.stringify({ history: newHistory, prefs: newPrefs });
        } catch (err) {
            console.error("Cloud Error:", err);
            lastSaveFailed.current = true;
            setSyncError("クラウド保存に失敗しました。");
        } finally {
            pendingSaves.current -= 1;
            setIsSyncing(false);
        }
    };

    // Silently pull the latest cloud data (e.g. after recording on another device)
    const refreshFromCloud = async (currentAuth) => {
        if (!currentAuth || !currentAuth.token || !isCloudInitialized.current) return;
        if (isRefreshing.current || pendingSaves.current > 0) return;
        // Local changes never reached the cloud: push them instead of discarding
        if (lastSaveFailed.current) {
            await saveToCloud(currentAuth, historyRef.current, prefsRef.current);
            return;
        }
        isRefreshing.current = true;
        try {
            const response = await fetch('/api/load', {
                cache: 'no-store',
                headers: { 'Authorization': `Bearer ${currentAuth.token}` }
            });
            if (!response.ok) {
                if (response.status === 401) logout();
                return;
            }
            const result = await response.json();
            const cloud = result.data;
            // A save started while loading: local is newer, keep it
            if (!cloud || pendingSaves.current > 0 || lastSaveFailed.current) return;
            const cloudHistory = cloud.history ? normalizeHistory(cloud.history) : historyRef.current;
            const cloudPrefs = cloud.prefs || prefsRef.current;
            const cloudJson = JSON.stringify({ history: cloudHistory, prefs: cloudPrefs });
            if (cloudJson === JSON.stringify({ history: historyRef.current, prefs: prefsRef.current })) return;
            cloudSnapshot.current = cloudJson;
            setHistory(cloudHistory);
            setPrefs(cloudPrefs);
        } catch (err) {
            console.error("Cloud Refresh Error:", err);
        } finally {
            isRefreshing.current = false;
        }
    };

    const loadFromCloud = async (currentAuth, isInitialLoad = false) => {
        if (!currentAuth || !currentAuth.token) return;
        setIsSyncing(true);
        setSyncError(null);
        try {
            const response = await fetch('/api/load', {
                cache: 'no-store',
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
                if (result.data.history) {
                    // Safety check: Don't silently overwrite local data if local has MORE matches
                    if (isInitialLoad && history.length > result.data.history.length) {
                        const wantsCloud = window.confirm(`クラウド上のデータ(${result.data.history.length}件)より、この端末のデータ(${history.length}件)の方が多いようです。\n\nクラウドのデータで上書きしてよろしいですか？\n(「キャンセル」を押すと上書きせず、この端末の最新データをクラウドに保存します)`);
                        if (wantsCloud) {
                            setHistory(normalizeHistory(result.data.history));
                        } else {
                            // Save local to cloud to sync them up
                            await saveToCloud(currentAuth, history, prefs);
                            return; // Skip setting prefs from cloud to avoid mixing states
                        }
                    } else {
                        setHistory(normalizeHistory(result.data.history));
                    }
                }
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

    // Re-sync whenever the app comes back to the foreground or periodically while open
    useEffect(() => {
        if (!auth || !auth.token) return;
        const onVisible = () => {
            if (document.visibilityState === 'visible') refreshFromCloud(auth);
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('focus', onVisible);
        const timer = setInterval(onVisible, 60 * 1000);
        return () => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('focus', onVisible);
            clearInterval(timer);
        };
    }, [auth?.token]);

    const isUnchangedFromCloud = () =>
        cloudSnapshot.current === JSON.stringify({ history: historyRef.current, prefs: prefsRef.current });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
        // Auto sync
        if (auth && auth.token && isCloudInitialized.current && history.length > 0 && !isUnchangedFromCloud()) {
            saveToCloud(auth, history, prefs);
        }
    }, [history]);

    useEffect(() => {
        localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
        if (auth && auth.token && isCloudInitialized.current && !isUnchangedFromCloud()) {
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
                setHistory(normalizeHistory(data.history));
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
