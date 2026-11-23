import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi, upload } from '../lib/api.js';
import { MediaIds } from './SiteSettings.jsx';
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

const fmtSize = n => (n > 1048576 ? `${(n / 1048576).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round((n || 0) / 1024))} Ko`);

/** Documents PDF joints à l'article (envoi, suppression, ordre). */
function DocsField({ docs = [], onChange }) {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const pick = async e => {
    const files = [...e.target.files]; e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    try {
      const form = new FormData(); files.forEach(f => form.append('files', f));
      const res = await upload('admin/documents', form);
      onChange([...docs, ...res]); toast(`${res.length} PDF ajouté(s) — pensez à enregistrer`);
    } catch (x) { toast(x.message, 'error'); }
    setBusy(false);
  };
  const move = (i, d) => { const a = [...docs]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); onChange(a); };
  return (
    <div className="a-field is-wide">
      {docs.length > 0 && (
        <ul className="a-docs">
          {docs.map((d, i) => (
            <li key={d.id} className="a-doc">
              <span className="a-doc-badge">PDF</span>
              <a href={d.url} target="_blank" rel="noreferrer" className="a-doc-name">{d.name}<small>{fmtSize(d.size)}</small></a>
              <span className="a-doc-actions">
                <button type="button" className="a-icon-btn" disabled={!i} onClick={() => move(i, -1)} title="Monter">↑</button>
                <button type="button" className="a-icon-btn" disabled={i === docs.length - 1} onClick={() => move(i, 1)} title="Descendre">↓</button>
                <button type="button" className="a-icon-btn is-danger" onClick={() => onChange(docs.filter(x => x.id !== d.id))} title="Retirer">×</button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <input ref={input} type="file" accept="application/pdf,.pdf" multiple hidden onChange={pick} />
      <div><Btn type="button" variant="ghost" small disabled={busy} onClick={() => input.current?.click()}>{busy ? 'Envoi…' : '+ Ajouter des PDF'}</Btn></div>
      <span className="a-hint">PDF uniquement, 25 Mo maximum par fichier. Les visiteurs pourront les ouvrir ou les télécharger depuis l’article.</span>
    </div>
  );
}

const EMPTY = { title_fr: '', outlet: '', url: '', gallery_ids: [], files: [], published_at: new Date().toISOString().slice(0, 10), status: 'published' };

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
      const body = { ...v, file_ids: (v.files || []).map(d => d.id) };
      for (const k of ['cover', 'gallery', 'files', 'gallery_count', 'files_count', 'has_body']) delete body[k];
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
              <BiField label="Contenu complet de l’article" obj={v} field="body" set={set} textarea rows={14} hint="Le texte intégral affiché sur la page de l’article. Une ligne vide = nouveau paragraphe." />
              <Field label="Lien vers l’article original (optionnel)" hint="Adresse complète (https://…). Un bouton « Lire sur le site du média » s’affiche sur la page de l’article."><Input value={v.url} onChange={x => set('url', x)} placeholder="https://" /></Field>
            </div>
          </Card>
          <Card title="Images et vidéos">
            <MediaIds label="Galerie de l’article" kind="" ids={v.gallery_ids || []} onChange={ids => set('gallery_ids', ids)}
              hint="Photos, vidéos (fichiers) ou liens YouTube / Vimeo. Elles s’affichent en galerie sous le texte, avec visionneuse plein écran." />
          </Card>
          <Card title="Documents PDF">
            <DocsField docs={v.files || []} onChange={docs => set('files', docs)} />
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
