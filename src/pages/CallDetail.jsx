import { useRef, useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Page from '../components/Page.jsx';
import Img from '../components/Img.jsx';
import { Reveal, EASE_OUT } from '../components/motion.jsx';
import { Loader, Arrow } from '../components/sections.jsx';
import { useApi, upload } from '../lib/api.js';
import { useLang, fmtDate, lines } from '../lib/i18n.jsx';
import NotFound from './NotFound.jsx';

function Field({ label, error, children, wide, hint }) {
  const { t } = useLang();
  return (
    <label className={`field ${wide ? 'is-wide' : ''} ${error ? 'has-error' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
      {error && <span className="field-error">{error === 'email' ? t('f.invalidEmail') : t('f.required')}</span>}
    </label>
  );
}

function Dropzone({ files, setFiles, accept, max, multiple = true }) {
  const { t } = useLang();
  const [drag, setDrag] = useState(false);
  const input = useRef(null);
  const add = list => {
    const arr = Array.from(list || []).filter(f => f.size <= 12 * 1024 * 1024);
    setFiles(prev => (multiple ? [...prev, ...arr].slice(0, max) : arr.slice(0, 1)));
  };
  return (
    <div className={`dropzone ${drag ? 'is-drag' : ''}`} onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)} onDrop={e => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
      <button type="button" className="dropzone-btn" onClick={() => input.current.click()}>
        <span className="dropzone-plus">+</span>{t('f.drop')}
      </button>
      <input ref={input} type="file" accept={accept} multiple={multiple} hidden onChange={e => { add(e.target.files); e.target.value = ''; }} />
      {files.length > 0 && (
        <div className="dropzone-files">
          <AnimatePresence>
            {files.map((f, i) => (
              <motion.div key={f.name + f.size + i} className="dz-file" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}>
                {f.type.startsWith('image/') ? <img src={URL.createObjectURL(f)} alt="" /> : <span className="dz-doc">PDF</span>}
                <span className="dz-name">{f.name}</span>
                <button type="button" onClick={() => setFiles(prev => prev.filter((_, k) => k !== i))} aria-label="Retirer">×</button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function ApplyForm({ call }) {
  const { t, pick, lang } = useLang();
  const [v, setV] = useState({ first_name: '', last_name: '', email: '', phone: '', city: '', country: 'Guinée', birthdate: '', link: '', message: '', website: '' });
  const [answers, setAnswers] = useState({});
  const [photos, setPhotos] = useState([]);
  const [cv, setCv] = useState([]);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [state, setState] = useState('idle');
  const [progress, setProgress] = useState(0);
  const [msg, setMsg] = useState('');
  const set = k => e => setV(s => ({ ...s, [k]: e.target.value }));

  const validate = () => {
    const e = {};
    for (const k of ['first_name', 'last_name', 'phone']) if (!v[k].trim()) e[k] = 'required';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) e.email = 'email';
    if (call.require_photos && !photos.length) e.photos = 'required';
    if (call.require_cv && !cv.length) e.cv = 'required';
    if (!consent) e.consent = 'required';
    for (const q of call.questions || []) if (q.required && !String(answers[q.id] || '').trim()) e[`q_${q.id}`] = 'required';
    return e;
  };

  const submit = async e => {
    e.preventDefault();
    const errs = validate(); setErrors(errs);
    if (Object.keys(errs).length) {
      document.querySelector('.has-error')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    const fd = new FormData();
    Object.entries(v).forEach(([k, val]) => fd.append(k, val));
    fd.append('answers', JSON.stringify(answers));
    fd.append('consent', 'true'); fd.append('lang', lang);
    photos.forEach(f => fd.append('photos', f));
    cv.forEach(f => fd.append('cv', f));
    setState('sending'); setMsg('');
    try {
      await upload(`calls/${call.slug}/apply`, fd, setProgress);
      setState('done');
    } catch (err) {
      setState('idle');
      if (err.data?.fields) setErrors(err.data.fields);
      setMsg(err.message || t('f.error'));
    }
  };

  if (state === 'done') {
    return (
      <motion.div className="apply-success" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, ease: EASE_OUT }}>
        <motion.svg viewBox="0 0 52 52" className="check"><motion.path d="M14 27 l8 8 l16 -18" fill="none" stroke="currentColor" strokeWidth="3"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.8, delay: 0.3 }} /></motion.svg>
        <h3 className="h-title">{t('f.success')}</h3>
        <p>{t('f.successText')}</p>
        <Link to="/candidatures" className="btn btn-ghost"><span className="btn-text">{t('cta.calls')}</span><Arrow /></Link>
      </motion.div>
    );
  }

  return (
    <form className="apply-form" onSubmit={submit} noValidate>
      <input type="text" name="website" value={v.website} onChange={set('website')} className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" />
      <div className="form-grid">
        <Field label={`${t('f.first')} *`} error={errors.first_name}><input value={v.first_name} onChange={set('first_name')} autoComplete="given-name" /></Field>
        <Field label={`${t('f.last')} *`} error={errors.last_name}><input value={v.last_name} onChange={set('last_name')} autoComplete="family-name" /></Field>
        <Field label={`${t('f.email')} *`} error={errors.email}><input type="email" value={v.email} onChange={set('email')} autoComplete="email" /></Field>
        <Field label={`${t('f.phone')} *`} error={errors.phone}><input type="tel" value={v.phone} onChange={set('phone')} autoComplete="tel" /></Field>
        <Field label={t('f.city')}><input value={v.city} onChange={set('city')} /></Field>
        <Field label={t('f.country')}><input value={v.country} onChange={set('country')} /></Field>
        <Field label={t('f.birth')}><input type="date" value={v.birthdate} onChange={set('birthdate')} /></Field>
        <Field label={t('f.link')}><input type="url" placeholder="https://instagram.com/…" value={v.link} onChange={set('link')} /></Field>

        {(call.questions || []).map(q => {
          const label = `${pick(q, 'label')}${q.required ? ' *' : ''}`;
          const val = answers[q.id] || '';
          const on = e => setAnswers(a => ({ ...a, [q.id]: e.target.value }));
          const err = errors[`q_${q.id}`];
          if (q.type === 'select') {
            const opts = lines(pick(q, 'options'));
            const fr = lines(q.options_fr);
            return (
              <Field key={q.id} label={label} error={err}>
                <select value={val} onChange={on}>
                  <option value="">{t('f.choose')}</option>
                  {opts.map((o, i) => <option key={o} value={fr[i] || o}>{o}</option>)}
                </select>
              </Field>
            );
          }
          if (q.type === 'textarea') return <Field key={q.id} label={label} error={err} wide><textarea rows={4} value={val} onChange={on} /></Field>;
          return <Field key={q.id} label={label} error={err}><input value={val} onChange={on} /></Field>;
        })}

        <Field label={t('f.message')} wide><textarea rows={5} value={v.message} onChange={set('message')} /></Field>

        <div className={`field is-wide ${errors.photos ? 'has-error' : ''}`}>
          <span className="field-label">{t('f.photos')}{call.require_photos ? ' *' : ''}</span>
          <Dropzone files={photos} setFiles={setPhotos} accept="image/jpeg,image/png,image/webp" max={6} />
          <span className="field-hint">{t('f.photosHint')}</span>
          {errors.photos && <span className="field-error">{t('f.required')}</span>}
        </div>
        <div className={`field is-wide ${errors.cv ? 'has-error' : ''}`}>
          <span className="field-label">{t('f.cv')}{call.require_cv ? ' *' : ''}</span>
          <Dropzone files={cv} setFiles={setCv} accept="application/pdf" max={1} multiple={false} />
          {errors.cv && <span className="field-error">{t('f.required')}</span>}
        </div>
        <label className={`check-field is-wide ${errors.consent ? 'has-error' : ''}`}>
          <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} />
          <span className="check-box" />
          <span>{t('f.consent')}</span>
        </label>
      </div>
      {msg && <p className="form-error">{msg}</p>}
      <button type="submit" className="btn btn-yellow btn-submit" disabled={state === 'sending'}>
        <span className="btn-text">{state === 'sending' ? `${t('f.sending')} ${Math.round(progress * 100)}%` : t('calls.form')}</span><Arrow />
        {state === 'sending' && <motion.i className="btn-progress" style={{ scaleX: progress }} />}
      </button>
    </form>
  );
}

export default function CallDetail() {
  const { slug } = useParams();
  const { t, pick, lang } = useLang();
  const { data: c, loading, error } = useApi(`calls/${slug}`);
  const formRef = useRef(null);
  useEffect(() => { if (window.location.hash === '#postuler') setTimeout(() => formRef.current?.scrollIntoView({ behavior: 'smooth' }), 900); }, [c]);
  if (error?.status === 404) return <NotFound />;
  if (loading || !c) return <Page><Loader /></Page>;
  const title = pick(c, 'title');
  const blocks = [['missions', t('calls.missions')], ['profile', t('calls.profile')], ['benefits', t('calls.benefits')]];
  const goForm = () => (window.__lenis ? window.__lenis.scrollTo(formRef.current, { offset: -100 }) : formRef.current?.scrollIntoView({ behavior: 'smooth' }));

  return (
    <Page title={title} label={t('calls.title')}>
      <section className="call-hero">
        <div className="call-hero-media">
          <motion.div className="fill" initial={{ scale: 1.3, clipPath: 'inset(0 0 100% 0)' }} animate={{ scale: 1, clipPath: 'inset(0 0 0% 0)' }}
            transition={{ duration: 1.6, ease: EASE_OUT, delay: 0.4 }}>
            <Img media={c.cover} sizes="(max-width:760px) 100vw, 40vw" eager position="center 25%" />
          </motion.div>
        </div>
        <div className="call-hero-text">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="call-tags">
            <span className={`status ${c.is_open ? 'is-open' : ''}`}>{c.is_open ? t('calls.open') : t('calls.closed')}</span>
            <span className="tag">{t(`role.${c.role_type || 'autre'}`)}</span>
          </motion.div>
          <h1 className="h-giant">
            {title.split(' ').map((w, i) => (
              <span key={i} className="split-mask is-w"><motion.span className="split-word" initial={{ y: '110%' }} animate={{ y: 0 }}
                transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.55 + i * 0.08 }}>{w}</motion.span></span>
            ))}
          </h1>
          <motion.p className="lead" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>{pick(c, 'summary')}</motion.p>
          <motion.dl className="call-facts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}>
            {c.deadline && <div><dt>{t('calls.deadline')}</dt><dd>{fmtDate(c.deadline, lang)}</dd></div>}
            {pick(c, 'engagement') && <div><dt>{t('calls.engagement')}</dt><dd>{pick(c, 'engagement')}</dd></div>}
            {c.location && <div><dt>{t('calls.location')}</dt><dd>{c.location}</dd></div>}
            {c.event && <div><dt>{t('calls.event')}</dt><dd><Link to={`/evenements/${c.event.slug}`} className="link-u">{pick(c.event, 'title')}</Link></dd></div>}
          </motion.dl>
          {c.is_open && <motion.button className="btn btn-yellow" onClick={goForm} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1 }}>
            <span className="btn-text">{t('cta.apply')}</span><Arrow /></motion.button>}
        </div>
      </section>

      <section className="section is-bone">
        <div className="container call-body">
          <div className="call-desc">
            <Reveal as="h2" className="h-title">{t('calls.about')}</Reveal>
            {pick(c, 'description').split('\n').filter(Boolean).map((p, i) => <Reveal as="p" key={i} className="body-text">{p}</Reveal>)}
          </div>
          <div className="call-lists">
            {blocks.map(([k, label]) => {
              const items = lines(pick(c, k));
              if (!items.length) return null;
              return (
                <Reveal key={k} className="call-list">
                  <h3>{label}</h3>
                  <ul>{items.map((x, i) => <li key={i}><span>{String(i + 1).padStart(2, '0')}</span>{x}</li>)}</ul>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <section className="section apply" id="postuler" ref={formRef}>
        <div className="container narrow">
          <h2 className="h-display">{t('calls.form')}</h2>
          {c.is_open ? <ApplyForm call={c} /> : <p className="empty">{t('calls.closedMsg')}</p>}
        </div>
      </section>
    </Page>
  );
}
