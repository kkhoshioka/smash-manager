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

    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!kvUrl || !kvToken) {
        return res.status(500).json({ error: 'Database is not configured.' })
    }

    try {
        let cursor = '0';
        let allKeys = [];
        
        // Scan for keys matching smash_data_* but not containing _backup_
        // MVP: Limit to a few scans or just one if we only have a few users.
        let loopCount = 0;
        do {
            const scanUrl = `${kvUrl}/scan/${cursor}?match=smash_data_*&count=100`;
            const scanRes = await fetch(scanUrl, {
                headers: { Authorization: `Bearer ${kvToken}` }
            });
            const scanData = await scanRes.json();
            
            if (scanData.result) {
                cursor = scanData.result[0];
                const keys = scanData.result[1].filter(k => !k.includes('_backup_'));
                allKeys.push(...keys);
            } else {
                break;
            }
            loopCount++;
        } while (cursor !== '0' && loopCount < 10); // Max 1000 keys for MVP

        if (allKeys.length === 0) {
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

        // Fetch data using MGET
        // Vercel KV REST supports MGET: /mget/key1/key2/...
        const mgetUrl = `${kvUrl}/mget/${allKeys.join('/')}`;
        const mgetRes = await fetch(mgetUrl, {
            headers: { Authorization: `Bearer ${kvToken}` }
        });
        const mgetData = await mgetRes.json();
        const values = mgetData.result;

        // Aggregate Data
        let totalMatches = 0;
        let fighterUsage = {};
        let allRecentMatches = [];

        values.forEach(valStr => {
            if (!valStr) return;
            try {
                let data = valStr;
                if (typeof data === 'string') data = JSON.parse(data);
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
            } catch (e) {
                // Parse error, ignore
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
                totalUsers: allKeys.length,
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
