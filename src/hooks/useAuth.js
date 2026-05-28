import { useState, useEffect } from 'react';

const AUTH_KEY = 'smash_logger_auth';

export function useAuth() {
    const [auth, setAuth] = useState(() => {
        const saved = localStorage.getItem(AUTH_KEY);
        return saved ? JSON.parse(saved) : null;
    });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (auth) {
            localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
        } else {
            localStorage.removeItem(AUTH_KEY);
        }
    }, [auth]);

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
            
            setAuth({ token: data.token, userId: data.userId, nickname: data.nickname, isAdmin: data.isAdmin });
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
            
            setAuth({ token: data.token, userId: data.userId, nickname: data.nickname, isAdmin: data.isAdmin });
            return true;
        } catch (err) {
            setError(err.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setAuth(null);
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
