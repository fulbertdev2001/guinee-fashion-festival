import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../lib/api.js';
import { PageHead, Card, Btn, Field, Input, BiField, Select, MediaField, Thumb, Badge, useToast, confirmDelete, fmt, fmtTime } from './ui.jsx';

const ACTION_STATUS = [['draft', 'Brouillon (invisible)'], ['published', 'Publié — inscriptions ouvertes'], ['closed', 'Visible — inscriptions closes']];
const REG_STATUS = { new: ['Nouvelle', 'yellow'], confirmed: ['Confirmée', 'green'], cancelled: ['Annulée', 'red'] };
const ActionBadge = ({ s }) => <Badge tone={{ draft: 'grey', published: 'green', closed: 'red' }[s] || 'grey'}>{{ draft: 'Brouillon', published: 'Ouvert', closed: 'Clos' }[s] || s}</Badge>;

export function ActionsList() {
  const { data, reload } = useApi('admin/social_actions');
  const toast = useToast();
  const del = async a => {
    if (!confirmDelete(`l’action « ${a.title_fr} » et ses ${a.registered} inscription(s)`)) return;
    await api(`admin/social_actions/${a.id}`, { method: 'DELETE' }); toast('Action supprimée'); reload();
  };
  return (
    <>
      <PageHead title="Actions sociales" sub="Actions menées autour de chaque événement. Les visiteurs s’inscrivent depuis la page « Le Festival ».">
        <a href="/api/admin/registrations/export.csv"><Btn variant="ghost">Exporter toutes les inscriptions (CSV)</Btn></a>
        <Link to="/admin/actions/new"><Btn>+ Nouvelle action</Btn></Link>
      </PageHead>
      <Card>
        <table className="a-table is-list">
          <thead><tr><th /><th>Action</th><th>Événement</th><th>Date</th><th>Inscrits</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {(data || []).map(a => (
              <tr key={a.id}>
                <td><Thumb m={a.cover} size={52} /></td>
                <td><Link to={`/admin/actions/${a.id}`} className="a-link-strong">{a.title_fr}</Link><small>{a.location || '—'}</small></td>
                <td>{a.event?.title_fr || '—'}</td>
                <td>{fmt(a.action_date)}</td>
                <td>
                  <Link to={`/admin/actions/${a.id}#inscriptions`} className="a-link">{a.registered}{a.capacity ? ` / ${a.capacity}` : ''}</Link>
                  {a.registrations_new > 0 && <small className="a-warn">{a.registrations_new} nouvelle(s)</small>}
                </td>
                <td><ActionBadge s={a.status} /></td>
                <td className="a-row-actions"><button className="a-link is-danger" onClick={() => del(a)}>Supprimer</button></td>
              </tr>
            ))}
          </tbody>
        </table>
        {data && !data.length && <p className="a-muted">Aucune action sociale. Cliquez sur « Nouvelle action » pour en créer une.</p>}
      </Card>
    </>
  );
}

function Registrations({ actionId }) {
  const [status, setStatus] = useState('');
  const { data, reload } = useApi(`admin/registrations?action_id=${actionId}${status ? `&status=${status}` : ''}`);
  const toast = useToast();
  const setSt = async (r, st) => { await api(`admin/registrations/${r.id}`, { method: 'PATCH', body: { status: st } }); reload(); };
  const del = async r => {
    if (!confirmDelete(`l’inscription de ${r.first_name} ${r.last_name}`)) return;
    await api(`admin/registrations/${r.id}`, { method: 'DELETE' }); toast('Inscription supprimée'); reload();
  };
  const total = (data || []).filter(r => r.status !== 'cancelled').reduce((n, r) => n + r.participants, 0);
  return (
    <Card title={`Inscriptions${data ? ` — ${total} personne(s)` : ''}`} actions={<>
      <Select value={status} onChange={setStatus} options={[['', 'Tous les statuts'], ['new', 'Nouvelles'], ['confirmed', 'Confirmées'], ['cancelled', 'Annulées']]} />
      <a href={`/api/admin/registrations/export.csv?action_id=${actionId}`}><Btn variant="ghost" small>Export CSV</Btn></a>
    </>}>
      <div id="inscriptions" />
      <table className="a-table is-list">
        <thead><tr><th>Inscrit·e</th><th>Contact</th><th>Pers.</th><th>Reçue le</th><th>Statut</th><th /></tr></thead>
        <tbody>
          {(data || []).map(r => (
            <tr key={r.id}>
              <td><strong>{r.first_name} {r.last_name}</strong><small>{r.city || '—'}</small>{r.message && <small>« {r.message} »</small>}</td>
              <td><a href={`mailto:${r.email}`} className="a-link">{r.email}</a><small>{r.phone || '—'}</small></td>
              <td>{r.participants}</td>
              <td className="a-muted">{fmtTime(r.created_at)}</td>
              <td><Select value={r.status} onChange={st => setSt(r, st)} options={Object.entries(REG_STATUS).map(([k, v]) => [k, v[0]])} /></td>
              <td className="a-row-actions"><button className="a-link is-danger" onClick={() => del(r)}>Supprimer</button></td>
            </tr>
          ))}
        </tbody>
      </table>
      {data && !data.length && <p className="a-muted">Aucune inscription pour le moment.</p>}
    </Card>
  );
}

const EMPTY = { title_fr: '', status: 'draft', location: 'Conakry', capacity: '' };

export function ActionEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();
  const toast = useToast();
  const events = useApi('admin/events').data || [];
  const [v, setV] = useState(isNew ? EMPTY : null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!isNew) api(`admin/social_actions/${id}`).then(setV); }, [id, isNew]);
  if (!v) return <div className="a-muted">Chargement…</div>;
  const set = (k, val) => setV(s => ({ ...s, [k]: val }));
  const save = async () => {
    setSaving(true);
    try {
      const body = { ...v, event_id: v.event_id || null, capacity: v.capacity ? Number(v.capacity) : null };
      for (const k of ['cover', 'event', 'registered', 'spots_left', 'is_open', 'registrations_new']) delete body[k];
      const r = await api(isNew ? 'admin/social_actions' : `admin/social_actions/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast('Action enregistrée');
      if (isNew) nav(`/admin/actions/${r.id}`, { replace: true }); else setV(r);
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };
  return (
    <>
      <PageHead title={isNew ? 'Nouvelle action sociale' : v.title_fr} sub={<Link to="/admin/actions" className="a-link">← Toutes les actions</Link>}>
        <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Btn>
      </PageHead>
      <div className="a-edit">
        <div className="a-edit-main">
          <Card title="Action">
            <div className="a-form">
              <BiField label="Titre" obj={v} field="title" set={set} required />
              <BiField label="Description" obj={v} field="description" set={set} textarea rows={7} hint="Objectif, déroulé, public concerné. Une ligne vide = nouveau paragraphe." />
            </div>
          </Card>
          {!isNew && <Registrations actionId={id} />}
        </div>
        <div className="a-edit-side">
          <Card title="Publication">
            <div className="a-form">
              <Field label="Statut"><Select value={v.status} onChange={x => set('status', x)} options={ACTION_STATUS} /></Field>
              <Field label="Événement"><Select value={v.event_id || ''} onChange={x => set('event_id', x ? Number(x) : null)} options={[['', '— Aucun —'], ...events.map(e => [e.id, e.title_fr])]} /></Field>
              {!isNew && <Field label="Adresse (slug)"><Input value={v.slug} onChange={x => set('slug', x)} /></Field>}
            </div>
          </Card>
          <Card title="Date et lieu">
            <div className="a-form">
              <Field label="Date"><Input type="date" value={v.action_date} onChange={x => set('action_date', x)} /></Field>
              <Field label="Heure" hint="Ex. 10h00 – 13h00"><Input value={v.action_time} onChange={x => set('action_time', x)} /></Field>
              <Field label="Lieu"><Input value={v.location} onChange={x => set('location', x)} /></Field>
              <Field label="Nombre de places" hint="Vide = illimité. Les inscriptions se ferment automatiquement quand c’est complet."><Input type="number" min="1" value={v.capacity ?? ''} onChange={x => set('capacity', x)} /></Field>
            </div>
          </Card>
          <Card title="Visuel">
            <MediaField media={v.cover} onChange={m => setV(s => ({ ...s, cover: m, cover_id: m?.id || null }))} />
          </Card>
        </div>
      </div>
    </>
  );
}
