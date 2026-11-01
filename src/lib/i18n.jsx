import { createContext, useContext, useEffect, useState, useCallback } from 'react';

const dict = {
  fr: {
    'nav.home': 'Accueil', 'nav.festival': 'Le Festival', 'nav.events': 'Événements', 'nav.gallery': 'Galerie',
    'nav.calls': 'Candidatures', 'nav.contact': 'Contact', 'nav.menu': 'Menu', 'nav.close': 'Fermer',
    'cta.apply': 'Postuler', 'cta.discover': 'Découvrir', 'cta.seeAll': 'Tout voir', 'cta.program': 'Voir le programme',
    'cta.gallery': 'Entrer dans la galerie', 'cta.calls': 'Voir les annonces', 'cta.back': 'Retour', 'cta.view': 'Voir',
    'cta.play': 'Lire', 'cta.drag': 'Glisser', 'cta.tickets': 'Billetterie', 'cta.send': 'Envoyer', 'cta.subscribe': "S'inscrire",
    'home.next': 'Prochaine édition', 'home.countdown': 'Lever de rideau dans', 'home.looks': 'Le défilé',
    'home.looksSub': 'Les silhouettes de la dernière édition, look après look.',
    'home.programme': 'Au programme', 'home.galleryTitle': 'Galerie', 'home.gallerySub': 'Défilés, coulisses, village des créateurs : chaque projet raconte une édition.',
    'home.callsTitle': 'Castings & candidatures', 'home.callsSub': 'Mannequins, créateurs, bénévoles, équipes image et beauté : le festival recrute.',
    'home.partners': 'Ils nous accompagnent', 'home.upcoming': 'À venir',
    'cd.days': 'Jours', 'cd.hours': 'Heures', 'cd.min': 'Min', 'cd.sec': 'Sec', 'cd.live': 'En ce moment', 'cd.done': 'Terminé',
    'ev.upcoming': 'À venir', 'ev.past': 'Éditions passées', 'ev.title': 'Événements', 'ev.lead': 'Annonces, dates et programmes des rendez-vous du Guinée Fashion Festival.',
    'ev.none': 'Aucun événement annoncé pour le moment — revenez bientôt.', 'ev.where': 'Lieu', 'ev.when': 'Dates',
    'ev.programme': 'Programme', 'ev.calls': 'Candidatures liées', 'ev.gallery': 'En images', 'ev.addCal': 'Ajouter au calendrier',
    'gal.title': 'Galerie', 'gal.lead': 'Photos et vidéos classées par projet. Choisissez un projet et laissez défiler.',
    'gal.all': 'Tout', 'gal.photos': 'photos', 'gal.videos': 'vidéos', 'gal.next': 'Projet suivant', 'gal.empty': 'Aucun média dans ce projet pour le moment.',
    'gal.view.grid': 'Mosaïque', 'gal.view.film': 'Pellicule',
    'cat.defile': 'Défilé', 'cat.exposition': 'Exposition', 'cat.backstage': 'Coulisses', 'cat.portrait': 'Portraits', 'cat.campagne': 'Campagne', 'cat.video': 'Vidéo', 'cat.autre': 'Autre',
    'calls.title': 'Candidatures', 'calls.lead': 'Rejoignez le festival : castings, appels à créateurs et recrutements pour la prochaine édition.',
    'calls.open': 'Ouvert', 'calls.closed': 'Clôturé', 'calls.deadline': 'Date limite', 'calls.none': 'Aucun appel ouvert actuellement. Inscrivez-vous à la newsletter pour être prévenu·e.',
    'calls.about': 'Le poste', 'calls.missions': 'Missions', 'calls.profile': 'Profil recherché', 'calls.benefits': 'Ce que nous offrons',
    'calls.form': 'Déposer ma candidature', 'calls.closedMsg': 'Cet appel est clôturé. Merci pour votre intérêt !',
    'calls.engagement': 'Engagement', 'calls.location': 'Lieu', 'calls.event': 'Événement',
    'role.mannequin': 'Mannequins', 'role.createur': 'Créateurs', 'role.benevole': 'Bénévoles', 'role.photo': 'Image', 'role.beaute': 'Beauté', 'role.autre': 'Autre',
    'f.first': 'Prénom', 'f.last': 'Nom', 'f.email': 'E-mail', 'f.phone': 'Téléphone / WhatsApp', 'f.city': 'Ville', 'f.country': 'Pays',
    'f.birth': 'Date de naissance', 'f.link': 'Instagram / portfolio (lien)', 'f.message': 'Votre motivation', 'f.photos': 'Photos',
    'f.photosHint': 'Jusqu’à 6 photos (JPG, PNG, WEBP — 12 Mo max chacune). Pour un casting : un portrait, une photo en pied, un profil.',
    'f.cv': 'CV / dossier (PDF)', 'f.consent': 'J’accepte que mes données soient utilisées par le Guinée Fashion Festival pour traiter ma candidature.',
    'f.required': 'Champ requis', 'f.invalidEmail': 'E-mail invalide', 'f.sending': 'Envoi…', 'f.choose': 'Choisir…',
    'f.success': 'Candidature envoyée !', 'f.successText': 'Merci. Notre équipe étudie chaque dossier et revient vers les profils retenus par e-mail ou téléphone.',
    'f.drop': 'Glissez vos fichiers ici ou cliquez pour parcourir', 'f.subject': 'Objet', 'f.name': 'Nom complet',
    'f.contactSuccess': 'Message envoyé — nous vous répondons rapidement.', 'f.error': 'Une erreur est survenue.',
    'contact.title': 'Contact', 'contact.lead': 'Presse, partenariats, exposants, questions : écrivez-nous.',
    'contact.phone': 'Téléphone', 'contact.email': 'E-mail', 'contact.address': 'Adresse', 'contact.hours': 'Horaires', 'contact.follow': 'Suivez-nous',
    'news.title': 'Restez au premier rang', 'news.text': 'Annonces, castings et invitations : recevez les nouvelles du festival.', 'news.ok': 'Merci, vous êtes inscrit·e !',
    'footer.rights': 'Tous droits réservés.', 'footer.admin': 'Espace admin',
    'about.title': 'Le Festival', 'about.pillars': 'Les temps forts', 'about.partners': 'Partenaires',
    'nf.title': 'Hors podium', 'nf.text': 'Cette page n’existe pas ou a été déplacée.',
    'loading': 'Chargement',
  },
  en: {
    'nav.home': 'Home', 'nav.festival': 'The Festival', 'nav.events': 'Events', 'nav.gallery': 'Gallery',
    'nav.calls': 'Open calls', 'nav.contact': 'Contact', 'nav.menu': 'Menu', 'nav.close': 'Close',
    'cta.apply': 'Apply', 'cta.discover': 'Discover', 'cta.seeAll': 'See all', 'cta.program': 'See the programme',
    'cta.gallery': 'Enter the gallery', 'cta.calls': 'See open calls', 'cta.back': 'Back', 'cta.view': 'View',
    'cta.play': 'Play', 'cta.drag': 'Drag', 'cta.tickets': 'Tickets', 'cta.send': 'Send', 'cta.subscribe': 'Subscribe',
    'home.next': 'Next edition', 'home.countdown': 'Curtain rises in', 'home.looks': 'The show',
    'home.looksSub': 'Silhouettes from the latest edition, look after look.',
    'home.programme': 'Programme', 'home.galleryTitle': 'Gallery', 'home.gallerySub': 'Shows, backstage, designers village: every project tells the story of an edition.',
    'home.callsTitle': 'Castings & open calls', 'home.callsSub': 'Models, designers, volunteers, image and beauty teams: the festival is recruiting.',
    'home.partners': 'With the support of', 'home.upcoming': 'Upcoming',
    'cd.days': 'Days', 'cd.hours': 'Hours', 'cd.min': 'Min', 'cd.sec': 'Sec', 'cd.live': 'Happening now', 'cd.done': 'Over',
    'ev.upcoming': 'Upcoming', 'ev.past': 'Past editions', 'ev.title': 'Events', 'ev.lead': 'Announcements, dates and programmes of Guinée Fashion Festival events.',
    'ev.none': 'No event announced yet — check back soon.', 'ev.where': 'Venue', 'ev.when': 'Dates',
    'ev.programme': 'Programme', 'ev.calls': 'Related open calls', 'ev.gallery': 'In pictures', 'ev.addCal': 'Add to calendar',
    'gal.title': 'Gallery', 'gal.lead': 'Photos and videos sorted by project. Pick a project and let it roll.',
    'gal.all': 'All', 'gal.photos': 'photos', 'gal.videos': 'videos', 'gal.next': 'Next project', 'gal.empty': 'No media in this project yet.',
    'gal.view.grid': 'Mosaic', 'gal.view.film': 'Film strip',
    'cat.defile': 'Runway', 'cat.exposition': 'Exhibition', 'cat.backstage': 'Backstage', 'cat.portrait': 'Portraits', 'cat.campagne': 'Campaign', 'cat.video': 'Video', 'cat.autre': 'Other',
    'calls.title': 'Open calls', 'calls.lead': 'Join the festival: castings, calls for designers and recruitment for the next edition.',
    'calls.open': 'Open', 'calls.closed': 'Closed', 'calls.deadline': 'Deadline', 'calls.none': 'No open calls right now. Subscribe to the newsletter to be notified.',
    'calls.about': 'The role', 'calls.missions': 'Responsibilities', 'calls.profile': 'Who we’re looking for', 'calls.benefits': 'What we offer',
    'calls.form': 'Submit my application', 'calls.closedMsg': 'This call is closed. Thank you for your interest!',
    'calls.engagement': 'Type', 'calls.location': 'Location', 'calls.event': 'Event',
    'role.mannequin': 'Models', 'role.createur': 'Designers', 'role.benevole': 'Volunteers', 'role.photo': 'Image', 'role.beaute': 'Beauty', 'role.autre': 'Other',
    'f.first': 'First name', 'f.last': 'Last name', 'f.email': 'Email', 'f.phone': 'Phone / WhatsApp', 'f.city': 'City', 'f.country': 'Country',
    'f.birth': 'Date of birth', 'f.link': 'Instagram / portfolio (link)', 'f.message': 'Why you', 'f.photos': 'Photos',
    'f.photosHint': 'Up to 6 photos (JPG, PNG, WEBP — 12 MB max each). For castings: a headshot, a full-length shot, a profile.',
    'f.cv': 'CV / portfolio (PDF)', 'f.consent': 'I agree that Guinée Fashion Festival may use my data to process my application.',
    'f.required': 'Required', 'f.invalidEmail': 'Invalid email', 'f.sending': 'Sending…', 'f.choose': 'Choose…',
    'f.success': 'Application sent!', 'f.successText': 'Thank you. Our team reviews every application and will contact shortlisted profiles by email or phone.',
    'f.drop': 'Drop your files here or click to browse', 'f.subject': 'Subject', 'f.name': 'Full name',
    'f.contactSuccess': 'Message sent — we will get back to you shortly.', 'f.error': 'Something went wrong.',
    'contact.title': 'Contact', 'contact.lead': 'Press, partnerships, exhibitors, questions: get in touch.',
    'contact.phone': 'Phone', 'contact.email': 'Email', 'contact.address': 'Address', 'contact.hours': 'Hours', 'contact.follow': 'Follow us',
    'news.title': 'Stay front row', 'news.text': 'Announcements, castings and invitations: get the festival news.', 'news.ok': 'Thanks, you’re subscribed!',
    'footer.rights': 'All rights reserved.', 'footer.admin': 'Admin',
    'about.title': 'The Festival', 'about.pillars': 'Highlights', 'about.partners': 'Partners',
    'nf.title': 'Off the runway', 'nf.text': 'This page does not exist or has moved.',
    'loading': 'Loading',
  },
};

const LangCtx = createContext(null);

function initialLang() {
  try {
    const saved = localStorage.getItem('gff-lang');
    if (saved === 'fr' || saved === 'en') return saved;
  } catch { /* stockage indisponible */ }
  return navigator.language?.startsWith('en') ? 'en' : 'fr';
}

export function LangProvider({ children }) {
  const [lang, setLangState] = useState(initialLang);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback(l => {
    setLangState(l);
    try { localStorage.setItem('gff-lang', l); } catch { /* */ }
  }, []);
  const t = useCallback(k => dict[lang][k] ?? dict.fr[k] ?? k, [lang]);
  /** Choisit le champ dans la langue courante, avec repli sur le français. */
  const pick = useCallback((obj, field) => {
    if (!obj) return '';
    return (lang === 'en' ? obj[`${field}_en`] : null) || obj[`${field}_fr`] || obj[`${field}_en`] || '';
  }, [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t, pick }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

/* ---------- Dates ---------- */
const parse = d => (d ? new Date(`${d}T12:00:00`) : null);
export function fmtDate(d, lang, opts = { day: 'numeric', month: 'long', year: 'numeric' }) {
  const x = parse(d); if (!x) return '';
  return x.toLocaleDateString(lang === 'en' ? 'en-GB' : 'fr-FR', opts);
}
export function fmtRange(a, b, lang) {
  const A = parse(a), B = parse(b);
  if (!A) return '';
  if (!B || a === b) return fmtDate(a, lang);
  const L = lang === 'en' ? 'en-GB' : 'fr-FR';
  if (A.getMonth() === B.getMonth() && A.getFullYear() === B.getFullYear()) {
    return `${A.getDate()}–${B.getDate()} ${B.toLocaleDateString(L, { month: 'long', year: 'numeric' })}`;
  }
  return `${fmtDate(a, lang, { day: 'numeric', month: 'short' })} – ${fmtDate(b, lang, { day: 'numeric', month: 'short', year: 'numeric' })}`;
}
export function dateParts(d, lang) {
  const x = parse(d); if (!x) return {};
  const L = lang === 'en' ? 'en-GB' : 'fr-FR';
  return { day: String(x.getDate()).padStart(2, '0'), month: x.toLocaleDateString(L, { month: 'short' }).replace('.', ''), year: x.getFullYear() };
}
export const lines = s => String(s || '').split('\n').map(x => x.trim()).filter(Boolean);
