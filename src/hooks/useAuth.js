import { useState, useEffect } from 'react';

const AUTH_KEY = 'smash_logger_auth';

// ログイン状態はアプリ全体で1つだけ持つ。
// 以前は useAuth() を呼ぶ画面ごとに別々の状態を持っていたため、
// 同期処理だけが裏でログアウトしても画面はログイン中のままに見え、
// 記録が端末の中だけに溜まり続けることがあった。
let sharedAuth = (() => {
    try {
        const saved = localStorage.getItem(AUTH_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
})();
const listeners = new Set();

function setSharedAuth(next) {
    sharedAuth = next;
    if (next) {
        localStorage.setItem(AUTH_KEY, JSON.stringify(next));
    } else {
        localStorage.removeItem(AUTH_KEY);
    }
    listeners.forEach(listener => listener(next));
}

export function useAuth() {
    const [auth, setAuth] = useState(sharedAuth);

    useEffect(() => {
        listeners.add(setAuth);
        setAuth(sharedAuth);
        return () => listeners.delete(setAuth);
    }, []);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const signup = async (nickname, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Signup failed');

            setSharedAuth({ token: data.token, userId: data.userId, nickname: data.nickname, isAdmin: data.isAdmin });
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const login = async (nickname, password) => {
        setIsLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nickname, password })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Login failed');

            setSharedAuth({ token: data.token, userId: data.userId, nickname: data.nickname, isAdmin: data.isAdmin });
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setSharedAuth(null);
        // We do not clear the local history automatically. 
        // The user can choose to reset or it stays as local cache.
    };

    return {
        auth,
        signup,
        login,
        logout,
        isLoading,
        error
    };
}
