# Guinée Fashion Festival — site web

Site vitrine + espace d’administration du **Guinée Fashion Festival — Mode & Artisanat**.

- **Front** : React 18, Vite, Framer Motion, Lenis (défilement fluide) — FR / EN
- **Back** : Node.js ≥ 20, Express 5, SQLite (better-sqlite3), Sharp (optimisation WebP), Multer
- **Admin** : `/admin` (connexion par e-mail / mot de passe)

## Démarrage rapide

```bash
npm install
cp .env.example .env          # puis modifier JWT_SECRET et ADMIN_PASSWORD
npm run seed                  # contenu initial (photos 2026, textes, castings exemples)
npm run build                 # build du front dans dist/
npm start                     # http://localhost:3000
```

Développement : `npm run dev` (API sur :3000 + Vite sur :5173 avec rechargement à chaud).

`npm run seed:reset` efface la base et les médias puis réimporte le contenu initial.

## Pages publiques

| URL | Contenu |
| --- | --- |
| `/` | Hero « podium » animé, manifeste, prochaine édition + compte à rebours, rail des looks, programme, chiffres, galerie, castings, partenaires |
| `/festival` | Présentation, temps forts, chiffres, partenaires |
| `/evenements`, `/evenements/:slug` | Annonces des événements à venir, programme jour par jour, ajout au calendrier (.ics), archives |
| `/galerie`, `/galerie/:slug` | Projets photo/vidéo filtrables ; vue mosaïque (colonnes en parallaxe) ou pellicule (glisser), visionneuse plein écran |
| `/candidatures`, `/candidatures/:slug` | Appels à candidature avec description du poste, missions, profil, avantages + formulaire (photos, CV PDF, questions personnalisées) |
| `/contact` | Coordonnées + formulaire |

## Administration (`/admin`)

- **Tableau de bord** : candidatures à traiter, appels ouverts, messages…
- **Événements** : création/édition FR-EN, dates, lieu, billetterie, programme, visuel, mise en avant
- **Galerie (projets)** : catégorie, année, événement lié, crédits ; ajout de photos/vidéos par glisser-déposer, liens YouTube/Vimeo, réordonnancement, légendes FR/EN
- **Médiathèque** : tous les médias, textes alternatifs, vignette des vidéos, suppression
- **Appels à candidature** : fiche de poste complète, date limite (fermeture automatique), photos/CV obligatoires, questions personnalisées (texte, texte long, liste de choix), duplication
- **Candidatures reçues** : filtres, fiche détaillée (photos, CV, réponses), statuts (nouvelle → en étude → présélection → retenue / non retenue), note ★, notes internes, lien WhatsApp, export CSV/Excel
- **Messages**, **Newsletter** (export CSV)
- **Textes & réglages** : hero, manifeste, images du diaporama, looks du défilé, page Festival, temps forts, chiffres, partenaires (logos), contact, réseaux sociaux, bandeau d’annonce, SEO
- **Comptes** : changement de mot de passe, ajout/retrait de membres de l’équipe

## Données & sauvegarde

Tout est dans `data/` (configurable via `DATA_DIR`) :

- `data/gff.sqlite` — base de données
- `data/uploads/` — médias publics optimisés
- `data/private/` — fichiers des candidatures (jamais servis publiquement, accessibles uniquement depuis l’admin)

Sauvegarder ce dossier suffit.

## Mise en production (exemple VPS)

```bash
npm ci && npm run build
NODE_ENV=production pm2 start server/index.js --name gff
```

Derrière Nginx, prévoir `client_max_body_size 600m;` pour les vidéos, et HTTPS (Let’s Encrypt).
Pour les vidéos longues, préférer YouTube/Vimeo (lien collé dans l’admin).

Après un `npm run build`, le serveur prend le nouveau front sans redémarrage.

`/sitemap.xml` et `/robots.txt` sont générés automatiquement ; chaque page événement / projet / annonce a ses balises Open Graph.
