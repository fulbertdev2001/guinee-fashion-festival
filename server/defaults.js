import { db, getSetting, setSetting, slugify } from './db.js';

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

/** Insère des articles d'exemple une seule fois (si l'admin les supprime, ils ne reviennent pas). */
export function ensureDefaults() {
  if (getSetting('press_samples_done', false)) return;
  const n = db.prepare('SELECT COUNT(*) n FROM press').get().n;
  if (!n) {
    const ins = db.prepare(`INSERT INTO press(slug,title_fr,title_en,outlet,url,published_at,excerpt_fr,excerpt_en,status) VALUES(?,?,?,?,?,?,?,?,'published')`);
    for (const a of SAMPLE_PRESS) ins.run(slugify(a.title_fr), a.title_fr, a.title_en, a.outlet, '', a.published_at, a.excerpt_fr, a.excerpt_en);
  }
  setSetting('press_samples_done', true);
}
