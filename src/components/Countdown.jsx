import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLang } from '../lib/i18n.jsx';

function diff(target) {
  const ms = Math.max(0, target - Date.now());
  return { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, s: Math.floor(ms / 1e3) % 60, ms };
}

function Digit({ value }) {
  return (
    <span className="cd-digit">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={value} initial={{ y: '100%' }} animate={{ y: '0%' }} exit={{ y: '-100%' }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}>{value}</motion.span>
      </AnimatePresence>
    </span>
  );
}

/** Compte à rebours jusqu'à start (date ISO), « en ce moment » entre start et end. */
export default function Countdown({ start, end, compact = false }) {
  const { t } = useLang();
  const target = new Date(`${start}T18:00:00`).getTime();
  const endT = new Date(`${end || start}T23:59:59`).getTime();
  const [v, setV] = useState(() => diff(target));
  useEffect(() => { const i = setInterval(() => setV(diff(target)), 1000); return () => clearInterval(i); }, [target]);
  if (!start) return null;
  if (v.ms <= 0) {
    return <div className={`countdown is-status ${compact ? 'is-compact' : ''}`}>
      <span className="live-dot" />{Date.now() <= endT ? t('cd.live') : t('cd.done')}
    </div>;
  }
  const units = [[v.d, 'cd.days'], [v.h, 'cd.hours'], [v.m, 'cd.min'], [v.s, 'cd.sec']];
  return (
    <div className={`countdown ${compact ? 'is-compact' : ''}`} role="timer">
      {units.map(([n, k]) => (
        <div key={k} className="cd-unit">
          <div className="cd-num">{String(n).padStart(2, '0').split('').map((c, i) => <Digit key={i} value={c} />)}</div>
          <div className="cd-label">{t(k)}</div>
        </div>
      ))}
    </div>
  );
}
