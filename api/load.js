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

    const MASTER_BLOB_ID = '019fb923-93e7-756b-a84b-6cece43d6afa';
    
    let targetUserId = null;
    let targetBlobId = null;

    // Check if called by OBS
    if (req.query.obsId) {
        targetUserId = req.query.obsId;
        
        // 1. Fetch Master Blob to find the blobId for this userId
        try {
            const masterRes = await fetch(`https://jsonblob.com/api/jsonBlob/${MASTER_BLOB_ID}`);
            if (!masterRes.ok) throw new Error('Master index failed');
            const masterData = await masterRes.json();
            
            const user = Object.values(masterData.users || {}).find(u => u.userId === targetUserId);
            if (user) {
                targetBlobId = user.blobId;
            }
        } catch (e) {
            console.error('Failed to find OBS user:', e);
        }
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
            targetBlobId = decoded.blobId;
        } catch (err) {
            return res.status(401).json({ error: 'トークンが無効または期限切れです。ログインし直してください。' });
        }
    }

    if (!targetBlobId) {
        return res.status(404).json({ error: 'データが見つかりません。' });
    }

    try {
        const url = `https://jsonblob.com/api/jsonBlob/${targetBlobId}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
        })

        if (!response.ok) {
            throw new Error(`JSONBlob API responded with status ${response.status}`)
        }

        const parsedData = await response.json();

        return res.status(200).json({ success: true, data: parsedData })
    } catch (error) {
        console.error('Load Error:', error)
        return res.status(500).json({ error: 'Failed to load data' })
    }
}
