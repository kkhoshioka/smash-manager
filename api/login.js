import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    // CORS headers
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

    const { nickname, password } = req.body

    if (!nickname || !password) {
        return res.status(400).json({ error: 'IDとパスワードを入力してください。' })
    }

    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!kvUrl || !kvToken) {
        return res.status(500).json({ error: 'Database is not configured.' })
    }

    try {
        const usernameKey = `smash_user_${encodeURIComponent(nickname.toLowerCase())}`;
        
        // 1. Get user data
        const userRes = await fetch(`${kvUrl}/get/${usernameKey}`, {
            headers: { Authorization: `Bearer ${kvToken}` },
        });
        const userData = await userRes.json();
        
        // Sometimes Vercel KV REST returns result as a stringified JSON if it was saved as string.
        let parsedUser = userData.result;
        if (!parsedUser) {
            return res.status(401).json({ error: 'IDまたはパスワードが間違っています。' });
        }
        
        if (typeof parsedUser === 'string') {
            try {
                parsedUser = JSON.parse(parsedUser);
            } catch(e) {}
        }

        // 2. Verify password
        const isValid = await bcrypt.compare(password, parsedUser.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'IDまたはパスワードが間違っています。' });
        }

        // 3. Generate JWT
        const jwtSecret = process.env.JWT_SECRET || 'smash-logger-secret-key-2026';
        const isAdmin = parsedUser.nickname === 'おじ勇者おりぶ';
        const token = jwt.sign({ userId: parsedUser.userId, nickname: parsedUser.nickname, isAdmin }, jwtSecret, { expiresIn: '30d' });

        return res.status(200).json({ success: true, token, userId: parsedUser.userId, nickname: parsedUser.nickname, isAdmin });
    } catch (error) {
        console.error('Login Error:', error)
        return res.status(500).json({ error: 'ログインに失敗しました。' })
    }
}
