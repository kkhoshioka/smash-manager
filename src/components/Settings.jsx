import React, { useRef } from 'react';
import { useMatchHistory } from '../hooks/useMatchHistory';
import { Image, Upload, Download, Cloud, Monitor, Database, Settings as SettingsIcon } from 'lucide-react';

export default function Settings({ backgroundImage, onBackgroundChange }) {
    const { history, prefs, importData, syncId, handleSetSyncId, isSyncing, syncError } = useMatchHistory();
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
        { id: 'bg-carbon', url: '/bg_carbon.png', name: 'カーボン・ミニマル', type: 'preset' }
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

    return (
        <div className="animate-enter" style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
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

            <div className="smash-divider" />

            {/* Cloud Sync */}
            <div className="stat-card" style={{ borderBottomColor: '#00ccff' }}>
                <h2 className="section-title" style={{ borderColor: '#00ccff', marginTop: 0 }}>
                    <Cloud size={28} style={{ marginRight: '0.8rem', color: '#00ccff' }} />
                    クラウド同期 (スマホ連携)
                </h2>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p style={{ color: 'var(--text-muted)' }}>
                        PCとスマホ間でデータを共有するための「合言葉」を設定します。
                        同じ合言葉を設定した端末同士でデータが自動的に同期されます。
                    </p>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <input
                            type="text"
                            placeholder="例: my-smash-secret-word"
                            defaultValue={syncId}
                            onBlur={(e) => handleSetSyncId(e.target.value)}
                            style={{ flex: 1, padding: '1rem', background: '#111', color: 'white', border: '2px solid #444', fontSize: '1.2rem', fontFamily: 'var(--font-en)' }}
                        />
                        {isSyncing && <span style={{ color: '#00ccff', fontWeight: 'bold' }}>同期中...</span>}
                    </div>
                    {syncError && <p style={{ color: 'var(--lose-color)', fontWeight: 'bold' }}>同期エラー: {syncError}</p>}
                    <p style={{ fontSize: '0.9rem', color: '#666' }}>※合言葉を入力してフォーカスを外すと自動で適用・同期されます。</p>
                </div>
            </div>

        </div>
    );
}
