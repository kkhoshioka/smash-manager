export default async function handler(req, res) {
    // CORS headers for local testing if needed
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { syncId, data } = req.body

    if (!syncId || typeof syncId !== 'string' || syncId.length < 4) {
        return res.status(400).json({ error: 'Sync ID must be at least 4 characters long.' })
    }

    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!kvUrl || !kvToken) {
        return res.status(500).json({ error: 'Database is not configured.' })
    }

    try {
        const url = `${kvUrl}/set/smash_sync_${syncId}`
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

        return res.status(200).json({ success: true })
    } catch (error) {
        console.error('KV Save Error:', error)
        return res.status(500).json({ error: 'Failed to save data' })
    }
}
