import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, useParams, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { Container } from 'react-bootstrap'
import NavBar from './components/smallComponents/NavBar'
import MangaPage from './components/pages/MangaPage'
import Catalog from './components/pages/Catalog'
import ChapterPage from './components/pages/ChapterPage'
import CommentsPage from './components/pages/CommentsPage'
import LoginModal from './components/smallComponents/LoginForm'
import RegisterModal from './components/smallComponents/RegisterForm'
import AdvancedSearchPage from './components/pages/AdvancedSearchPage'
import DownloadsPage from './components/pages/DownloadsPage'
import PrivateRoute from './components/smallComponents/PrivateRoute'
import Settings from './components/pages/Settings'
import mangaData from './data/mangaData'
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useMangaPage from './customHooks/useMangaPage';
import Spinner from './components/smallComponents/Spinner';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();

  // If this location has a background state, keep it here so we can render
  // the background UI while showing the modal on top.
  const background = location.state && location.state.background;

  // Apply theme from localStorage (profile_display.theme) at app start so the
  // entire site reflects user's choice immediately.
  useEffect(() => {
    try {
      const raw = localStorage.getItem('profile_display');
      if (raw) {
        const d = JSON.parse(raw);
        const t = (d.theme || 'Dark').toString().toLowerCase();
        document.documentElement.setAttribute('data-theme', t);
      }
    } catch (err) {
      // ignore
    }
  }, []);

  // Keep theme in sync if other parts of the app (or other tabs) update
  useEffect(() => {
    function onStorage(e) {
      if (e.key === 'profile_display') {
        try {
          const raw = e.newValue || localStorage.getItem('profile_display');
          if (!raw) return;
          const d = JSON.parse(raw);
          const t = (d.theme || 'Dark').toString().toLowerCase();
          document.documentElement.setAttribute('data-theme', t);
        } catch (err) { /* ignore */ }
      }
    }

    function onThemeChange(e) {
      try {
        const t = (e?.detail?.theme || 'Dark').toString().toLowerCase();
        document.documentElement.setAttribute('data-theme', t);
      } catch (err) { /* ignore */ }
    }

    window.addEventListener('storage', onStorage);
    window.addEventListener('digiman:themeChanged', onThemeChange);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('digiman:themeChanged', onThemeChange); };
  }, []);

  // Small wrapper used by the Route to pass the :id param and load data from local fixture.
  const MangaRoute = () => {
    const { id } = useParams();

    const { 
      mangaData, mangaIsLoading, mangaError,
      genresData, genresIsLoading, genresError,
      chaptersData, chaptersIsLoading, chaptersError
    } = useMangaPage(id);

    if (mangaError) return <div className="text-danger">No manga found.</div>;

    return (
      <>
        {mangaIsLoading ? <Spinner /> 
        : <MangaPage
          {...mangaData}
          genres={genresData}
          genresIsLoading={genresIsLoading}
          genresError={genresError}
          chapters={chaptersData}
          chaptersIsLoading={chaptersIsLoading}
          chaptersError={chaptersError}
          onRequireLogin={() => navigate('/login', { state: { background: location } })}
        />}
      </>
    );
  };
  return (
    <>
      <NavBar />

      <Container fluid style={{ paddingTop: '80px' }}>
        {/* Render the background routes. When a modal route is opened with
            state.background, `background` will be set and we render the
            background UI using that location. */}
        <Routes location={background || location}>
          <Route path="/" element={<Catalog />} />
          <Route path="/search/advanced" element={<AdvancedSearchPage />} />
          <Route path="/manga/:id" element={<MangaRoute />} />
          <Route path="/manga/:mangaId/chapter/:chapterId" element={<ChapterPage />} />
          <Route path="/manga/:mangaId/chapter/:chapterId/comments" element={<CommentsPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          {/* Also allow the modal routes to render as full pages when visited directly */}
          <Route path="/login" element={<LoginModal show={true} onClose={() => { if (background) navigate(background); else navigate('/'); }} onSwitchToRegister={() => navigate('/register', { state: { background } })} />} />
          <Route path="/register" element={<RegisterModal show={true} onClose={() => { if (background) navigate(background); else navigate('/'); }} onSwitchToLogin={() => navigate('/login', { state: { background } })} />} />
        </Routes>

        {/* If we have a background location, also render the modal routes on top */}
        {background && (
          <Routes>
            <Route path="/login" element={<LoginModal show={true} onClose={() => { if (background) navigate(background); else navigate('/'); }} onSwitchToRegister={() => navigate('/register', { state: { background } })} />} />
            <Route path="/register" element={<RegisterModal show={true} onClose={() => { if (background) navigate(background); else navigate('/'); }} onSwitchToLogin={() => navigate('/login', { state: { background } })} />} />
          </Routes>
        )}
      </Container>
    </>
  );
}


const queryClient = new QueryClient();

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}