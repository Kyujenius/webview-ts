import { Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CameraPage from './pages/CameraPage';
import LocationPage from './pages/LocationPage';
import StoragePage from './pages/StoragePage';
import BiometricPage from './pages/BiometricPage';
import DevToolsPage from './pages/DevToolsPage';

function App() {
  const location = useLocation();

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
            <Link to="/devtools" className={isActive('/devtools')}>
              DevTools
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
          <Route path="/devtools" element={<DevToolsPage />} />
        </Routes>
      </div>
    </>
  );
}

export default App;
