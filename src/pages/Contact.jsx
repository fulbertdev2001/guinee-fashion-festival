import { useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page.jsx';
import { PageHero, Arrow } from '../components/sections.jsx';
import { Reveal } from '../components/motion.jsx';
import { useSite } from '../lib/site.jsx';
import { useLang } from '../lib/i18n.jsx';
import { api } from '../lib/api.js';

export default function Contact() {
  const { t, pick } = useLang();
  const site = useSite();
  const c = site?.contact || {};
  const [v, setV] = useState({ name: '', email: '', phone: '', subject: '', message: '', website: '' });
  const [state, setState] = useState('idle');
  const [err, setErr] = useState('');
  const set = k => e => setV(s => ({ ...s, [k]: e.target.value }));
  const submit = async e => {
    e.preventDefault(); setState('sending'); setErr('');
    try { await api('contact', { method: 'POST', body: v }); setState('ok'); }
    catch (x) { setErr(x.message); setState('idle'); }
  };
  const socials = Object.entries(site?.socials || {}).filter(([, u]) => u);
  const rows = [
    c.phone && [t('contact.phone'), c.phone, `tel:${c.phone.replace(/\s/g, '')}`],
    c.email && [t('contact.email'), c.email, `mailto:${c.email}`],
    pick(c, 'address') && [t('contact.address'), [c.venue, pick(c, 'address')].filter(Boolean).join(' — ')],
    pick(c, 'hours') && [t('contact.hours'), pick(c, 'hours')],
  ].filter(Boolean);

  return (
    <Page title={t('contact.title')}>
      <PageHero kicker="Presse · Partenaires · Exposants" title={t('contact.title')} lead={t('contact.lead')} />
      <section className="section">
        <div className="container contact-grid">
          <div className="contact-lines">
            {rows.map(([k, val, href], i) => (
              <Reveal key={k} delay={i * 0.06} className="contact-line">
                <span className="kicker">{k}</span>
                {href ? <a href={href} className="contact-big" data-cursor="↗">{val}</a> : <span className="contact-big is-small">{val}</span>}
              </Reveal>
            ))}
            {socials.length > 0 && (
              <Reveal className="contact-line"><span className="kicker">{t('contact.follow')}</span>
                <div className="contact-socials">{socials.map(([k, u]) => <a key={k} href={u} target="_blank" rel="noreferrer">{k}</a>)}</div>
              </Reveal>
            )}
          </div>
          <Reveal className="contact-form-wrap">
            {state === 'ok' ? (
              <motion.p className="apply-success" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>✦ {t('f.contactSuccess')}</motion.p>
            ) : (
              <form className="apply-form" onSubmit={submit}>
                <input type="text" value={v.website} onChange={set('website')} className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
                <div className="form-grid">
                  <label className="field"><span className="field-label">{t('f.name')} *</span><input required value={v.name} onChange={set('name')} /></label>
                  <label className="field"><span className="field-label">{t('f.email')} *</span><input required type="email" value={v.email} onChange={set('email')} /></label>
                  <label className="field"><span className="field-label">{t('f.phone')}</span><input value={v.phone} onChange={set('phone')} /></label>
                  <label className="field"><span className="field-label">{t('f.subject')}</span><input value={v.subject} onChange={set('subject')} /></label>
                  <label className="field is-wide"><span className="field-label">Message *</span><textarea required rows={6} value={v.message} onChange={set('message')} /></label>
                </div>
                {err && <p className="form-error">{err}</p>}
                <button className="btn btn-yellow" disabled={state === 'sending'}><span className="btn-text">{state === 'sending' ? t('f.sending') : t('cta.send')}</span><Arrow /></button>
              </form>
            )}
          </Reveal>
        </div>
      </section>
    </Page>
  );
}
