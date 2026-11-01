import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';
import { EASE_OUT } from './motion.jsx';

function Slide({ m }) {
  if (m.kind === 'video') {
    return <video className="lb-media" src={m.src} poster={m.poster?.src} controls autoPlay playsInline />;
  }
  if (m.kind === 'embed') {
    return (
      <div className="lb-embed">
        <iframe src={`${m.embed}?autoplay=1&rel=0`} title={m.name || 'Vidéo'} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
      </div>
    );
  }
  return <img className="lb-media" src={m.src} srcSet={m.srcset} sizes="100vw" alt="" draggable="false" />;
}

/** Visionneuse plein écran : clavier, glisser, vignettes. */
export default function Lightbox({ items, index, onClose, onIndex, title }) {
  const { pick } = useLang();
  const [dir, setDir] = useState(1);
  const thumbs = useRef(null);
  const m = items[index];
  const go = d => { setDir(d); onIndex((index + d + items.length) % items.length); };

  useEffect(() => {
    window.__lenis?.stop();
    document.documentElement.classList.add('lb-open');
    const key = e => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
    };
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener('keydown', key); window.__lenis?.start(); document.documentElement.classList.remove('lb-open'); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index]);

  useEffect(() => {
    const el = thumbs.current?.children[index];
    el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [index]);

  if (!m) return null;
  const caption = pick(m, 'caption') || pick(m, 'alt');

  return createPortal(
    <motion.div className="lightbox" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
      role="dialog" aria-modal="true">
      <div className="lb-top">
        <span className="lb-title">{title}</span>
        <span className="lb-count">{String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}</span>
        <button className="lb-close" onClick={onClose} aria-label="Fermer">×</button>
      </div>
      <div className="lb-stage">
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.div key={m.id + '-' + index} className="lb-slide" custom={dir}
            initial={{ x: `${dir * 30}%`, opacity: 0, scale: 0.92 }} animate={{ x: 0, opacity: 1, scale: 1 }}
            exit={{ x: `${dir * -30}%`, opacity: 0, scale: 0.92 }} transition={{ duration: 0.7, ease: EASE_OUT }}
            drag={m.kind === 'image' ? 'x' : false} dragConstraints={{ left: 0, right: 0 }} dragElastic={0.6}
            onDragEnd={(_e, info) => { if (info.offset.x < -80) go(1); else if (info.offset.x > 80) go(-1); }}>
            <Slide m={m} />
          </motion.div>
        </AnimatePresence>
        {items.length > 1 && <>
          <button className="lb-nav lb-prev" onClick={() => go(-1)} aria-label="Précédent" data-cursor="←">←</button>
          <button className="lb-nav lb-next" onClick={() => go(1)} aria-label="Suivant" data-cursor="→">→</button>
        </>}
      </div>
      <div className="lb-bottom">
        <p className="lb-caption">{caption}</p>
        <div className="lb-thumbs" ref={thumbs}>
          {items.map((it, i) => (
            <button key={it.id + '-' + i} className={i === index ? 'is-active' : ''} onClick={() => { setDir(i > index ? 1 : -1); onIndex(i); }}>
              {it.kind === 'image' ? <img src={it.thumb} alt="" /> : it.thumb || it.poster ? <img src={it.poster?.thumb || it.thumb} alt="" /> : <span>▶</span>}
              {it.kind !== 'image' && <i className="lb-thumb-play">▶</i>}
            </button>
          ))}
        </div>
      </div>
    </motion.div>,
    document.body,
  );
}
