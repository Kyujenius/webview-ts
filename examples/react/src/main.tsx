import './styles.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { BridgeProvider } from './bridge';

// DevTools recorder — dev only, registers itself on import
if (import.meta.env.DEV) {
  import('@webview-ts/devtools/client');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <BridgeProvider>
        <App />
      </BridgeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
