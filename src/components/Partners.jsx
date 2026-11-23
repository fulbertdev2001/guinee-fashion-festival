import { Reveal, Marquee } from './motion.jsx';

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

/** Grille de logos (page Le Festival). */
export function PartnersGrid({ partners = [] }) {
  return (
    <div className="partners-grid">
      {partners.map((p, i) => <Reveal key={i} delay={(i % 6) * 0.05} y={20}><PartnerTile p={p} /></Reveal>)}
    </div>
  );
}

/** Bandeau défilant de logos (accueil). */
export function PartnersStrip({ partners = [] }) {
  const list = partners.length >= 6 ? partners : Array.from({ length: Math.ceil(6 / partners.length) * partners.length }, (_, i) => partners[i % partners.length]);
  return (
    <Marquee speed={38} skew={false} steady className="partners-strip">
      {list.map((p, i) => <div key={i} className="partners-strip-item"><PartnerTile p={p} /></div>)}
    </Marquee>
  );
}
