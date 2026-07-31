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

    let { nickname, password } = req.body
    
    if (typeof nickname === 'string') nickname = nickname.trim();

    if (!nickname || !password) {
        return res.status(400).json({ error: 'IDとパスワードを入力してください。' })
    }

    const MASTER_BLOB_ID = '019fb923-93e7-756b-a84b-6cece43d6afa';
    
    try {
        const usernameKey = `smash_user_${encodeURIComponent(nickname.toLowerCase())}`;
        
        // 1. Fetch Master Blob
        const masterRes = await fetch(`https://jsonblob.com/api/jsonBlob/${MASTER_BLOB_ID}`);
        if (!masterRes.ok) throw new Error('Failed to fetch master index');
        const masterData = await masterRes.json();
        
        if (!masterData.users || !masterData.users[usernameKey]) {
            return res.status(401).json({ error: 'IDまたはパスワードが間違っています。' });
        }

        const parsedUser = masterData.users[usernameKey];

        // 2. Verify password
        const isValid = await bcrypt.compare(password, parsedUser.passwordHash);
        if (!isValid) {
            return res.status(401).json({ error: 'IDまたはパスワードが間違っています。' });
        }

        // 3. Generate JWT (include blobId)
        const jwtSecret = process.env.JWT_SECRET || 'smash-logger-secret-key-2026';
        const isAdmin = parsedUser.nickname === 'おじ勇者おりぶ';
        const token = jwt.sign({ 
            userId: parsedUser.userId, 
            nickname: parsedUser.nickname, 
            blobId: parsedUser.blobId,
            isAdmin 
        }, jwtSecret, { expiresIn: '30d' });

        return res.status(200).json({ success: true, token, userId: parsedUser.userId, nickname: parsedUser.nickname, isAdmin });
    } catch (error) {
        console.error('Login Error:', error)
        return res.status(500).json({ error: `ログインに失敗しました: ${error.message}` })
    }
}
