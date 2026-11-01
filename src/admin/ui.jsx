import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { api, upload } from '../lib/api.js';

/* ---------- Notifications ---------- */
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((msg, type = 'ok') => {
    const id = Math.random();
    setItems(l => [...l, { id, msg, type }]);
    setTimeout(() => setItems(l => l.filter(x => x.id !== id)), 3800);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts">{items.map(t => <div key={t.id} className={`toast toast-${t.type}`}>{t.msg}</div>)}</div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- Champs ---------- */
export function Field({ label, hint, children, wide, className = '' }) {
  return (
    <label className={`a-field ${wide ? 'is-wide' : ''} ${className}`}>
      {label && <span className="a-label">{label}</span>}
      {children}
      {hint && <span className="a-hint">{hint}</span>}
    </label>
  );
}

export function Input({ value, onChange, ...rest }) {
  return <input className="a-input" value={value ?? ''} onChange={e => onChange(e.target.value)} {...rest} />;
}
export function Textarea({ value, onChange, rows = 4, ...rest }) {
  return <textarea className="a-input" rows={rows} value={value ?? ''} onChange={e => onChange(e.target.value)} {...rest} />;
}
export function Select({ value, onChange, options, ...rest }) {
  return (
    <select className="a-input" value={value ?? ''} onChange={e => onChange(e.target.value)} {...rest}>
      {options.map(o => Array.isArray(o) ? <option key={o[0]} value={o[0]}>{o[1]}</option> : <option key={o} value={o}>{o}</option>)}
    </select>
  );
}
export function Toggle({ checked, onChange, label }) {
  return (
    <label className="a-toggle">
      <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
      <span className="a-toggle-ui" /><span>{label}</span>
    </label>
  );
}

/** Champ bilingue : FR (obligatoire) + EN côte à côte. */
export function BiField({ label, obj, field, set, textarea = false, rows = 4, hint, wide = true, required }) {
  const C = textarea ? Textarea : Input;
  return (
    <div className={`a-field a-bi ${wide ? 'is-wide' : ''}`}>
      <span className="a-label">{label}{required && ' *'}</span>
      <div className="a-bi-row">
        <div className="a-bi-col"><span className="a-flag">FR</span><C value={obj[`${field}_fr`]} onChange={v => set(`${field}_fr`, v)} rows={rows} /></div>
        <div className="a-bi-col"><span className="a-flag is-en">EN</span><C value={obj[`${field}_en`]} onChange={v => set(`${field}_en`, v)} rows={rows} placeholder="(optionnel — repli sur le français)" /></div>
      </div>
      {hint && <span className="a-hint">{hint}</span>}
    </div>
  );
}

export function Btn({ children, variant = 'primary', small, ...rest }) {
  return <button className={`a-btn a-btn-${variant} ${small ? 'is-small' : ''}`} {...rest}>{children}</button>;
}

export function PageHead({ title, sub, children }) {
  return (
    <div className="a-head">
      <div><h1>{title}</h1>{sub && <p>{sub}</p>}</div>
      <div className="a-head-actions">{children}</div>
    </div>
  );
}

export function Badge({ children, tone = 'grey' }) {
  return <span className={`a-badge tone-${tone}`}>{children}</span>;
}

export function Card({ title, children, actions, className = '' }) {
  return (
    <section className={`a-card ${className}`}>
      {(title || actions) && <div className="a-card-head"><h2>{title}</h2><div>{actions}</div></div>}
      {children}
    </section>
  );
}

/* ---------- Modale ---------- */
export function Modal({ open, onClose, title, children, wide, footer }) {
  useEffect(() => {
    if (!open) return;
    const k = e => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="a-modal-bg" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <div className={`a-modal ${wide ? 'is-wide' : ''}`} role="dialog" aria-modal="true">
        <div className="a-modal-head"><h3>{title}</h3><button onClick={onClose} className="a-x" aria-label="Fermer">×</button></div>
        <div className="a-modal-body">{children}</div>
        {footer && <div className="a-modal-foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function confirmDelete(what = 'cet élément') {
  return window.confirm(`Supprimer ${what} ? Cette action est définitive.`);
}

/* ---------- Médias ---------- */
export function Thumb({ m, size = 64 }) {
  if (!m) return <span className="a-thumb is-empty" style={{ width: size, height: size }} />;
  const src = m.kind === 'image' ? m.thumb : m.poster?.thumb || m.thumb;
  return (
    <span className="a-thumb" style={{ width: size, height: size, background: m.color || '#222' }}>
      {src ? <img src={src} alt="" /> : m.kind === 'video' ? <video src={`${m.src}#t=0.5`} muted preload="metadata" /> : null}
      {m.kind !== 'image' && <i className="a-thumb-play">▶</i>}
    </span>
  );
}

/** Zone d'envoi de fichiers vers la médiathèque, avec progression. */
export function Uploader({ onDone, accept = 'image/*,video/mp4,video/webm,video/quicktime', compact }) {
  const toast = useToast();
  const [drag, setDrag] = useState(false);
  const [progress, setProgress] = useState(null);
  const ref = useRef(null);
  const send = async files => {
    const list = Array.from(files || []);
    if (!list.length) return;
    const fd = new FormData(); list.forEach(f => fd.append('files', f));
    setProgress(0);
    try {
      const res = await upload('admin/media', fd, setProgress);
      toast(`${res.length} fichier(s) ajouté(s)`);
      onDone?.(res);
    } catch (e) { toast(e.message, 'error'); }
    setProgress(null);
  };
  return (
    <div className={`a-upload ${drag ? 'is-drag' : ''} ${compact ? 'is-compact' : ''}`}
      onDragOver={e => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); send(e.dataTransfer.files); }}
      onClick={() => progress === null && ref.current.click()} role="button" tabIndex={0}>
      <input ref={ref} type="file" multiple accept={accept} hidden onChange={e => { send(e.target.files); e.target.value = ''; }} />
      {progress === null ? (
        <><strong>+ Ajouter des photos / vidéos</strong><span>Glisser-déposer ou cliquer — JPG, PNG, WEBP, MP4, WEBM. Les images sont optimisées automatiquement.</span></>
      ) : (
        <><strong>Envoi… {Math.round(progress * 100)}%</strong><span className="a-progress"><i style={{ width: `${progress * 100}%` }} /></span>
          {progress >= 1 && <span>Optimisation des images…</span>}</>
      )}
    </div>
  );
}

/** Ajout d'un lien YouTube / Vimeo. */
export function EmbedAdder({ onDone }) {
  const toast = useToast();
  const [url, setUrl] = useState('');
  const add = async () => {
    try { const m = await api('admin/media/embed', { method: 'POST', body: { url } }); setUrl(''); onDone?.([m]); toast('Vidéo ajoutée'); }
    catch (e) { toast(e.message, 'error'); }
  };
  return (
    <div className="a-embed">
      <input className="a-input" placeholder="Lien YouTube ou Vimeo (https://…)" value={url} onChange={e => setUrl(e.target.value)} />
      <Btn variant="ghost" onClick={add} disabled={!url} type="button">Ajouter la vidéo</Btn>
    </div>
  );
}

/** Sélecteur de média (modale médiathèque). */
export function MediaPicker({ open, onClose, onPick, multiple = false, kind }) {
  const [items, setItems] = useState([]);
  const [sel, setSel] = useState([]);
  const [filter, setFilter] = useState(kind || '');
  const load = useCallback(() => api(`admin/media?kind=${filter}`).then(d => setItems(d.items)), [filter]);
  useEffect(() => { if (open) { setSel([]); load(); } }, [open, load]);
  const toggle = m => {
    if (!multiple) { onPick(m); onClose(); return; }
    setSel(s => (s.find(x => x.id === m.id) ? s.filter(x => x.id !== m.id) : [...s, m]));
  };
  return (
    <Modal open={open} onClose={onClose} title={multiple ? 'Choisir des médias' : 'Choisir un média'} wide
      footer={multiple && <><span className="a-muted">{sel.length} sélectionné(s)</span><Btn onClick={() => { onPick(sel); onClose(); }} disabled={!sel.length}>Ajouter la sélection</Btn></>}>
      <div className="a-picker-tools">
        {!kind && <Select value={filter} onChange={setFilter} options={[['', 'Tous les médias'], ['image', 'Images'], ['video', 'Vidéos (fichiers)'], ['embed', 'Vidéos (liens)']]} />}
        <Uploader compact onDone={res => { load(); if (!multiple && res[0]) { onPick(res[0]); onClose(); } else setSel(s => [...s, ...res]); }} />
        {!kind && <EmbedAdder onDone={res => { load(); if (!multiple) { onPick(res[0]); onClose(); } else setSel(s => [...s, ...res]); }} />}
      </div>
      <div className="a-media-grid">
        {items.map(m => (
          <button type="button" key={m.id} className={`a-media-cell ${sel.find(x => x.id === m.id) ? 'is-sel' : ''}`} onClick={() => toggle(m)}>
            <Thumb m={m} size="100%" />
            <span className="a-media-name">{m.name}</span>
          </button>
        ))}
        {!items.length && <p className="a-muted">Aucun média pour l’instant — ajoutez-en ci-dessus.</p>}
      </div>
    </Modal>
  );
}

/** Champ « image de couverture » (un média). */
export function MediaField({ label, media, onChange, hint, kind = 'image' }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="a-field">
      {label && <span className="a-label">{label}</span>}
      <div className="a-mediafield">
        <button type="button" className="a-mediafield-prev" onClick={() => setOpen(true)}>
          {media ? <Thumb m={media} size="100%" /> : <span>Choisir</span>}
        </button>
        <div className="a-mediafield-actions">
          <Btn variant="ghost" small type="button" onClick={() => setOpen(true)}>{media ? 'Changer' : 'Choisir'}</Btn>
          {media && <Btn variant="link" small type="button" onClick={() => onChange(null)}>Retirer</Btn>}
        </div>
      </div>
      {hint && <span className="a-hint">{hint}</span>}
      <MediaPicker open={open} onClose={() => setOpen(false)} onPick={m => onChange(m)} kind={kind} />
    </div>
  );
}

/** Formulaire avec état local + sauvegarde. */
export function useForm(initial) {
  const [v, setV] = useState(initial);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { setV(initial); setDirty(false); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initial]);
  const set = useCallback((k, val) => { setV(s => ({ ...s, [k]: val })); setDirty(true); }, []);
  return { v, set, setV, dirty, setDirty };
}

export const STATUS = {
  draft: ['Brouillon', 'grey'], published: ['Publié', 'green'], open: ['Ouvert', 'green'], closed: ['Clôturé', 'red'],
  new: ['Nouvelle', 'yellow'], review: ['En étude', 'blue'], shortlist: ['Présélection', 'violet'], accepted: ['Retenue', 'green'], rejected: ['Non retenue', 'red'],
};
export function StatusBadge({ s }) {
  const [l, tone] = STATUS[s] || [s, 'grey'];
  return <Badge tone={tone}>{l}</Badge>;
}

export const fmt = d => (d ? new Date(d.length <= 10 ? `${d}T12:00:00` : d.replace(' ', 'T') + 'Z').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—');
export const fmtTime = d => (d ? new Date(d.replace(' ', 'T') + 'Z').toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '');
