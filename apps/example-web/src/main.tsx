import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { BridgeProvider } from './bridge';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <BridgeProvider>
        <App />
      </BridgeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
