import { Routes, Route, Link, useLocation } from 'react-router-dom';
import HomePage from './pages/HomePage';
import CameraPage from './pages/CameraPage';
import LocationPage from './pages/LocationPage';
import BiometricPage from './pages/BiometricPage';
import PhonePage from './pages/PhonePage';
import CalendarPage from './pages/CalendarPage';
import DevicePage from './pages/DevicePage';
import SharePage from './pages/SharePage';
import ActionsPage from './pages/ActionsPage';

function App() {
  const location = useLocation();

  const isActive = (path: string) => (location.pathname === path ? 'active' : '');

  return (
    <>
      <div className="container page-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/camera" element={<CameraPage />} />
          <Route path="/location" element={<LocationPage />} />
          <Route path="/biometric" element={<BiometricPage />} />
          <Route path="/phone" element={<PhonePage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/device" element={<DevicePage />} />
          <Route path="/share" element={<SharePage />} />
          <Route path="/actions" element={<ActionsPage />} />
        </Routes>
      </div>

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
            <Link to="/biometric" className={isActive('/biometric')}>
              Biometric
            </Link>
          </li>
          <li>
            <Link to="/phone" className={isActive('/phone')}>
              Phone
            </Link>
          </li>
          <li>
            <Link to="/calendar" className={isActive('/calendar')}>
              Calendar
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
          <li>
            <Link to="/actions" className={isActive('/actions')}>
              useAction
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}

export default App;
