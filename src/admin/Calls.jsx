import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, useApi } from '../lib/api.js';
import {
  PageHead, Card, Btn, Field, Input, BiField, Select, Toggle, MediaField, Thumb, StatusBadge, useToast, confirmDelete, fmt,
} from './ui.jsx';

export const ROLES = [['mannequin', 'Mannequins'], ['createur', 'Créateurs / exposants'], ['benevole', 'Bénévoles'], ['photo', 'Photo / vidéo'], ['beaute', 'Maquillage / coiffure'], ['autre', 'Autre']];

export function CallsList() {
  const { data, reload } = useApi('admin/calls');
  const toast = useToast();
  const del = async c => {
    if (!confirmDelete(`l’annonce « ${c.title_fr} » (les candidatures reçues sont conservées)`)) return;
    await api(`admin/calls/${c.id}`, { method: 'DELETE' }); toast('Annonce supprimée'); reload();
  };
  const duplicate = async c => {
    const full = await api(`admin/calls/${c.id}`);
    const body = { ...full, title_fr: `${full.title_fr} (copie)`, status: 'draft', cover_id: full.cover_id };
    delete body.id; delete body.slug; delete body.cover; delete body.event; delete body.is_open;
    await api('admin/calls', { method: 'POST', body }); toast('Annonce dupliquée'); reload();
  };
  return (
    <>
      <PageHead title="Appels à candidature" sub="Castings, appels à créateurs, recrutements : chaque annonce a sa page et son formulaire.">
        <Link to="/admin/annonces/new"><Btn>+ Nouvelle annonce</Btn></Link>
      </PageHead>
      <Card>
        <table className="a-table is-list">
          <thead><tr><th /><th>Annonce</th><th>Type</th><th>Date limite</th><th>Statut</th><th /></tr></thead>
          <tbody>
            {(data || []).map(c => (
              <tr key={c.id}>
                <td><Thumb m={c.cover} size={52} /></td>
                <td><Link to={`/admin/annonces/${c.id}`} className="a-link-strong">{c.title_fr}</Link><small>{c.event?.title_fr || '—'}</small></td>
                <td>{ROLES.find(r => r[0] === c.role_type)?.[1] || '—'}</td>
                <td>{fmt(c.deadline)}{c.status === 'open' && !c.is_open && <small className="a-warn">dépassée</small>}</td>
                <td><StatusBadge s={c.status} /></td>
                <td className="a-row-actions">
                  <Link to={`/admin/candidatures?call=${c.id}`} className="a-link">Candidatures</Link>
                  <button className="a-link" onClick={() => duplicate(c)}>Dupliquer</button>
                  <button className="a-link is-danger" onClick={() => del(c)}>Supprimer</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}

const EMPTY = { title_fr: '', status: 'draft', role_type: 'mannequin', location: 'Conakry', questions: [], require_photos: true, require_cv: false };

export function CallEdit() {
  const { id } = useParams();
  const isNew = id === 'new';
  const nav = useNavigate();
  const toast = useToast();
  const events = useApi('admin/events').data || [];
  const [v, setV] = useState(isNew ? EMPTY : null);
  const [saving, setSaving] = useState(false);
  useEffect(() => { if (!isNew) api(`admin/calls/${id}`).then(setV); }, [id, isNew]);
  if (!v) return <div className="a-muted">Chargement…</div>;
  const set = (k, val) => setV(s => ({ ...s, [k]: val }));
  const qs = v.questions || [];
  const setQ = (i, k, val) => set('questions', qs.map((q, j) => (j === i ? { ...q, [k]: val } : q)));
  const save = async () => {
    setSaving(true);
    try {
      const body = { ...v, event_id: v.event_id || null, questions: qs.map((q, i) => ({ ...q, id: q.id || `q${i + 1}${Date.now().toString(36).slice(-3)}` })) };
      delete body.cover; delete body.event; delete body.is_open;
      const r = await api(isNew ? 'admin/calls' : `admin/calls/${id}`, { method: isNew ? 'POST' : 'PUT', body });
      toast('Annonce enregistrée');
      if (isNew) nav(`/admin/annonces/${r.id}`, { replace: true }); else setV(r);
    } catch (e) { toast(e.message, 'error'); }
    setSaving(false);
  };
  return (
    <>
      <PageHead title={isNew ? 'Nouvelle annonce' : v.title_fr} sub={<Link to="/admin/annonces" className="a-link">← Toutes les annonces</Link>}>
        {!isNew && v.status !== 'draft' && <a href={`/candidatures/${v.slug}`} target="_blank" rel="noreferrer"><Btn variant="ghost">Voir ↗</Btn></a>}
        <Btn onClick={save} disabled={saving}>{saving ? 'Enregistrement…' : 'Enregistrer'}</Btn>
      </PageHead>
      <div className="a-edit">
        <div className="a-edit-main">
          <Card title="Annonce">
            <div className="a-form">
              <BiField label="Intitulé du poste / de l’appel" obj={v} field="title" set={set} required />
              <BiField label="Résumé (liste et haut de page)" obj={v} field="summary" set={set} textarea rows={2} />
              <BiField label="Description du poste" obj={v} field="description" set={set} textarea rows={6} />
              <BiField label="Missions" obj={v} field="missions" set={set} textarea rows={5} hint="Une ligne = un point." />
              <BiField label="Profil recherché" obj={v} field="profile" set={set} textarea rows={5} hint="Une ligne = un point." />
              <BiField label="Ce que nous offrons" obj={v} field="benefits" set={set} textarea rows={4} hint="Une ligne = un point." />
            </div>
          </Card>
          <Card title="Formulaire de candidature" actions={<Btn variant="ghost" small onClick={() => set('questions', [...qs, { label_fr: '', label_en: '', type: 'text', required: false }])}>+ Question</Btn>}>
            <p className="a-hint">Toujours demandés : prénom, nom, e-mail, téléphone, ville, pays, date de naissance, lien Instagram/portfolio, motivation.</p>
            <div className="a-row">
              <Toggle checked={v.require_photos} onChange={x => set('require_photos', x)} label="Photos obligatoires" />
              <Toggle checked={v.require_cv} onChange={x => set('require_cv', x)} label="CV / dossier PDF obligatoire" />
            </div>
            <div className="a-repeat">
              {qs.map((q, i) => (
                <div key={i} className="a-repeat-item">
                  <div className="a-repeat-head">
                    <strong>Question {i + 1}</strong>
                    <button className="a-icon-btn is-danger" onClick={() => set('questions', qs.filter((_, j) => j !== i))}>×</button>
                  </div>
                  <div className="a-form a-form-2">
                    <BiField label="Libellé" obj={q} field="label" set={(k, x) => setQ(i, k, x)} />
                    <Field label="Type de réponse"><Select value={q.type} onChange={x => setQ(i, 'type', x)} options={[['text', 'Texte court'], ['textarea', 'Texte long'], ['select', 'Liste de choix']]} /></Field>
                    <Toggle checked={q.required} onChange={x => setQ(i, 'required', x)} label="Obligatoire" />
                    {q.type === 'select' && <BiField label="Choix (un par ligne)" obj={q} field="options" set={(k, x) => setQ(i, k, x)} textarea rows={3} />}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
        <div className="a-edit-side">
          <Card title="Publication">
            <div className="a-form">
              <Field label="Statut" hint="« Ouvert » : visible avec formulaire. « Clôturé » : visible sans formulaire."><Select value={v.status} onChange={x => set('status', x)} options={[['draft', 'Brouillon (invisible)'], ['open', 'Ouvert'], ['closed', 'Clôturé']]} /></Field>
              <Field label="Date limite" hint="Le formulaire se ferme automatiquement après cette date."><Input type="date" value={v.deadline} onChange={x => set('deadline', x)} /></Field>
              {!isNew && <Field label="Adresse (slug)"><Input value={v.slug} onChange={x => set('slug', x)} /></Field>}
            </div>
          </Card>
          <Card title="Détails">
            <div className="a-form">
              <Field label="Type de poste"><Select value={v.role_type} onChange={x => set('role_type', x)} options={ROLES} /></Field>
              <Field label="Événement lié"><Select value={v.event_id || ''} onChange={x => set('event_id', x ? Number(x) : null)} options={[['', '— Aucun —'], ...events.map(e => [e.id, e.title_fr])]} /></Field>
              <Field label="Lieu"><Input value={v.location} onChange={x => set('location', x)} /></Field>
              <Field label="Engagement FR" hint="Ex. Rémunéré, Bénévolat, Sélection sur dossier"><Input value={v.engagement_fr} onChange={x => set('engagement_fr', x)} /></Field>
              <Field label="Engagement EN"><Input value={v.engagement_en} onChange={x => set('engagement_en', x)} /></Field>
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
