import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    let targetUserId = null;

    // Check if called by OBS
    if (req.query.obsId) {
        targetUserId = req.query.obsId;
    } else {
        // Otherwise require JWT
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: '認証が必要です。ログインし直してください。' });
        }

        const token = authHeader.split(' ')[1];
        try {
            const jwtSecret = process.env.JWT_SECRET || 'smash-logger-secret-key-2026';
            const decoded = jwt.verify(token, jwtSecret);
            targetUserId = decoded.userId;
        } catch (err) {
            return res.status(401).json({ error: 'トークンが無効または期限切れです。ログインし直してください。' });
        }
    }

    if (!targetUserId) {
        return res.status(400).json({ error: 'ユーザーIDが指定されていません。' });
    }

    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!kvUrl || !kvToken) {
        return res.status(500).json({ error: 'Database is not configured.' })
    }

    try {
        const url = `${kvUrl}/get/smash_data_${targetUserId}`
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${kvToken}`,
            },
        })

        if (!response.ok) {
            throw new Error(`KV API responded with status ${response.status}`)
        }

        const json = await response.json()
        let parsedData = json.result

        if (typeof parsedData === 'string') {
            try {
                parsedData = JSON.parse(parsedData)
            } catch (e) {
                // Ignore parse error
            }
        }

        return res.status(200).json({ success: true, data: parsedData })
    } catch (error) {
        console.error('KV Load Error:', error)
        return res.status(500).json({ error: 'Failed to load data' })
    }
}
