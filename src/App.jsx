import React, { useState, useEffect } from 'react';
import MatchLogger from './components/MatchLogger';
import Stats from './components/Stats';
import Settings from './components/Settings';
import { Swords, BarChart2, Settings as SettingsIcon } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('log');
  const [backgroundImage, setBackgroundImage] = useState(() => {
    return localStorage.getItem('smashBgImage') || '/bg_stage.png';
  });

  useEffect(() => {
    document.documentElement.style.setProperty('--bg-image', `url(${backgroundImage})`);
    localStorage.setItem('smashBgImage', backgroundImage);
  }, [backgroundImage]);

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
        </div>

        <main>
          {activeTab === 'log' && <MatchLogger />}
          {activeTab === 'stats' && <Stats />}
          {activeTab === 'settings' && <Settings backgroundImage={backgroundImage} onBackgroundChange={setBackgroundImage} />}
        </main>
      </div>
    </div>
  );
}

export default App;
