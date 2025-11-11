import React, { useState } from 'react'
import { Container } from 'react-bootstrap'
import NavBar from './components/smallComponents/NavBar'
import MangaPage from './components/pages/MangaPage'

// Import a local image from src/assets/images — place your file at: src/assets/images/shangri-la.webp
// NOTE: the file must exist at this exact path. Add the file and restart the dev server if you see an import error.
// You placed the file at `frontend/digiman/assets/shangri-la.webp`.
// Import it via a relative path from `src/`.
// Alternatively move the file to `public/images` and use an absolute `/images/...` path.
import cover from '../assets/shangri-la.webp';

function App() {
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const switchToRegister = () => {
    setShowLogin(false);
    setTimeout(() => setShowRegister(true), 200);
  };

  const switchToLogin = () => {
    setShowRegister(false);
    setTimeout(() => setShowLogin(true), 200);
  };

  const handleLogin = (data) => {
    console.log('Login submitted:', data);
    // TODO: replace with real authentication flow. On success:
    setIsLoggedIn(true);
    setShowLogin(false);
  };

  const handleRegister = (data) => {
    console.log('Register submitted:', data);
    setShowRegister(false);
  };
  const sampleChapters = [
    { id: 1, number: 1, title: 'Prologue', date: '2025-11-01', link: '#' },
    { id: 2, number: 2, title: 'First Hunt', date: '2025-11-05', link: '#' },
  ];

  return (
    <>
      <NavBar
        showLogin={showLogin}
        setShowLogin={setShowLogin}
        showRegister={showRegister}
        setShowRegister={setShowRegister}
        switchToRegister={switchToRegister}
        switchToLogin={switchToLogin}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
      <Container style={{ paddingTop: '80px' }}>
        <MangaPage
          title="Shangri-La Frontier: Kusoge Hunter"
          altTitle="Kusoge Hunter Kamige ni Idoman to Su"
          author="Hiroshi Yagi"
          artist="Boichi"
          genres={["Action", "Comedy", "Game"]}
          status="Ongoing"
          coverUrl={cover}
          synopsis="A high-quality action-comedy about a skilled gamer who specializes in kusoge (trash games) and becomes a top player in a brutal VR world."
          chapters={sampleChapters}
          isLoggedIn={isLoggedIn}
          onRequireLogin={() => setShowLogin(true)}
        />
      </Container>
    </>
  )
}

export default App