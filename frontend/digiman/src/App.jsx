import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, useParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap'
import NavBar from './components/smallComponents/NavBar'
import MangaPage from './components/pages/MangaPage'
import Catalog from './components/pages/Catalog'
import LoginModal from './components/smallComponents/LoginForm'
import RegisterModal from './components/smallComponents/RegisterForm'
import mangaData from './data/mangaData'
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { login, register, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // If this location has a background state, keep it here so we can render
  // the background UI while showing the modal on top.
  const background = location.state && location.state.background;

  const handleLogin = async (data) => {
    try {
      await login(data.identifier, data.password, data.rememberMe);
      // close modal and return to background
      alert("Login successful");
      if (background) navigate(background);
      else navigate('/');
    } catch (err) {
      alert("Login failed\nMessage: " + err.message);
    }
  };

  const handleRegister = async (data) => {
    try {
      await register(data.username, data.email, data.password, data.rememberMe);
      // close modal and return to background
      alert("Registration successful");
      if (background) navigate(background);
      else navigate('/');
    } catch (err) {
      alert("Registration failed\nMessage: " + err.message);
    }
  };

  // Small wrapper used by the Route to pass the :id param and load data from local fixture.
  const MangaRoute = () => {
    const { id } = useParams();
    // Try to find the manga in the local data store by id; fall back to the first entry.
    const manga = (id && mangaData[id]) || Object.values(mangaData)[0];

    if (!manga) return <div>No manga found.</div>;

    return (
      <MangaPage
        {...manga}
        isLoggedIn={isAuthenticated}
        onRequireLogin={() => navigate('/login', { state: { background: location } })}
      />
    );
  };
  return (
    <>
      <NavBar onLogin={handleLogin} onRegister={handleRegister} />

      <Container fluid style={{ paddingTop: '80px' }}>
        {/* Render the background routes. When a modal route is opened with
            state.background, `background` will be set and we render the
            background UI using that location. */}
        <Routes location={background || location}>
          <Route path="/" element={<Catalog />} />
          <Route path="/manga/:id" element={<MangaRoute />} />
          {/* Also allow the modal routes to render as full pages when visited directly */}
          <Route path="/login" element={<LoginModal show={true} onClose={() => { if (background) navigate(background); else navigate('/'); }} onLogin={handleLogin} onSwitchToRegister={() => navigate('/register', { state: { background } })} />} />
          <Route path="/register" element={<RegisterModal show={true} onClose={() => { if (background) navigate(background); else navigate('/'); }} onRegister={handleRegister} onSwitchToLogin={() => navigate('/login', { state: { background } })} />} />
        </Routes>

        {/* If we have a background location, also render the modal routes on top */}
        {background && (
          <Routes>
            <Route path="/login" element={<LoginModal show={true} onClose={() => { if (background) navigate(background); else navigate('/'); }} onLogin={handleLogin} onSwitchToRegister={() => navigate('/register', { state: { background } })} />} />
            <Route path="/register" element={<RegisterModal show={true} onClose={() => { if (background) navigate(background); else navigate('/'); }} onRegister={handleRegister} onSwitchToLogin={() => navigate('/login', { state: { background } })} />} />
          </Routes>
        )}
      </Container>
    </>
  );
}

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}