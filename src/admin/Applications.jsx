import { Fragment, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, useApi } from '../lib/api.js';
import { PageHead, Card, Btn, Select, Textarea, StatusBadge, STATUS, useToast, confirmDelete, fmt, fmtTime } from './ui.jsx';

const ORDER = ['new', 'review', 'shortlist', 'accepted', 'rejected'];

function Detail({ a, onChange, onDelete }) {
  const toast = useToast();
  const [notes, setNotes] = useState(a.notes || '');
  useEffect(() => setNotes(a.notes || ''), [a.id, a.notes]);
  const patch = async body => { const r = await api(`admin/applications/${a.id}`, { method: 'PATCH', body }); onChange(r); };
  const fileUrl = i => `/api/admin/applications/${a.id}/files/${i}`;
  const photos = a.files.map((f, i) => ({ ...f, i })).filter(f => f.mime.startsWith('image/'));
  const docs = a.files.map((f, i) => ({ ...f, i })).filter(f => !f.mime.startsWith('image/'));
  const wa = a.phone ? `https://wa.me/${a.phone.replace(/[^\d]/g, '')}` : null;
  return (
    <Card className="a-app-detail">
      <div className="a-app-top">
        <div>
          <h2>{a.first_name} {a.last_name}</h2>
          <p className="a-muted">{a.call_title} · reçue le {fmtTime(a.created_at)} · {a.lang === 'en' ? 'anglais' : 'français'}</p>
        </div>
        <div className="a-stars" title="Note interne">
          {[1, 2, 3, 4, 5].map(n => <button key={n} className={n <= a.rating ? 'on' : ''} onClick={() => patch({ rating: n === a.rating ? 0 : n })}>★</button>)}
        </div>
      </div>
      <div className="a-status-row">
        {ORDER.map(s => (
          <button key={s} className={`a-status-btn tone-${STATUS[s][1]} ${a.status === s ? 'is-on' : ''}`} onClick={() => patch({ status: s })}>{STATUS[s][0]}</button>
        ))}
      </div>
      <dl className="a-dl is-cols">
        <dt>E-mail</dt><dd><a href={`mailto:${a.email}`} className="a-link">{a.email}</a></dd>
        <dt>Téléphone</dt><dd>{a.phone} {wa && <a href={wa} target="_blank" rel="noreferrer" className="a-link">WhatsApp ↗</a>}</dd>
        <dt>Ville / pays</dt><dd>{[a.city, a.country].filter(Boolean).join(', ') || '—'}</dd>
        <dt>Naissance</dt><dd>{a.birthdate ? fmt(a.birthdate) : '—'}</dd>
        <dt>Lien</dt><dd>{a.link ? <a href={a.link} target="_blank" rel="noreferrer" className="a-link">{a.link}</a> : '—'}</dd>
        {a.answers.filter(x => x.value).map(x => <Fragment key={x.id}><dt>{x.label}</dt><dd>{x.value}</dd></Fragment>)}
      </dl>
      {a.message && <><h3 className="a-h3">Motivation</h3><p className="a-pre">{a.message}</p></>}
      {photos.length > 0 && <>
        <h3 className="a-h3">Photos ({photos.length})</h3>
        <div className="a-app-photos">
          {photos.map(f => <a key={f.i} href={fileUrl(f.i)} target="_blank" rel="noreferrer"><img src={fileUrl(f.i)} alt={f.name} loading="lazy" /></a>)}
        </div>
      </>}
      {docs.length > 0 && <>
        <h3 className="a-h3">Documents</h3>
        {docs.map(f => <p key={f.i}><a href={fileUrl(f.i)} target="_blank" rel="noreferrer" className="a-link">📄 {f.name}</a> · <a href={`${fileUrl(f.i)}?download=1`} className="a-link">télécharger</a></p>)}
      </>}
      <h3 className="a-h3">Notes internes</h3>
      <Textarea value={notes} onChange={setNotes} rows={3} placeholder="Visible uniquement par l’équipe" />
      <div className="a-row">
        <Btn small onClick={async () => { await patch({ notes }); toast('Notes enregistrées'); }} disabled={notes === (a.notes || '')}>Enregistrer les notes</Btn>
        <Btn small variant="danger" onClick={onDelete}>Supprimer la candidature</Btn>
      </div>
    </Card>
  );
}

export default function Applications() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const calls = useApi('admin/calls').data || [];
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const call = params.get('call') || '';
  const [list, setList] = useState([]);
  const selId = Number(params.get('id')) || null;
  const qs = useMemo(() => new URLSearchParams({ ...(call && { call_id: call }), ...(status && { status }), ...(q && { q }) }).toString(), [call, status, q]);
  const load = () => api(`admin/applications?${qs}`).then(setList);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [qs]);
  const [selected, setSelected] = useState(null);
  useEffect(() => {
    if (!selId) { setSelected(null); return; }
    api(`admin/applications/${selId}`).then(setSelected).catch(() => setSelected(null));
  }, [selId]);
  const setParam = (k, v) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }); };

  const onChange = r => { setSelected(r); setList(l => l.map(x => (x.id === r.id ? r : x))); };
  const onDelete = async () => {
    if (!confirmDelete('cette candidature et ses fichiers')) return;
    await api(`admin/applications/${selected.id}`, { method: 'DELETE' }); toast('Candidature supprimée');
    setParam('id', ''); load();
  };
  const counts = ORDER.reduce((o, s) => ({ ...o, [s]: list.filter(a => a.status === s).length }), {});

  return (
    <>
      <PageHead title="Candidatures reçues" sub={`${list.length} candidature(s) affichée(s)`}>
        <a href={`/api/admin/applications/export.csv?${qs}`}><Btn variant="ghost">Exporter (CSV / Excel)</Btn></a>
      </PageHead>
      <div className="a-toolbar">
        <Select value={call} onChange={x => setParam('call', x)} options={[['', 'Toutes les annonces'], ...calls.map(c => [String(c.id), c.title_fr])]} />
        <Select value={status} onChange={setStatus} options={[['', 'Tous les statuts'], ...ORDER.map(s => [s, `${STATUS[s][0]}${!status ? ` (${counts[s]})` : ''}`])]} />
        <input className="a-input" placeholder="Nom, e-mail, ville…" value={q} onChange={e => setQ(e.target.value)} />
      </div>
      <div className={`a-split ${selected ? 'has-sel' : ''}`}>
        <div className="a-app-list">
          {list.map(a => (
            <button key={a.id} className={`a-app-item ${selId === a.id ? 'is-sel' : ''} ${a.status === 'new' ? 'is-new' : ''}`} onClick={() => setParam('id', a.id)}>
              <span className="a-app-avatar">
                {a.files.find(f => f.mime.startsWith('image/'))
                  ? <img src={`/api/admin/applications/${a.id}/files/${a.files.findIndex(f => f.mime.startsWith('image/'))}`} alt="" loading="lazy" />
                  : `${a.first_name?.[0] || ''}${a.last_name?.[0] || ''}`}
              </span>
              <span className="a-app-main">
                <strong>{a.first_name} {a.last_name}</strong>
                <small>{a.call_title} · {fmt(a.created_at)}</small>
              </span>
              <span className="a-app-side">
                <StatusBadge s={a.status} />
                {a.rating > 0 && <small className="a-rating">{'★'.repeat(a.rating)}</small>}
              </span>
            </button>
          ))}
          {!list.length && <p className="a-muted a-pad">Aucune candidature ne correspond.</p>}
        </div>
        {selected && (
          <div className="a-split-detail">
            <button className="a-link a-back-mobile" onClick={() => setParam('id', '')}>← Retour à la liste</button>
            <Detail a={selected} onChange={onChange} onDelete={onDelete} />
          </div>
        )}
      </div>
    </>
  );
}
