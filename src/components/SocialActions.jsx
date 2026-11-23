import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import Img from './Img.jsx';
import { Reveal } from './motion.jsx';
import { SectionHead, Arrow } from './sections.jsx';
import { useApi, api } from '../lib/api.js';
import { useLang, fmtDate } from '../lib/i18n.jsx';

function RegisterModal({ action, onClose }) {
  const { t, pick } = useLang();
  const [v, setV] = useState({ first_name: '', last_name: '', email: '', phone: '', city: '', participants: 1, message: '', consent: false, website: '' });
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  const set = k => e => setV(s => ({ ...s, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  useEffect(() => {
    document.documentElement.classList.add('lb-open'); window.__lenis?.stop();
    const k = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => { document.documentElement.classList.remove('lb-open'); window.__lenis?.start(); window.removeEventListener('keydown', k); };
  }, [onClose]);
  const submit = async e => {
    e.preventDefault(); setState('sending'); setErr('');
    try { await api(`actions/${action.id}/register`, { method: 'POST', body: v }); setState('ok'); }
    catch (x) { setErr(x.message); setState('idle'); }
  };
  const max = action.spots_left ? Math.min(10, action.spots_left) : 10;
  return createPortal(
    <div className="modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal" role="dialog" aria-modal="true" data-lenis-prevent initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <button className="modal-close" onClick={onClose} aria-label={t('act.close')}>×</button>
        <p className="kicker">{t('act.formTitle')}</p>
        <h3 className="modal-title">{pick(action, 'title')}</h3>
        {state === 'ok' ? (
          <div className="apply-success"><svg className="check" viewBox="0 0 24 24"><path d="M6 12.5l4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" /></svg>
            <strong className="h-title">{t('act.ok')}</strong><p>{t('act.okText')}</p>
            <button className="btn btn-ghost" onClick={onClose}><span className="btn-text">{t('act.close')}</span></button></div>
        ) : (
          <form className="apply-form" onSubmit={submit}>
            <input type="text" value={v.website} onChange={set('website')} className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
            <div className="form-grid">
              <label className="field"><span className="field-label">{t('f.first')} *</span><input required value={v.first_name} onChange={set('first_name')} autoComplete="given-name" /></label>
              <label className="field"><span className="field-label">{t('f.last')} *</span><input required value={v.last_name} onChange={set('last_name')} autoComplete="family-name" /></label>
              <label className="field"><span className="field-label">{t('f.email')} *</span><input required type="email" value={v.email} onChange={set('email')} autoComplete="email" /></label>
              <label className="field"><span className="field-label">{t('f.phone')}</span><input value={v.phone} onChange={set('phone')} autoComplete="tel" /></label>
              <label className="field"><span className="field-label">{t('f.city')}</span><input value={v.city} onChange={set('city')} /></label>
              <label className="field"><span className="field-label">{t('act.people')}</span>
                <select value={v.participants} onChange={set('participants')}>{Array.from({ length: max }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}</select></label>
              <label className="field is-wide"><span className="field-label">{t('act.note')}</span><textarea rows={3} value={v.message} onChange={set('message')} /></label>
              <label className="check-field is-wide"><input type="checkbox" checked={v.consent} onChange={set('consent')} required /><span className="check-box" /><span>{t('act.consent')}</span></label>
            </div>
            {err && <p className="form-error">{err}</p>}
            <button className="btn btn-yellow btn-submit" disabled={state === 'sending'}><span className="btn-text">{state === 'sending' ? t('f.sending') : t('act.register')}</span><Arrow /></button>
          </form>
        )}
      </motion.div>
    </div>,
    document.body,
  );
}

function ActionCard({ a, i, onRegister }) {
  const { t, pick, lang } = useLang();
  const desc = (pick(a, 'description') || '').split('\n').filter(Boolean);
  const when = [a.action_date && fmtDate(a.action_date, lang), a.action_time].filter(Boolean).join(' · ');
  const full = a.spots_left === 0;
  return (
    <Reveal as="article" className="action-card" y={40} delay={(i % 3) * 0.08}>
      <div className="action-media">
        {a.cover ? <Img media={a.cover} sizes="(max-width:760px) 90vw, 30vw" /> : <span className="action-ph" aria-hidden="true">✦</span>}
        {a.action_date && <span className="action-date">{fmtDate(a.action_date, lang, { day: 'numeric', month: 'short' })}</span>}
      </div>
      <div className="action-body">
        <h4 className="action-title">{pick(a, 'title')}</h4>
        <p className="action-meta">{[when, a.location].filter(Boolean).join(' — ')}</p>
        {desc[0] && <p className="action-desc">{desc.join(' ')}</p>}
        <div className="action-foot">
          <span className={`action-spots ${full || !a.is_open ? 'is-off' : ''}`}>
            {a.status === 'closed' ? t('act.closed') : full ? t('act.full')
              : a.spots_left !== null ? `${a.spots_left} ${t('act.spotsLeft')}` : t('act.free')}
          </span>
          {a.is_open && <button className="btn btn-yellow" onClick={() => onRegister(a)}><span className="btn-text">{t('act.register')}</span><Arrow /></button>}
        </div>
      </div>
    </Reveal>
  );
}

/** Actions sociales regroupées par événement, avec inscription. */
export default function SocialActions({ eventSlug = null }) {
  const { t, pick, lang } = useLang();
  const { data } = useApi('actions');
  const [sel, setSel] = useState(null);
  const groups = useMemo(() => {
    const g = new Map();
    for (const a of data || []) {
      if (eventSlug && a.event?.slug !== eventSlug) continue;
      const k = a.event?.slug || '_';
      if (!g.has(k)) g.set(k, { event: a.event, items: [] });
      g.get(k).items.push(a);
    }
    return [...g.values()];
  }, [data, eventSlug]);
  if (!groups.length) return null;
  return (
    <section className={`section social-actions ${eventSlug ? 'is-in-event' : ''}`} id={eventSlug ? undefined : 'actions-sociales'}>
      <div className="container">
        <SectionHead kicker={t('act.kicker')} title={t('act.title')} sub={t('act.lead')} />
        {groups.map((g, gi) => (
          <div key={gi} className="action-group">
            {g.event && !eventSlug && (
              <h3 className="action-group-title">{pick(g.event, 'title')}<small>{fmtDate(g.event.start_date, lang)}</small></h3>
            )}
            <div className="action-grid">{g.items.map((a, i) => <ActionCard key={a.id} a={a} i={i} onRegister={setSel} />)}</div>
          </div>
        ))}
      </div>
      {sel && <RegisterModal action={sel} onClose={() => setSel(null)} />}
    </section>
  );
}
