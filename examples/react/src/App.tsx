import { useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { TsBridgeDevtools } from '@webview-ts/devtools';
import { useBridge } from './bridge';
import HomePage from './pages/HomePage';
import CameraPage from './pages/CameraPage';
import LocationPage from './pages/LocationPage';
import StoragePage from './pages/StoragePage';
import BiometricPage from './pages/BiometricPage';
import ClipboardPage from './pages/ClipboardPage';
import DevicePage from './pages/DevicePage';
import SharePage from './pages/SharePage';

function App() {
  const location = useLocation();
  const { bridge } = useBridge();
  useEffect(() => {
    // Demo middleware that logs actions for DevTools drill-down
    bridge.use({
      name: 'request-logger',
      fn: async (ctx, next) => {
        const logs: string[] = [];
        logs.push(`Action: ${ctx.request.action}`);
        logs.push(`Payload: ${JSON.stringify(ctx.request.payload ?? null)}`);
        ctx.metadata.set('__mwLog:request-logger', logs);
        ctx.metadata.set('requestedAt', new Date().toISOString());
        await next();
        if (ctx.response?.success) {
          logs.push(`Response: success`);
        }
      },
    });
    bridge.use({
      name: 'auth-check',
      fn: async (ctx, next) => {
        const logs: string[] = [];
        logs.push('Checking auth token...');
        logs.push('Token valid, proceeding');
        ctx.metadata.set('__mwLog:auth-check', logs);
        ctx.metadata.set('authUser', 'demo-user');
        await next();
      },
    });
  }, [bridge]);

  const isActive = (path: string) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <>
      <nav className="nav">
        <ul>
          <li>
            <Link to="/" className={isActive('/')}>
              Home
            </Link>
          </li>
          <li>
            <Link to="/camera" className={isActive('/camera')}>
              Camera
            </Link>
          </li>
          <li>
            <Link to="/location" className={isActive('/location')}>
              Location
            </Link>
          </li>
          <li>
            <Link to="/storage" className={isActive('/storage')}>
              Storage
            </Link>
          </li>
          <li>
            <Link to="/biometric" className={isActive('/biometric')}>
              Biometric
            </Link>
          </li>
          <li>
            <Link to="/clipboard" className={isActive('/clipboard')}>
              Clipboard
            </Link>
          </li>
          <li>
            <Link to="/device" className={isActive('/device')}>
              Device
            </Link>
          </li>
          <li>
            <Link to="/share" className={isActive('/share')}>
              Share
            </Link>
          </li>
        </ul>
      </nav>

      <div className="container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/camera" element={<CameraPage />} />
          <Route path="/location" element={<LocationPage />} />
          <Route path="/storage" element={<StoragePage />} />
          <Route path="/biometric" element={<BiometricPage />} />
          <Route path="/clipboard" element={<ClipboardPage />} />
          <Route path="/device" element={<DevicePage />} />
          <Route path="/share" element={<SharePage />} />
        </Routes>
      </div>

      <TsBridgeDevtools bridge={bridge} />
    </>
  );
}

export default App;
