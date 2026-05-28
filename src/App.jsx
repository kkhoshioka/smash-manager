import React, { useState, useEffect } from 'react';
import MatchLogger from './components/MatchLogger';
import Stats from './components/Stats';
import Settings from './components/Settings';
import ObsOverlay from './components/ObsOverlay';
import AdminDashboard from './components/AdminDashboard';
import { Swords, BarChart2, Settings as SettingsIcon, ShieldAlert } from 'lucide-react';
import { useAuth } from './hooks/useAuth';

function App() {
  const [activeTab, setActiveTab] = useState('log');
  const { auth } = useAuth();
  const [backgroundImage, setBackgroundImage] = useState(() => {
    return localStorage.getItem('smashBgImage') || '/bg_stage.png';
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--bg-image', `url(${backgroundImage})`);
    localStorage.setItem('smashBgImage', backgroundImage);
  }, [backgroundImage]);

  const isObsMode = window.location.search.includes('obs=true') || window.location.search.includes('obsId=') || window.location.hash.includes('obs=true');

  if (isObsMode) {
    return <ObsOverlay />;
  }

  return (
    <div className="app-container">
      <div className="main-content">
        <header className="app-header">
          <h1 className="app-title">
            <span style={{ color: 'var(--smash-red)' }}>SMASH</span> LOGGER
          </h1>
        </header>

        <div className="smash-tabs">
          <button
            className={`smash-tab ${activeTab === 'log' ? 'active' : ''}`}
            onClick={() => setActiveTab('log')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', flex: 1 }}
          >
            <Swords size={20} /> 記録する
          </button>
          <button
            className={`smash-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', flex: 1 }}
          >
            <BarChart2 size={20} /> 戦績・履歴
          </button>
          <button
            className={`smash-tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', flex: 1 }}
          >
            <SettingsIcon size={20} /> オプション
          </button>
          {auth?.isAdmin && (
            <button
              className={`smash-tab ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', flex: 1, backgroundColor: activeTab === 'admin' ? 'rgba(255,204,0,0.2)' : 'transparent', color: activeTab === 'admin' ? 'gold' : 'var(--text-muted)' }}
            >
              <ShieldAlert size={20} /> 管理者
            </button>
          )}
        </div>

        <main>
          {activeTab === 'log' && <MatchLogger />}
          {activeTab === 'stats' && <Stats />}
          {activeTab === 'settings' && <Settings backgroundImage={backgroundImage} onBackgroundChange={setBackgroundImage} />}
          {activeTab === 'admin' && auth?.isAdmin && <AdminDashboard auth={auth} />}
        </main>
      </div>
    </div>
  );
}

export default App;
