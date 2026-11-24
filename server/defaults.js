import fs from 'node:fs';
import path from 'node:path';
import { db, getSetting, setSetting, slugify } from './db.js';
import { ROOT } from './config.js';
import { ingestImage } from './media.js';

/** Contenu par défaut du « mot du promoteur » (modifiable depuis l'admin : Textes & réglages › Accueil). */
export const ORGANIZER_DEFAULTS = {
  organizer_kicker_fr: 'Le mot du promoteur',
  organizer_kicker_en: 'A word from the promoter',
  organizer_name: 'Le promoteur',
  organizer_role_fr: 'Fondateur & promoteur du Guinée Fashion Festival',
  organizer_role_en: 'Founder & promoter of the Guinée Fashion Festival',
  organizer_message_fr: [
    'Bienvenue au Guinée Fashion Festival.',
    'Ce rendez-vous est né d’une conviction : la mode et l’artisanat guinéens méritent une scène à la hauteur de leur talent. Chaque année, nous réunissons créateurs, artisans, mannequins et professionnels pour célébrer un savoir-faire qui traverse les générations et s’invente un avenir.',
    'Merci à celles et ceux qui nous accompagnent, et à vous qui venez nous rejoindre. Je vous donne rendez-vous à Conakry.',
  ].join('\n'),
  organizer_message_en: [
    'Welcome to the Guinée Fashion Festival.',
    'This event was born from a conviction: Guinean fashion and craftsmanship deserve a stage worthy of their talent. Every year we bring together designers, artisans, models and professionals to celebrate a know-how that spans generations and is inventing its future.',
    'Thank you to everyone who supports us, and to you for joining us. See you in Conakry.',
  ].join('\n'),
  organizer_photo_id: null,
};

// anciens textes par défaut (« organisatrice ») : s'ils sont encore en base, ils sont remplacés par les nouveaux
const LEGACY = {
  organizer_kicker_fr: ['Le mot de l’organisatrice'], organizer_kicker_en: ['A word from the organiser'],
  organizer_name: ['L’organisatrice'],
  organizer_role_fr: ['Fondatrice & organisatrice du Guinée Fashion Festival'], organizer_role_en: ['Founder & organiser of the Guinée Fashion Festival'],
};

/** Complète les réglages « home » avec les valeurs par défaut (sans écraser ce que l'admin a saisi). */
export function withHomeDefaults(home = {}) {
  const out = { ...home };
  for (const [k, v] of Object.entries(ORGANIZER_DEFAULTS)) {
    if (out[k] === undefined || out[k] === null || out[k] === '' || LEGACY[k]?.includes(out[k])) out[k] = v;
  }
  return out;
}

const SAMPLE_PRESS = [
  { outlet: 'Média partenaire (exemple)', published_at: '2026-10-19',
    title_fr: 'Conakry : le Guinée Fashion Festival célèbre la mode et l’artisanat locaux',
    title_en: 'Conakry: the Guinée Fashion Festival celebrates local fashion and craftsmanship',
    excerpt_fr: 'Quatre jours de défilés, d’exposition-vente et de rencontres professionnelles au Chapiteau By Issa.',
    excerpt_en: 'Four days of shows, exhibition-sales and business meetings at the Chapiteau By Issa.' },
  { outlet: 'Journal en ligne (exemple)', published_at: '2026-10-16',
    title_fr: 'Les créateurs guinéens à l’honneur lors du défilé international',
    title_en: 'Guinean designers in the spotlight at the international show',
    excerpt_fr: 'Indigo, cuir, vannerie : une génération de créateurs impose son style sur le podium.',
    excerpt_en: 'Indigo, leather, basketry: a new generation of designers imposes its style on the runway.' },
  { outlet: 'Magazine mode (exemple)', published_at: '2026-10-12',
    title_fr: 'Rencontres B to B : la mode guinéenne s’ouvre à l’international',
    title_en: 'B to B meetings: Guinean fashion opens up to the world',
    excerpt_fr: 'Acheteurs, créateurs et institutions se retrouvent pour construire des partenariats durables.',
    excerpt_en: 'Buyers, designers and institutions meet to build lasting partnerships.' },
];

/* ---------- Logos de partenaires livrés avec le site (public/partners/) ---------- */
const BUNDLED_PARTNERS = [
  { name: 'Platinum Dakar', file: 'platinum-dakar.webp', aliases: ['platinum'] },
  { name: 'By Issa', file: 'by-issa.webp', aliases: ['byissa'] },
  { name: 'NCI', file: 'nci.webp', aliases: [] },
  { name: 'ONFPP', file: 'onfpp.webp', aliases: [] },
  { name: 'KPAAF', file: 'kpaaf.webp', aliases: [] },
  { name: 'Avenue Group', file: 'avenue-group.webp', aliases: ['avenue'] },
  { name: 'Upstairs Lounge', file: 'upstairs-lounge.webp', aliases: ['upstairs'] },
  { name: 'Noom Hotel Conakry', file: 'noom-hotel-conakry.webp', aliases: ['noom', 'noomhotel'] },
];
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');

/** Fusionne les partenaires en base avec les logos livrés : logos d'abord, les autres partenaires conservés après. */
export function mergeBundledPartners(list = []) {
  const rest = [...list]; const out = [];
  for (const b of BUNDLED_PARTNERS) {
    const keys = [norm(b.name), ...b.aliases.map(norm)];
    const i = rest.findIndex(p => keys.includes(norm(p.name)));
    const existing = i >= 0 ? rest.splice(i, 1)[0] : null;
    out.push({ url: '', logo_id: null, ...(existing || {}), name: b.name, ...(existing?.logo_id ? {} : { static_logo: b.file }) });
  }
  return [...out, ...rest];
}

/** Logo « intégré » d'un partenaire (fichier de public/partners/), au même format qu'un média. */
export function staticLogo(file) {
  if (!file) return null;
  const f = `/partners/${String(file).replace(/[^a-zA-Z0-9._-]/g, '')}`;
  return { id: null, kind: 'image', src: f, mid: f, thumb: f };
}

/** Insère des articles d'exemple une seule fois (si l'admin les supprime, ils ne reviennent pas). */
export function ensureDefaults() {
  // une seule fois : rattache les logos livrés aux partenaires existants (après, l'admin garde la main)
  if (!getSetting('partners_logos_v1', false)) {
    setSetting('partners', mergeBundledPartners(getSetting('partners', [])));
    setSetting('partners_logos_v1', true);
  }
  if (getSetting('press_samples_done', false)) return;
  const n = db.prepare('SELECT COUNT(*) n FROM press').get().n;
  if (!n) {
    const ins = db.prepare(`INSERT INTO press(slug,title_fr,title_en,outlet,url,published_at,excerpt_fr,excerpt_en,status) VALUES(?,?,?,?,?,?,?,?,'published')`);
    for (const a of SAMPLE_PRESS) ins.run(slugify(a.title_fr), a.title_fr, a.title_en, a.outlet, '', a.published_at, a.excerpt_fr, a.excerpt_en);
  }
  setSetting('press_samples_done', true);
}

/** Une seule fois : importe les images du hero livrées avec le site (seed-assets/hero) dans la médiathèque et les met en diaporama. */
export async function ensureHeroSlides() {
  if (getSetting('hero_slides_v1', false)) return;
  const dir = path.join(ROOT, 'seed-assets', 'hero');
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir).filter(f => /\.(jpe?g|png|webp)$/i.test(f)).sort();
  const ids = [];
  for (const f of files) {
    const m = await ingestImage(fs.readFileSync(path.join(dir, f)), f, { alt_fr: 'Défilé du Guinée Fashion Festival', alt_en: 'Guinée Fashion Festival runway show' });
    ids.push(m.id);
  }
  if (ids.length) {
    const home = getSetting('home', {}) || {};
    setSetting('home', { ...home, hero_images: ids, hero_interval: home.hero_interval || 6 });
  }
  setSetting('hero_slides_v1', true);
}
