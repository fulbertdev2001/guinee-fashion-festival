import { db } from './db.js';
import { getMedia } from './media.js';

const json = (s, d) => { try { return JSON.parse(s ?? ''); } catch { return d; } };

export function eventOut(row, { full = false } = {}) {
  if (!row) return null;
  const out = {
    id: row.id, slug: row.slug,
    title_fr: row.title_fr, title_en: row.title_en,
    subtitle_fr: row.subtitle_fr, subtitle_en: row.subtitle_en,
    excerpt_fr: row.excerpt_fr, excerpt_en: row.excerpt_en,
    start_date: row.start_date, end_date: row.end_date,
    venue: row.venue, city: row.city, address: row.address, ticket_url: row.ticket_url,
    status: row.status, featured: !!row.featured,
    cover_id: row.cover_id, cover: getMedia(row.cover_id),
    updated_at: row.updated_at,
  };
  if (full) {
    out.body_fr = row.body_fr; out.body_en = row.body_en;
    out.programme = json(row.programme, []);
  }
  return out;
}

export function projectOut(row, { full = false, preview = 0 } = {}) {
  if (!row) return null;
  const out = {
    id: row.id, slug: row.slug,
    title_fr: row.title_fr, title_en: row.title_en,
    description_fr: row.description_fr, description_en: row.description_en,
    category: row.category, year: row.year, event_id: row.event_id, credits: row.credits,
    status: row.status, sort: row.sort,
    cover_id: row.cover_id, cover: getMedia(row.cover_id),
  };
  const items = db.prepare('SELECT * FROM project_media WHERE project_id=? ORDER BY sort, id').all(row.id);
  out.count = items.length;
  out.counts = { image: 0, video: 0 };
  const media = items.map(it => ({ ...getMedia(it.media_id), item_id: it.id, caption_fr: it.caption_fr, caption_en: it.caption_en }))
    .filter(m => m.id);
  for (const m of media) out.counts[m.kind === 'image' ? 'image' : 'video']++;
  if (!out.cover) out.cover = media.find(m => m.kind === 'image') || null;
  if (full) out.media = media;
  else if (preview) out.preview = media.filter(m => m.kind === 'image').slice(0, preview);
  if (full && row.event_id) {
    const ev = db.prepare('SELECT * FROM events WHERE id=?').get(row.event_id);
    out.event = ev ? { slug: ev.slug, title_fr: ev.title_fr, title_en: ev.title_en, status: ev.status } : null;
  }
  return out;
}

export function callOut(row, { full = false } = {}) {
  if (!row) return null;
  const out = {
    id: row.id, slug: row.slug, title_fr: row.title_fr, title_en: row.title_en,
    role_type: row.role_type, event_id: row.event_id, location: row.location,
    engagement_fr: row.engagement_fr, engagement_en: row.engagement_en,
    deadline: row.deadline, summary_fr: row.summary_fr, summary_en: row.summary_en,
    status: row.status, cover_id: row.cover_id, cover: getMedia(row.cover_id),
    require_photos: !!row.require_photos, require_cv: !!row.require_cv,
  };
  // une candidature dont la date limite est passée est considérée fermée côté public
  out.is_open = row.status === 'open' && (!row.deadline || row.deadline >= new Date().toISOString().slice(0, 10));
  if (row.event_id) {
    const ev = db.prepare('SELECT slug,title_fr,title_en,start_date,end_date FROM events WHERE id=?').get(row.event_id);
    out.event = ev || null;
  }
  if (full) {
    for (const k of ['description', 'missions', 'profile', 'benefits']) {
      out[`${k}_fr`] = row[`${k}_fr`]; out[`${k}_en`] = row[`${k}_en`];
    }
    out.questions = json(row.questions, []);
  }
  return out;
}

export function applicationOut(row) {
  if (!row) return null;
  return { ...row, answers: json(row.answers, []), files: json(row.files, []) };
}
