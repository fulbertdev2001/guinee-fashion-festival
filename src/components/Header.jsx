import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { useSite } from '../lib/site.jsx';
import { EASE, EASE_OUT, Magnetic } from './motion.jsx';
import Img from './Img.jsx';

const LINKS = [
  ['/', 'nav.home'], ['/festival', 'nav.festival'], ['/evenements', 'nav.events'],
  ['/galerie', 'nav.gallery'], ['/candidatures', 'nav.calls'], ['/contact', 'nav.contact'],
];

export default function Header() {
  const { t, lang, setLang, pick } = useLang();
  const site = useSite();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [solid, setSolid] = useState(false);
  const [hoverIdx, setHoverIdx] = useState(0);
  const [bar, setBar] = useState(true);

  useEffect(() => { setOpen(false); }, [loc.pathname]);
  useEffect(() => {
    let last = window.scrollY;
    const handler = () => {
      const y = window.scrollY;
      setSolid(y > 40);
      if (y > 300 && y > last + 4) setHidden(true);
      else if (y < last - 4 || y < 300) setHidden(false);
      last = y;
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open);
    window.__lenis?.[open ? 'stop' : 'start']();
    const esc = e => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);

  const images = site?.looks?.length ? site.looks : site?.heroImages || [];
  const announce = pick(site?.general, 'announcement');
  const announceLink = site?.general?.announcement_link || '/candidatures';

  return (
    <>
      <AnimatePresence>
        {bar && announce && !open && (
          <motion.div className={`announce ${hidden ? 'is-hidden' : ''}`} initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}>
            <Link to={announceLink} className="announce-inner">
              <span className="announce-dot" />
              <span>{announce}</span>
              <span className="announce-arrow">→</span>
            </Link>
            <button className="announce-close" onClick={() => setBar(false)} aria-label="Fermer">×</button>
          </motion.div>
        )}
      </AnimatePresence>

      <header className={`header ${hidden && !open ? 'is-hidden' : ''} ${solid ? 'is-solid' : ''} ${open ? 'is-open' : ''} ${bar && announce ? 'with-bar' : ''}`}>
        <Link to="/" className="header-logo" aria-label="Guinée Fashion Festival — accueil">
          <img src="/logo-festival-dark.svg" alt="Guinée Fashion Festival" />
        </Link>
        <nav className="header-nav" aria-label="Navigation principale">
          {LINKS.slice(1).map(([to, k]) => (
            <NavLink key={to} to={to} className="header-link"><span data-text={t(k)}>{t(k)}</span></NavLink>
          ))}
        </nav>
        <div className="header-right">
          <div className="lang-switch" role="group" aria-label="Langue">
            {['fr', 'en'].map(l => (
              <button key={l} className={lang === l ? 'is-active' : ''} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
            ))}
          </div>
          <Magnetic>
            <button className="menu-btn" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-label={t(open ? 'nav.close' : 'nav.menu')}>
              <span className="menu-btn-label">{t(open ? 'nav.close' : 'nav.menu')}</span>
              <span className="menu-btn-lines"><i /><i /></span>
            </button>
          </Magnetic>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div className="menu" initial={{ clipPath: 'inset(0 0 100% 0)' }} animate={{ clipPath: 'inset(0 0 0% 0)' }}
            exit={{ clipPath: 'inset(100% 0 0% 0)' }} transition={{ duration: 0.9, ease: EASE }}>
            <div className="menu-media">
              <AnimatePresence mode="popLayout">
                {images[hoverIdx % Math.max(1, images.length)] && (
                  <motion.div key={hoverIdx} className="menu-media-frame" initial={{ clipPath: 'inset(100% 0 0 0)', scale: 1.2 }}
                    animate={{ clipPath: 'inset(0% 0 0 0)', scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8, ease: EASE_OUT }}>
                    <Img media={images[hoverIdx % images.length]} sizes="40vw" eager />
                  </motion.div>
                )}
              </AnimatePresence>
              <span className="menu-media-tag">Look {String((hoverIdx % Math.max(1, images.length)) + 1).padStart(2, '0')}</span>
            </div>
            <nav className="menu-links">
              {LINKS.map(([to, k], i) => (
                <div key={to} className="menu-link-mask">
                  <motion.div initial={{ y: '110%' }} animate={{ y: 0 }} exit={{ y: '-110%' }}
                    transition={{ duration: 0.9, ease: EASE_OUT, delay: 0.25 + i * 0.06 }}>
                    <NavLink to={to} end={to === '/'} className="menu-link" onMouseEnter={() => setHoverIdx(i)}>
                      <span className="menu-link-num">0{i + 1}</span>
                      <span className="menu-link-text" data-text={t(k)}>{t(k)}</span>
                    </NavLink>
                  </motion.div>
                </div>
              ))}
            </nav>
            <motion.div className="menu-foot" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ delay: 0.6 }}>
              <div>
                {site?.contact?.phone && <a href={`tel:${site.contact.phone.replace(/\s/g, '')}`}>{site.contact.phone}</a>}
                {site?.contact?.email && <a href={`mailto:${site.contact.email}`}>{site.contact.email}</a>}
              </div>
              <div className="menu-socials">
                {Object.entries(site?.socials || {}).filter(([, v]) => v).map(([k, v]) => <a key={k} href={v} target="_blank" rel="noreferrer">{k}</a>)}
              </div>
              <div className="lang-switch is-large">
                {['fr', 'en'].map(l => <button key={l} className={lang === l ? 'is-active' : ''} onClick={() => setLang(l)}>{l === 'fr' ? 'Français' : 'English'}</button>)}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
