import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { EASE } from './motion.jsx';

/** Enveloppe de page : rideau jaune/noir à l'entrée et à la sortie + titre du document. */
export default function Page({ children, title, label, className = '' }) {
  useEffect(() => {
    document.title = title ? `${title} — Guinée Fashion Festival` : 'Guinée Fashion Festival — Mode & Artisanat';
  }, [title]);
  return (
    <>
      <motion.main className={`page ${className}`} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.4, delay: 0.35 } }}
        exit={{ opacity: 1, transition: { duration: 0.75 } }}>
        {children}
      </motion.main>
      <motion.div className="curtain curtain-in" initial={{ scaleY: 0 }} animate={{ scaleY: 0 }} exit={{ scaleY: 1 }}
        transition={{ duration: 0.7, ease: EASE }} aria-hidden="true">
        <span>{label || title || 'GFF'}</span>
      </motion.div>
      <motion.div className="curtain curtain-out" initial={{ scaleY: 1 }} animate={{ scaleY: 0 }} exit={{ scaleY: 0 }}
        transition={{ duration: 0.75, ease: EASE, delay: 0.05 }} aria-hidden="true" />
    </>
  );
}
