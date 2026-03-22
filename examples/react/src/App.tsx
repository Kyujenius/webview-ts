import { ComponentType } from 'react';
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
import MiddlewarePage from './pages/MiddlewarePage';

const routes: { path: string; label: string; component: ComponentType }[] = [
  { path: '/', label: 'Home', component: HomePage },
  { path: '/camera', label: 'Camera', component: CameraPage },
  { path: '/location', label: 'Location', component: LocationPage },
  { path: '/biometric', label: 'Biometric', component: BiometricPage },
  { path: '/phone', label: 'Phone', component: PhonePage },
  { path: '/calendar', label: 'Calendar', component: CalendarPage },
  { path: '/device', label: 'Device', component: DevicePage },
  { path: '/share', label: 'Share', component: SharePage },
  { path: '/actions', label: 'useAction', component: ActionsPage },
  { path: '/middleware', label: 'Middleware', component: MiddlewarePage },
];

function App() {
  const location = useLocation();

  const isActive = (path: string) => (location.pathname === path ? 'active' : '');

  return (
    <>
      <div className="container page-content">
        <Routes>
          {routes.map(({ path, component: Component }) => (
            <Route key={path} path={path} element={<Component />} />
          ))}
        </Routes>
      </div>

      <nav className="nav">
        <ul>
          {routes.map(({ path, label }) => (
            <li key={path}>
              <Link to={path} className={isActive(path)}>
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
}

export default App;
