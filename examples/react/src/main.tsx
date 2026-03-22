import './styles.css';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import App from './App';
import { BridgeProvider } from './bridge';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <BridgeProvider>
        <App />
      </BridgeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
