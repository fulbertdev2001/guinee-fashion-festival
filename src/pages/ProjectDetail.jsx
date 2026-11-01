import { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion, useTransform, AnimatePresence } from 'framer-motion';
import Page from '../components/Page.jsx';
import Img from '../components/Img.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { EASE_OUT, Reveal, useScrollProgress, useMediaQuery } from '../components/motion.jsx';
import { Loader, Arrow, clipUp, PillTabs } from '../components/sections.jsx';
import { useApi } from '../lib/api.js';
import { useLang } from '../lib/i18n.jsx';
import NotFound from './NotFound.jsx';

/* ---------- Tuile média (image, vidéo, lien vidéo) ---------- */
function Tile({ m, i, onOpen, sizes }) {
  const { t, pick } = useLang();
  const vid = useRef(null);
  const ratio = m.width && m.height ? m.width / m.height : m.kind === 'image' ? 0.75 : 16 / 9;
  return (
    <motion.button className={`tile tile-${m.kind}`} onClick={() => onOpen(i)} data-cursor={m.kind === 'image' ? t('cta.view') : t('cta.play')}
      initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.1 }}
      onMouseEnter={() => vid.current?.play().catch(() => {})} onMouseLeave={() => { if (vid.current) { vid.current.pause(); } }}>
      <motion.div className="tile-inner" style={{ aspectRatio: ratio }} variants={clipUp} transition={{ duration: 1.2, ease: EASE_OUT, delay: (i % 3) * 0.08 }}>
        {m.kind === 'image' && <Img media={m} sizes={sizes} />}
        {m.kind === 'video' && (m.poster ? <Img media={m.poster} sizes={sizes} /> : null)}
        {m.kind === 'video' && <video ref={vid} src={`${m.src}#t=0.5`} muted loop playsInline preload="metadata" className="tile-video" />}
        {m.kind === 'embed' && (m.thumb ? <img src={m.thumb} alt="" className="tile-embed-thumb" loading="lazy" /> : <div className="tile-embed-ph">{m.provider}</div>)}
        {m.kind !== 'image' && <span className="play-badge"><i>▶</i></span>}
      </motion.div>
      {(pick(m, 'caption')) && <span className="tile-caption">{pick(m, 'caption')}</span>}
    </motion.button>
  );
}

/* ---------- Mosaïque : colonnes à vitesses différentes ---------- */
function Mosaic({ items, onOpen }) {
  const mobile = useMediaQuery('(max-width: 760px)');
  const cols = mobile ? 2 : items.length < 4 ? Math.max(1, items.length) : 3;
  const ref = useRef(null);
  const p = useScrollProgress(ref);
  const speeds = [0, -140, 70];
  const y0 = useTransform(p, [0, 1], [0, mobile ? 0 : speeds[0]]);
  const y1 = useTransform(p, [0, 1], [0, mobile ? -60 : speeds[1]]);
  const y2 = useTransform(p, [0, 1], [0, mobile ? 0 : speeds[2]]);
  const ys = [y0, y1, y2];
  const columns = useMemo(() => {
    const c = Array.from({ length: cols }, () => ({ h: 0, items: [] }));
    items.forEach((m, i) => {
      const r = m.width && m.height ? m.height / m.width : m.kind === 'image' ? 1.33 : 0.5625;
      const col = c.reduce((a, b) => (b.h < a.h ? b : a));
      col.items.push({ m, i }); col.h += r;
    });
    return c;
  }, [items, cols]);
  return (
    <div className="mosaic" ref={ref} style={{ '--cols': cols }}>
      {columns.map((c, k) => (
        <motion.div key={k} className="mosaic-col" style={{ y: ys[k] }}>
          {c.items.map(({ m, i }) => <Tile key={m.item_id || m.id} m={m} i={i} onOpen={onOpen} sizes={`(max-width:760px) 50vw, ${Math.round(100 / cols)}vw`} />)}
        </motion.div>
      ))}
    </div>
  );
}

/* ---------- Pellicule : bande horizontale à faire glisser ---------- */
function FilmStrip({ items, onOpen }) {
  const { t } = useLang();
  const wrap = useRef(null), track = useRef(null);
  const [left, setLeft] = useState(0);
  useLayoutEffect(() => {
    const m = () => setLeft(Math.min(0, (wrap.current?.offsetWidth || 0) - (track.current?.scrollWidth || 0)));
    m(); const t2 = setTimeout(m, 600); window.addEventListener('resize', m);
    return () => { clearTimeout(t2); window.removeEventListener('resize', m); };
  }, [items.length]);
  return (
    <div className="film" ref={wrap} data-cursor={t('cta.drag')}>
      <div className="film-holes" />
      <motion.div className="film-track" ref={track} drag="x" dragConstraints={{ left, right: 0 }} dragElastic={0.08}
        dragTransition={{ power: 0.25, timeConstant: 300 }}>
        {items.map((m, i) => (
          <div key={m.item_id || m.id} className="film-frame">
            <span className="film-num">{String(i + 1).padStart(2, '0')}A</span>
            <Tile m={m} i={i} onOpen={onOpen} sizes="40vh" />
          </div>
        ))}
      </motion.div>
      <div className="film-holes" />
    </div>
  );
}

export default function ProjectDetail() {
  const { slug } = useParams();
  const { t, pick } = useLang();
  const { data: p, loading, error } = useApi(`projects/${slug}`);
  const [view, setView] = useState('grid');
  const [open, setOpen] = useState(-1);
  const heroRef = useRef(null);
  const hp = useScrollProgress(heroRef, 'sticky');
  const clip = useTransform(hp, [0, 1], ['inset(0% 0% 0% 0%)', 'inset(8% 6% 8% 6%)']);
  const imgScale = useTransform(hp, [0, 1], [1.05, 1.25]);
  const titleX = useTransform(hp, [0, 1], ['0%', '-12%']);
  const [nextHover, setNextHover] = useState(false);

  if (error?.status === 404) return <NotFound />;
  if (loading || !p) return <Page><Loader /></Page>;
  const title = pick(p, 'title');
  const media = p.media || [];

  return (
    <Page title={title} label={title} className="project-page">
      <section className="pj-hero" ref={heroRef}>
        <div className="pj-hero-sticky">
          <motion.div className="pj-hero-media" style={{ clipPath: clip }}>
            <motion.div className="fill" style={{ scale: imgScale }}><Img media={p.cover} sizes="100vw" eager position="center 30%" /></motion.div>
            <div className="ev-hero-shade" />
          </motion.div>
          <div className="pj-hero-text container">
            <motion.p className="kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>
              {t(`cat.${p.category || 'autre'}`)} — {p.year} · {p.counts.image} {t('gal.photos')}{p.counts.video ? ` · ${p.counts.video} ${t('gal.videos')}` : ''}
            </motion.p>
            <motion.h1 className="h-giant" style={{ x: titleX }}>
              {title.split(' ').map((w, i) => (
                <span key={i} className="split-mask is-w"><motion.span className="split-word" initial={{ y: '110%' }} animate={{ y: 0 }}
                  transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.6 + i * 0.08 }}>{w}</motion.span></span>
              ))}
            </motion.h1>
          </div>
        </div>
      </section>

      <section className="section pj-intro">
        <div className="container pj-intro-grid">
          <Reveal as="p" className="h-serif">{pick(p, 'description')}</Reveal>
          <div className="pj-side">
            {p.event && <Reveal><span className="kicker">{t('calls.event')}</span><Link to={`/evenements/${p.event.slug}`} className="link-u">{pick(p.event, 'title')}</Link></Reveal>}
            {p.credits && <Reveal><span className="kicker">Crédits</span><p className="pj-credits">{p.credits}</p></Reveal>}
            <PillTabs className="view-toggle" itemClass="vt" items={[['grid', t('gal.view.grid')], ['film', t('gal.view.film')]]} value={view} onChange={setView} />
          </div>
        </div>
      </section>

      <section className="pj-media">
        {!media.length ? <p className="empty container">{t('gal.empty')}</p> : (
          <motion.div key={view} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className={view === 'grid' ? 'container' : ''}>
            {view === 'grid' ? <Mosaic items={media} onOpen={setOpen} /> : <FilmStrip items={media} onOpen={setOpen} />}
          </motion.div>
        )}
      </section>

      {p.next && (
        <section className="pj-next">
          <Link to={`/galerie/${p.next.slug}`} className="pj-next-link" onMouseEnter={() => setNextHover(true)} onMouseLeave={() => setNextHover(false)} data-cursor={t('cta.view')}>
            <motion.div className="pj-next-bg" animate={{ opacity: nextHover ? 0.55 : 0.25, scale: nextHover ? 1 : 1.08 }} transition={{ duration: 0.9, ease: EASE_OUT }}>
              <Img media={p.next.cover} sizes="100vw" />
            </motion.div>
            <span className="kicker">{t('gal.next')}</span>
            <span className="h-giant">{pick(p.next, 'title')}</span>
            <Arrow className="pj-next-arrow" />
          </Link>
        </section>
      )}

      <AnimatePresence>
        {open >= 0 && <Lightbox items={media} index={open} onIndex={setOpen} onClose={() => setOpen(-1)} title={title} />}
      </AnimatePresence>
    </Page>
  );
}
