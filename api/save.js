import jwt from 'jsonwebtoken';

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
    const { data } = req.body

    if (!data) {
        return res.status(400).json({ error: 'No data provided.' })
    }

    const blobId = decoded.blobId;
    if (!blobId) {
        return res.status(401).json({ error: '古い認証トークンです。再度ログインしてください。' });
    }

    try {
        const url = `https://jsonblob.com/api/jsonBlob/${blobId}`;
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data),
        })

        if (!response.ok) {
            throw new Error(`JSONBlob API responded with status ${response.status}`)
        }

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('Save Error:', error)
        return res.status(500).json({ error: 'Failed to save data' })
    }
}
