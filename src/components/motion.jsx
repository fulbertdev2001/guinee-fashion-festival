import { useEffect, useRef, useState, Children } from 'react';
import {
  motion, useMotionValue, useSpring, useTransform, useAnimationFrame, useVelocity, useInView,
} from 'framer-motion';

export const EASE = [0.76, 0, 0.24, 1];
export const EASE_OUT = [0.16, 1, 0.3, 1];

/**
 * Progression de scroll calculée en JS (plus fiable que l'accélération native sur mobile).
 * mode 'through' : 0 quand le haut de l'élément entre par le bas, 1 quand son bas sort par le haut.
 * mode 'sticky'  : 0 quand le haut touche le haut de l'écran, 1 quand le bas touche le bas.
 * mode 'enter'   : 0 quand le haut entre par le bas, 1 quand le haut atteint le haut.
 */
export function useScrollProgress(ref, mode = 'through') {
  const mv = useMotionValue(0);
  useEffect(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      let p;
      if (mode === 'sticky') p = -r.top / Math.max(1, r.height - vh);
      else if (mode === 'enter') p = (vh - r.top) / vh;
      else p = (vh - r.top) / (r.height + vh);
      mv.set(Math.min(1, Math.max(0, p)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf); };
  }, [ref, mode, mv]);
  return mv;
}

/** Vitesse de scroll lissée (pour les marquees et les déformations). */
export function useScrollVelocity() {
  const y = useMotionValue(typeof window !== 'undefined' ? window.scrollY : 0);
  useEffect(() => {
    const on = () => y.set(window.scrollY);
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [y]);
  const v = useVelocity(y);
  return useSpring(v, { damping: 50, stiffness: 400 });
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/** Apparition douce au défilement. */
export function Reveal({ children, delay = 0, y = 40, className, as = 'div', once = true, amount = 0.2, ...rest }) {
  const M = motion[as];
  return (
    <M className={className} initial={{ opacity: 0, y }} whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }} transition={{ duration: 1, ease: EASE_OUT, delay }} {...rest}>
      {children}
    </M>
  );
}

/** Texte découpé en mots qui montent depuis un masque. */
export function SplitText({ text = '', className, delay = 0, stagger = 0.06, as = 'span', inView = true, duration = 1.1 }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.3 });
  const show = inView ? seen : true;
  const Tag = as;
  const words = String(text).split(/(\s+)/);
  let i = 0;
  return (
    <Tag ref={ref} className={`split ${className || ''}`} aria-label={text}>
      {words.map((w, k) => {
        if (/^\s+$/.test(w)) return <span key={k}> </span>;
        const idx = i++;
        return (
          <span key={k} className="split-mask" aria-hidden="true">
            <motion.span className="split-word" initial={{ y: '110%', rotate: 4 }}
              animate={show ? { y: '0%', rotate: 0 } : {}} transition={{ duration, ease: EASE_OUT, delay: delay + idx * stagger }}>
              {w}
            </motion.span>
          </span>
        );
      })}
    </Tag>
  );
}

/** Lettres qui tombent une à une (titres géants). */
export function SplitLetters({ text = '', className, delay = 0, stagger = 0.04, inView = true }) {
  const ref = useRef(null);
  const seen = useInView(ref, { once: true, amount: 0.2 });
  const show = inView ? seen : true;
  return (
    <span ref={ref} className={`split ${className || ''}`} aria-label={text}>
      {Array.from(text).map((c, i) => (
        <span key={i} className="split-mask" aria-hidden="true">
          <motion.span className="split-word" initial={{ y: '105%' }} animate={show ? { y: '0%' } : {}}
            transition={{ duration: 1.2, ease: EASE_OUT, delay: delay + i * stagger }}>
            {c === ' ' ? ' ' : c}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/** Bandeau défilant infini dont la vitesse réagit au scroll. */
export function Marquee({ children, speed = 40, reverse = false, className, skew = true }) {
  const x = useMotionValue(0);
  const vel = useScrollVelocity();
  const factor = useTransform(vel, [-3000, 0, 3000], [-4, 0, 4], { clamp: false });
  const skewX = useTransform(vel, [-3000, 3000], skew ? [8, -8] : [0, 0]);
  const dir = useRef(reverse ? 1 : -1);
  const track = useRef(null);
  useAnimationFrame((_t, delta) => {
    const w = track.current ? track.current.scrollWidth / 2 : 1000;
    const f = factor.get();
    if (f < 0) dir.current = reverse ? -1 : 1; else if (f > 0) dir.current = reverse ? 1 : -1;
    let move = dir.current * speed * (delta / 1000) * (1 + Math.abs(f));
    let next = x.get() + move;
    if (next <= -w) next += w; if (next > 0) next -= w;
    x.set(next);
  });
  const items = Children.toArray(children);
  return (
    <div className={`marquee ${className || ''}`}>
      <motion.div className="marquee-track" ref={track} style={{ x, skewX }}>
        <div className="marquee-group">{items}</div>
        <div className="marquee-group" aria-hidden="true">{items}</div>
      </motion.div>
    </div>
  );
}

/** Bouton/élément magnétique. */
export function Magnetic({ children, strength = 0.35, className }) {
  const ref = useRef(null);
  const x = useSpring(0, { stiffness: 200, damping: 15 });
  const y = useSpring(0, { stiffness: 200, damping: 15 });
  const onMove = e => {
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  };
  return (
    <motion.span ref={ref} className={`magnetic ${className || ''}`} style={{ x, y }}
      onMouseMove={onMove} onMouseLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.span>
  );
}

/** Parallaxe verticale d'un enfant dans son conteneur. */
export function Parallax({ children, amount = 80, className, style }) {
  const ref = useRef(null);
  const p = useScrollProgress(ref, 'through');
  const y = useTransform(p, [0, 1], [-amount, amount]);
  return (
    <div ref={ref} className={className} style={{ overflow: 'hidden', ...style }}>
      <motion.div style={{ y, height: '100%' }}>{children}</motion.div>
    </div>
  );
}

/** Compteur animé (ex. « 15+ »). */
export function CountUp({ value = '0', duration = 1.8 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const m = String(value).match(/^(\D*)(\d+)(.*)$/);
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!inView || !m) return;
    const target = Number(m[2]); const t0 = performance.now(); let raf;
    const tick = t => {
      const k = Math.min(1, (t - t0) / (duration * 1000));
      setN(Math.round(target * (1 - Math.pow(1 - k, 4))));
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView]);
  if (!m) return <span ref={ref}>{value}</span>;
  return <span ref={ref}>{m[1]}{n}{m[3]}</span>;
}

export function useIsTouch() {
  const [touch, setTouch] = useState(false);
  useEffect(() => { setTouch(window.matchMedia('(hover: none), (pointer: coarse)').matches); }, []);
  return touch;
}

export function useMediaQuery(q) {
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q); const on = () => setM(mq.matches);
    mq.addEventListener('change', on); on();
    return () => mq.removeEventListener('change', on);
  }, [q]);
  return m;
}
