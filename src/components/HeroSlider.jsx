import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Img from './Img.jsx';
import Countdown from './Countdown.jsx';
import { ButtonLink } from './sections.jsx';
import { EASE_OUT } from './motion.jsx';
import { useLang, dateParts } from '../lib/i18n.jsx';

const SLIDE_EASE = [0.76, 0, 0.24, 1];
const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const pad = n => String(n).padStart(2, '0');

const variants = {
  enter: d => ({ x: d >= 0 ? '100%' : '-100%' }),
  center: { x: '0%' },
  exit: d => ({ x: d >= 0 ? '-30%' : '30%', opacity: 0.35 }),
};

/** Un fond : image (y compris GIF / WebP animé) ou vidéo en boucle, en plein écran. */
function Slide({ m, active, single, onEnded, onDuration, seconds }) {
  if (m.kind === 'video') {
    return (
      <video className="hs-video" src={m.src} poster={m.poster?.src} muted playsInline autoPlay preload="auto" loop={single}
        onEnded={onEnded} onLoadedMetadata={e => onDuration?.(e.currentTarget.duration)} />
    );
  }
  return (
    <motion.div className="hs-kenburns" initial={{ scale: 1.12 }} animate={{ scale: 1 }} transition={{ duration: seconds + 1.6, ease: 'linear' }}>
      <Img media={m} sizes="100vw" eager position="center 28%" />
    </motion.div>
  );
}

/**
 * Hero en diaporama plein écran : images / images animées / vidéos qui défilent,
 * lecture automatique (pause au survol), flèches, indicateurs, glisser au doigt.
 */
export default function HeroSlider({ slides = [], event, home, delay = 0.6 }) {
  const { t, pick, lang } = useLang();
  const ref = useRef(null);
  const [[index, dir], setPos] = useState([0, 1]);
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [vdur, setVdur] = useState(null);
  const n = slides.length;
  const cur = slides[index];
  const seconds = Math.min(20, Math.max(3, Number(home?.hero_interval) || 6));
  const still = reduced();
  const d = event ? dateParts(event.start_date, lang) : null;

  const go = useCallback(step => { setVdur(null); setPos(([i]) => [(i + step + n) % n, step]); }, [n]);
  const goTo = i => { setVdur(null); setPos(([c]) => [i, i >= c ? 1 : -1]); };

  // lecture automatique : image = durée réglée dans l'admin ; vidéo = fin de la vidéo (sécurité : 60 s)
  useEffect(() => {
    if (n < 2 || paused || hidden || still) return;
    const ms = cur?.kind === 'video' ? 60000 : seconds * 1000;
    const tm = setTimeout(() => go(1), ms);
    return () => clearTimeout(tm);
  }, [index, n, paused, hidden, still, cur?.kind, seconds, go]);

  useEffect(() => {
    const on = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', on);
    return () => document.removeEventListener('visibilitychange', on);
  }, []);

  // précharge l'image suivante pour un défilement sans à-coup
  useEffect(() => {
    const next = slides[(index + 1) % Math.max(n, 1)];
    if (next?.kind === 'image' && next.src) { const i = new Image(); i.src = next.src; }
  }, [index, slides, n]);

  // léger parallaxe au scroll
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '16%']);
  const fade = useTransform(scrollYProgress, [0, 0.55], [1, 0]);

  const barSeconds = cur?.kind === 'video' ? (Number.isFinite(vdur) && vdur > 0 ? vdur : 8) : seconds;

  return (
    <section className="hero-slider" ref={ref} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} aria-roledescription="carousel" aria-label="Guinée Fashion Festival">
      <motion.div className="hs-bg" style={{ y: bgY }}>
        {n > 0 ? (
          <AnimatePresence initial={false} custom={dir}>
            <motion.div key={cur.id} className="hs-slide" custom={dir} variants={variants} initial="enter" animate="center" exit="exit"
              transition={{ duration: 1.15, ease: SLIDE_EASE }}
              drag={n > 1 ? 'x' : false} dragDirectionLock dragConstraints={{ left: 0, right: 0 }} dragElastic={0.12}
              onDragEnd={(_, i) => { if (i.offset.x < -70) go(1); else if (i.offset.x > 70) go(-1); }}>
              <Slide m={cur} single={n === 1} seconds={seconds} onEnded={() => n > 1 && go(1)} onDuration={setVdur} />
            </motion.div>
          </AnimatePresence>
        ) : <div className="hs-slide hs-empty" />}
        <div className="hs-shade" />
      </motion.div>

      <motion.div className="hs-content container" style={{ opacity: fade }}>
        <div className="hs-text">
          <motion.span className="kicker" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 0.1, duration: 0.9 }}>
            {pick(home, 'hero_kicker') || 'Conakry · Guinée'}
          </motion.span>
          <h1 className="hs-title">
            <span className="hs-title-top split-mask"><motion.span className="split-word" initial={{ y: '110%' }} animate={{ y: '0%' }} transition={{ duration: 1.2, ease: EASE_OUT, delay: delay + 0.15 }}>Guinée Fashion</motion.span></span>
            <span className="hs-title-big split-mask"><motion.span className="split-word" initial={{ y: '110%' }} animate={{ y: '0%' }} transition={{ duration: 1.3, ease: EASE_OUT, delay: delay + 0.3 }}>Festival</motion.span></span>
          </h1>
          {pick(home, 'hero_text') && (
            <motion.p className="hs-lead" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 0.7, duration: 1 }}>{pick(home, 'hero_text')}</motion.p>
          )}
          <motion.div className="btn-row hs-cta" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 0.85, duration: 1 }}>
            <ButtonLink to="/programme">{t('cta.program')}</ButtonLink>
            <ButtonLink to="/candidatures" variant="ghost">{t('cta.apply')}</ButtonLink>
          </motion.div>
        </div>

        {event && (
          <motion.div className="hs-event-wrap" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay + 1, duration: 1 }}>
            <Link to={`/evenements/${event.slug}`} className="hero-event" data-cursor={t('cta.discover')}>
              <span className="hero-event-date"><b>{d.day}</b><em>{d.month}<br />{d.year}</em></span>
              <span className="hero-event-txt">
                <span className="kicker">{t('home.next')}</span>
                <strong>{pick(event, 'title')}</strong>
                <Countdown start={event.start_date} end={event.end_date} compact />
              </span>
            </Link>
          </motion.div>
        )}
      </motion.div>

      {n > 1 && (
        <motion.div className="hs-controls container" style={{ opacity: fade }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: delay + 1.2 }}>
          <div className="hs-dots" role="tablist" aria-label="Diapositives">
            <span className="hs-count">{pad(index + 1)} / {pad(n)}</span>
            {slides.map((m, i) => (
              <button key={m.id} role="tab" aria-selected={i === index} aria-label={`Diapositive ${i + 1}`} className={`hs-dot ${i === index ? 'is-active' : ''} ${i < index ? 'is-done' : ''}`} onClick={() => goTo(i)}>
                {i === index && <i key={`${index}-${barSeconds}`} style={{ animationDuration: `${barSeconds}s`, animationPlayState: paused || still ? 'paused' : 'running' }} />}
              </button>
            ))}
          </div>
          <div className="hs-arrows">
            <button className="hs-arrow" onClick={() => go(-1)} aria-label="Précédent">←</button>
            <button className="hs-arrow" onClick={() => go(1)} aria-label="Suivant">→</button>
          </div>
        </motion.div>
      )}
    </section>
  );
}
