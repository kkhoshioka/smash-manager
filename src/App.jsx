import React, { useState } from 'react';
import MatchLogger from './components/MatchLogger';
import Stats from './components/Stats';
import { Swords, BarChart2 } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('log');

  return (
    <div className="app-container">
      <div className="main-content">
        <header style={{
          display: 'flex',
          justifyContent: 'center',
          padding: '1.5rem',
          borderBottom: '4px solid var(--smash-dark-red)',
          marginBottom: '1rem',
          background: 'linear-gradient(180deg, #111, var(--bg-panel))'
        }}>
          <h1 style={{
            margin: 0,
            color: 'var(--text-main)',
            fontSize: '3.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            textShadow: '4px 4px 0 #000',
            letterSpacing: '3px'
          }}>
            <span style={{ color: 'var(--smash-red)' }}>SMASH</span> LOGGER
          </h1>
        </header>

        <div className="smash-tabs">
          <button
            className={`smash-tab ${activeTab === 'log' ? 'active' : ''}`}
            onClick={() => setActiveTab('log')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', flex: 1 }}
          >
            <Swords size={24} /> 記録する
          </button>
          <button
            className={`smash-tab ${activeTab === 'stats' ? 'active' : ''}`}
            onClick={() => setActiveTab('stats')}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', flex: 1 }}
          >
            <BarChart2 size={24} /> 戦績・履歴
          </button>
        </div>

        <main>
          {activeTab === 'log' ? <MatchLogger /> : <Stats />}
        </main>
      </div>
    </div>
  );
}

export default App;
