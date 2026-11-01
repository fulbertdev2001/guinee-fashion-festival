import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useLang, fmtDate, dateParts, fmtRange } from '../lib/i18n.jsx';
import Img from './Img.jsx';
import { EASE_OUT, Reveal, useIsTouch } from './motion.jsx';

/* ---------- Titre de section ---------- */
export function SectionHead({ kicker, title, sub, action, light = false }) {
  return (
    <div className={`section-head ${light ? 'is-light' : ''}`}>
      <div>
        {kicker && <Reveal as="p" className="kicker" y={20}>{kicker}</Reveal>}
        <h2 className="h-display"><RevealTitle text={title} /></h2>
      </div>
      <div className="section-head-side">
        {sub && <Reveal as="p" className="lead" delay={0.1}>{sub}</Reveal>}
        {action && <Reveal delay={0.2}>{action}</Reveal>}
      </div>
    </div>
  );
}

/* L'observateur est posé sur le parent : un mot translaté hors de son masque n'est jamais « visible ». */
export function RevealTitle({ text, delay = 0 }) {
  return (
    <motion.span initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }} style={{ display: 'inline' }}>
      {String(text || '').split(' ').map((w, i) => (
        <span key={i} className="split-mask is-w">
          <motion.span className="split-word" variants={{ hidden: { y: '110%' }, show: { y: '0%' } }}
            transition={{ duration: 1.1, ease: EASE_OUT, delay: delay + i * 0.07 }}>{w}</motion.span>
        </span>
      ))}
    </motion.span>
  );
}

export const clipUp = { hidden: { clipPath: 'inset(100% 0% 0% 0%)' }, show: { clipPath: 'inset(0% 0% 0% 0%)' } };
export const clipDown = { hidden: { clipPath: 'inset(0% 0% 100% 0%)' }, show: { clipPath: 'inset(0% 0% 0% 0%)' } };
export const clipRight = { hidden: { clipPath: 'inset(0% 100% 0% 0%)' }, show: { clipPath: 'inset(0% 0% 0% 0%)' } };

/** Révélation par masque : l'observateur est sur le conteneur, le masque sur l'enfant. */
export function ClipReveal({ children, className, variants = clipUp, duration = 1.3, delay = 0, amount = 0.15, style }) {
  return (
    <motion.div className={className} style={style} initial="hidden" whileInView="show" viewport={{ once: true, amount }}>
      <motion.div className="clip-inner" variants={variants} transition={{ duration, ease: EASE_OUT, delay }}>{children}</motion.div>
    </motion.div>
  );
}

export function Arrow({ className = '' }) {
  return (
    <svg className={`arrow ${className}`} viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
  );
}

export function ButtonLink({ to, children, variant = 'yellow', href, ...rest }) {
  const inner = <><span className="btn-text" data-text={typeof children === 'string' ? children : ''}>{children}</span><Arrow /></>;
  if (href) return <a href={href} className={`btn btn-${variant}`} {...rest}>{inner}</a>;
  return <Link to={to} className={`btn btn-${variant}`} {...rest}>{inner}</Link>;
}

/* ---------- Image flottante qui suit le curseur ---------- */
export function useFloatingImage() {
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 150, damping: 20 });
  const sy = useSpring(y, { stiffness: 150, damping: 20 });
  const onMove = e => { x.set(e.clientX); y.set(e.clientY); };
  return { sx, sy, onMove };
}

export function FloatingImage({ media, sx, sy, show }) {
  return (
    <motion.div className="float-img" style={{ x: sx, y: sy }}>
      <AnimatePresence mode="popLayout">
        {show && media && (
          <motion.div key={media.id} className="float-img-inner" initial={{ clipPath: 'inset(50% 50% 50% 50%)', rotate: -6 }}
            animate={{ clipPath: 'inset(0% 0% 0% 0%)', rotate: 0 }} exit={{ clipPath: 'inset(50% 50% 50% 50%)', opacity: 0 }}
            transition={{ duration: 0.55, ease: EASE_OUT }}>
            <Img media={media} sizes="320px" eager />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ---------- Liste des temps forts ---------- */
export function PillarList({ pillars = [] }) {
  const { pick } = useLang();
  const touch = useIsTouch();
  const [active, setActive] = useState(-1);
  const { sx, sy, onMove } = useFloatingImage();
  return (
    <div className="pillars" onMouseMove={onMove} onMouseLeave={() => setActive(-1)}>
      {pillars.map((p, i) => (
        <Reveal key={i} className={`pillar ${active === i ? 'is-active' : ''}`} y={30} delay={i * 0.04}
          onMouseEnter={() => setActive(i)}>
          <span className="pillar-num">{String(i + 1).padStart(2, '0')}</span>
          <h3 className="pillar-title">{pick(p, 'title')}</h3>
          <p className="pillar-text">{pick(p, 'text')}</p>
          {touch && p.image && <div className="pillar-thumb"><Img media={p.image} sizes="40vw" /></div>}
        </Reveal>
      ))}
      {!touch && <FloatingImage media={pillars[active]?.image} sx={sx} sy={sy} show={active >= 0} />}
    </div>
  );
}

/* ---------- Lignes d'annonces (candidatures) ---------- */
export function CallRows({ calls = [] }) {
  const { t, pick, lang } = useLang();
  const touch = useIsTouch();
  const [active, setActive] = useState(-1);
  const { sx, sy, onMove } = useFloatingImage();
  if (!calls.length) return <p className="empty">{t('calls.none')}</p>;
  return (
    <div className="call-rows" onMouseMove={onMove} onMouseLeave={() => setActive(-1)}>
      {calls.map((c, i) => (
        <Reveal key={c.id} y={24} delay={i * 0.05}>
          <Link to={`/candidatures/${c.slug}`} className={`call-row ${c.is_open ? '' : 'is-closed'}`} onMouseEnter={() => setActive(i)} data-cursor={t('cta.apply')}>
            <span className="call-row-role">{t(`role.${c.role_type || 'autre'}`)}</span>
            <span className="call-row-title">{pick(c, 'title')}</span>
            <span className="call-row-meta">
              <span className={`status ${c.is_open ? 'is-open' : ''}`}>{c.is_open ? t('calls.open') : t('calls.closed')}</span>
              {c.deadline && <span>{t('calls.deadline')} · {fmtDate(c.deadline, lang, { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
            </span>
            <Arrow className="call-row-arrow" />
          </Link>
        </Reveal>
      ))}
      {!touch && <FloatingImage media={calls[active]?.cover} sx={sx} sy={sy} show={active >= 0} />}
    </div>
  );
}

/* ---------- Carte projet (galerie) avec feuilletage au survol ---------- */
export function ProjectCard({ project, size = 'md', index = 0 }) {
  const { t, pick } = useLang();
  const [hover, setHover] = useState(false);
  const [frame, setFrame] = useState(0);
  const preview = project.preview?.length ? project.preview : [project.cover].filter(Boolean);
  useEffect(() => {
    if (!hover || preview.length < 2) { setFrame(0); return; }
    const i = setInterval(() => setFrame(f => (f + 1) % preview.length), 650);
    return () => clearInterval(i);
  }, [hover, preview.length]);
  const media = frame === 0 ? project.cover : preview[frame];
  return (
    <motion.article className={`project-card size-${size}`} initial="hidden" whileInView="show"
      variants={{ hidden: { opacity: 0, y: 60 }, show: { opacity: 1, y: 0 } }}
      viewport={{ once: true, amount: 0.1 }} transition={{ duration: 1.1, ease: EASE_OUT, delay: (index % 2) * 0.12 }}>
      <Link to={`/galerie/${project.slug}`} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} data-cursor={t('cta.view')}>
        <div className="project-card-media">
          <motion.div className="project-card-reveal" variants={clipUp} transition={{ duration: 1.3, ease: EASE_OUT, delay: 0.1 + (index % 2) * 0.12 }}>
            <Img media={media || project.cover} sizes={size === 'lg' ? '90vw' : '(max-width: 760px) 90vw, 45vw'} />
          </motion.div>
          <span className="project-card-count">
            {project.counts?.image || 0} {t('gal.photos')}{project.counts?.video ? ` · ${project.counts.video} ${t('gal.videos')}` : ''}
          </span>
          {preview.length > 1 && (
            <span className="project-card-dots">{preview.map((_, i) => <i key={i} className={i === frame ? 'on' : ''} />)}</span>
          )}
        </div>
        <div className="project-card-info">
          <span className="project-card-cat">{t(`cat.${project.category || 'autre'}`)} — {project.year}</span>
          <h3 className="project-card-title">{pick(project, 'title')}</h3>
        </div>
      </Link>
    </motion.article>
  );
}

/* ---------- Carte événement ---------- */
export function EventCard({ ev, big = false }) {
  const { t, pick, lang } = useLang();
  const d = dateParts(ev.start_date, lang);
  return (
    <Reveal className={`event-card ${big ? 'is-big' : ''}`}>
      <Link to={`/evenements/${ev.slug}`} data-cursor={t('cta.discover')}>
        <div className="event-card-media"><Img media={ev.cover} sizes={big ? '60vw' : '(max-width: 760px) 90vw, 33vw'} /></div>
        <div className="event-card-date"><span className="ec-day">{d.day}</span><span className="ec-month">{d.month} {d.year}</span></div>
        <div className="event-card-body">
          <span className="kicker">{fmtRange(ev.start_date, ev.end_date, lang)} · {ev.venue || ev.city}</span>
          <h3>{pick(ev, 'title')}</h3>
          {big && <p>{pick(ev, 'excerpt')}</p>}
        </div>
      </Link>
    </Reveal>
  );
}

/* ---------- Entête de page intérieure ---------- */
export function PageHero({ kicker, title, lead, children, media }) {
  return (
    <section className={`page-hero ${media ? 'has-media' : ''}`}>
      {media && <div className="page-hero-bg"><Img media={media} sizes="100vw" eager /></div>}
      <div className="container">
        {kicker && <motion.p className="kicker" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6, duration: 0.8 }}>{kicker}</motion.p>}
        <h1 className="h-giant">
          {String(title).split(' ').map((w, i) => (
            <span key={i} className="split-mask is-w"><motion.span className="split-word" initial={{ y: '110%' }} animate={{ y: '0%' }}
              transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.55 + i * 0.08 }}>{w}</motion.span></span>
          ))}
        </h1>
        {lead && <motion.p className="lead page-hero-lead" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.9, duration: 0.9 }}>{lead}</motion.p>}
        {children}
      </div>
    </section>
  );
}

export function Loader() {
  const { t } = useLang();
  return <div className="loader"><span /><em>{t('loading')}</em></div>;
}

/** Index id → média, à partir de plusieurs listes. */
export function mediaIndex(...lists) {
  const o = {};
  for (const l of lists) for (const m of l || []) if (m?.id) o[m.id] = m;
  return o;
}

/* ---------- Onglets à pastille glissante (sans layoutId : il bloquait la sortie de page) ---------- */
export function PillTabs({ items, value, onChange, className = 'filters', itemClass = 'filter', count }) {
  const refs = useRef({});
  const [box, setBox] = useState(null);
  useEffect(() => {
    const measure = () => {
      const el = refs.current[value];
      if (el) setBox({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [value, items.length]);
  return (
    <div className={className} role="tablist" style={{ position: 'relative' }}>
      {box && <motion.span className="filter-pill" initial={false} animate={{ x: box.x, y: box.y, width: box.w, height: box.h }}
        transition={{ type: 'spring', stiffness: 400, damping: 35 }} style={{ inset: 'auto', left: 0, top: 0 }} />}
      {items.map(([k, label]) => (
        <button key={k} ref={el => { refs.current[k] = el; }} role="tab" aria-selected={value === k}
          className={`${itemClass} ${value === k ? 'is-active' : ''}`} onClick={() => onChange(k)}>
          <span className="filter-label">{label}</span>
          {count && <sup>{count(k)}</sup>}
        </button>
      ))}
    </div>
  );
}
