import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { PageHead, Card, Btn, Field, Input, Select, Uploader, EmbedAdder, Thumb, MediaField, useToast, confirmDelete, fmt } from './ui.jsx';

export default function MediaLibrary() {
  const toast = useToast();
  const [kind, setKind] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ items: [], total: 0, per: 60 });
  const [sel, setSel] = useState(null);
  const load = useCallback(() => api(`admin/media?kind=${kind}&q=${encodeURIComponent(q)}&page=${page}`).then(setData), [kind, q, page]);
  useEffect(() => { load(); }, [load]);

  const saveSel = async () => {
    const r = await api(`admin/media/${sel.id}`, { method: 'PATCH', body: { alt_fr: sel.alt_fr || '', alt_en: sel.alt_en || '', poster_id: sel.poster?.id || null } });
    setSel(r); toast('Média mis à jour'); load();
  };
  const del = async () => {
    if (!confirmDelete('ce média (il sera retiré de tous les projets)')) return;
    await api(`admin/media/${sel.id}`, { method: 'DELETE' }); setSel(null); toast('Média supprimé'); load();
  };
  const pages = Math.ceil(data.total / data.per);

  return (
    <>
      <PageHead title="Médiathèque" sub={`${data.total} média(s) — photos optimisées en WebP, vidéos MP4/WEBM, liens YouTube/Vimeo.`} />
      <div className="a-grid-2 is-uneven">
        <Uploader onDone={load} />
        <Card title="Vidéo en ligne"><EmbedAdder onDone={load} /><p className="a-hint">Conseillé pour les vidéos longues : hébergez-les sur YouTube ou Vimeo et collez le lien.</p></Card>
      </div>
      <div className="a-toolbar">
        <Select value={kind} onChange={x => { setKind(x); setPage(1); }} options={[['', 'Tous'], ['image', 'Images'], ['video', 'Vidéos (fichiers)'], ['embed', 'Vidéos (liens)']]} />
        <input className="a-input" placeholder="Rechercher…" value={q} onChange={e => { setQ(e.target.value); setPage(1); }} />
      </div>
      <div className={`a-lib ${sel ? 'has-sel' : ''}`}>
        <div className="a-media-grid is-lib">
          {data.items.map(m => (
            <button key={m.id} className={`a-media-cell ${sel?.id === m.id ? 'is-sel' : ''}`} onClick={() => setSel(m)}>
              <Thumb m={m} size="100%" /><span className="a-media-name">{m.name}</span>
            </button>
          ))}
        </div>
        {sel && (
          <Card className="a-lib-panel" title="Détails" actions={<button className="a-x" onClick={() => setSel(null)}>×</button>}>
            <div className="a-lib-preview">
              {sel.kind === 'image' && <img src={sel.mid} alt="" />}
              {sel.kind === 'video' && <video src={sel.src} controls poster={sel.poster?.mid} />}
              {sel.kind === 'embed' && <iframe src={sel.embed} title="vidéo" allowFullScreen />}
            </div>
            <dl className="a-dl">
              <dt>Fichier</dt><dd>{sel.name}</dd>
              {sel.width && <><dt>Dimensions</dt><dd>{sel.width} × {sel.height}</dd></>}
              {sel.size && <><dt>Poids</dt><dd>{(sel.size / 1048576).toFixed(1)} Mo</dd></>}
              <dt>Ajouté</dt><dd>{fmt(sel.created_at)}</dd>
            </dl>
            <div className="a-form">
              <Field label="Texte alternatif FR"><Input value={sel.alt_fr} onChange={x => setSel(s => ({ ...s, alt_fr: x }))} /></Field>
              <Field label="Texte alternatif EN"><Input value={sel.alt_en} onChange={x => setSel(s => ({ ...s, alt_en: x }))} /></Field>
              {sel.kind !== 'image' && <MediaField label="Image d’aperçu (vignette)" media={sel.poster} onChange={m => setSel(s => ({ ...s, poster: m }))} />}
              <div className="a-row">
                <Btn onClick={saveSel}>Enregistrer</Btn>
                <Btn variant="danger" onClick={del}>Supprimer</Btn>
              </div>
            </div>
          </Card>
        )}
      </div>
      {pages > 1 && (
        <div className="a-pager">
          <Btn variant="ghost" small disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Précédent</Btn>
          <span>Page {page} / {pages}</span>
          <Btn variant="ghost" small disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Suivant →</Btn>
        </div>
      )}
    </>
  );
}
