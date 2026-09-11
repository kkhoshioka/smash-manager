import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
// 新デザイン。[data-ui="neo"] の下だけに効くので、classic に戻せば完全に無効化される。
import './theme-neo.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
