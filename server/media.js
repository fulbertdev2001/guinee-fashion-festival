import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { db } from './db.js';
import { UPLOAD_DIR } from './config.js';

const WIDTHS = [480, 960, 1600, 2400];

function stamp() {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}
function rid() { return crypto.randomBytes(6).toString('hex'); }
function baseName(name = 'media') {
  return path.parse(name).name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'media';
}

/** Traite une image : variantes WebP, placeholder flou, couleur dominante. */
export async function ingestImage(buffer, originalName, extra = {}) {
  const { default: sharp } = await import('sharp');
  const dir = stamp();
  fs.mkdirSync(path.join(UPLOAD_DIR, dir), { recursive: true });
  const base = `${baseName(originalName)}-${rid()}`;
  const img = sharp(buffer, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  let w = meta.width, h = meta.height;
  if ([5, 6, 7, 8].includes(meta.orientation)) [w, h] = [h, w];

  const variants = {};
  let native = false; // une seule variante à la taille d'origine si elle est plus petite que 2400 px
  for (const W of WIDTHS) {
    if (native) break;
    const target = Math.min(W, w);
    if (target === w) native = true;
    const rel = `${dir}/${base}-${W}.webp`;
    await sharp(buffer, { failOn: 'none' }).rotate()
      .resize({ width: target, withoutEnlargement: true })
      .webp({ quality: W >= 1600 ? 80 : 78, effort: 4 })
      .toFile(path.join(UPLOAD_DIR, rel));
    variants[target] = rel;
  }
  const tiny = await sharp(buffer, { failOn: 'none' }).rotate().resize(20).webp({ quality: 40 }).toBuffer();
  const stats = await sharp(buffer, { failOn: 'none' }).stats();
  const c = stats.dominant;
  const color = `#${[c.r, c.g, c.b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
  const largest = variants[Math.max(...Object.keys(variants).map(Number))];

  const info = db.prepare(`INSERT INTO media(kind,path,variants,width,height,blur,color,mime,size,original_name,alt_fr,alt_en)
    VALUES('image',?,?,?,?,?,?,?,?,?,?,?)`).run(
    largest, JSON.stringify(variants), w, h,
    `data:image/webp;base64,${tiny.toString('base64')}`, color,
    'image/webp', buffer.length, originalName, extra.alt_fr || null, extra.alt_en || null);
  return getMedia(info.lastInsertRowid);
}

/** Enregistre une vidéo (fichier déjà sur disque via multer). */
export function ingestVideo(file) {
  const dir = stamp();
  fs.mkdirSync(path.join(UPLOAD_DIR, dir), { recursive: true });
  const ext = (path.extname(file.originalname) || '.mp4').toLowerCase();
  const rel = `${dir}/${baseName(file.originalname)}-${rid()}${ext}`;
  fs.renameSync(file.path, path.join(UPLOAD_DIR, rel));
  const info = db.prepare(`INSERT INTO media(kind,path,mime,size,original_name) VALUES('video',?,?,?,?)`)
    .run(rel, file.mimetype.startsWith('video/') ? file.mimetype : (ext === '.webm' ? 'video/webm' : 'video/mp4'), file.size, file.originalname);
  return getMedia(info.lastInsertRowid);
}

export function parseEmbed(url = '') {
  const u = url.trim();
  let m = u.match(/(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{6,})/);
  if (m) return { provider: 'youtube', id: m[1], embed: `https://www.youtube-nocookie.com/embed/${m[1]}`, thumb: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { provider: 'vimeo', id: m[1], embed: `https://player.vimeo.com/video/${m[1]}`, thumb: null };
  return null;
}

export function createEmbed(url, title) {
  const e = parseEmbed(url);
  if (!e) throw Object.assign(new Error('Lien vidéo non reconnu (YouTube ou Vimeo)'), { status: 400 });
  const info = db.prepare(`INSERT INTO media(kind,embed_url,original_name,mime) VALUES('embed',?,?,?)`)
    .run(url.trim(), title || `${e.provider} ${e.id}`, e.provider);
  return getMedia(info.lastInsertRowid);
}

export function serializeMedia(row) {
  if (!row) return null;
  const out = {
    id: row.id, kind: row.kind, width: row.width, height: row.height, blur: row.blur, color: row.color,
    alt_fr: row.alt_fr, alt_en: row.alt_en, name: row.original_name, size: row.size, mime: row.mime,
    created_at: row.created_at,
  };
  if (row.kind === 'image') {
    const v = JSON.parse(row.variants || '{}');
    out.src = `/uploads/${row.path}`;
    out.srcset = Object.entries(v).map(([w, p]) => `/uploads/${p} ${w}w`).join(', ');
    out.thumb = `/uploads/${v[480] || row.path}`;
    out.mid = `/uploads/${v[960] || v[480] || row.path}`;
  } else if (row.kind === 'video') {
    out.src = `/uploads/${row.path}`;
  } else if (row.kind === 'embed') {
    const e = parseEmbed(row.embed_url);
    out.url = row.embed_url; out.embed = e?.embed; out.provider = e?.provider; out.thumb = e?.thumb;
  }
  if (row.poster_id) out.poster = serializeMedia(db.prepare('SELECT * FROM media WHERE id=?').get(row.poster_id));
  return out;
}

export function getMedia(id) {
  if (!id) return null;
  return serializeMedia(db.prepare('SELECT * FROM media WHERE id=?').get(id));
}

export function deleteMediaFiles(row) {
  const files = [];
  if (row.kind === 'image') files.push(...Object.values(JSON.parse(row.variants || '{}')));
  else if (row.kind === 'video' && row.path) files.push(row.path);
  for (const f of files) { try { fs.unlinkSync(path.join(UPLOAD_DIR, f)); } catch { /* déjà absent */ } }
}
