import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useTransform, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import Page from '../components/Page.jsx';
import Img from '../components/Img.jsx';
import Countdown from '../components/Countdown.jsx';
import {
  EASE_OUT, Marquee, Reveal, CountUp, useScrollProgress, useMediaQuery, Magnetic,
} from '../components/motion.jsx';
import {
  SectionHead, ButtonLink, PillarList, CallRows, ProjectCard, EventCard, Loader, Arrow, ClipReveal, clipDown,
} from '../components/sections.jsx';
import { useSite } from '../lib/site.jsx';
import { useLang, fmtRange, dateParts } from '../lib/i18n.jsx';

/* =========================================================
   HERO — le podium : arche centrale, looks qui « défilent »,
   sol en perspective, projecteur qui suit la souris.
   Au scroll, l'arche s'ouvre en plein écran.
   ========================================================= */
function Hero({ images = [], event, home, delay }) {
  const { t, pick, lang } = useLang();
  const ref = useRef(null);
  const mobile = useMediaQuery('(max-width: 760px)');
  const p = useScrollProgress(ref, 'sticky');
  const [idx, setIdx] = useState(0);
  const n = images.length;

  useEffect(() => {
    if (n < 2) return;
    const i = setInterval(() => setIdx(v => (v + 1) % n), 3600);
    return () => clearInterval(i);
  }, [n]);

  // projecteur
  const mx = useMotionValue(50), my = useMotionValue(30);
  const smx = useSpring(mx, { stiffness: 60, damping: 20 }), smy = useSpring(my, { stiffness: 60, damping: 20 });
  const spot = useTransform([smx, smy], ([x, y]) => `radial-gradient(circle at ${x}% ${y}%, rgba(249,206,33,.22), transparent 42%)`);
  const onMove = e => { mx.set((e.clientX / window.innerWidth) * 100); my.set((e.clientY / window.innerHeight) * 100); };

  // ouverture de l'arche au scroll
  const w0 = mobile ? 68 : 30;
  const width = useTransform(p, [0, 0.75], [`${w0}vw`, '100vw']);
  const height = useTransform(p, [0, 0.75], [mobile ? '62vh' : '74vh', '100vh']);
  const radius = useTransform(p, [0, 0.6], [mobile ? 160 : 400, 0]);
  const frameY = useTransform(p, [0, 0.75], [mobile ? '4vh' : '6vh', '0vh']);
  const textY = useTransform(p, [0, 0.6], ['0%', '-40%']);
  const textOp = useTransform(p, [0, 0.45], [1, 0]);
  const sideX = useTransform(p, [0, 0.5], ['0vw', '30vw']);
  const sideXn = useTransform(p, [0, 0.5], ['0vw', '-30vw']);
  const sideOp = useTransform(p, [0, 0.4], [1, 0]);
  const dark = useTransform(p, [0.5, 1], [0, 0.55]);
  const capOp = useTransform(p, [0.7, 0.95], [0, 1]);
  const capY = useTransform(p, [0.7, 0.95], [40, 0]);
  const floorOp = useTransform(p, [0, 0.4], [1, 0]);

  const cur = images[idx], prev = images[(idx - 1 + n) % n], next = images[(idx + 1) % n];
  const d = event ? dateParts(event.start_date, lang) : null;

  return (
    <section className="hero" ref={ref} onMouseMove={onMove}>
      <div className="hero-stage">
        <motion.div className="hero-spot" style={{ background: spot }} />
        <motion.div className="hero-floor" style={{ opacity: floorOp }} aria-hidden="true"><div /></motion.div>

        {/* texte géant derrière l'arche */}
        <motion.div className="hero-type" style={{ y: textY, opacity: textOp }} aria-hidden="true">
          <motion.span className="hero-type-top" initial={{ y: '100%', opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 1.2, ease: EASE_OUT, delay }}>Guinée Fashion</motion.span>
          <span className="hero-type-big">
            {'FESTIVAL'.split('').map((c, i) => (
              <span key={i} className="split-mask"><motion.span className="split-word" initial={{ y: '100%' }} animate={{ y: '0%' }}
                transition={{ duration: 1.3, ease: EASE_OUT, delay: delay + 0.1 + i * 0.05 }}>{c}</motion.span></span>
            ))}
          </span>
        </motion.div>

        {/* arches latérales (look précédent / suivant) */}
        {!mobile && n > 2 && <>
          <motion.div className="hero-side hero-side-l" style={{ x: sideXn, opacity: sideOp }}>
            <motion.div className="fill" initial={{ y: '100%' }} animate={{ y: '0%' }} transition={{ duration: 1.4, ease: EASE_OUT, delay: delay + 0.5 }}>
            <AnimatePresence mode="popLayout"><motion.div key={prev?.id} className="fill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
              <Img media={prev} sizes="18vw" eager /></motion.div></AnimatePresence>
            </motion.div>
          </motion.div>
          <motion.div className="hero-side hero-side-r" style={{ x: sideX, opacity: sideOp }}>
            <motion.div className="fill" initial={{ y: '100%' }} animate={{ y: '0%' }} transition={{ duration: 1.4, ease: EASE_OUT, delay: delay + 0.6 }}>
            <AnimatePresence mode="popLayout"><motion.div key={next?.id} className="fill" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1 }}>
              <Img media={next} sizes="18vw" eager /></motion.div></AnimatePresence>
            </motion.div>
          </motion.div>
        </>}

        {/* arche centrale */}
        <motion.div className="hero-frame" style={{ width, height, borderTopLeftRadius: radius, borderTopRightRadius: radius, y: frameY }}
          initial={{ clipPath: 'inset(100% 0 0 0)' }} animate={{ clipPath: 'inset(0% 0 0 0)' }} transition={{ duration: 1.6, ease: EASE_OUT, delay: delay + 0.2 }}>
          <AnimatePresence initial={false}>
            <motion.div key={cur?.id ?? 'none'} className="hero-look"
              initial={{ opacity: 0, scale: 1.18, y: '-3%' }} animate={{ opacity: 1, scale: 1.02, y: '0%' }} exit={{ opacity: 0, scale: 0.98 }}
              transition={{ opacity: { duration: 1.1 }, scale: { duration: 4.2, ease: 'linear' }, y: { duration: 4.2, ease: 'linear' } }}>
              <Img media={cur} sizes="(max-width:760px) 100vw, 100vw" eager position="center 25%" />
            </motion.div>
          </AnimatePresence>
          <motion.div className="hero-frame-dark" style={{ opacity: dark }} />
          <motion.div className="hero-frame-caption" style={{ opacity: capOp, y: capY }}>
            <span className="kicker">Look {String(idx + 1).padStart(2, '0')} / {String(n).padStart(2, '0')}</span>
            <p className="h-serif">{pick(home, 'manifesto')}</p>
          </motion.div>
        </motion.div>

        {/* outline de FESTIVAL devant l'arche */}
        <motion.div className="hero-type hero-type-outline" style={{ y: textY, opacity: textOp }} aria-hidden="true">
          <span className="hero-type-top" style={{ visibility: 'hidden' }}>Guinée Fashion</span>
          <motion.span className="hero-type-big" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 0.9, duration: 1 }}>FESTIVAL</motion.span>
        </motion.div>

        <h1 className="sr-only">Guinée Fashion Festival — {t('nav.home')}</h1>

        <motion.div className="hero-meta hero-meta-l" style={{ opacity: textOp }}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 1, duration: 1 }}>
            <span className="kicker">{pick(home, 'hero_kicker') || 'Conakry · Guinée'}</span>
            <p>{pick(home, 'hero_text')}</p>
          </motion.div>
        </motion.div>

        {event && (
          <motion.div className="hero-meta hero-meta-r" style={{ opacity: textOp }}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 1.15, duration: 1 }}>
            <Link to={`/evenements/${event.slug}`} className="hero-event" data-cursor={t('cta.discover')}>
              <span className="hero-event-date"><b>{d.day}</b><em>{d.month}<br />{d.year}</em></span>
              <span className="hero-event-txt">
                <span className="kicker">{t('home.next')}</span>
                <strong>{pick(event, 'title')}</strong>
                <Countdown start={event.start_date} end={event.end_date} compact />
              </span>
            </Link>
            </motion.div>
          </motion.div>
        )}

        <motion.div className="hero-scroll" style={{ opacity: textOp }}>
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 1.4 }}>Scroll</motion.span><i />
        </motion.div>
      </div>
    </section>
  );
}

/* ---------- Manifeste : mots qui s'allument au scroll ---------- */
function Word({ children, p, range }) {
  const op = useTransform(p, range, [0.14, 1]);
  const y = useTransform(p, range, [8, 0]);
  return <><motion.span className="mw" style={{ opacity: op, y }}>{children}</motion.span>{' '}</>;
}
function Manifesto({ text, images = [] }) {
  const ref = useRef(null);
  const p = useScrollProgress(ref, 'through');
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const N = words.length;
  const imgA = useTransform(p, [0, 1], [120, -160]);
  const imgB = useTransform(p, [0, 1], [-60, 140]);
  const rot = useTransform(p, [0, 1], [-8, 6]);
  return (
    <section className="manifesto" ref={ref}>
      {images[0] && <motion.div className="manifesto-img mi-a" style={{ y: imgA, rotate: rot }}><Img media={images[0]} sizes="22vw" /></motion.div>}
      {images[1] && <motion.div className="manifesto-img mi-b" style={{ y: imgB }}><Img media={images[1]} sizes="18vw" /></motion.div>}
      <div className="container">
        <p className="kicker">Manifeste — Mode & Artisanat</p>
        <p className="manifesto-text">
          {words.map((w, i) => <Word key={i} p={p} range={[0.2 + (i / N) * 0.45, 0.2 + ((i + 1) / N) * 0.45]}>{w}</Word>)}
        </p>
      </div>
    </section>
  );
}

/* ---------- Prochaine édition ---------- */
function NextEvent({ event, others = [] }) {
  const { t, pick, lang } = useLang();
  const ref = useRef(null);
  const p = useScrollProgress(ref, 'through');
  const imgY = useTransform(p, [0, 1], ['-12%', '12%']);
  if (!event) return null;
  const a = dateParts(event.start_date, lang), b = dateParts(event.end_date || event.start_date, lang);
  return (
    <section className="next-event" ref={ref}>
      <div className="container next-event-grid">
        <div className="next-event-info">
          <Reveal as="p" className="kicker">{t('home.next')}</Reveal>
          <motion.div className="big-date" aria-label={fmtRange(event.start_date, event.end_date, lang)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
            {[a.day, '—', b.day].map((x, i) => (
              <span key={i} className="split-mask"><motion.span className="split-word" variants={{ hidden: { y: '100%' }, show: { y: '0%' } }}
                transition={{ duration: 1.1, ease: EASE_OUT, delay: i * 0.1 }}>{x}</motion.span></span>
            ))}
            <span className="big-date-month">{b.month} {b.year}</span>
          </motion.div>
          <Reveal as="h2" className="h-title">{pick(event, 'title')}</Reveal>
          <Reveal as="p" className="lead" delay={0.1}>{pick(event, 'excerpt')}</Reveal>
          <Reveal className="next-event-venue" delay={0.15}><span className="kicker">{t('ev.where')}</span>{[event.venue, event.city].filter(Boolean).join(', ')}</Reveal>
          <Reveal delay={0.2}><p className="kicker cd-title">{t('home.countdown')}</p><Countdown start={event.start_date} end={event.end_date} /></Reveal>
          <Reveal className="btn-row" delay={0.25}>
            <ButtonLink to={`/evenements/${event.slug}`}>{t('cta.program')}</ButtonLink>
            <ButtonLink to="/candidatures" variant="ghost">{t('cta.calls')}</ButtonLink>
          </Reveal>
        </div>
        <div className="next-event-wrap">
          <ClipReveal className="next-event-media" variants={clipDown} duration={1.5}>
            <motion.div style={{ y: imgY, height: '124%', marginTop: '-12%', position: 'relative' }}><Img media={event.cover} sizes="(max-width:760px) 100vw, 45vw" /></motion.div>
          </ClipReveal>
          <span className="next-event-stamp">{pick(event, 'subtitle')}</span>
        </div>
      </div>
      {others.length > 0 && (
        <div className="container other-events">
          <p className="kicker">{t('home.upcoming')}</p>
          <div className="event-grid">{others.map(ev => <EventCard key={ev.id} ev={ev} />)}</div>
        </div>
      )}
    </section>
  );
}

/* ---------- Le défilé : rail horizontal épinglé ---------- */
function LooksRail({ looks = [] }) {
  const { t, pick } = useLang();
  const ref = useRef(null);
  const track = useRef(null);
  const mobile = useMediaQuery('(max-width: 760px)');
  const p = useScrollProgress(ref, 'sticky');
  const [dist, setDist] = useState(0);
  useLayoutEffect(() => {
    const m = () => setDist(Math.max(0, (track.current?.scrollWidth || 0) - window.innerWidth));
    m(); window.addEventListener('resize', m);
    const t2 = setTimeout(m, 800);
    return () => { window.removeEventListener('resize', m); clearTimeout(t2); };
  }, [looks.length, mobile]);
  const x = useTransform(p, [0, 1], [0, -dist]);
  const bar = useTransform(p, [0, 1], [0, 1]);
  if (!looks.length) return null;

  const cards = looks.map((m, i) => <LookCard key={m.id} m={m} i={i} p={p} n={looks.length} pick={pick} />);
  return (
    <section className={`looks ${mobile ? 'is-mobile' : ''}`} ref={ref} style={mobile ? undefined : { height: `calc(${dist}px + 100vh)` }}>
      <div className="looks-sticky">
        <div className="looks-head container">
          <h2 className="h-display">{t('home.looks')}</h2>
          <p className="lead">{t('home.looksSub')}</p>
        </div>
        {mobile ? <div className="looks-track is-scroll">{cards}<div className="looks-end-pad" /></div> : (
          <motion.div className="looks-track" ref={track} style={{ x }}>
            <div className="looks-intro"><span className="h-outline">Runway</span></div>
            {cards}
            <div className="looks-end">
              <ButtonLink to="/galerie">{t('cta.gallery')}</ButtonLink>
            </div>
          </motion.div>
        )}
        {!mobile && <div className="looks-progress"><motion.i style={{ scaleX: bar }} /></div>}
      </div>
    </section>
  );
}
function LookCard({ m, i, p, n, pick }) {
  const local = useTransform(p, [Math.max(0, (i - 2) / n), Math.min(1, (i + 2) / n)], ['-8%', '8%']);
  return (
    <figure className={`look ${i % 2 ? 'is-low' : ''}`}>
      <div className="look-media"><motion.div className="look-media-in" style={{ x: local }}><Img media={m} sizes="(max-width:760px) 75vw, 28vw" /></motion.div></div>
      <figcaption>
        <span className="look-num">Look {String(i + 1).padStart(2, '0')}</span>
        <span className="look-alt">{pick(m, 'alt')}</span>
      </figcaption>
    </figure>
  );
}

/* ---------- Chiffres ---------- */
function Stats({ stats = [] }) {
  const { pick } = useLang();
  if (!stats.length) return null;
  return (
    <section className="stats">
      <div className="container stats-grid">
        {stats.map((s, i) => (
          <Reveal key={i} className="stat" delay={i * 0.08}>
            <span className="stat-value"><CountUp value={s.value} /></span>
            <span className="stat-label">{pick(s, 'label')}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ========================================================= */
export default function Home({ intro }) {
  const site = useSite();
  const { t, pick } = useLang();
  const [delay] = useState(() => (intro ? 2.7 : 0.6));
  if (!site) return <Page><Loader /></Page>;
  const [next, ...others] = site.upcoming || [];
  const heroImages = site.heroImages?.length ? site.heroImages : site.looks;

  return (
    <Page label="Guinée Fashion Festival" className="home">
      <Hero images={heroImages} event={next} home={site.home} delay={delay} />

      <Marquee className="band band-yellow" speed={70}>
        {['Mode', 'Artisanat', 'Défilés', 'Exposition & vente', 'B to B', 'Formation', 'Conakry'].map(w => <span key={w}>{w}<i>✦</i></span>)}
      </Marquee>

      <Manifesto text={pick(site.home, 'manifesto')} images={[site.about?.image, site.about?.image2]} />

      <NextEvent event={next} others={others} />

      <LooksRail looks={site.looks} />

      <section className="section programme">
        <div className="container">
          <SectionHead kicker="01 — 07" title={t('home.programme')} sub={pick(site.about, 'intro')}
            action={<ButtonLink to="/festival" variant="ghost">{t('cta.discover')}</ButtonLink>} />
          <PillarList pillars={site.pillars} />
        </div>
      </section>

      <Stats stats={site.stats} />

      <section className="section gallery-teaser">
        <div className="container">
          <SectionHead kicker={t('nav.gallery')} title={t('home.galleryTitle')} sub={t('home.gallerySub')}
            action={<ButtonLink to="/galerie">{t('cta.gallery')}</ButtonLink>} />
          <div className="project-grid">
            {(site.projects || []).slice(0, 4).map((p, i) => <ProjectCard key={p.id} project={p} index={i} size={i === 0 ? 'lg' : 'md'} />)}
          </div>
        </div>
      </section>

      <section className="section casting">
        <Marquee className="casting-marquee" speed={50} reverse>
          {['Casting call', 'Open call', 'Casting call', 'Rejoignez-nous'].map((w, i) => <span key={i} className="h-outline">{w}<i>✦</i></span>)}
        </Marquee>
        <div className="container">
          <SectionHead kicker={t('nav.calls')} title={t('home.callsTitle')} sub={t('home.callsSub')}
            action={<ButtonLink to="/candidatures">{t('cta.calls')}</ButtonLink>} />
          <CallRows calls={site.calls} />
        </div>
      </section>

      {site.partners?.length > 0 && (
        <section className="partners">
          <p className="kicker container">{t('home.partners')}</p>
          <Marquee speed={45} skew={false} className="partners-marquee">
            {site.partners.map((p, i) => (
              <span key={i} className="partner">{p.logo ? <img src={p.logo.thumb} alt={p.name} /> : p.name}<i>✦</i></span>
            ))}
          </Marquee>
        </section>
      )}

      <section className="cta-final">
        <div className="container">
          <Reveal as="p" className="kicker">Guinée Fashion Festival</Reveal>
          <Link to="/candidatures" className="cta-final-link" data-cursor={t('cta.apply')}>
            <span className="h-giant"><span>{t('cta.apply')}</span><Magnetic><span className="cta-final-arrow"><Arrow /></span></Magnetic></span>
          </Link>
        </div>
      </section>
    </Page>
  );
}
