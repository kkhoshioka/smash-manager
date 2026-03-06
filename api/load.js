export default async function handler(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Credentials', true)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

    if (req.method === 'OPTIONS') {
        res.status(200).end()
        return
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' })
    }

    const { syncId } = req.query

    if (!syncId || typeof syncId !== 'string' || syncId.length < 4) {
        return res.status(400).json({ error: 'Sync ID must be at least 4 characters long.' })
    }

    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!kvUrl || !kvToken) {
        return res.status(500).json({ error: 'Database is not configured.' })
    }

    try {
        const url = `${kvUrl}/get/smash_sync_${syncId}`
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
        // Vercel KV REST API returns { result: "value" } or { result: {object} }
        let parsedData = json.result

        // Sometimes it returns a string if we sent a string instead of an object, safely parse it
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
