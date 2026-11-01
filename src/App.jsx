import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Lenis from 'lenis';
import { LangProvider } from './lib/i18n.jsx';
import { SiteProvider } from './lib/site.jsx';
import Header from './components/Header.jsx';
import Footer from './components/Footer.jsx';
import Cursor from './components/Cursor.jsx';
import Preloader from './components/Preloader.jsx';
import Home from './pages/Home.jsx';
import Festival from './pages/Festival.jsx';
import Events from './pages/Events.jsx';
import EventDetail from './pages/EventDetail.jsx';
import Gallery from './pages/Gallery.jsx';
import ProjectDetail from './pages/ProjectDetail.jsx';
import Calls from './pages/Calls.jsx';
import CallDetail from './pages/CallDetail.jsx';
import Contact from './pages/Contact.jsx';
import NotFound from './pages/NotFound.jsx';

const AdminApp = lazy(() => import('./admin/AdminApp.jsx'));

function useLenis(enabled) {
  useEffect(() => {
    if (!enabled || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const lenis = new Lenis({ duration: 1.15, smoothWheel: true, wheelMultiplier: 1 });
    window.__lenis = lenis;
    let raf;
    const loop = t => { lenis.raf(t); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); lenis.destroy(); window.__lenis = null; };
  }, [enabled]);
}

function PublicSite() {
  const location = useLocation();
  const [loading, setLoading] = useState(() => {
    try { return !sessionStorage.getItem('gff-intro'); } catch { return true; }
  });
  const done = useCallback(() => {
    setLoading(false);
    try { sessionStorage.setItem('gff-intro', '1'); } catch { /* */ }
  }, []);
  useLenis(true);
  useEffect(() => {
    document.documentElement.classList.toggle('is-loading', loading);
    if (loading) window.__lenis?.stop(); else window.__lenis?.start();
  }, [loading]);

  return (
    <SiteProvider>
      {loading && <Preloader onDone={done} />}
      <Cursor />
      <Header />
      <AnimatePresence mode="wait" onExitComplete={() => { window.__lenis?.scrollTo(0, { immediate: true }); window.scrollTo(0, 0); }}>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home intro={loading} />} />
          <Route path="/festival" element={<Festival />} />
          <Route path="/evenements" element={<Events />} />
          <Route path="/evenements/:slug" element={<EventDetail />} />
          <Route path="/galerie" element={<Gallery />} />
          <Route path="/galerie/:slug" element={<ProjectDetail />} />
          <Route path="/candidatures" element={<Calls />} />
          <Route path="/candidatures/:slug" element={<CallDetail />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AnimatePresence>
      <Footer />
    </SiteProvider>
  );
}

export default function App() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');
  return (
    <LangProvider>
      {isAdmin ? (
        <Suspense fallback={<div className="adm-loading">Chargement…</div>}>
          <Routes><Route path="/admin/*" element={<AdminApp />} /></Routes>
        </Suspense>
      ) : <PublicSite />}
    </LangProvider>
  );
}
