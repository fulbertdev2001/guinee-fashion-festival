import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../lib/api.js';
import {
  PageHead, Card, Btn, Field, Input, BiField, Select, Toggle, MediaField, Thumb, StatusBadge, useToast, confirmDelete, fmt,
} from './ui.jsx';

export function EventsList() {
  const { data, reload } = useApi('admin/events');
  const toast = useToast();
  const del = async ev => {
    if (!confirmDelete(`« ${ev.title_fr} »`)) return;
    await api(`admin/events/${ev.id}`, { method: 'DELETE' }); toast('Événement supprimé'); reload();
  };
  const today = new Date().toISOString().slice(0, 10);
  return (
    <>
      <PageHead title="Événements" sub="Annonces des événements à venir et archives des éditions passées.">
        <Link to="/admin/evenements/new"><Btn>+ Nouvel événement</Btn></Link>
      </PageHead>
      <Card>
        <table className="a-table is-list">
          <thead><tr><th /><th>Titre</th><th>Dates</th><th>Lieu</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {(data || []).map(ev => (
              <tr key={ev.id}>
                <td><Thumb m={ev.cover} size={52} /></td>
                <td><Link to={`/admin/evenements/${ev.id}`} className="a-link-strong">{ev.title_fr}</Link>
                  <small>{(ev.end_date || ev.start_date) >= today ? 'À venir' : 'Passé'}{ev.featured ? ' · mis en avant' : ''}</small></td>
                <td>{fmt(ev.start_date)}{ev.end_date && ev.end_date !== ev.start_date ? ` → ${fmt(ev.end_date)}` : ''}</td>
                <td>{[ev.venue, ev.city].filter(Boolean).join(', ')}</td>
                <td><StatusBadge s={ev.status} /></td>
                <td className="a-row-actions">
                  {ev.status === 'published' && <a href={`/evenements/${ev.slug}`} target="_blank" rel="noreferrer" className="a-link">Voir ↗</a>}
                  <button className="a-link is-danger" onClick={() => del(ev)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !data.length && <p className="a-muted">Aucun événement.</p>}
      </Card>
    </>
  );
}

const EMPTY = { title_fr: '', status: 'draft', programme: [], featured: false, city: 'Conakry' };

export function EventEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();
  const toast = useToast();
  const [v, setV] = useState(isNew ? EMPTY : null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!isNew) api(`admin/events/${id}`).then(setV); }, [id, isNew]);
  if (!v) return <div className="a-muted">Chargement…</div>;
  const set = (k, val) => setV(s => ({ ...s, [k]: val }));
  const prog = v.programme || [];
  const setProg = (i, k, val) => set('programme', prog.map((p, j) => (j === i ? { ...p, [k]: val } : p)));
  const move = (i, d) => { const a = [...prog]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); set('programme', a); };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...v, cover_id: v.cover?.id ?? v.cover_id ?? null };
      delete body.cover;
      const r = await api(isNew ? 'admin/events' : `admin/events/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast('Événement enregistré');
      if (isNew) nav(`/admin/evenements/${r.id}`, { replace: true }); else setV(r);
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };

  return (
    <>
      <PageHead title={isNew ? 'Nouvel événement' : v.title_fr} sub={<Link to="/admin/evenements" className="a-link">← Tous les événements</Link>}>
        {!isNew && v.status === 'published' && <a href={`/evenements/${v.slug}`} target="_blank" rel="noreferrer"><Btn variant="ghost">Voir sur le site ↗</Btn></a>}
        <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Btn>
      </PageHead>
      <div className="a-edit">
        <div className="a-edit-main">
          <Card title="Contenu">
            <div className="a-form">
              <BiField label="Titre" obj={v} field="title" set={set} required />
              <BiField label="Sous-titre" obj={v} field="subtitle" set={set} />
              <BiField label="Accroche (cartes, référencement)" obj={v} field="excerpt" set={set} textarea rows={3} />
              <BiField label="Description complète" obj={v} field="body" set={set} textarea rows={8} hint="Une ligne vide = nouveau paragraphe." />
            </div>
          </Card>
          <Card title="Programme" actions={<Btn variant="ghost" small onClick={() => set('programme', [...prog, { day: '', time: '', title_fr: '', title_en: '', desc_fr: '', desc_en: '' }])}>+ Ajouter un temps fort</Btn>}>
            {!prog.length && <p className="a-muted">Aucun élément. Ajoutez les temps forts (jour, heure, titre).</p>}
            <div className="a-repeat">
              {prog.map((p, i) => (
                <div key={i} className="a-repeat-item">
                  <div className="a-repeat-head">
                    <strong>#{i + 1}</strong>
                    <div>
                      <button disabled={!i} onClick={() => move(i, -1)} className="a-icon-btn" title="Monter">↑</button>
                      <button disabled={i === prog.length - 1} onClick={() => move(i, 1)} className="a-icon-btn" title="Descendre">↓</button>
                      <button onClick={() => set('programme', prog.filter((_, j) => j !== i))} className="a-icon-btn is-danger" title="Supprimer">×</button>
                    </div>
                  </div>
                  <div className="a-form a-form-2">
                    <Field label="Jour (ex. « Jour 1 » ou « Ven. 15 oct. »)"><Input value={p.day} onChange={x => setProg(i, 'day', x)} /></Field>
                    <Field label="Heure"><Input value={p.time} onChange={x => setProg(i, 'time', x)} placeholder="20:00" /></Field>
                    <BiField label="Intitulé" obj={p} field="title" set={(k, x) => setProg(i, k, x)} />
                    <BiField label="Détail" obj={p} field="desc" set={(k, x) => setProg(i, k, x)} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="a-edit-side">
          <Card title="Publication">
            <div className="a-form">
              <Field label="Statut"><Select value={v.status} onChange={x => set('status', x)} options={[['draft', 'Brouillon (invisible)'], ['published', 'Publié']]} /></Field>
              <Toggle checked={v.featured} onChange={x => set('featured', x)} label="Mettre en avant" />
              {!isNew && <Field label="Adresse de la page (slug)"><Input value={v.slug} onChange={x => set('slug', x)} /></Field>}
            </div>
          </Card>
          <Card title="Dates & lieu">
            <div className="a-form">
              <Field label="Début *"><Input type="date" value={v.start_date} onChange={x => set('start_date', x)} /></Field>
              <Field label="Fin"><Input type="date" value={v.end_date} onChange={x => set('end_date', x)} /></Field>
              <Field label="Lieu"><Input value={v.venue} onChange={x => set('venue', x)} placeholder="Chapiteau By Issa" /></Field>
              <Field label="Ville"><Input value={v.city} onChange={x => set('city', x)} /></Field>
              <Field label="Adresse"><Input value={v.address} onChange={x => set('address', x)} /></Field>
              <Field label="Lien billetterie" hint="Optionnel — affiche un bouton « Billetterie »."><Input value={v.ticket_url} onChange={x => set('ticket_url', x)} placeholder="https://" /></Field>
            </div>
          </Card>
          <Card title="Visuel">
            <MediaField media={v.cover} onChange={m => setV(s => ({ ...s, cover: m, cover_id: m?.id || null }))} hint="Format portrait conseillé (4:5)." />
          </Card>
        </div>
      </div>
    </>
  );
}
