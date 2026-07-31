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

    let { nickname, password } = req.body
    
    if (typeof nickname === 'string') nickname = nickname.trim();

    if (!nickname || typeof nickname !== 'string' || nickname.length === 0) {
        return res.status(400).json({ error: 'ID（ニックネーム）を入力してください。' })
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
        return res.status(400).json({ error: 'パスワードは4文字以上で設定してください。' })
    }

    const MASTER_BLOB_ID = '019fb923-93e7-756b-a84b-6cece43d6afa';
    
    try {
        const usernameKey = `smash_user_${encodeURIComponent(nickname.toLowerCase())}`;
        
        // 1. Fetch Master Blob
        const masterRes = await fetch(`https://jsonblob.com/api/jsonBlob/${MASTER_BLOB_ID}`);
        if (!masterRes.ok) throw new Error('Failed to fetch master index');
        const masterData = await masterRes.json();
        
        if (!masterData.users) masterData.users = {};

        // 2. Check if user already exists
        if (masterData.users[usernameKey]) {
            return res.status(409).json({ error: 'このID（ニックネーム）はすでに使用されています。' });
        }

        // 3. Create a NEW blob for this user's data
        const initialUserData = { history: [], prefs: {} };
        const newBlobRes = await fetch('https://jsonblob.com/api/jsonBlob', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initialUserData)
        });
        if (!newBlobRes.ok) throw new Error('Failed to create user data blob');
        
        // Get the Location header which contains the new Blob ID
        const locationUrl = newBlobRes.headers.get('location');
        const blobId = locationUrl.split('/').pop();

        // 4. Hash password and save to master index
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = randomUUID(); 
        
        masterData.users[usernameKey] = {
            nickname,
            passwordHash: hashedPassword,
            userId,
            blobId
        };

        // 5. Update Master Blob
        const updateMasterRes = await fetch(`https://jsonblob.com/api/jsonBlob/${MASTER_BLOB_ID}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(masterData)
        });
        if (!updateMasterRes.ok) throw new Error('Failed to update master index');

        // 6. Generate JWT (now includes blobId!)
        const jwtSecret = process.env.JWT_SECRET || 'smash-logger-secret-key-2026';
        const isAdmin = nickname === 'おじ勇者おりぶ';
        const token = jwt.sign({ userId, nickname, blobId, isAdmin }, jwtSecret, { expiresIn: '30d' });

        return res.status(200).json({ success: true, token, userId, nickname, isAdmin });
    } catch (error) {
        console.error('Signup Error:', error)
        return res.status(500).json({ error: `登録に失敗しました: ${error.message}` })
    }
}
