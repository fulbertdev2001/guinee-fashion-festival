import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../lib/api.js';
import {
  PageHead, Card, Btn, Field, Input, Textarea, BiField, Select, MediaField, MediaPicker, Uploader, EmbedAdder, Thumb, StatusBadge,
  useToast, confirmDelete,
} from './ui.jsx';

export const CATEGORIES = [['defile', 'Défilé'], ['exposition', 'Exposition'], ['backstage', 'Coulisses'], ['portrait', 'Portraits / street style'], ['campagne', 'Campagne'], ['autre', 'Autre']];

export function ProjectsList() {
  const { data, reload } = useApi('admin/projects');
  const toast = useToast();
  const list = data || [];
  const move = async (i, d) => {
    const a = [...list]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x);
    await Promise.all(a.map((p, k) => api(`admin/projects/${p.id}`, { method: 'PUT', body: { sort: k } })));
    reload();
  };
  const del = async p => {
    if (!confirmDelete(`le projet « ${p.title_fr} » (les médias restent dans la médiathèque)`)) return;
    await api(`admin/projects/${p.id}`, { method: 'DELETE' }); toast('Projet supprimé'); reload();
  };
  return (
    <>
      <PageHead title="Galerie — projets" sub="Chaque projet regroupe des photos et vidéos (un défilé, une exposition, des coulisses…). L’ordre ci-dessous est celui du site.">
        <Link to="/admin/galerie/new"><Btn>+ Nouveau projet</Btn></Link>
      </PageHead>
      <div className="a-project-grid">
        {list.map((p, i) => (
          <div key={p.id} className="a-project">
            <Link to={`/admin/galerie/${p.id}`} className="a-project-cover"><Thumb m={p.cover} size="100%" /></Link>
            <div className="a-project-info">
              <Link to={`/admin/galerie/${p.id}`} className="a-link-strong">{p.title_fr}</Link>
              <small>{CATEGORIES.find(c => c[0] === p.category)?.[1] || '—'} · {p.year || '—'} · {p.counts.image} photo(s), {p.counts.video} vidéo(s)</small>
              <div className="a-project-actions">
                <StatusBadge s={p.status} />
                <span>
                  <button className="a-icon-btn" disabled={!i} onClick={() => move(i, -1)} title="Avancer">←</button>
                  <button className="a-icon-btn" disabled={i === list.length - 1} onClick={() => move(i, 1)} title="Reculer">→</button>
                  <button className="a-icon-btn is-danger" onClick={() => del(p)} title="Supprimer">×</button>
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {data && !list.length && <p className="a-muted">Aucun projet.</p>}
    </>
  );
}

function MediaManager({ project, onSaved }) {
  const toast = useToast();
  const [items, setItems] = useState(project.media || []);
  const [dirty, setDirty] = useState(false);
  const [picker, setPicker] = useState(false);
  const [dragIdx, setDragIdx] = useState(null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { setItems(project.media || []); setDirty(false); }, [project]);
  const update = a => { setItems(a); setDirty(true); };
  const add = list => update([...items, ...list.filter(m => m && !items.find(x => x.id === m.id))]);
  const save = async (list = items) => {
    setSaving(true);
    try {
      const r = await api(`admin/projects/${project.id}/media`, { method: 'PUT', body: { items: list.map(m => ({ media_id: m.id, caption_fr: m.caption_fr, caption_en: m.caption_en })) } });
      toast('Médias du projet enregistrés'); setDirty(false); onSaved(r);
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };
  const onDrop = i => {
    if (dragIdx === null || dragIdx === i) return;
    const a = [...items]; const [x] = a.splice(dragIdx, 1); a.splice(i, 0, x); update(a); setDragIdx(null);
  };
  return (
    <Card title={`Photos & vidéos (${items.length})`} actions={<>
      <Btn variant="ghost" small onClick={() => setPicker(true)}>Depuis la médiathèque</Btn>
      <Btn small onClick={() => save()} disabled={!dirty || saving}>{saving ? '…' : dirty ? 'Enregistrer l’ordre & légendes' : 'Enregistré'}</Btn>
    </>}>
      <div className="a-manager-add">
        <Uploader compact onDone={res => { const list = [...items, ...res]; setItems(list); save(list); }} />
        <EmbedAdder onDone={res => { const list = [...items, ...res]; setItems(list); save(list); }} />
      </div>
      <p className="a-hint">Glissez les vignettes pour changer l’ordre. Les légendes s’affichent dans la visionneuse.</p>
      <div className="a-sortable">
        {items.map((m, i) => (
          <div key={`${m.id}-${i}`} className={`a-sort-item ${dragIdx === i ? 'is-drag' : ''}`} draggable
            onDragStart={() => setDragIdx(i)} onDragOver={e => e.preventDefault()} onDrop={() => onDrop(i)} onDragEnd={() => setDragIdx(null)}>
            <div className="a-sort-thumb"><Thumb m={m} size="100%" /><span className="a-sort-num">{i + 1}</span>
              <button className="a-sort-del" onClick={() => update(items.filter((_, k) => k !== i))} title="Retirer du projet">×</button></div>
            <input className="a-input is-small" placeholder="Légende FR" value={m.caption_fr || ''} onChange={e => update(items.map((x, k) => k === i ? { ...x, caption_fr: e.target.value } : x))} />
            <input className="a-input is-small" placeholder="Caption EN" value={m.caption_en || ''} onChange={e => update(items.map((x, k) => k === i ? { ...x, caption_en: e.target.value } : x))} />
          </div>
        ))}
      </div>
      {!items.length && <p className="a-muted">Ce projet est vide : ajoutez des photos et des vidéos.</p>}
      <MediaPicker open={picker} onClose={() => setPicker(false)} multiple onPick={add} />
    </Card>
  );
}

export function ProjectEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();
  const toast = useToast();
  const events = useApi('admin/events').data || [];
  const [v, setV] = useState(isNew ? { title_fr: '', status: 'draft', category: 'defile', year: new Date().getFullYear() } : null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!isNew) api(`admin/projects/${id}`).then(setV); }, [id, isNew]);
  if (!v) return <div className="a-muted">Chargement…</div>;
  const set = (k, val) => setV(s => ({ ...s, [k]: val }));
  const save = async () => {
    setSaving(true);
    try {
      const body = { ...v, cover_id: v.cover_id ?? null, event_id: v.event_id || null, year: v.year ? Number(v.year) : null };
      delete body.media; delete body.cover; delete body.event;
      const r = await api(isNew ? 'admin/projects' : `admin/projects/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast('Projet enregistré');
      if (isNew) nav(`/admin/galerie/${r.id}`, { replace: true }); else setV(r);
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };
  return (
    <>
      <PageHead title={isNew ? 'Nouveau projet' : v.title_fr} sub={<Link to="/admin/galerie" className="a-link">← Tous les projets</Link>}>
        {!isNew && v.status === 'published' && <a href={`/galerie/${v.slug}`} target="_blank" rel="noreferrer"><Btn variant="ghost">Voir ↗</Btn></a>}
        <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Btn>
      </PageHead>
      <div className="a-edit">
        <div className="a-edit-main">
          <Card title="Informations">
            <div className="a-form">
              <BiField label="Titre" obj={v} field="title" set={set} required />
              <BiField label="Description" obj={v} field="description" set={set} textarea rows={4} />
              <Field label="Crédits (photographe, stylisme, mannequins…)" wide><Textarea value={v.credits} onChange={x => set('credits', x)} rows={3} /></Field>
            </div>
          </Card>
          {isNew ? <Card title="Photos & vidéos"><p className="a-muted">Enregistrez le projet pour pouvoir y ajouter des médias.</p></Card>
            : <MediaManager project={v} onSaved={setV} />}
        </div>
        <div className="a-edit-side">
          <Card title="Publication">
            <div className="a-form">
              <Field label="Statut"><Select value={v.status} onChange={x => set('status', x)} options={[['draft', 'Brouillon (invisible)'], ['published', 'Publié']]} /></Field>
              <Field label="Catégorie"><Select value={v.category} onChange={x => set('category', x)} options={CATEGORIES} /></Field>
              <Field label="Année"><Input type="number" value={v.year} onChange={x => set('year', x)} /></Field>
              <Field label="Événement lié"><Select value={v.event_id || ''} onChange={x => set('event_id', x ? Number(x) : null)} options={[['', '— Aucun —'], ...events.map(e => [e.id, e.title_fr])]} /></Field>
              {!isNew && <Field label="Adresse (slug)"><Input value={v.slug} onChange={x => set('slug', x)} /></Field>}
            </div>
          </Card>
          <Card title="Couverture">
            <MediaField media={v.cover} onChange={m => setV(s => ({ ...s, cover: m, cover_id: m?.id || null }))} hint="Par défaut : la première photo du projet." />
          </Card>
        </div>
      </div>
    </>
  );
}
