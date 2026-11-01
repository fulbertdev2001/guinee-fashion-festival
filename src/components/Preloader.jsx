import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { EASE, EASE_OUT } from './motion.jsx';

/** Écran d'ouverture (une fois par session) : logo révélé, compteur, rideaux. */
export default function Preloader({ onDone }) {
  const [n, setN] = useState(0);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t0 = performance.now(); const D = 1900; let raf;
    const tick = t => {
      const k = Math.min(1, (t - t0) / D);
      setN(Math.round(100 * (1 - Math.pow(1 - k, 3))));
      if (k < 1) raf = requestAnimationFrame(tick);
      else setTimeout(() => setLeaving(true), 250);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => { if (leaving) { const t = setTimeout(onDone, 1100); return () => clearTimeout(t); } }, [leaving, onDone]);

  return (
    <div className="preloader" aria-hidden="true">
      <motion.div className="pre-panel pre-yellow" initial={{ y: 0 }} animate={leaving ? { y: '-100%' } : {}}
        transition={{ duration: 0.9, ease: EASE, delay: 0.12 }} />
      <motion.div className="pre-panel pre-black" initial={{ y: 0 }} animate={leaving ? { y: '-100%' } : {}}
        transition={{ duration: 0.9, ease: EASE }}>
        <div className="pre-runway">
          {Array.from({ length: 9 }).map((_, i) => (
            <motion.span key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }}
              transition={{ duration: 1.4, ease: EASE_OUT, delay: 0.1 + i * 0.05 }} style={{ '--i': i }} />
          ))}
        </div>
        <motion.img className="pre-logo" src="/logo-festival-dark.svg" alt=""
          initial={{ clipPath: 'inset(100% 0 0 0)', scale: 1.08 }} animate={{ clipPath: 'inset(0% 0 0 0)', scale: 1 }}
          transition={{ duration: 1.6, ease: EASE_OUT, delay: 0.2 }} />
        <div className="pre-bottom">
          <span className="pre-tag">Conakry — Mode & Artisanat</span>
          <span className="pre-count">{String(n).padStart(3, '0')}</span>
        </div>
        <motion.div className="pre-bar" style={{ scaleX: n / 100 }} />
      </motion.div>
    </div>
  );
}
