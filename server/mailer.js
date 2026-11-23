import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import nodemailer from 'nodemailer';
import { db, getSetting, setSetting } from './db.js';
import { PRIVATE_DIR, JWT_SECRET } from './config.js';

/* =========================================================
   Envoi d'e-mails (SMTP) : réponses aux messages + newsletter.
   Configuration par variables d'environnement (voir .env.example).
   ========================================================= */
const env = k => String(process.env[k] ?? '').trim();
const isTrue = v => /^(1|true|yes|oui)$/i.test(String(v || '').trim());

/* ---------- Mot de passe SMTP chiffré en base (AES-256-GCM, clé dérivée du secret du site) ---------- */
const key = () => crypto.createHash('sha256').update(`smtp:${JWT_SECRET}`).digest();
function encrypt(txt) {
  const iv = crypto.randomBytes(12); const c = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([c.update(String(txt), 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), enc].map(b => b.toString('base64')).join('.');
}
function decrypt(blob) {
  try {
    const [iv, tag, enc] = String(blob).split('.').map(x => Buffer.from(x, 'base64'));
    const d = crypto.createDecipheriv('aes-256-gcm', key(), iv); d.setAuthTag(tag);
    return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
  } catch { return ''; }
}

const has = v => v !== undefined && v !== null && String(v).trim() !== '';
const first = (...vals) => vals.find(has);

/** Configuration effective : saisie de l'admin (base de données) > variables d'environnement (secours). `override` = valeurs non enregistrées (test). */
export const mailConfig = (override = {}) => {
  const s = getSetting('mail', {}) || {};
  const o = override || {};
  const port = Number(first(o.port, s.port, env('SMTP_PORT'))) || 465;
  const secureRaw = first(o.secure, s.secure, env('SMTP_SECURE'));
  const secure = has(secureRaw) ? (typeof secureRaw === 'boolean' ? secureRaw : isTrue(secureRaw)) : port === 465;
  const user = String(first(o.user, s.user, env('SMTP_USER')) || '').trim();
  const fromEmail = String(first(o.from_email, s.from_email) || '').trim();
  const fromName = String(first(o.from_name, s.from_name) || '').trim();
  const from = fromEmail ? (fromName ? `"${fromName.replace(/"/g, '')}" <${fromEmail}>` : fromEmail) : (env('MAIL_FROM') || user);
  return {
    host: String(first(o.host, s.host, env('SMTP_HOST')) || '').trim(),
    port, secure, user,
    pass: first(o.pass) ? String(o.pass) : (s.pass_enc ? decrypt(s.pass_enc) : (process.env.SMTP_PASS || '')),
    from,
    replyTo: String(first(o.reply_to, s.reply_to, env('MAIL_REPLY_TO')) || '').trim(),
    siteUrl: String(first(o.site_url, s.site_url, env('SITE_URL')) || '').trim().replace(/\/+$/, ''),
    delayMs: Math.max(0, Number(first(o.delay_ms, s.delay_ms, env('MAIL_DELAY_MS'))) || 400),
    dryRun: isTrue(env('MAIL_DRY_RUN')),
  };
};

/** Réglages renvoyés à l'admin : jamais le mot de passe, seulement s'il est enregistré. */
export function getMailSettings() {
  const s = getSetting('mail', {}) || {}; const c = mailConfig();
  return {
    host: c.host, port: c.port, secure: c.secure, user: c.user,
    from_name: s.from_name || '', from_email: s.from_email || '', reply_to: c.replyTo, site_url: c.siteUrl, delay_ms: c.delayMs,
    has_pass: !!c.pass, source: s.host ? 'admin' : (c.host ? 'env' : 'none'),
  };
}

export function saveMailSettings(b = {}) {
  const old = getSetting('mail', {}) || {};
  const next = {
    host: String(b.host || '').trim(), port: Number(b.port) || 465, secure: typeof b.secure === 'boolean' ? b.secure : Number(b.port) === 465,
    user: String(b.user || '').trim(), from_name: String(b.from_name || '').trim().slice(0, 100), from_email: String(b.from_email || '').trim(),
    reply_to: String(b.reply_to || '').trim(), site_url: String(b.site_url || '').trim().replace(/\/+$/, ''),
    delay_ms: Math.min(60000, Math.max(0, Number(b.delay_ms) || 400)),
    pass_enc: b.clear_pass ? '' : (has(b.pass) ? encrypt(b.pass) : (old.pass_enc || '')),
  };
  setSetting('mail', next);
}

export function mailStatus() {
  const c = mailConfig();
  const missing = [];
  if (!c.dryRun) {
    if (!c.host) missing.push('serveur SMTP');
    if (!c.user) missing.push('identifiant');
    if (!c.pass) missing.push('mot de passe');
    if (!c.from) missing.push('adresse expéditeur');
  }
  return { configured: c.dryRun || missing.length === 0, dryRun: c.dryRun, from: c.from, missing, siteUrl: c.siteUrl };
}

/** Message d'erreur compréhensible pour une erreur SMTP. */
export function friendlyMailError(e) {
  const m = String(e?.message || e); const code = e?.code;
  if (code === 'EAUTH' || /Invalid login|Authentication|535|534/i.test(m)) return 'Identifiant ou mot de passe refusé par le serveur SMTP.';
  if (code === 'ENOTFOUND' || code === 'EDNS') return 'Serveur SMTP introuvable : vérifiez l’adresse du serveur.';
  if (['ETIMEDOUT', 'ECONNECTION', 'ECONNREFUSED', 'ECONNRESET', 'ESOCKET'].includes(code) || /ECONNREFUSED|ETIMEDOUT|ECONNRESET|socket hang up/i.test(m)) return 'Impossible de joindre le serveur SMTP : vérifiez le serveur et le port.';
  if (/wrong version number|SSL routines|unexpected response/i.test(m)) return 'Échec de la connexion sécurisée : essayez port 465 avec « SSL » activé, ou port 587 avec « SSL » désactivé.';
  if (/sender|from address|not owned|553|550/i.test(m)) return `Adresse expéditeur refusée par le serveur (elle doit être celle de la boîte e-mail) : ${m}`;
  return m;
}

export function mailStatusLegacy() { return mailStatus(); }

let transport = null; let transportKey = '';
function getTransport(c) {
  const k = JSON.stringify([c.host, c.port, c.secure, c.user, c.pass, c.dryRun]);
  if (transport && k === transportKey) return transport;
  transportKey = k;
  transport = c.dryRun
    ? nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'unix' })
    : nodemailer.createTransport({ host: c.host, port: c.port, secure: c.secure, requireTLS: !c.secure && c.port === 587, auth: { user: c.user, pass: c.pass }, connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 30000 });
  return transport;
}

const clean = s => String(s ?? '').replace(/[\r\n]+/g, ' ').trim();

/** Envoie un e-mail. En mode test (MAIL_DRY_RUN), écrit un fichier .eml dans private/outbox/. */
export async function sendMail({ to, subject, html, text, replyTo, headers, cfg }) {
  const c = mailConfig(cfg);
  if (!c.dryRun && !(c.host && c.user && c.pass && c.from)) throw Object.assign(new Error('Envoi d’e-mails non configuré : renseignez les paramètres SMTP dans « E-mails (SMTP) ».'), { status: 503 });
  let info;
  try {
    info = await getTransport(c).sendMail({
      from: c.from, to: clean(to), subject: clean(subject), html, text,
      replyTo: clean(replyTo) || c.replyTo || undefined, headers,
    });
  } catch (e) { throw Object.assign(new Error(friendlyMailError(e)), { status: 502 }); }
  if (c.dryRun) {
    const dir = path.join(PRIVATE_DIR, 'outbox'); fs.mkdirSync(dir, { recursive: true });
    const name = `${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto.randomBytes(3).toString('hex')}.eml`;
    fs.writeFileSync(path.join(dir, name), info.message);
  }
  return info;
}

/* ---------- Désinscription (lien signé, sans connexion) ---------- */
const sig = email => crypto.createHmac('sha256', JWT_SECRET).update(`unsub:${String(email).toLowerCase()}`).digest('hex').slice(0, 32);
export const unsubscribeUrl = (origin, email) => `${origin}/api/unsubscribe?e=${encodeURIComponent(email)}&s=${sig(email)}`;
export function checkUnsubscribe(email, s) {
  const a = Buffer.from(sig(email)); const b = Buffer.from(String(s || ''));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* ---------- Gabarit HTML (compatible clients mail : tableaux + styles en ligne) ---------- */
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const safeUrl = u => (/^https?:\/\//i.test(String(u || '').trim()) ? String(u).trim() : '');

/** Texte simple → HTML : paragraphes, « ## Titre », **gras**, liens automatiques. */
export function textToHtml(text = '') {
  const inline = s => esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#0a0a0a;font-weight:600">$1</a>');
  return String(text).replace(/\r/g, '').split(/\n{2,}/).map(b => b.trim()).filter(Boolean).map(block => {
    if (/^##\s+/.test(block)) return `<h2 style="margin:28px 0 10px;font:700 22px/1.2 Arial,Helvetica,sans-serif;color:#0a0a0a">${inline(block.replace(/^##\s+/, ''))}</h2>`;
    return `<p style="margin:0 0 16px;font:400 16px/1.65 Arial,Helvetica,sans-serif;color:#2a2a2a">${inline(block).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}

export function renderEmail({ origin = '', preheader = '', bodyHtml = '', button, footerHtml = '' }) {
  const logo = origin ? `<img src="${esc(origin)}/logo-festival.png" width="86" alt="Guinée Fashion Festival" style="display:block;border:0;height:auto">` : '<strong style="font:700 18px Arial">Guinée Fashion Festival</strong>';
  const btn = button?.url && button?.label
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:26px 0 6px"><tr><td style="background:#f9ce21;border-radius:999px"><a href="${esc(button.url)}" style="display:inline-block;padding:14px 26px;font:700 13px Arial,Helvetica,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#0a0a0a;text-decoration:none">${esc(button.label)}</a></td></tr></table>` : '';
  return `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f1ea">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ea"><tr><td align="center" style="padding:24px 12px">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:14px;overflow:hidden">
    <tr><td style="padding:26px 32px 18px;border-bottom:4px solid #f9ce21">${logo}</td></tr>
    <tr><td style="padding:30px 32px 26px">${bodyHtml}${btn}</td></tr>
    <tr><td style="padding:18px 32px 26px;background:#0a0a0a;font:400 12px/1.6 Arial,Helvetica,sans-serif;color:#b9b5aa">${footerHtml || 'Guinée Fashion Festival — Mode &amp; Artisanat · Conakry'}</td></tr>
  </table>
</td></tr></table></body></html>`;
}

const stripHtml = html => String(html).replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|h2|tr)>/gi, '\n\n').replace(/<a [^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\n{3,}/g, '\n\n').trim();

/** Prépare le contenu d'une newsletter (HTML + texte) pour un destinataire. */
export function buildNewsletter({ subject, body, button_label, button_url }, origin, email) {
  const unsub = email ? unsubscribeUrl(origin, email) : `${origin || ''}/api/unsubscribe`;
  const button = safeUrl(button_url) && button_label ? { label: String(button_label).slice(0, 60), url: safeUrl(button_url) } : null;
  const footerHtml = `Vous recevez cet e-mail car vous êtes inscrit·e à la newsletter du Guinée Fashion Festival.<br><a href="${esc(unsub)}" style="color:#f9ce21">Se désinscrire</a>`;
  const html = renderEmail({ origin, preheader: String(body || '').slice(0, 110).replace(/\s+/g, ' '), bodyHtml: `<h1 style="margin:0 0 20px;font:800 28px/1.15 Arial,Helvetica,sans-serif;color:#0a0a0a">${esc(subject)}</h1>${textToHtml(body)}`, button, footerHtml });
  const text = `${subject}\n\n${stripHtml(textToHtml(body))}${button ? `\n\n${button.label} : ${button.url}` : ''}\n\n--\nPour vous désinscrire : ${unsub}\n`;
  return { html, text, headers: { 'List-Unsubscribe': `<${unsub}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } };
}

/** Prépare une réponse à un message reçu via le formulaire de contact. */
export function buildReply({ body, original }, origin) {
  const quote = original ? `<blockquote style="margin:22px 0 0;padding:4px 0 4px 16px;border-left:3px solid #f9ce21;color:#6b675e;font:400 14px/1.6 Arial,Helvetica,sans-serif">${esc(original.message).replace(/\n/g, '<br>')}</blockquote><p style="margin:8px 0 0;font:400 12px Arial;color:#8a8579">Votre message du ${esc(original.date)}</p>` : '';
  const html = renderEmail({ origin, preheader: String(body).slice(0, 110), bodyHtml: textToHtml(body) + quote });
  const text = `${body}\n\n${original ? `> ${String(original.message).replace(/\n/g, '\n> ')}\n` : ''}\n-- \nGuinée Fashion Festival — Mode & Artisanat\n`;
  return { html, text };
}

/* ---------- Tables ---------- */
db.exec(`
CREATE TABLE IF NOT EXISTS message_replies (
  id INTEGER PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  subject TEXT, body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'sent',     -- sent | failed
  error TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY,
  subject TEXT NOT NULL, body TEXT NOT NULL, button_label TEXT, button_url TEXT,
  status TEXT NOT NULL DEFAULT 'sending',  -- sending | done | interrupted
  total INTEGER DEFAULT 0, sent INTEGER DEFAULT 0, failed INTEGER DEFAULT 0, last_error TEXT,
  created_at TEXT DEFAULT (datetime('now')), finished_at TEXT
);
`);
// un envoi interrompu par un redémarrage du serveur est signalé comme tel
db.prepare(`UPDATE campaigns SET status='interrupted', finished_at=datetime('now') WHERE status='sending'`).run();

/** Envoi d'une campagne en tâche de fond, avec une pause entre chaque e-mail (limites des hébergeurs). */
export function startCampaign(id, origin) {
  const camp = db.prepare('SELECT * FROM campaigns WHERE id=?').get(id);
  const recipients = db.prepare('SELECT email FROM subscribers ORDER BY id').all().map(r => r.email);
  db.prepare('UPDATE campaigns SET total=? WHERE id=?').run(recipients.length, id);
  const delay = mailConfig().delayMs;
  (async () => {
    for (const email of recipients) {
      try {
        const m = buildNewsletter(camp, origin, email);
        await sendMail({ to: email, subject: camp.subject, ...m });
        db.prepare('UPDATE campaigns SET sent=sent+1 WHERE id=?').run(id);
      } catch (e) {
        db.prepare('UPDATE campaigns SET failed=failed+1, last_error=? WHERE id=?').run(String(e.message).slice(0, 300), id);
      }
      if (delay) await new Promise(r => setTimeout(r, delay));
    }
    db.prepare(`UPDATE campaigns SET status='done', finished_at=datetime('now') WHERE id=?`).run(id);
  })().catch(e => db.prepare(`UPDATE campaigns SET status='interrupted', last_error=?, finished_at=datetime('now') WHERE id=?`).run(String(e.message).slice(0, 300), id));
  return recipients.length;
}
