import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useParams, useNavigate } from 'react-router-dom';
import { Container } from 'react-bootstrap'
import NavBar from './components/smallComponents/NavBar'
import Toaster from './components/smallComponents/Toaster'
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
import Profile from './components/pages/Profile'
import Library from './components/pages/Library'
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useMangaPage from './customHooks/useMangaPage';
import Spinner from './components/smallComponents/Spinner';
import useModalBackground from './customHooks/useModalBackground';

function AppContent() {
  const { location, background } = useModalBackground();
  const navigate = useNavigate();

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
    return () => { 
      window.removeEventListener('storage', onStorage); 
      window.removeEventListener('digiman:themeChanged', onThemeChange); 
    };
  }, []);
  
  // Auto navigate to DownloadsPage when going offline
  useEffect(() => {
    function handleOffline() {
      if (!navigator.onLine) {
        navigate('/downloads', { replace: true });
      }
    }

    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('offline', handleOffline);
    };
  }, [navigate]);

  const onCloseModal = () => {if (background) navigate(background); else navigate(-1);};

  // Small wrapper used by the Route to pass the :id param and load data from local fixture.
  const MangaRoute = () => {
    const { mangaId } = useParams();

    const { 
      mangaData, mangaIsLoading, mangaError,
      genresData, genresIsLoading, genresError,
      chaptersData, chaptersIsLoading, chaptersError
    } = useMangaPage(mangaId);

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
          <Route path="/manga/:mangaId" element={<MangaRoute />} />
          <Route path="/manga/:mangaId/comments" element={<CommentsPage />} />
          <Route path="/offline/mangas/:mangaId/chapter/:chapterId" element={<ChapterPage />} />
          <Route path="/manga/:mangaId/chapter/:chapterId" element={<ChapterPage />} />
          <Route path="/manga/:mangaId/chapter/:chapterId/comments" element={<CommentsPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
          <Route path="/library" element={<PrivateRoute><Library /></PrivateRoute>} />
          <Route path="/settings" element={<PrivateRoute><Settings /></PrivateRoute>} />
          <Route path="/login" element={<LoginModal onClose={onCloseModal} onSwitchToRegister={() => navigate('/register', { state: { background } })} />} />
          <Route path="/register" element={<RegisterModal onClose={onCloseModal} onSwitchToLogin={() => navigate('/login', { state: { background } })} />} />
        </Routes>
      </Container>

      {/* If we have a background location, also render the modal routes on top */}
      {background && (
        <Routes>
          <Route path="/login" element={<LoginModal onClose={onCloseModal} onSwitchToRegister={() => navigate('/register', { state: { background } })} />} />
          <Route path="/register" element={<RegisterModal onClose={onCloseModal} onSwitchToLogin={() => navigate('/login', { state: { background } })} />} />
        </Routes>
      )}
    </>
  );
}


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: "never",
      staleTime: 1000 * 60 * 5,
      retry: navigator.onLine ? 1 : 0,
      enabled: navigator.onLine
    }
  }
});

export default function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Toaster />
          <AppContent />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}