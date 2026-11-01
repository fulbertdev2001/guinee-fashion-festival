import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { db, getSetting, setSetting, uniqueSlug } from '../db.js';
import { PRIVATE_DIR, MAX_VIDEO_MB } from '../config.js';
import { requireAuth, publicUser, hashPassword, checkPassword } from '../auth.js';
import { eventOut, projectOut, callOut, applicationOut } from '../serialize.js';
import { ingestImage, ingestVideo, createEmbed, getMedia, serializeMedia, deleteMediaFiles } from '../media.js';

const r = Router();
r.use(requireAuth);

const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const nowSql = "datetime('now')";

/* ---------- Tableau de bord ---------- */
r.get('/dashboard', (_req, res) => {
  const n = sql => db.prepare(sql).get().n;
  res.json({
    counts: {
      events: n(`SELECT COUNT(*) n FROM events`),
      upcoming: n(`SELECT COUNT(*) n FROM events WHERE status='published' AND COALESCE(end_date,start_date) >= date('now')`),
      projects: n(`SELECT COUNT(*) n FROM projects`),
      media: n(`SELECT COUNT(*) n FROM media`),
      calls_open: n(`SELECT COUNT(*) n FROM calls WHERE status='open'`),
      applications: n(`SELECT COUNT(*) n FROM applications`),
      applications_new: n(`SELECT COUNT(*) n FROM applications WHERE status='new'`),
      messages_unread: n(`SELECT COUNT(*) n FROM messages WHERE is_read=0`),
      subscribers: n(`SELECT COUNT(*) n FROM subscribers`),
    },
    recentApplications: db.prepare(`SELECT id,first_name,last_name,call_title,status,created_at FROM applications ORDER BY id DESC LIMIT 6`).all(),
    recentMessages: db.prepare(`SELECT id,name,subject,is_read,created_at FROM messages ORDER BY id DESC LIMIT 5`).all(),
    perCall: db.prepare(`SELECT c.id,c.title_fr,c.status,c.deadline,COUNT(a.id) n FROM calls c LEFT JOIN applications a ON a.call_id=c.id GROUP BY c.id ORDER BY c.id DESC LIMIT 8`).all(),
  });
});

/* ---------- Compte ---------- */
r.post('/password', (req, res) => {
  const { current, next } = req.body || {};
  if (!checkPassword(String(current || ''), req.user.password_hash)) return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
  if (String(next || '').length < 8) return res.status(400).json({ error: '8 caractères minimum' });
  db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hashPassword(next), req.user.id);
  res.json({ ok: true });
});

r.get('/users', (_req, res) => res.json(db.prepare('SELECT id,email,name,role,created_at FROM users ORDER BY id').all()));
r.post('/users', (req, res) => {
  const { email, name, password } = req.body || {};
  if (!/^[^\s@]+@[^\s@]+$/.test(email || '') || String(password || '').length < 8) return res.status(400).json({ error: 'E-mail valide et mot de passe de 8 caractères minimum requis' });
  try {
    const info = db.prepare('INSERT INTO users(email,name,password_hash,role) VALUES(?,?,?,?)').run(email.toLowerCase().trim(), name || '', hashPassword(password), 'admin');
    res.json(publicUser(db.prepare('SELECT * FROM users WHERE id=?').get(info.lastInsertRowid)));
  } catch { res.status(400).json({ error: 'Cet e-mail existe déjà' }); }
});
r.delete('/users/:id', (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte' });
  db.prepare('DELETE FROM users WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------- Médiathèque ---------- */
const mediaUpload = multer({
  dest: path.join(os.tmpdir(), 'gff-up'),
  limits: { fileSize: MAX_VIDEO_MB * 1024 * 1024, files: 40 },
  fileFilter: (_req, f, cb) => {
    const ok = /^(image\/|video\/(mp4|webm|quicktime))/.test(f.mimetype) || /\.(jpe?g|png|webp|gif|avif|heic|mp4|webm|mov|m4v)$/i.test(f.originalname);
    cb(ok ? null : Object.assign(new Error(`Format non supporté : ${f.originalname}`), { status: 400 }), ok);
  },
});

r.get('/media', (req, res) => {
  const { kind, q } = req.query;
  const page = Math.max(1, Number(req.query.page) || 1); const per = 60;
  const where = []; const args = [];
  if (kind) { where.push('kind=?'); args.push(kind); }
  if (q) { where.push('(original_name LIKE ? OR alt_fr LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = db.prepare(`SELECT COUNT(*) n FROM media ${w}`).get(...args).n;
  const rows = db.prepare(`SELECT * FROM media ${w} ORDER BY id DESC LIMIT ? OFFSET ?`).all(...args, per, (page - 1) * per);
  res.json({ total, page, per, items: rows.map(serializeMedia) });
});

r.post('/media', mediaUpload.array('files', 40), wrap(async (req, res) => {
  const out = [];
  for (const f of req.files || []) {
    const isImage = f.mimetype.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|heic)$/i.test(f.originalname);
    if (isImage) {
      const buf = fs.readFileSync(f.path);
      fs.unlinkSync(f.path);
      out.push(await ingestImage(buf, f.originalname));
    } else {
      out.push(ingestVideo(f));
    }
  }
  res.json(out);
}));

r.get('/media/by-ids', (req, res) => {
  const ids = String(req.query.ids || '').split(',').map(Number).filter(Boolean);
  res.json(ids.map(id => getMedia(id)).filter(Boolean));
});

r.post('/media/embed', (req, res) => res.json(createEmbed(req.body?.url || '', req.body?.title)));

r.patch('/media/:id', (req, res) => {
  const { alt_fr, alt_en, poster_id } = req.body || {};
  db.prepare('UPDATE media SET alt_fr=COALESCE(?,alt_fr), alt_en=COALESCE(?,alt_en), poster_id=? WHERE id=?')
    .run(alt_fr ?? null, alt_en ?? null, poster_id || null, req.params.id);
  res.json(getMedia(req.params.id));
});

r.delete('/media/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM media WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  deleteMediaFiles(row);
  db.prepare('DELETE FROM media WHERE id=?').run(row.id);
  res.json({ ok: true });
});

/* ---------- CRUD générique ---------- */
function crud(table, { fields, out, slugFrom = 'title_fr', order = 'id DESC', json = [] }) {
  const pick = (body) => {
    const o = {};
    for (const f of fields) if (f in body) {
      let v = body[f];
      if (json.includes(f)) v = JSON.stringify(v ?? []);
      else if (typeof v === 'boolean') v = v ? 1 : 0;
      else if (v === '') v = null;
      o[f] = v;
    }
    return o;
  };
  r.get(`/${table}`, (_req, res) => res.json(db.prepare(`SELECT * FROM ${table} ORDER BY ${order}`).all().map(x => out(x))));
  r.get(`/${table}/:id`, (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Introuvable' });
    res.json(out(row, { full: true }));
  });
  r.post(`/${table}`, (req, res) => {
    const data = pick(req.body || {});
    if (!data[slugFrom]) return res.status(400).json({ error: 'Le titre (FR) est obligatoire' });
    data.slug = uniqueSlug(table, req.body.slug || data[slugFrom]);
    const keys = Object.keys(data);
    const info = db.prepare(`INSERT INTO ${table}(${keys.join(',')}) VALUES(${keys.map(() => '?').join(',')})`).run(...keys.map(k => data[k]));
    res.json(out(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(info.lastInsertRowid), { full: true }));
  });
  r.put(`/${table}/:id`, (req, res) => {
    const row = db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(req.params.id);
    if (!row) return res.status(404).json({ error: 'Introuvable' });
    const data = pick(req.body || {});
    if ('slug' in (req.body || {}) && req.body.slug) data.slug = uniqueSlug(table, req.body.slug, row.id);
    if (slugFrom in data && !data[slugFrom]) return res.status(400).json({ error: 'Le titre (FR) est obligatoire' });
    const keys = Object.keys(data);
    if (keys.length) {
      db.prepare(`UPDATE ${table} SET ${keys.map(k => `${k}=?`).join(',')}, updated_at=${nowSql} WHERE id=?`)
        .run(...keys.map(k => data[k]), row.id);
    }
    res.json(out(db.prepare(`SELECT * FROM ${table} WHERE id=?`).get(row.id), { full: true }));
  });
  r.delete(`/${table}/:id`, (req, res) => {
    db.prepare(`DELETE FROM ${table} WHERE id=?`).run(req.params.id);
    res.json({ ok: true });
  });
}

crud('events', {
  out: eventOut, order: 'start_date DESC', json: ['programme'],
  fields: ['title_fr', 'title_en', 'subtitle_fr', 'subtitle_en', 'excerpt_fr', 'excerpt_en', 'body_fr', 'body_en',
    'start_date', 'end_date', 'venue', 'city', 'address', 'ticket_url', 'cover_id', 'programme', 'status', 'featured'],
});

// projets : sous-route médias avant le CRUD générique (ordre, légendes)
r.put('/projects/:id/media', (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items : [];
  const tx = db.transaction(() => {
    db.prepare('DELETE FROM project_media WHERE project_id=?').run(req.params.id);
    const ins = db.prepare('INSERT INTO project_media(project_id,media_id,caption_fr,caption_en,sort) VALUES(?,?,?,?,?)');
    const exists = db.prepare('SELECT 1 FROM media WHERE id=?');
    items.filter(it => exists.get(it.media_id ?? it.id)).forEach((it, i) => ins.run(req.params.id, it.media_id ?? it.id, it.caption_fr || null, it.caption_en || null, i));
    db.prepare(`UPDATE projects SET updated_at=${nowSql} WHERE id=?`).run(req.params.id);
  });
  tx();
  res.json(projectOut(db.prepare('SELECT * FROM projects WHERE id=?').get(req.params.id), { full: true }));
});

crud('projects', {
  out: projectOut, order: 'sort, year DESC, id DESC',
  fields: ['title_fr', 'title_en', 'description_fr', 'description_en', 'category', 'year', 'event_id', 'cover_id', 'credits', 'status', 'sort'],
});

crud('calls', {
  out: callOut, json: ['questions'],
  fields: ['title_fr', 'title_en', 'role_type', 'event_id', 'location', 'engagement_fr', 'engagement_en', 'deadline',
    'summary_fr', 'summary_en', 'description_fr', 'description_en', 'missions_fr', 'missions_en', 'profile_fr', 'profile_en',
    'benefits_fr', 'benefits_en', 'require_photos', 'require_cv', 'questions', 'cover_id', 'status'],
});

/* ---------- Candidatures reçues ---------- */
function appFilter(q) {
  const where = []; const args = [];
  if (q.call_id) { where.push('call_id=?'); args.push(q.call_id); }
  if (q.status) { where.push('status=?'); args.push(q.status); }
  if (q.q) { where.push(`(first_name||' '||last_name||' '||email||' '||COALESCE(city,'')) LIKE ?`); args.push(`%${q.q}%`); }
  return { w: where.length ? `WHERE ${where.join(' AND ')}` : '', args };
}

r.get('/applications', (req, res) => {
  const { w, args } = appFilter(req.query);
  res.json(db.prepare(`SELECT * FROM applications ${w} ORDER BY id DESC`).all(...args).map(applicationOut));
});

r.get('/applications/export.csv', (req, res) => {
  const { w, args } = appFilter(req.query);
  const rows = db.prepare(`SELECT * FROM applications ${w} ORDER BY id DESC`).all(...args).map(applicationOut);
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['id', 'date', 'annonce', 'statut', 'note', 'prénom', 'nom', 'email', 'téléphone', 'ville', 'pays', 'naissance', 'lien', 'message', 'réponses'];
  const lines = rows.map(a => [a.id, a.created_at, a.call_title, a.status, a.rating, a.first_name, a.last_name, a.email, a.phone, a.city, a.country,
    a.birthdate, a.link, a.message, a.answers.map(x => `${x.label}: ${x.value}`).join(' | ')].map(esc).join(';'));
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="candidatures.csv"');
  res.send('﻿' + [head.map(esc).join(';'), ...lines].join('\n'));
});

r.get('/applications/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM applications WHERE id=?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Introuvable' });
  res.json(applicationOut(row));
});

r.get('/applications/:id/files/:idx', (req, res) => {
  const row = db.prepare('SELECT files FROM applications WHERE id=?').get(req.params.id);
  const f = row && JSON.parse(row.files || '[]')[Number(req.params.idx)];
  if (!f) return res.status(404).end();
  const abs = path.resolve(PRIVATE_DIR, f.file);
  if (!abs.startsWith(PRIVATE_DIR) || !fs.existsSync(abs)) return res.status(404).end();
  res.setHeader('Content-Type', f.mime);
  res.setHeader('Content-Disposition', `${req.query.download ? 'attachment' : 'inline'}; filename="${encodeURIComponent(f.name)}"`);
  fs.createReadStream(abs).pipe(res);
});

r.patch('/applications/:id', (req, res) => {
  const { status, notes, rating } = req.body || {};
  db.prepare('UPDATE applications SET status=COALESCE(?,status), notes=COALESCE(?,notes), rating=COALESCE(?,rating) WHERE id=?')
    .run(status ?? null, notes ?? null, rating ?? null, req.params.id);
  res.json(applicationOut(db.prepare('SELECT * FROM applications WHERE id=?').get(req.params.id)));
});

r.delete('/applications/:id', (req, res) => {
  const row = db.prepare('SELECT files FROM applications WHERE id=?').get(req.params.id);
  if (row) for (const f of JSON.parse(row.files || '[]')) { try { fs.unlinkSync(path.join(PRIVATE_DIR, f.file)); } catch { /* */ } }
  db.prepare('DELETE FROM applications WHERE id=?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------- Messages & abonnés ---------- */
r.get('/messages', (_req, res) => res.json(db.prepare('SELECT * FROM messages ORDER BY id DESC').all()));
r.patch('/messages/:id', (req, res) => {
  db.prepare('UPDATE messages SET is_read=? WHERE id=?').run(req.body?.is_read ? 1 : 0, req.params.id);
  res.json({ ok: true });
});
r.delete('/messages/:id', (req, res) => { db.prepare('DELETE FROM messages WHERE id=?').run(req.params.id); res.json({ ok: true }); });

r.get('/subscribers', (_req, res) => res.json(db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all()));
r.delete('/subscribers/:id', (req, res) => { db.prepare('DELETE FROM subscribers WHERE id=?').run(req.params.id); res.json({ ok: true }); });

/* ---------- Réglages / textes ---------- */
const SETTING_KEYS = ['general', 'home', 'about', 'stats', 'pillars', 'partners', 'contact', 'socials'];
r.get('/settings', (_req, res) => {
  const o = {}; for (const k of SETTING_KEYS) o[k] = getSetting(k, null); res.json(o);
});
r.put('/settings/:key', (req, res) => {
  if (!SETTING_KEYS.includes(req.params.key)) return res.status(400).json({ error: 'Clé inconnue' });
  setSetting(req.params.key, req.body?.value ?? null);
  res.json({ ok: true });
});

export default r;
