import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';

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

    if (!nickname || typeof nickname !== 'string' || nickname.trim().length === 0) {
        return res.status(400).json({ error: 'ID（ニックネーム）を入力してください。' })
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
        return res.status(400).json({ error: 'パスワードは4文字以上で設定してください。' })
    }

    const kvUrl = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL
    const kvToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN

    if (!kvUrl || !kvToken) {
        return res.status(500).json({ error: 'Database is not configured.' })
    }

    try {
        const usernameKey = `smash_user_${encodeURIComponent(nickname.toLowerCase())}`;
        
        // 1. Check if user already exists
        const checkRes = await fetch(`${kvUrl}/get/${usernameKey}`, {
            headers: { Authorization: `Bearer ${kvToken}` },
        });
        const checkData = await checkRes.json();
        
        if (checkData.result) {
            return res.status(409).json({ error: 'このID（ニックネーム）はすでに使用されています。' });
        }

        // 2. Hash password and generate UUID
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = randomUUID(); // or generate random string if randomUUID is unavailable in some edge runtime
        const userData = { nickname, passwordHash: hashedPassword, userId };

        // 3. Save user data
        const saveRes = await fetch(`${kvUrl}/set/${usernameKey}`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${kvToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
        });

        if (!saveRes.ok) throw new Error('Failed to save user');

        // 4. Generate JWT
        const jwtSecret = process.env.JWT_SECRET || 'smash-logger-secret-key-2026';
        const isAdmin = nickname === 'おじ勇者おりぶ';
        const token = jwt.sign({ userId, nickname, isAdmin }, jwtSecret, { expiresIn: '30d' });

        return res.status(200).json({ success: true, token, userId, nickname, isAdmin });
    } catch (error) {
        console.error('Signup Error:', error)
        return res.status(500).json({ error: '登録に失敗しました。' })
    }
}
