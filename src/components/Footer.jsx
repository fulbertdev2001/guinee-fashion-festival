import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useTransform } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { useSite } from '../lib/site.jsx';
import { api } from '../lib/api.js';
import { useScrollProgress, Marquee } from './motion.jsx';

export function Newsletter() {
  const { t } = useLang();
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle');
  const submit = async e => {
    e.preventDefault(); setState('sending');
    try { await api('newsletter', { method: 'POST', body: { email } }); setState('ok'); setEmail(''); }
    catch { setState('error'); }
  };
  return (
    <form className="newsletter" onSubmit={submit}>
      <label htmlFor="nl-email" className="newsletter-title">{t('news.title')}</label>
      <p>{t('news.text')}</p>
      {state === 'ok' ? <p className="newsletter-ok">✦ {t('news.ok')}</p> : (
        <div className="newsletter-field">
          <input id="nl-email" type="email" required placeholder="email@exemple.com" value={email} onChange={e => setEmail(e.target.value)} />
          <button type="submit" disabled={state === 'sending'}>{t('cta.subscribe')} →</button>
        </div>
      )}
      {state === 'error' && <p className="form-error">{t('f.error')}</p>}
    </form>
  );
}

export default function Footer() {
  const { t, pick } = useLang();
  const site = useSite();
  const ref = useRef(null);
  const p = useScrollProgress(ref, 'enter');
  const y = useTransform(p, [0, 1], ['40%', '0%']);
  const c = site?.contact || {};
  const socials = Object.entries(site?.socials || {}).filter(([, v]) => v);
  return (
    <footer className="footer" ref={ref}>
      <Marquee speed={60} className="footer-marquee">
        {['Mode', 'Artisanat', 'Défilés', 'Conakry', 'Création', 'Héritage'].map(w => <span key={w}>{w}<i>✦</i></span>)}
      </Marquee>
      <div className="footer-top container">
        <Newsletter />
        <div className="footer-cols">
          <div>
            <h4>Navigation</h4>
            <Link to="/festival">{t('nav.festival')}</Link>
            <Link to="/evenements">{t('nav.events')}</Link>
            <Link to="/galerie">{t('nav.gallery')}</Link>
            <Link to="/candidatures">{t('nav.calls')}</Link>
            <Link to="/contact">{t('nav.contact')}</Link>
          </div>
          <div>
            <h4>{t('nav.contact')}</h4>
            {c.phone && <a href={`tel:${c.phone.replace(/\s/g, '')}`}>{c.phone}</a>}
            {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
            <span>{pick(c, 'address')}</span>
          </div>
          {socials.length > 0 && (
            <div>
              <h4>{t('contact.follow')}</h4>
              {socials.map(([k, v]) => <a key={k} href={v} target="_blank" rel="noreferrer" className="cap">{k}</a>)}
            </div>
          )}
        </div>
      </div>
      <div className="footer-giant" aria-hidden="true">
        <motion.div style={{ y }} className="footer-giant-inner">
          <span className="fg-small">Guinée Fashion</span>
          <span className="fg-big">FESTIVAL</span>
        </motion.div>
      </div>
      <div className="footer-bottom container">
        <span>© {new Date().getFullYear()} Guinée Fashion Festival — {t('footer.rights')}</span>
        <span className="footer-tag">Mode & Artisanat</span>
        <Link to="/admin">{t('footer.admin')}</Link>
      </div>
    </footer>
  );
}
