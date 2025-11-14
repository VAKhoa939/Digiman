// src/components/NavBar.js
import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';

function NavBar({ onLogin, onRegister }) {
  const handleLogin = onLogin || ((data) => { console.log('Login submitted:', data); });
  const handleRegister = onRegister || ((data) => { console.log('Register submitted:', data); });

  return (
    <>
      <nav className="navbar fixed-top navbar-expand-lg bg-dark" data-bs-theme="dark">
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
                  <li>
                    <NavLoginButton />
                  </li>
                  <li>
                    <NavRegisterButton />
                  </li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>
    </>
  );
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
