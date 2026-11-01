/* Contenu initial : node server/seed.js [--reset] */
import fs from 'node:fs';
import path from 'node:path';
import { DATA_DIR, ROOT, DB_FILE } from './config.js';

export async function seed({ reset = false, force = false } = {}) {
  if (reset) {
    for (const f of [DB_FILE, `${DB_FILE}-wal`, `${DB_FILE}-shm`]) { try { fs.rmSync(f); } catch { /* */ } }
    fs.rmSync(path.join(DATA_DIR, 'uploads'), { recursive: true, force: true });
    fs.mkdirSync(path.join(DATA_DIR, 'uploads'), { recursive: true });
  }

  const { db, setSetting } = await import('./db.js');
  const { ensureAdmin } = await import('./auth.js');
  const { ingestImage } = await import('./media.js');

  ensureAdmin();

  if (db.prepare('SELECT COUNT(*) n FROM events').get().n && !force) {
    console.log('Base déjà remplie — rien à faire (utilisez --reset pour repartir de zéro).');
    return;
  }

/* ---------- Photos ---------- */
const PHOTO_DIR = path.join(ROOT, 'seed-assets/photos');
const alts = {
  'runway-indigo-mini': ['Mannequin en robe indigo volumineuse sur le podium', 'Model in a voluminous indigo dress on the runway'],
  'runway-perles-cuir': ['Silhouette cuir et colliers de perles', 'Leather silhouette with layered pearl necklaces'],
  'runway-carreaux-chapeau': ['Ensemble à carreaux, chapeau et cabas assortis', 'Checked suit with matching hat and tote'],
  'runway-homme-tie-dye': ['Ensemble homme teint à la main', 'Hand-dyed menswear look'],
  'runway-kaftan-noir': ['Kaftan noir brodé', 'Embroidered black kaftan'],
  'runway-panier-terracotta': ['Robe terracotta et panier tressé en coiffe', 'Terracotta dress with a woven basket headpiece'],
  'runway-volume-noir': ['Manteau noir sculptural', 'Sculptural black coat'],
  'expo-maroquinerie': ['Stand de maroquinerie au village des créateurs', 'Leather goods stand at the designers village'],
  'expo-stand-createurs': ['Créatrices sur leur stand', 'Designers at their stand'],
  'expo-visiteuse': ['Visiteuse au village exposition & vente', 'Visitor at the exhibition & sale village'],
  'expo-affiche-programme': ['Invitées devant l’affiche du programme 2026', 'Guests in front of the 2026 programme banner'],
  'portrait-indigo-invitee': ['Invitée en grand boubou indigo', 'Guest in an indigo grand boubou'],
};
const M = {};
for (const file of fs.readdirSync(PHOTO_DIR).sort()) {
  const key = path.parse(file).name;
  const [fr, en] = alts[key] || [];
  M[key] = await ingestImage(fs.readFileSync(path.join(PHOTO_DIR, file)), file, { alt_fr: fr, alt_en: en });
  process.stdout.write(`  ✓ ${file}\n`);
}

/* ---------- Réglages & textes ---------- */
setSetting('general', {
  site_title: 'Guinée Fashion Festival — Mode & Artisanat',
  seo_description: 'Le Guinée Fashion Festival célèbre la mode et l’artisanat guinéens : défilés, exposition-vente, rencontres B to B et formations à Conakry.',
  tagline_fr: 'Mode & Artisanat', tagline_en: 'Fashion & Craftsmanship',
  announcement_fr: 'Les castings de la prochaine édition sont ouverts — postulez en ligne',
  announcement_en: 'Castings for the next edition are open — apply online',
  announcement_link: '/candidatures',
});

setSetting('home', {
  hero_kicker_fr: 'Conakry · Guinée', hero_kicker_en: 'Conakry · Guinea',
  hero_text_fr: 'Le podium où la création guinéenne rencontre le monde. Défilés, artisanat, rencontres professionnelles : quatre jours pour faire rayonner la mode d’ici.',
  hero_text_en: 'The runway where Guinean creativity meets the world. Shows, craftsmanship and business meetings: four days to put local fashion in the spotlight.',
  manifesto_fr: 'Nous croyons que le pagne tissé, l’indigo, le cuir travaillé et le geste de l’artisan sont des langages contemporains. Le festival leur offre une scène.',
  manifesto_en: 'We believe that woven cloth, indigo, crafted leather and the artisan’s hand are contemporary languages. The festival gives them a stage.',
  hero_images: [M['runway-indigo-mini'].id, M['runway-panier-terracotta'].id, M['runway-perles-cuir'].id, M['runway-kaftan-noir'].id, M['runway-homme-tie-dye'].id].filter(Boolean),
  looks: ['runway-indigo-mini', 'runway-perles-cuir', 'runway-carreaux-chapeau', 'runway-homme-tie-dye', 'runway-kaftan-noir', 'runway-panier-terracotta', 'runway-volume-noir'].map(k => M[k]?.id).filter(Boolean),
});

setSetting('about', {
  title_fr: 'Une scène pour la mode et l’artisanat guinéens',
  title_en: 'A stage for Guinean fashion and craftsmanship',
  intro_fr: 'Le Guinée Fashion Festival réunit créateurs, artisans, mannequins, acheteurs et partenaires autour d’un même objectif : valoriser le savoir-faire guinéen et lui ouvrir de nouveaux marchés.',
  intro_en: 'Guinée Fashion Festival brings together designers, artisans, models, buyers and partners around one goal: to showcase Guinean know-how and open new markets for it.',
  body_fr: 'Pendant quatre jours, le festival transforme Conakry en capitale de la mode : défilés de créateurs nationaux et internationaux, village d’exposition et de vente, rencontres B to B entre professionnels, formations pour les jeunes talents et découverte du patrimoine guinéen.\n\nChaque édition met en lumière les matières et les techniques locales — teinture à l’indigo, tissage, maroquinerie, vannerie — et les fait dialoguer avec une écriture contemporaine.',
  body_en: 'For four days, the festival turns Conakry into a fashion capital: runway shows by national and international designers, an exhibition and sales village, B2B meetings between professionals, training for young talent and a discovery of Guinean heritage.\n\nEach edition highlights local materials and techniques — indigo dyeing, weaving, leatherwork, basketry — and sets them in dialogue with a contemporary vision.',
  image_id: M['portrait-indigo-invitee']?.id,
  image2_id: M['expo-stand-createurs']?.id,
});

setSetting('stats', [
  { value: '4', label_fr: 'jours de festival', label_en: 'festival days' },
  { value: '7', label_fr: 'temps forts au programme', label_en: 'programme highlights' },
  { value: '15+', label_fr: 'partenaires engagés', label_en: 'committed partners' },
  { value: '1', label_fr: 'défilé international', label_en: 'international show' },
]);

setSetting('pillars', [
  { title_fr: 'Conférence de presse', title_en: 'Press conference', text_fr: 'Lancement officiel de l’édition, présentation des créateurs et des partenaires.', text_en: 'Official launch of the edition, introducing designers and partners.', image_id: M['expo-affiche-programme']?.id },
  { title_fr: 'Rencontres B to B', title_en: 'B2B meetings', text_fr: 'Créateurs, artisans, acheteurs et investisseurs se rencontrent pour bâtir des collaborations.', text_en: 'Designers, artisans, buyers and investors meet to build partnerships.', image_id: M['expo-stand-createurs']?.id },
  { title_fr: 'Visite touristique', title_en: 'Sightseeing tour', text_fr: 'Découverte des sites et du patrimoine guinéens pour les invités du festival.', text_en: 'Discovering Guinean sites and heritage with festival guests.', image_id: M['portrait-indigo-invitee']?.id },
  { title_fr: 'Exposition & vente', title_en: 'Exhibition & sale', text_fr: 'Le village des créateurs : mode, maroquinerie, accessoires et artisanat à acheter sur place.', text_en: 'The designers village: fashion, leather goods, accessories and crafts to buy on site.', image_id: M['expo-maroquinerie']?.id },
  { title_fr: 'Formation', title_en: 'Training', text_fr: 'Ateliers et masterclass pour les jeunes talents de la mode et de l’artisanat.', text_en: 'Workshops and masterclasses for young fashion and craft talent.', image_id: M['expo-visiteuse']?.id },
  { title_fr: 'Défilé international', title_en: 'International show', text_fr: 'Les collections de créateurs guinéens et invités sur le grand podium.', text_en: 'Collections by Guinean and guest designers on the main runway.', image_id: M['runway-perles-cuir']?.id },
  { title_fr: 'Défilé de clôture', title_en: 'Closing show', text_fr: 'Une soirée finale pour célébrer l’édition et ses talents.', text_en: 'A final evening celebrating the edition and its talents.', image_id: M['runway-volume-noir']?.id },
]);

setSetting('partners', ['Simandou 2040', 'ONFPP', 'KPAAF', 'By Issa', 'Madina', 'Kaira by Amalya & Niby', 'Avenue Group', 'VoxAfrica', 'Upstairs', 'IBM Soul', 'Bugis'].map(name => ({ name, url: '', logo_id: null })));

setSetting('contact', {
  phone: '+224 622 83 83 53', email: 'contact@guineefashionfestival.com',
  address_fr: 'Conakry, République de Guinée', address_en: 'Conakry, Republic of Guinea',
  venue: 'Chapiteau By Issa',
  hours_fr: 'Du lundi au vendredi, 9 h – 18 h', hours_en: 'Monday to Friday, 9am – 6pm',
});
setSetting('socials', { instagram: '', facebook: '', tiktok: '', youtube: '', linkedin: '' });

/* ---------- Événements ---------- */
const insEvent = db.prepare(`INSERT INTO events(slug,title_fr,title_en,subtitle_fr,subtitle_en,excerpt_fr,excerpt_en,body_fr,body_en,start_date,end_date,venue,city,address,cover_id,programme,status,featured)
  VALUES(@slug,@title_fr,@title_en,@subtitle_fr,@subtitle_en,@excerpt_fr,@excerpt_en,@body_fr,@body_en,@start_date,@end_date,@venue,@city,@address,@cover_id,@programme,@status,@featured)`);

const programme2026 = [
  ['Conférence de presse', 'Press conference'], ['Rencontres B to B', 'B2B meetings'], ['Visite touristique', 'Sightseeing tour'],
  ['Exposition & vente', 'Exhibition & sale'], ['Formation', 'Training'], ['Défilé international', 'International show'], ['Défilé de clôture', 'Closing show'],
].map(([fr, en]) => ({ day: '', time: '', title_fr: fr, title_en: en, desc_fr: '', desc_en: '' }));

const ev2026 = insEvent.run({
  slug: 'guinee-fashion-festival-2026', title_fr: 'Guinée Fashion Festival 2026', title_en: 'Guinée Fashion Festival 2026',
  subtitle_fr: 'Mode & Artisanat', subtitle_en: 'Fashion & Craftsmanship',
  excerpt_fr: 'Quatre jours de défilés, d’exposition-vente, de rencontres professionnelles et de formations au Chapiteau By Issa.',
  excerpt_en: 'Four days of runway shows, exhibition & sale, business meetings and training at Chapiteau By Issa.',
  body_fr: 'L’édition 2026 a réuni créateurs, artisans, mannequins et partenaires du 15 au 18 octobre à Conakry. Au programme : conférence de presse, rencontres B to B, visite touristique, exposition & vente, formation, défilé international et défilé de clôture.',
  body_en: 'The 2026 edition brought designers, artisans, models and partners together in Conakry from 15 to 18 October. On the programme: press conference, B2B meetings, sightseeing tour, exhibition & sale, training, international show and closing show.',
  start_date: '2026-10-15', end_date: '2026-10-18', venue: 'Chapiteau By Issa', city: 'Conakry', address: '',
  cover_id: M['runway-indigo-mini']?.id, programme: JSON.stringify(programme2026), status: 'published', featured: 0,
}).lastInsertRowid;

const programme2027 = [
  { day: 'Jour 1', time: '10:00', title_fr: 'Conférence de presse & ouverture', title_en: 'Press conference & opening', desc_fr: 'Présentation des créateurs sélectionnés.', desc_en: 'Introducing the selected designers.' },
  { day: 'Jour 1', time: '15:00', title_fr: 'Ouverture du village des créateurs', title_en: 'Designers village opens', desc_fr: 'Exposition & vente.', desc_en: 'Exhibition & sale.' },
  { day: 'Jour 2', time: '09:30', title_fr: 'Rencontres B to B', title_en: 'B2B meetings', desc_fr: 'Créateurs, acheteurs, investisseurs.', desc_en: 'Designers, buyers, investors.' },
  { day: 'Jour 2', time: '14:00', title_fr: 'Masterclass & formations', title_en: 'Masterclasses & training', desc_fr: 'Stylisme, couture, photo de mode.', desc_en: 'Styling, tailoring, fashion photography.' },
  { day: 'Jour 3', time: '10:00', title_fr: 'Visite touristique', title_en: 'Sightseeing tour', desc_fr: '', desc_en: '' },
  { day: 'Jour 3', time: '20:00', title_fr: 'Défilé international', title_en: 'International show', desc_fr: 'Le grand podium.', desc_en: 'The main runway.' },
  { day: 'Jour 4', time: '20:30', title_fr: 'Défilé de clôture', title_en: 'Closing show', desc_fr: 'Soirée finale.', desc_en: 'Final night.' },
];
const ev2027 = insEvent.run({
  slug: 'guinee-fashion-festival-2027', title_fr: 'Guinée Fashion Festival 2027', title_en: 'Guinée Fashion Festival 2027',
  subtitle_fr: 'La prochaine édition', subtitle_en: 'The next edition',
  excerpt_fr: 'Créateurs, mannequins, artisans : la prochaine édition se prépare. Castings et inscriptions exposants ouverts.',
  excerpt_en: 'Designers, models, artisans: the next edition is coming. Castings and exhibitor applications are open.',
  body_fr: 'Après le succès de l’édition 2026, le Guinée Fashion Festival revient avec un podium plus grand, un village des créateurs élargi et davantage de rencontres professionnelles.\n\nLes appels à candidature (mannequins, créateurs-exposants, bénévoles, équipes beauté et image) sont ouverts : rejoignez l’aventure.',
  body_en: 'After the success of the 2026 edition, Guinée Fashion Festival returns with a bigger runway, an expanded designers village and more business meetings.\n\nApplications are open for models, designer-exhibitors, volunteers, beauty and image teams: join us.',
  start_date: '2027-10-14', end_date: '2027-10-17', venue: 'Chapiteau By Issa', city: 'Conakry', address: '',
  cover_id: M['runway-panier-terracotta']?.id, programme: JSON.stringify(programme2027), status: 'published', featured: 1,
}).lastInsertRowid;

/* ---------- Projets de la galerie ---------- */
const insProject = db.prepare(`INSERT INTO projects(slug,title_fr,title_en,description_fr,description_en,category,year,event_id,cover_id,credits,status,sort)
  VALUES(?,?,?,?,?,?,?,?,?,?,?,?)`);
const insPM = db.prepare('INSERT INTO project_media(project_id,media_id,caption_fr,caption_en,sort) VALUES(?,?,?,?,?)');
function project(slug, fr, en, dfr, den, cat, cover, keys, sort) {
  const id = insProject.run(slug, fr, en, dfr, den, cat, 2026, ev2026, M[cover]?.id, '', 'published', sort).lastInsertRowid;
  keys.forEach((k, i) => M[k] && insPM.run(id, M[k].id, `Look ${String(i + 1).padStart(2, '0')}`, `Look ${String(i + 1).padStart(2, '0')}`, i));
}
project('defile-international-2026', 'Défilé international', 'International show',
  'Le grand podium de l’édition 2026 : silhouettes indigo, cuir, volumes sculpturaux et pièces d’artisanat portées comme des manifestes.',
  'The main runway of the 2026 edition: indigo silhouettes, leather, sculptural volumes and craft pieces worn as statements.',
  'defile', 'runway-perles-cuir',
  ['runway-indigo-mini', 'runway-perles-cuir', 'runway-carreaux-chapeau', 'runway-homme-tie-dye', 'runway-kaftan-noir', 'runway-panier-terracotta', 'runway-volume-noir'], 0);
project('village-des-createurs-2026', 'Village des créateurs', 'Designers village',
  'Exposition & vente : maroquinerie, prêt-à-porter, accessoires et artisanat sous le chapiteau.',
  'Exhibition & sale: leather goods, ready-to-wear, accessories and crafts under the big top.',
  'exposition', 'expo-stand-createurs', ['expo-stand-createurs', 'expo-maroquinerie', 'expo-visiteuse', 'expo-affiche-programme'], 1);
project('invites-street-style-2026', 'Invités & street style', 'Guests & street style',
  'Les silhouettes du public et des invités : la mode se joue aussi hors du podium.',
  'Looks from the audience and guests: fashion happens off the runway too.',
  'portrait', 'portrait-indigo-invitee', ['portrait-indigo-invitee', 'expo-affiche-programme'], 2);
// légendes plus parlantes pour les projets hors défilé
db.prepare(`UPDATE project_media SET caption_fr=NULL, caption_en=NULL WHERE project_id IN (SELECT id FROM projects WHERE category<>'defile')`).run();

/* ---------- Appels à candidature ---------- */
const insCall = db.prepare(`INSERT INTO calls(slug,title_fr,title_en,role_type,event_id,location,engagement_fr,engagement_en,deadline,summary_fr,summary_en,description_fr,description_en,missions_fr,missions_en,profile_fr,profile_en,benefits_fr,benefits_en,require_photos,require_cv,questions,cover_id,status)
  VALUES(@slug,@title_fr,@title_en,@role_type,@event_id,@location,@engagement_fr,@engagement_en,@deadline,@summary_fr,@summary_en,@description_fr,@description_en,@missions_fr,@missions_en,@profile_fr,@profile_en,@benefits_fr,@benefits_en,@require_photos,@require_cv,@questions,@cover_id,@status)`);
const base = { event_id: ev2027, location: 'Conakry', status: 'open', require_cv: 0, require_photos: 0, questions: '[]' };

insCall.run({ ...base, slug: 'casting-mannequins-2027', title_fr: 'Casting mannequins', title_en: 'Model casting', role_type: 'mannequin',
  engagement_fr: 'Rémunéré', engagement_en: 'Paid', deadline: '2027-06-30', cover_id: M['runway-indigo-mini']?.id, require_photos: 1,
  summary_fr: 'Femmes et hommes, débutants ou confirmés : défilez pour les créateurs de la prochaine édition.',
  summary_en: 'Women and men, new faces or experienced: walk for the designers of the next edition.',
  description_fr: 'Le Guinée Fashion Festival recherche des mannequins pour le défilé international et le défilé de clôture. Les candidats retenus seront convoqués à un casting physique à Conakry, puis aux essayages et répétitions.',
  description_en: 'Guinée Fashion Festival is looking for models for the international show and the closing show. Shortlisted applicants will be invited to an in-person casting in Conakry, followed by fittings and rehearsals.',
  missions_fr: 'Participer au casting physique et aux essayages\nAssister aux répétitions générales\nDéfiler pour plusieurs créateurs\nParticiper aux shootings officiels du festival',
  missions_en: 'Attend the in-person casting and fittings\nAttend dress rehearsals\nWalk for several designers\nTake part in official festival photo shoots',
  profile_fr: 'Âge minimum : 18 ans\nFemmes : 1,72 m minimum — Hommes : 1,82 m minimum (indicatif)\nDisponible pendant toute la durée du festival\nPonctuel·le, professionnel·le, à l’aise devant le public',
  profile_en: 'Minimum age: 18\nWomen: 1.72 m min — Men: 1.82 m min (indicative)\nAvailable for the whole festival\nPunctual, professional, comfortable in front of an audience',
  benefits_fr: 'Cachet par défilé\nVisibilité auprès des créateurs et de la presse\nPhotos professionnelles pour votre book',
  benefits_en: 'Fee per show\nExposure to designers and press\nProfessional photos for your book',
  questions: JSON.stringify([
    { id: 'taille', label_fr: 'Taille (cm)', label_en: 'Height (cm)', type: 'text', required: true },
    { id: 'mensurations', label_fr: 'Mensurations (poitrine / taille / hanches)', label_en: 'Measurements (bust / waist / hips)', type: 'text', required: false },
    { id: 'experience', label_fr: 'Expérience de défilé', label_en: 'Runway experience', type: 'select', required: true, options_fr: 'Aucune\nQuelques défilés\nProfessionnelle', options_en: 'None\nA few shows\nProfessional' },
  ]),
});

insCall.run({ ...base, slug: 'createurs-exposants-2027', title_fr: 'Créateurs & exposants', title_en: 'Designers & exhibitors', role_type: 'createur',
  engagement_fr: 'Sélection sur dossier', engagement_en: 'Portfolio selection', deadline: '2027-05-31', cover_id: M['expo-maroquinerie']?.id, require_photos: 1, require_cv: 1,
  summary_fr: 'Stylistes, couturiers, maroquiniers, artisans : présentez votre collection sur le podium ou exposez au village des créateurs.',
  summary_en: 'Designers, tailors, leather craftsmen, artisans: show your collection on the runway or exhibit at the designers village.',
  description_fr: 'Deux formats sont proposés : un passage au défilé (collection de 8 à 12 silhouettes) et/ou un stand au village exposition & vente. La sélection est faite par le comité artistique du festival.',
  description_en: 'Two formats are available: a runway slot (collection of 8 to 12 looks) and/or a stand at the exhibition & sale village. Selection is made by the festival’s artistic committee.',
  missions_fr: 'Présenter une collection cohérente et originale\nAssurer les essayages avec les mannequins\nTenir votre stand pendant l’exposition-vente\nParticiper aux rencontres B to B',
  missions_en: 'Present a coherent, original collection\nRun fittings with the models\nStaff your stand during the exhibition & sale\nTake part in the B2B meetings',
  profile_fr: 'Marque ou atelier basé en Guinée ou dans la diaspora\nCollection disponible avant le festival\nUtilisation de matières ou savoir-faire locaux appréciée',
  profile_en: 'Brand or workshop based in Guinea or in the diaspora\nCollection ready before the festival\nUse of local materials or techniques is a plus',
  benefits_fr: 'Visibilité presse et réseaux sociaux\nAccès aux acheteurs et partenaires\nPhotos et vidéos professionnelles de votre passage',
  benefits_en: 'Press and social media exposure\nAccess to buyers and partners\nProfessional photos and video of your show',
  questions: JSON.stringify([
    { id: 'marque', label_fr: 'Nom de la marque / de l’atelier', label_en: 'Brand / workshop name', type: 'text', required: true },
    { id: 'format', label_fr: 'Format souhaité', label_en: 'Preferred format', type: 'select', required: true, options_fr: 'Défilé\nStand exposition-vente\nLes deux', options_en: 'Runway\nExhibition stand\nBoth' },
    { id: 'collection', label_fr: 'Décrivez votre collection', label_en: 'Describe your collection', type: 'textarea', required: true },
  ]),
});

insCall.run({ ...base, slug: 'benevoles-2027', title_fr: 'Bénévoles du festival', title_en: 'Festival volunteers', role_type: 'benevole',
  engagement_fr: 'Bénévolat', engagement_en: 'Volunteer', deadline: '2027-08-31', cover_id: M['expo-visiteuse']?.id,
  summary_fr: 'Accueil, backstage, logistique, presse : vivez le festival de l’intérieur.',
  summary_en: 'Welcome desk, backstage, logistics, press: experience the festival from the inside.',
  description_fr: 'Rejoignez l’équipe qui fait vivre le festival. Chaque bénévole est affecté à un pôle selon ses envies et ses compétences, avec un briefing avant l’événement.',
  description_en: 'Join the team that brings the festival to life. Each volunteer is assigned to a team based on their interests and skills, with a briefing before the event.',
  missions_fr: 'Accueil et orientation du public et des invités\nAssistance backstage (habillage, coordination des passages)\nAppui logistique et installation\nAppui à l’équipe communication',
  missions_en: 'Welcoming and guiding the public and guests\nBackstage assistance (dressing, show coordination)\nLogistics and set-up support\nSupport for the communication team',
  profile_fr: 'Dynamique, souriant·e, esprit d’équipe\nDisponible au moins 2 jours sur 4\nLe français est indispensable, l’anglais est un plus',
  profile_en: 'Energetic, friendly, team player\nAvailable at least 2 days out of 4\nFrench required, English is a plus',
  benefits_fr: 'Tenue officielle du festival\nRepas pendant les journées de mission\nAttestation de bénévolat',
  benefits_en: 'Official festival outfit\nMeals on volunteer days\nVolunteer certificate',
  questions: JSON.stringify([
    { id: 'pole', label_fr: 'Pôle souhaité', label_en: 'Preferred team', type: 'select', required: true, options_fr: 'Accueil\nBackstage\nLogistique\nCommunication', options_en: 'Welcome\nBackstage\nLogistics\nCommunication' },
    { id: 'dispo', label_fr: 'Vos disponibilités', label_en: 'Your availability', type: 'text', required: true },
  ]),
});

insCall.run({ ...base, slug: 'photographes-videastes-2027', title_fr: 'Photographes & vidéastes', title_en: 'Photographers & videographers', role_type: 'photo',
  engagement_fr: 'Prestation', engagement_en: 'Freelance', deadline: '2027-07-31', cover_id: M['runway-volume-noir']?.id, require_photos: 1,
  summary_fr: 'Couvrez les défilés, le backstage et le village des créateurs pour les canaux officiels du festival.',
  summary_en: 'Cover the shows, backstage and designers village for the festival’s official channels.',
  description_fr: 'Nous constituons l’équipe image officielle : photo podium, backstage, portraits, vidéo récap et contenus courts pour les réseaux sociaux.',
  description_en: 'We are building the official image team: runway photography, backstage, portraits, recap video and short-form social content.',
  missions_fr: 'Couverture photo/vidéo selon un planning défini\nLivraison d’une sélection retouchée sous 48 h\nProduction de contenus courts (reels)',
  missions_en: 'Photo/video coverage on a set schedule\nDeliver an edited selection within 48 hours\nProduce short-form content (reels)',
  profile_fr: 'Portfolio mode ou événementiel\nMatériel professionnel\nRéactivité et sens du détail',
  profile_en: 'Fashion or event portfolio\nProfessional equipment\nResponsive with an eye for detail',
  benefits_fr: 'Accréditation tous accès\nCrédit photo sur les publications officielles',
  benefits_en: 'All-access accreditation\nPhoto credit on official publications',
  questions: JSON.stringify([{ id: 'specialite', label_fr: 'Spécialité', label_en: 'Speciality', type: 'select', required: true, options_fr: 'Photo\nVidéo\nPhoto & vidéo', options_en: 'Photo\nVideo\nPhoto & video' }]),
});

insCall.run({ ...base, slug: 'maquillage-coiffure-2027', title_fr: 'Maquilleurs & coiffeurs', title_en: 'Make-up artists & hairstylists', role_type: 'beaute',
  engagement_fr: 'Rémunéré', engagement_en: 'Paid', deadline: '2027-07-31', cover_id: M['runway-kaftan-noir']?.id, require_photos: 1,
  summary_fr: 'Rejoignez l’équipe beauté du backstage et signez les looks des défilés.',
  summary_en: 'Join the backstage beauty team and create the looks for the shows.',
  description_fr: 'Sous la direction d’un·e directeur·rice beauté, l’équipe réalise maquillages et coiffures des mannequins pour chaque passage.',
  description_en: 'Led by a beauty director, the team creates the models’ make-up and hair for every show.',
  missions_fr: 'Réaliser les looks validés par les créateurs\nTravailler en rythme backstage\nAssurer les retouches entre les passages',
  missions_en: 'Create the looks approved by designers\nWork at backstage pace\nHandle touch-ups between shows',
  profile_fr: 'Expérience en maquillage ou coiffure (événementiel, shooting, mariage…)\nTrousse professionnelle\nRapidité et précision',
  profile_en: 'Experience in make-up or hair (events, shoots, weddings…)\nProfessional kit\nFast and precise',
  benefits_fr: 'Rémunération journalière\nVisibilité et crédit sur les réseaux officiels',
  benefits_en: 'Daily fee\nExposure and credit on official channels',
});

  console.log('✓ Contenu initial importé');
}

if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seed({
    reset: process.argv.includes('--reset'),
    force: process.argv.includes('--force'),
  }).then(() => process.exit(0)).catch(err => {
    console.error(err);
    process.exit(1);
  });
}
