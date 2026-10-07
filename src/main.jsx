import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
// 新デザイン。[data-ui="neo"] の下だけに効くので、classic に戻せば完全に無効化される。
import './theme-neo.css';

// 新しいバージョンが届いたら自動で読み込み直す(スマホのホーム画面アプリが古い版のまま動き続けないように)
if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
  let reloaded = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloaded) return;
    reloaded = true;
    window.location.reload();
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
