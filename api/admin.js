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

    // Authorization
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: '認証が必要です。' });
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
        const jwtSecret = process.env.JWT_SECRET || 'smash-logger-secret-key-2026';
        decoded = jwt.verify(token, jwtSecret);
    } catch (err) {
        return res.status(401).json({ error: '無効なトークンです。' });
    }

    if (!decoded.isAdmin) {
        return res.status(403).json({ error: '管理者権限がありません。' });
    }

    const MASTER_BLOB_ID = '019fb923-93e7-756b-a84b-6cece43d6afa';

    try {
        // 1. Fetch Master Blob to get all users
        const masterRes = await fetch(`https://jsonblob.com/api/jsonBlob/${MASTER_BLOB_ID}`);
        if (!masterRes.ok) throw new Error('Failed to fetch master index');
        const masterData = await masterRes.json();
        
        const users = Object.values(masterData.users || {});
        
        if (users.length === 0) {
            return res.status(200).json({
                success: true,
                stats: {
                    totalUsers: 0,
                    totalMatches: 0,
                    popularFighters: [],
                    recentMatches: []
                }
            });
        }

        // 2. Fetch all individual blobs concurrently
        const fetchPromises = users.map(async (user) => {
            try {
                const res = await fetch(`https://jsonblob.com/api/jsonBlob/${user.blobId}`);
                if (res.ok) {
                    return await res.json();
                }
            } catch(e) {
                // ignore failed fetches
            }
            return null;
        });

        const allData = await Promise.all(fetchPromises);

        // 3. Aggregate Data
        let totalMatches = 0;
        let fighterUsage = {};
        let allRecentMatches = [];

        allData.forEach(data => {
            if (!data) return;
            if (data.history && Array.isArray(data.history)) {
                totalMatches += data.history.length;
                
                data.history.forEach(match => {
                    // Count fighters
                    if (match.myFighter) {
                        fighterUsage[match.myFighter] = (fighterUsage[match.myFighter] || 0) + 1;
                    }
                    
                    // Collect recent matches for global feed
                    allRecentMatches.push(match);
                });
            }
        });

        // Sort fighters by popularity
        const popularFighters = Object.entries(fighterUsage)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([fighter, count]) => ({ fighter, count }));

        // Sort all matches by timestamp descending
        allRecentMatches.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const recentMatches = allRecentMatches.slice(0, 50);

        return res.status(200).json({
            success: true,
            stats: {
                totalUsers: users.length,
                totalMatches,
                popularFighters,
                recentMatches
            }
        });

    } catch (error) {
        console.error('Admin API Error:', error)
        return res.status(500).json({ error: 'データの取得に失敗しました。' })
    }
}
