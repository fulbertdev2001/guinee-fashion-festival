import { useEffect, useState } from 'react';
import { motion, useMotionValue, useSpring, AnimatePresence } from 'framer-motion';
import { useIsTouch } from './motion.jsx';

/** Curseur personnalisé : point + anneau, étiquette sur [data-cursor]. */
export default function Cursor() {
  const touch = useIsTouch();
  const x = useMotionValue(-100), y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 500, damping: 40, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 500, damping: 40, mass: 0.6 });
  const [label, setLabel] = useState('');
  const [hover, setHover] = useState(false);
  const [down, setDown] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if (touch) return;
    document.documentElement.classList.add('has-cursor');
    const move = e => {
      x.set(e.clientX); y.set(e.clientY); setHidden(false);
      const el = e.target.closest?.('[data-cursor], a, button, input, textarea, select, label');
      const l = el?.closest('[data-cursor]')?.getAttribute('data-cursor') || '';
      setLabel(l);
      setHover(!!el && !l);
    };
    const leave = () => setHidden(true);
    const d = () => setDown(true), u = () => setDown(false);
    window.addEventListener('mousemove', move);
    document.addEventListener('mouseleave', leave);
    window.addEventListener('mousedown', d); window.addEventListener('mouseup', u);
    return () => {
      document.documentElement.classList.remove('has-cursor');
      window.removeEventListener('mousemove', move); document.removeEventListener('mouseleave', leave);
      window.removeEventListener('mousedown', d); window.removeEventListener('mouseup', u);
    };
  }, [touch, x, y]);

  if (touch) return null;
  const size = label ? 96 : hover ? 54 : 12;
  return (
    <>
      <motion.div className={`cursor ${label ? 'has-label' : ''} ${hover ? 'is-hover' : ''}`}
        style={{ x: sx, y: sy, opacity: hidden ? 0 : 1 }}
        animate={{ width: size, height: size, scale: down ? 0.85 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}>
        <AnimatePresence>
          {label && (
            <motion.span key={label} className="cursor-label" initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} transition={{ duration: 0.2 }}>
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  );
}
