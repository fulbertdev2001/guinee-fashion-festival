import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../lib/api.js';
import { PageHead, Card, Btn, Field, Input, BiField, Select, MediaField, Thumb, StatusBadge, useToast, confirmDelete, fmt } from './ui.jsx';

export function PressList() {
  const { data, reload } = useApi('admin/press');
  const toast = useToast();
  const del = async a => {
    if (!confirmDelete(`l’article « ${a.title_fr} »`)) return;
    await api(`admin/press/${a.id}`, { method: 'DELETE' }); toast('Article supprimé'); reload();
  };
  return (
    <>
      <PageHead title="Presse" sub="Les articles et reportages qui parlent du festival, affichés sur la page « Presse ».">
        <Link to="/admin/presse/new"><Btn>+ Nouvel article</Btn></Link>
      </PageHead>
      <Card>
        <table className="a-table is-list">
          <thead><tr><th /><th>Article</th><th>Média</th><th>Date</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {(data || []).map(a => (
              <tr key={a.id}>
                <td><Thumb m={a.cover} size={52} /></td>
                <td><Link to={`/admin/presse/${a.id}`} className="a-link-strong">{a.title_fr}</Link>{a.url && <small>{a.url}</small>}</td>
                <td>{a.outlet || '—'}</td>
                <td>{fmt(a.published_at)}</td>
                <td><StatusBadge s={a.status} /></td>
                <td className="a-row-actions">
                  {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="a-link">Ouvrir ↗</a>}
                  <button className="a-link is-danger" onClick={() => del(a)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !data.length && <p className="a-muted">Aucun article. Cliquez sur « Nouvel article » pour commencer.</p>}
      </Card>
    </>
  );
}

const EMPTY = { title_fr: '', outlet: '', url: '', published_at: new Date().toISOString().slice(0, 10), status: 'published' };

export function PressEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();
  const toast = useToast();
  const [v, setV] = useState(isNew ? EMPTY : null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!isNew) api(`admin/press/${id}`).then(setV); }, [id, isNew]);
  if (!v) return <div className="a-muted">Chargement…</div>;
  const set = (k, val) => setV(s => ({ ...s, [k]: val }));
  const save = async () => {
    setSaving(true);
    try {
      const body = { ...v }; delete body.cover;
      const r = await api(isNew ? 'admin/press' : `admin/press/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast('Article enregistré');
      if (isNew) nav(`/admin/presse/${r.id}`, { replace: true }); else setV(r);
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };
  return (
    <>
      <PageHead title={isNew ? 'Nouvel article' : v.title_fr} sub={<Link to="/admin/presse" className="a-link">← Tous les articles</Link>}>
        <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Btn>
      </PageHead>
      <div className="a-edit">
        <div className="a-edit-main">
          <Card title="Article">
            <div className="a-form">
              <BiField label="Titre de l’article" obj={v} field="title" set={set} required />
              <BiField label="Extrait (2-3 phrases)" obj={v} field="excerpt" set={set} textarea rows={3} />
              <Field label="Lien vers l’article" hint="Adresse complète (https://…). Le visiteur est envoyé sur le site du média."><Input value={v.url} onChange={x => set('url', x)} placeholder="https://" /></Field>
            </div>
          </Card>
        </div>
        <div className="a-edit-side">
          <Card title="Publication">
            <div className="a-form">
              <Field label="Statut"><Select value={v.status} onChange={x => set('status', x)} options={[['published', 'Publié'], ['draft', 'Brouillon (invisible)']]} /></Field>
              <Field label="Date de parution"><Input type="date" value={v.published_at} onChange={x => set('published_at', x)} /></Field>
              <Field label="Média / journal" hint="Ex. Guinéenews, Jeune Afrique, RTG…"><Input value={v.outlet} onChange={x => set('outlet', x)} /></Field>
              {!isNew && <Field label="Adresse (slug)"><Input value={v.slug} onChange={x => set('slug', x)} /></Field>}
            </div>
          </Card>
          <Card title="Visuel (optionnel)">
            <MediaField media={v.cover} onChange={m => setV(s => ({ ...s, cover: m, cover_id: m?.id || null }))} hint="Sans visuel, une carte jaune avec le nom du média s’affiche." />
          </Card>
        </div>
      </div>
    </>
  );
}
