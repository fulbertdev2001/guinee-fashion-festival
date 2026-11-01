import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { db, getSetting } from '../db.js';
import { PRIVATE_DIR } from '../config.js';
import { eventOut, projectOut, callOut } from '../serialize.js';
import { getMedia } from '../media.js';

const r = Router();
const today = () => new Date().toISOString().slice(0, 10);

/* ---------- petite protection anti-spam (mémoire) ---------- */
const hits = new Map();
function rateLimit(max, windowMs) {
  return (req, res, next) => {
    const key = `${req.ip}:${req.path}`;
    const now = Date.now();
    const list = (hits.get(key) || []).filter(t => now - t < windowMs);
    if (list.length >= max) return res.status(429).json({ error: 'Trop de tentatives, réessayez plus tard.' });
    list.push(now); hits.set(key, list); next();
  };
}
const isEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
const clip = (s, n = 2000) => String(s ?? '').trim().slice(0, n);

/* ---------- Site ---------- */
function siteSettings() {
  return {
    general: getSetting('general', {}),
    home: getSetting('home', {}),
    about: (a => ({ ...a, image: getMedia(a.image_id), image2: getMedia(a.image2_id) }))(getSetting('about', {})),
    stats: getSetting('stats', []),
    pillars: getSetting('pillars', []).map(x => ({ ...x, image: getMedia(x.image_id) })),
    partners: getSetting('partners', []).map(x => ({ ...x, logo: getMedia(x.logo_id) })),
    contact: getSetting('contact', {}),
    socials: getSetting('socials', {}),
  };
}

function resolveImages(list = []) {
  return list.map(id => getMedia(id)).filter(Boolean);
}

r.get('/site', (_req, res) => {
  const s = siteSettings();
  res.json(s);
});

r.get('/home', (_req, res) => {
  const s = siteSettings();
  const upcoming = db.prepare(`SELECT * FROM events WHERE status='published' AND COALESCE(end_date,start_date) >= ?
    ORDER BY start_date ASC LIMIT 4`).all(today()).map(e => eventOut(e, { full: true }));
  const past = db.prepare(`SELECT * FROM events WHERE status='published' AND COALESCE(end_date,start_date) < ?
    ORDER BY start_date DESC LIMIT 3`).all(today()).map(e => eventOut(e));
  const projects = db.prepare(`SELECT * FROM projects WHERE status='published' ORDER BY sort, year DESC, id DESC LIMIT 8`)
    .all().map(p => projectOut(p, { preview: 4 }));
  const calls = db.prepare(`SELECT * FROM calls WHERE status='open' AND (deadline IS NULL OR deadline='' OR deadline >= ?)
    ORDER BY deadline ASC LIMIT 6`).all(today()).map(c => callOut(c));
  // looks du défilé : images de la sélection « home.looks » ou des projets « defile »
  let looks = resolveImages(s.home.looks || []);
  if (!looks.length) {
    looks = db.prepare(`SELECT pm.media_id FROM project_media pm JOIN projects p ON p.id=pm.project_id
      JOIN media m ON m.id=pm.media_id WHERE p.status='published' AND p.category='defile' AND m.kind='image'
      ORDER BY p.sort, pm.sort LIMIT 10`).all().map(x => getMedia(x.media_id));
  }
  const hero = resolveImages(s.home.hero_images || []);
  res.json({ ...s, heroImages: hero.length ? hero : looks.slice(0, 5), looks, upcoming, past, projects, calls });
});

/* ---------- Événements ---------- */
r.get('/events', (req, res) => {
  const scope = req.query.scope || 'all';
  let where = `status='published'`;
  if (scope === 'upcoming') where += ` AND COALESCE(end_date,start_date) >= '${today()}'`;
  if (scope === 'past') where += ` AND COALESCE(end_date,start_date) < '${today()}'`;
  const order = scope === 'past' ? 'DESC' : 'ASC';
  const rows = db.prepare(`SELECT * FROM events WHERE ${where} ORDER BY start_date ${order}`).all();
  res.json(rows.map(e => eventOut(e)));
});

r.get('/events/:slug', (req, res) => {
  const row = db.prepare(`SELECT * FROM events WHERE slug=? AND status='published'`).get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Événement introuvable' });
  const ev = eventOut(row, { full: true });
  ev.calls = db.prepare(`SELECT * FROM calls WHERE event_id=? AND status IN ('open','closed') ORDER BY deadline`).all(row.id).map(c => callOut(c));
  ev.projects = db.prepare(`SELECT * FROM projects WHERE event_id=? AND status='published' ORDER BY sort`).all(row.id).map(p => projectOut(p, { preview: 3 }));
  res.json(ev);
});

/* ---------- Galerie ---------- */
r.get('/projects', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM projects WHERE status='published' ORDER BY sort, year DESC, id DESC`).all();
  res.json(rows.map(p => projectOut(p, { preview: 4 })));
});

r.get('/projects/:slug', (req, res) => {
  const row = db.prepare(`SELECT * FROM projects WHERE slug=? AND status='published'`).get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Projet introuvable' });
  const p = projectOut(row, { full: true });
  const all = db.prepare(`SELECT * FROM projects WHERE status='published' ORDER BY sort, year DESC, id DESC`).all();
  const i = all.findIndex(x => x.id === row.id);
  const next = all[(i + 1) % all.length];
  p.next = next && next.id !== row.id ? projectOut(next) : null;
  res.json(p);
});

/* ---------- Candidatures ---------- */
r.get('/calls', (_req, res) => {
  const rows = db.prepare(`SELECT * FROM calls WHERE status IN ('open','closed') ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, deadline ASC`).all();
  res.json(rows.map(c => callOut(c)));
});

r.get('/calls/:slug', (req, res) => {
  const row = db.prepare(`SELECT * FROM calls WHERE slug=? AND status IN ('open','closed')`).get(req.params.slug);
  if (!row) return res.status(404).json({ error: 'Annonce introuvable' });
  res.json(callOut(row, { full: true }));
});

const appUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      const dir = path.join(PRIVATE_DIR, new Date().toISOString().slice(0, 7));
      fs.mkdirSync(dir, { recursive: true }); cb(null, dir);
    },
    filename: (_req, file, cb) => cb(null, `${crypto.randomBytes(10).toString('hex')}${path.extname(file.originalname).toLowerCase().slice(0, 6)}`),
  }),
  limits: { fileSize: 12 * 1024 * 1024, files: 8 },
  fileFilter: (_req, file, cb) => {
    const ok = /^(image\/(jpeg|png|webp|heic|heif)|application\/pdf)$/.test(file.mimetype);
    cb(ok ? null : Object.assign(new Error('Format de fichier non accepté (JPG, PNG, WEBP, PDF)'), { status: 400 }), ok);
  },
});

r.post('/calls/:slug/apply', rateLimit(6, 60 * 60 * 1000),
  appUpload.fields([{ name: 'photos', maxCount: 6 }, { name: 'cv', maxCount: 1 }]),
  (req, res) => {
    const files = [...(req.files?.photos || []), ...(req.files?.cv || [])];
    const cleanup = () => files.forEach(f => { try { fs.unlinkSync(f.path); } catch { /* */ } });
    const call = db.prepare(`SELECT * FROM calls WHERE slug=?`).get(req.params.slug);
    const c = callOut(call);
    if (!c || !c.is_open) { cleanup(); return res.status(400).json({ error: 'Cet appel à candidature est fermé.' }); }
    const b = req.body || {};
    if (b.website) { cleanup(); return res.json({ ok: true }); } // pot de miel
    const errors = {};
    if (!clip(b.first_name)) errors.first_name = 'required';
    if (!clip(b.last_name)) errors.last_name = 'required';
    if (!isEmail(b.email)) errors.email = 'email';
    if (!clip(b.phone)) errors.phone = 'required';
    if (call.require_photos && !(req.files?.photos || []).length) errors.photos = 'required';
    if (call.require_cv && !(req.files?.cv || []).length) errors.cv = 'required';
    if (b.consent !== 'true' && b.consent !== 'on') errors.consent = 'required';
    const questions = JSON.parse(call.questions || '[]');
    let answersIn = {};
    try { answersIn = JSON.parse(b.answers || '{}'); } catch { /* */ }
    const answers = questions.map(q => ({ id: q.id, label: q.label_fr, value: clip(answersIn[q.id], 3000) }));
    questions.forEach((q, i) => { if (q.required && !answers[i].value) errors[`q_${q.id}`] = 'required'; });
    if (Object.keys(errors).length) { cleanup(); return res.status(422).json({ error: 'Formulaire incomplet', fields: errors }); }

    const stored = files.map(f => ({
      name: f.originalname, file: path.relative(PRIVATE_DIR, f.path), mime: f.mimetype, size: f.size,
      field: f.fieldname,
    }));
    const info = db.prepare(`INSERT INTO applications(call_id,call_title,first_name,last_name,email,phone,city,country,birthdate,link,message,answers,files,lang)
      VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(call.id, call.title_fr, clip(b.first_name, 120), clip(b.last_name, 120),
      clip(b.email, 200), clip(b.phone, 60), clip(b.city, 120), clip(b.country, 120), clip(b.birthdate, 20),
      clip(b.link, 400), clip(b.message, 5000), JSON.stringify(answers), JSON.stringify(stored), b.lang === 'en' ? 'en' : 'fr');
    res.json({ ok: true, id: info.lastInsertRowid });
  });

/* ---------- Contact & newsletter ---------- */
r.post('/contact', rateLimit(8, 60 * 60 * 1000), (req, res) => {
  const b = req.body || {};
  if (b.website) return res.json({ ok: true });
  if (!clip(b.name) || !isEmail(b.email) || !clip(b.message)) return res.status(422).json({ error: 'Merci de compléter nom, e-mail et message.' });
  db.prepare('INSERT INTO messages(name,email,phone,subject,message) VALUES(?,?,?,?,?)')
    .run(clip(b.name, 160), clip(b.email, 200), clip(b.phone, 60), clip(b.subject, 200), clip(b.message, 5000));
  res.json({ ok: true });
});

r.post('/newsletter', rateLimit(10, 60 * 60 * 1000), (req, res) => {
  const email = clip(req.body?.email, 200).toLowerCase();
  if (!isEmail(email)) return res.status(422).json({ error: 'E-mail invalide' });
  db.prepare('INSERT OR IGNORE INTO subscribers(email) VALUES(?)').run(email);
  res.json({ ok: true });
});

export default r;
