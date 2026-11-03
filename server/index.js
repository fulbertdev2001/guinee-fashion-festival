import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { PORT, UPLOAD_DIR, DIST_DIR, IS_PROD } from './config.js';
import { db, getSetting } from './db.js';
import { ensureAdmin, login, logout, requireAuth, publicUser } from './auth.js';
import { getMedia } from './media.js';
import publicRoutes from './routes/public.js';
import adminRoutes from './routes/admin.js';
import { seed } from './seed.js';

ensureAdmin();

// Auto-seed au premier lancement si la base est vide (sans bloquer le require ESM de LiteSpeed)
seed().catch(e => {
  console.warn('[seed] auto-seed :', e.message);
});

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false, crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '365d', immutable: true }));

app.post('/api/auth/login', login);
app.post('/api/auth/logout', logout);
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }));
app.use('/api/admin', adminRoutes);
app.use('/api', publicRoutes);
app.use('/api', (_req, res) => res.status(404).json({ error: 'Route inconnue' }));

/* ---------- SEO : robots & sitemap ---------- */
app.get('/robots.txt', (req, res) => {
  res.type('text/plain').send(`User-agent: *\nDisallow: /admin\nDisallow: /api\nSitemap: ${req.protocol}://${req.get('host')}/sitemap.xml\n`);
});
app.get('/sitemap.xml', (req, res) => {
  const origin = `${req.protocol}://${req.get('host')}`;
  const urls = ['/', '/festival', '/evenements', '/galerie', '/candidatures', '/contact'];
  for (const r of db.prepare(`SELECT slug FROM events WHERE status='published'`).all()) urls.push(`/evenements/${r.slug}`);
  for (const r of db.prepare(`SELECT slug FROM projects WHERE status='published'`).all()) urls.push(`/galerie/${r.slug}`);
  for (const r of db.prepare(`SELECT slug FROM calls WHERE status IN ('open','closed')`).all()) urls.push(`/candidatures/${r.slug}`);
  res.type('application/xml').send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(u => `  <url><loc>${origin}${u}</loc></url>`).join('\n')}\n</urlset>\n`);
});

/* ---------- Front (build Vite) avec méta SEO par page ---------- */
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, { index: false, maxAge: '7d', setHeaders: (res, p) => {
    if (p.includes(`${path.sep}assets${path.sep}`)) res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  } }));
  // relu à chaque requête : un nouveau build est pris en compte sans redémarrer
  const readTemplate = () => fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  const esc = s => String(s || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function metaFor(url) {
    const general = getSetting('general', {});
    let title = general.site_title || 'Guinée Fashion Festival';
    let desc = general.seo_description || 'Mode & Artisanat — le festival de la mode guinéenne.';
    let image = null;
    const m = url.match(/^\/(evenements|galerie|candidatures)\/([\w-]+)/);
    if (m) {
      const table = { evenements: 'events', galerie: 'projects', candidatures: 'calls' }[m[1]];
      const row = db.prepare(`SELECT * FROM ${table} WHERE slug=?`).get(m[2]);
      if (row) {
        title = `${row.title_fr} — Guinée Fashion Festival`;
        desc = row.excerpt_fr || row.description_fr || row.summary_fr || desc;
        image = getMedia(row.cover_id)?.mid;
      }
    }
    return { title, desc: String(desc).slice(0, 220), image };
  }

  app.get(/^(?!\/(api|uploads)\/).*/, (req, res) => {
    const { title, desc, image } = metaFor(req.path);
    const origin = `${req.protocol}://${req.get('host')}`;
    const html = readTemplate()
      .replace(/<title>.*?<\/title>/, `<title>${esc(title)}</title>`)
      .replace('<!--meta-->', [
        `<meta name="description" content="${esc(desc)}">`,
        `<meta property="og:title" content="${esc(title)}">`,
        `<meta property="og:description" content="${esc(desc)}">`,
        `<meta property="og:type" content="website">`,
        `<meta property="og:image" content="${esc(origin + (image || '/og-image.jpg'))}">`,
        `<meta name="twitter:card" content="summary_large_image">`,
      ].join('\n    '));
    res.setHeader('Cache-Control', 'no-cache');
    res.send(html);
  });
}

app.use((err, _req, res, _next) => {
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux' : (err.message || 'Erreur serveur') });
});

const rawPort = process.env.PORT || 3000;
const port = isNaN(Number(rawPort)) ? rawPort : Number(rawPort);

function tryListen(p, host) {
  try {
    const s = host
      ? app.listen(p, host, () => console.log(`Guinée Fashion Festival → http://${host}:${p} ${IS_PROD ? '(production)' : ''}`))
      : app.listen(p, () => console.log(`Guinée Fashion Festival → ${p} ${IS_PROD ? '(production)' : ''}`));
    s.on('error', (err) => console.warn(`[listen] ${p} ignoré (${err.code || err.message})`));
  } catch (err) {
    console.warn(`[listen] erreur sur ${p}: ${err.message}`);
  }
}

if (typeof port === 'number') {
  tryListen(port, '0.0.0.0');
  for (const alt of [3000, 8080]) {
    if (alt !== port) tryListen(alt, '0.0.0.0');
  }
} else {
  tryListen(port);
}

export default app;
