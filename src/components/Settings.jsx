import React, { useRef, useState } from 'react';
import { useMatchHistory } from '../hooks/useMatchHistory';
import { useAuth } from '../hooks/useAuth';
import { Image, Upload, Download, Cloud, Monitor, Database, LogIn, UserPlus, LogOut, Copy, Eye, EyeOff } from 'lucide-react';

export default function Settings({ backgroundImage, onBackgroundChange }) {
    const { history, prefs, importData, isSyncing, syncError } = useMatchHistory();
    const { auth, login, signup, logout, isLoading, error: authError } = useAuth();
    
    const [nickname, setNickname] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginMode, setIsLoginMode] = useState(true);
    const [showObsUrl, setShowObsUrl] = useState(false);

    const fileInputRef = useRef(null);
    const bgUploadRef = useRef(null);

    const backgrounds = [
        { id: 'bg-symbol', url: '/bg_stage.png', name: '特大シンボル (レッド)', type: 'preset' },
        { id: 'bg-symbol-blue', url: '/bg_symbol_blue.png', name: 'サイバーブルー', type: 'preset' },
        { id: 'bg-symbol-gold', url: '/bg_symbol_gold.png', name: 'ゴールドエンブレム', type: 'preset' },
        { id: 'bg-symbol-glitch', url: '/bg_symbol_glitch.png', name: 'グリッチハック', type: 'preset' },
        { id: 'bg-symbol-stealth', url: '/bg_symbol_stealth.png', name: 'ダークステルス', type: 'preset' },
        { id: 'bg-symbol-fire', url: '/bg_symbol_fire.png', name: 'バーニング', type: 'preset' },
        { id: 'bg-neon', url: '/bg_neon.png', name: 'ネオン・シティ', type: 'preset' },
        { id: 'bg-calm', url: '/bg_calm.png', name: '天空の島', type: 'preset' },
        { id: 'bg-fiery', url: '/bg_fiery.png', name: '灼熱の闘技場', type: 'preset' },
        { id: 'bg-carbon', url: '/bg_carbon.png', name: 'カーボン・ミニマル', type: 'preset' },
        { id: 'bg-light-2', url: '/bg_light_2.png', name: '天空の闘技場 1', type: 'preset' },
        { id: 'bg-light-5', url: '/bg_light_5.png', name: '天空の闘技場 2 (シアン)', type: 'preset' },
        { id: 'bg-light-6', url: '/bg_light_6.png', name: '天空の闘技場 3 (神秘)', type: 'preset' },
        { id: 'bg-light-7', url: '/bg_light_7.png', name: '天空の闘技場 4 (スタジアム)', type: 'preset' }
    ];

    const handleExport = () => {
        const data = { history, prefs };
        const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `smash_logger_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        if (fileInputRef.current) fileInputRef.current.click();
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const success = importData(event.target.result);
            if (success) {
                alert('データの読み込み（復元）が完了しました！');
            } else {
                alert('エラー：データの読み込みに失敗しました。正しいバックアップファイル形式か確認してください。');
            }
        };
        reader.readAsText(file);
    };

    const handleBgUploadClick = () => {
        if (bgUploadRef.current) bgUploadRef.current.click();
    };

    const handleBgFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            onBackgroundChange(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleAuthSubmit = async (e) => {
        e.preventDefault();
        if (isLoginMode) {
            const success = await login(nickname, password);
            if (success) alert('ログインしました！');
        } else {
            const success = await signup(nickname, password);
            if (success) alert('アカウントを作成しログインしました！');
        }
    };

    const copyObsUrl = () => {
        if (!auth?.userId) return;
        // Construct full URL including origin
        const url = `${window.location.origin}/?obsId=${auth.userId}`;
        navigator.clipboard.writeText(url)
            .then(() => alert('OBS用URLをコピーしました！'))
            .catch(() => alert('コピーに失敗しました。'));
    };

    return (
        <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Account & Cloud Sync */}
            <div className="stat-card" style={{ borderBottomColor: '#00ccff' }}>
                <h2 className="section-title" style={{ borderColor: '#00ccff', marginTop: 0 }}>
                    <Cloud size={28} style={{ marginRight: '0.8rem', color: '#00ccff' }} />
                    アカウント・クラウド同期
                </h2>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {auth ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#111', padding: '1rem', border: '1px solid #333', borderRadius: '8px' }}>
                                <div>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.2rem' }}>ログイン中のID</p>
                                    <p style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'white' }}>{auth.nickname}</p>
                                    {isSyncing && <p style={{ color: 'var(--smash-yellow)', fontSize: '0.8rem', marginTop: '0.5rem', animation: 'pulse 1.5s infinite' }}>☁️ データ同期中...</p>}
                                    {syncError && <p style={{ color: 'var(--lose-color)', fontSize: '0.8rem', marginTop: '0.5rem' }}>{syncError}</p>}
                                </div>
                                <button onClick={() => { if(window.confirm('ログアウトしますか？')) logout(); }} className="btn-smash" style={{ background: '#444', padding: '0.5rem 1rem' }}>
                                    <div style={{ transform: 'skewX(20deg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <LogOut size={16} /> ログアウト
                                    </div>
                                </button>
                            </div>

                            <div style={{ backgroundColor: 'rgba(0, 204, 255, 0.1)', padding: '1.5rem', border: '1px solid #00ccff', borderRadius: '8px', marginTop: '1rem' }}>
                                <h3 style={{ color: '#00ccff', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <Monitor size={20} /> OBS配信用オーバーレイURL
                                </h3>
                                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                                    OBSのブラウザソースに以下のURLを設定すると、戦績がリアルタイムで表示されます。
                                </p>
                                <div style={{ display: 'flex', gap: '0.5rem' }}>
                                    <input 
                                        type={showObsUrl ? "text" : "password"} 
                                        readOnly 
                                        value={`${window.location.origin}/?obsId=${auth.userId}`}
                                        style={{ flex: 1, padding: '0.8rem', background: '#000', color: showObsUrl ? '#00ccff' : 'var(--text-muted)', border: '1px solid #00ccff', fontSize: '0.9rem', fontFamily: 'monospace' }}
                                    />
                                    <button onClick={() => setShowObsUrl(!showObsUrl)} className="btn-smash" style={{ background: '#333', padding: '0 0.8rem' }}>
                                        <div style={{ transform: 'skewX(20deg)', display: 'flex', alignItems: 'center' }}>
                                            {showObsUrl ? <EyeOff size={20} /> : <Eye size={20} />}
                                        </div>
                                    </button>
                                    <button onClick={copyObsUrl} className="btn-smash" style={{ background: '#00ccff', padding: '0 1rem' }}>
                                        <div style={{ transform: 'skewX(20deg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <Copy size={20} /> コピー
                                        </div>
                                    </button>
                                </div>
                                <p style={{ color: 'var(--lose-color)', fontSize: '0.8rem', marginTop: '0.8rem', fontWeight: 'bold' }}>
                                    ※このURLを知っていれば誰でもあなたの戦績を見ることができます。第三者には教えないでください。
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ color: 'var(--text-muted)' }}>
                                アカウントを作成（ログイン）すると、PCとスマホ間で戦績データが自動的に同期されます。<br/>
                                OBSでの配信レイアウトも利用可能になります。
                            </p>
                            
                            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                                <button 
                                    onClick={() => { setIsLoginMode(true); seterror(null); }}
                                    style={{ flex: 1, padding: '0.8rem', borderBottom: isLoginMode ? '3px solid var(--smash-yellow)' : '3px solid #333', background: 'none', color: isLoginMode ? 'white' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    ログイン
                                </button>
                                <button 
                                    onClick={() => { setIsLoginMode(false); seterror(null); }}
                                    style={{ flex: 1, padding: '0.8rem', borderBottom: !isLoginMode ? '3px solid var(--smash-yellow)' : '3px solid #333', background: 'none', color: !isLoginMode ? 'white' : 'var(--text-muted)', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}
                                >
                                    新規作成
                                </button>
                            </div>

                            <form onSubmit={handleAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                                {authError && (
                                    <div style={{ backgroundColor: 'rgba(255, 0, 0, 0.1)', color: 'var(--lose-color)', padding: '1rem', border: '1px solid var(--lose-color)', borderRadius: '4px', fontWeight: 'bold' }}>
                                        {authError}
                                    </div>
                                )}
                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>ID (ニックネーム)</label>
                                    <input 
                                        type="text" 
                                        placeholder="例: smash_player_1"
                                        value={nickname}
                                        onChange={(e) => setNickname(e.target.value)}
                                        required
                                        style={{ width: '100%', padding: '1rem', background: '#111', color: 'white', border: '1px solid #444', fontSize: '1.1rem' }}
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: 'var(--text-muted)', marginBottom: '0.5rem', fontSize: '0.9rem' }}>パスワード (4文字以上)</label>
                                    <input 
                                        type="password" 
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        minLength={4}
                                        style={{ width: '100%', padding: '1rem', background: '#111', color: 'white', border: '1px solid #444', fontSize: '1.1rem' }}
                                    />
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={isLoading}
                                    className="btn-smash" 
                                    style={{ background: 'var(--smash-yellow)', color: 'black', marginTop: '1rem', padding: '1rem', opacity: isLoading ? 0.7 : 1 }}
                                >
                                    <div style={{ transform: 'skewX(20deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                        {isLoginMode ? <LogIn size={20} /> : <UserPlus size={20} />}
                                        {isLoading ? '処理中...' : (isLoginMode ? 'ログイン' : 'アカウントを作成してログイン')}
                                    </div>
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            <div className="smash-divider" />

            {/* Background Settings */}
            <div className="stat-card" style={{ borderBottomColor: 'var(--smash-yellow)' }}>
                <h2 className="section-title" style={{ borderColor: 'var(--smash-yellow)', marginTop: 0 }}>
                    <Image size={28} style={{ marginRight: '0.8rem', color: 'var(--smash-yellow)' }} />
                    背景画像の変更
                </h2>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
                        {backgrounds.map(bg => (
                            <div
                                key={bg.id}
                                onClick={() => onBackgroundChange(bg.url)}
                                style={{
                                    border: backgroundImage === bg.url ? '4px solid var(--smash-yellow)' : '4px solid transparent',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    transform: backgroundImage === bg.url ? 'scale(1.05)' : 'scale(1)',
                                    boxShadow: backgroundImage === bg.url ? '0 0 15px rgba(255,204,0,0.5)' : 'none'
                                }}
                            >
                                <img src={bg.url} alt={bg.name} style={{ width: '100%', height: '100px', objectFit: 'cover' }} />
                                <div style={{ padding: '0.5rem', backgroundColor: '#111', color: 'white', fontSize: '0.9rem', textAlign: 'center', fontWeight: 'bold' }}>
                                    {bg.name}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div style={{ marginTop: '1rem', borderTop: '2px solid #333', paddingTop: '1.5rem' }}>
                        <h3 style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                            <Monitor size={20} color="var(--text-muted)" /> カスタム画像アップロード
                        </h3>
                        <input type="file" accept="image/*" ref={bgUploadRef} style={{ display: 'none' }} onChange={handleBgFileChange} />
                        <button className="btn-smash" onClick={handleBgUploadClick} style={{ background: '#444', clipPath: 'none', padding: '0.8rem 2rem' }}>
                            <div style={{ transform: 'skewX(20deg)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <Upload size={20} /> 画像を選ぶ
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <div className="smash-divider" />

            {/* Local Backup */}
            <div className="stat-card" style={{ borderBottomColor: 'var(--win-color)' }}>
                <h2 className="section-title" style={{ borderColor: 'var(--win-color)', marginTop: 0 }}>
                    <Database size={28} style={{ marginRight: '0.8rem', color: 'var(--win-color)' }} />
                    ローカル バックアップ
                </h2>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>ローカルPCに現在のすべての対戦記録をJSONファイルとして保存、または復元します。</p>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button onClick={handleExport} className="btn-smash" style={{ background: 'var(--win-color)', flex: 1 }}>
                            <div style={{ transform: 'skewX(20deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Download size={20} />PCへ保存 (エクスポート)
                            </div>
                        </button>
                        <input type="file" accept=".json" onChange={handleFileChange} ref={fileInputRef} style={{ display: 'none' }} />
                        <button onClick={handleImportClick} className="btn-smash" style={{ background: '#333', flex: 1 }}>
                            <div style={{ transform: 'skewX(20deg)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                <Upload size={20} />PCから復元 (インポート)
                            </div>
                        </button>
                    </div>
                </div>
            </div>

        </div>
    );
}
