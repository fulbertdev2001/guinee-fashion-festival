import { Marquee } from './motion.jsx';

const initials = (name = '') => name.split(/[\s&]+/).filter(w => w.length > 1 || /\d/.test(w)).slice(0, 2).map(w => w[0]).join('').toUpperCase() || (name[0] || '?').toUpperCase();

/** Tuile partenaire : logo en couleur sur fond clair, ou monogramme + nom à défaut de logo. */
export function PartnerTile({ p }) {
  const inner = p.logo
    ? <img src={p.logo.mid || p.logo.thumb} alt={p.name} loading="lazy" draggable="false" />
    : <><span className="partner-mono" aria-hidden="true">{initials(p.name)}</span><span className="partner-name">{p.name}</span></>;
  return p.url
    ? <a className="partner-tile" href={p.url} target="_blank" rel="noreferrer noopener" aria-label={p.name} title={p.name}>{inner}</a>
    : <div className="partner-tile" title={p.name}>{inner}</div>;
}

/** Slider de logos sur 2 lignes : la 2e ligne défile en sens inverse. */
export function PartnersSlider({ partners = [] }) {
  if (!partners.length) return null;
  // répartition alternée pour que chaque ligne mélange logos et noms ; répétition pour une boucle sans trou
  const rows = [partners.filter((_, i) => i % 2 === 0), partners.filter((_, i) => i % 2 === 1)].filter(r => r.length);
  const fill = r => (r.length >= 6 ? r : Array.from({ length: Math.ceil(6 / r.length) * r.length }, (_, i) => r[i % r.length]));
  return (
    <div className="partners-rows">
      {rows.map((r, k) => (
        <Marquee key={k} speed={k ? 34 : 40} skew={false} steady reverse={k === 1} className="partners-strip">
          {fill(r).map((p, i) => <div key={i} className="partners-strip-item"><PartnerTile p={p} /></div>)}
        </Marquee>
      ))}
    </div>
  );
}
