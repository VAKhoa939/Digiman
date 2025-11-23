// src/components/NavBar.js
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import SearchBar from './SearchBar';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import { useTheme } from '../../context/ThemeContext';

function NavBar({ onLogin, onRegister }) {
  const handleLogin = onLogin || ((data) => { console.log('Login submitted:', data); });
  const handleRegister = onRegister || ((data) => { console.log('Register submitted:', data); });
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      // After logout, navigate home
      navigate('/');
    } catch (e) {
      console.error('Logout failed', e);
    }
  };

  const { theme } = useTheme ? useTheme() : { theme: 'dark' }
  return (
    <>
      <nav className={`navbar fixed-top navbar-expand-lg ${theme === 'dark' ? 'bg-dark' : 'bg-light'}`} data-bs-theme={theme}>
        <div className="container-fluid">
          <Link className="navbar-brand" to="/">
            <span style={{ color: "white" }}>Digi</span>
            <span style={{ color: "yellow" }}>man</span>
          </Link>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarColor02"
            aria-controls="navbarColor02"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarColor02">
            <ul className="navbar-nav ms-auto align-items-center">
              <div className="d-flex align-items-center me-2">
                <SearchBar />
                <button className="btn btn-sm btn-outline-light ms-2" title="Downloads" onClick={() => navigate('/downloads')}>
                  <CloudDownloadIcon />
                </button>
                <button className="btn btn-sm btn-outline-light ms-2" title="Advanced search" onClick={() => navigate('/search/advanced')}>
                  <FilterListIcon />
                </button>
                <ThemeToggle />
              </div>

              {/* If authenticated, show profile and logout; otherwise show Login/Register */}
              {isAuthenticated ? (
                <>
                <li className="nav-item dropdown">
                  <a
                    className="nav-link dropdown-toggle d-flex align-items-center"
                    href="#"
                    role="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    {/* Simple avatar placeholder using initials */}
                    <div className="rounded-circle bg-secondary text-dark d-inline-flex justify-content-center align-items-center me-2" style={{ width: 32, height: 32 }}>
                      <small>{(user && user.username && user.username[0]) || 'U'}</small>
                    </div>
                    <span className="me-1">{(user && user.username) || 'User'}</span>
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <button className="dropdown-item" onClick={() => navigate('/profile')}>Profile</button>
                    </li>
                    <li>
                      <button className="dropdown-item" onClick={() => navigate('/settings')}>Settings</button>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <button className="dropdown-item" onClick={handleLogout}>Logout</button>
                    </li>
                  </ul>
                </li>
                </>
              ) : (
                <li className="nav-item dropdown">
                  <a
                    className="nav-link dropdown-toggle"
                    href="#"
                    role="button"
                    data-bs-toggle="dropdown"
                    aria-expanded="false"
                  >
                    <FormatListBulletedIcon />
                  </a>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <NavLoginButton />
                    </li>
                    <li>
                      <NavRegisterButton />
                    </li>
                  </ul>
                </li>
              )}
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
}

function ThemeToggle(){
  const { theme, toggle } = useTheme()
  return (
    <button className="btn btn-sm btn-outline-light ms-2" title="Toggle theme" onClick={toggle}>
      {theme === 'dark' ? <Brightness7Icon /> : <Brightness4Icon />}
    </button>
  )
}

function NavLoginButton() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <button
      className="dropdown-item"
      onClick={() => navigate('/login', { state: { background: location } })}
    >
      Login
    </button>
  );
}

function NavRegisterButton() {
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <button
      className="dropdown-item"
      onClick={() => navigate('/register', { state: { background: location } })}
    >
      Register
    </button>
  );
}

export default NavBar;
