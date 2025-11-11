// src/components/NavBar.js
import React from 'react';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import LoginModal from './LoginForm'; // import your modal component
import RegisterModal from './RegisterForm'; // import your modal component  
function NavBar({ showLogin, setShowLogin, showRegister, setShowRegister, switchToRegister, switchToLogin, onLogin, onRegister }) {

  const handleLogin = onLogin || ((data) => { console.log('Login submitted:', data); });
  const handleRegister = onRegister || ((data) => { console.log('Register submitted:', data); });

  return (
    <>
      <nav className="navbar fixed-top navbar-expand-lg bg-dark" data-bs-theme="dark">
        <div className="container-fluid">
          <a className="navbar-brand" href="#">
            <span style={{ color: "white" }}>Digi</span>
            <span style={{ color: "yellow" }}>man</span>
          </a>

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
            <ul className="navbar-nav ms-auto">
              <form className="d-flex">
                <input className="form-control me-sm-2" type="search" placeholder="Search" />
                <button className="btn btn-secondary my-2 my-sm-0" type="submit">Q</button>
              </form>

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
                  {/* Instead of data-bs-toggle, trigger state change */}
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => setShowLogin && setShowLogin(true)}
                    >
                      Login
                    </button>
                  </li>
                  <li><button
                      className="dropdown-item"
                      onClick={() => setShowRegister && setShowRegister(true)}
                    >
                      Register
                    </button></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* 🪄 React-controlled Bootstrap modal */}
      <LoginModal
        show={showLogin}
        onClose={() => setShowLogin && setShowLogin(false)}
        onLogin={handleLogin}
        onSwitchToRegister={() => {
          if (switchToRegister) switchToRegister();
        }}
      />
      <RegisterModal
        show={showRegister}
        onClose={() => setShowRegister && setShowRegister(false)}
        onRegister={handleRegister}
        onSwitchToLogin={() => {
          if (switchToLogin) switchToLogin();
        }}
      />
    </>
  );
}

export default NavBar;
