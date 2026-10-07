import jwt from 'jsonwebtoken';
import { mergeHistories, mergePrefs } from '../lib/mergeHistory.js';

export default async function handler(req, res) {
    // CORS headers for local testing if needed
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '認証が必要です。ログインし直してください。' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
        const jwtSecret = process.env.JWT_SECRET || 'smash-logger-secret-key-2026';
        decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
        return res.status(401).json({ error: 'トークンが無効または期限切れです。ログインし直してください。' });
    }

    const userId = decoded.userId;
    let { data } = req.body

    if (!data) {
        return res.status(400).json({ error: 'No data provided.' })
    }

    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!kvUrl || !kvToken) {
        return res.status(500).json({ error: 'Database is not configured.' })
    }

    try {
        // Merge with what is already in the cloud instead of overwriting it,
        // so a device with stale data can't erase matches recorded elsewhere.
        const currentRes = await fetch(`${kvUrl}/get/smash_data_${userId}`, {
            headers: { Authorization: `Bearer ${kvToken}` },
        })
        if (!currentRes.ok) {
            throw new Error(`KV API responded with status ${currentRes.status}`)
        }
        let current = (await currentRes.json()).result
        if (typeof current === 'string') {
            try { current = JSON.parse(current) } catch { current = null }
        }
        if (current && Array.isArray(current.history) && Array.isArray(data.history)) {
            const prefs = mergePrefs(data.prefs, current.prefs)
            data = {
                ...data,
                prefs,
                history: mergeHistories(data.history, current.history, prefs.deletedIds),
            }
        }

        const url = `${kvUrl}/set/smash_data_${userId}`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${kvToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            throw new Error(`KV API responded with status ${response.status}`)
        }

        // Daily Backup Logic (JST time)
        try {
            const jstDate = new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
            const backupUrl = `${kvUrl}/set/smash_data_${userId}_backup_${jstDate}`;
            await fetch(backupUrl, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${kvToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data),
            });
        } catch (backupError) {
            console.error('KV Backup Error:', backupError);
        }

        return res.status(200).json({ success: true, count: Array.isArray(data.history) ? data.history.length : null })
    } catch (error) {
        console.error('KV Save Error:', error)
        return res.status(500).json({ error: 'Failed to save data' })
    }
}
