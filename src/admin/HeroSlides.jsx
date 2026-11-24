import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { Btn, Field, Input, BiField, MediaPicker, Thumb } from './ui.jsx';

const EMPTY = { kicker_fr: '', kicker_en: '', title_fr: '', title_en: '', text_fr: '', text_en: '', button_label_fr: '', button_label_en: '', button_url: '', duration: '' };
const hasContent = s => ['kicker_fr', 'title_fr', 'text_fr', 'button_label_fr'].some(k => String(s[k] || '').trim());

/** Éditeur des diapositives du hero : média + texte, bouton et durée propres à chaque diapositive. */
export default function HeroSlides({ slides = [], onChange, defaultSeconds = 6 }) {
  const [media, setMedia] = useState({});
  const [pick, setPick] = useState(null); // 'add' | index (changer le média)
  const [open, setOpen] = useState(null);
  const ids = [...new Set(slides.map(s => s.media_id).filter(Boolean))];
  useEffect(() => {
    if (!ids.length) return;
    api(`admin/media/by-ids?ids=${ids.join(',')}`).then(list => setMedia(m => ({ ...m, ...Object.fromEntries(list.map(x => [x.id, x])) })));
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const up = (i, patch) => onChange(slides.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const move = (i, d) => { const a = [...slides]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); onChange(a); setOpen(open === i ? i + d : open); };
  const remove = i => { onChange(slides.filter((_, j) => j !== i)); setOpen(null); };
  const onPick = list => {
    const arr = Array.isArray(list) ? list : [list];
    setMedia(m => ({ ...m, ...Object.fromEntries(arr.map(x => [x.id, x])) }));
    if (pick === 'add') onChange([...slides, ...arr.map(x => ({ media_id: x.id }))]);
    else if (typeof pick === 'number' && arr[0]) up(pick, { media_id: arr[0].id });
  };

  return (
    <div className="a-field is-wide">
      <span className="a-label">Diapositives du hero (plein écran, page d’accueil)</span>
      <div className="a-slides">
        {slides.map((s, i) => {
          const m = media[s.media_id]; const isOpen = open === i;
          return (
            <div key={`${s.media_id}-${i}`} className={`a-slide ${isOpen ? 'is-open' : ''}`}>
              <div className="a-slide-head">
                <span className="a-slide-num">{String(i + 1).padStart(2, '0')}</span>
                <div className="a-slide-thumb">{m ? <Thumb m={m} size="100%" /> : <span className="a-muted">…</span>}</div>
                <div className="a-slide-info">
                  <strong>{String(s.title_fr || '').trim() || (m ? (m.kind === 'video' ? 'Vidéo' : 'Image') : 'Diapositive')}</strong>
                  <small>{hasContent(s) ? 'Texte personnalisé' : 'Texte par défaut du site'} · {Number(s.duration) ? `${s.duration} s` : `${defaultSeconds} s (défaut)`}</small>
                </div>
                <div className="a-slide-actions">
                  <button type="button" className="a-icon-btn" disabled={!i} onClick={() => move(i, -1)} title="Monter">↑</button>
                  <button type="button" className="a-icon-btn" disabled={i === slides.length - 1} onClick={() => move(i, 1)} title="Descendre">↓</button>
                  <Btn type="button" variant="ghost" small onClick={() => setOpen(isOpen ? null : i)}>{isOpen ? 'Fermer' : 'Modifier'}</Btn>
                  <button type="button" className="a-icon-btn is-danger" onClick={() => remove(i)} title="Retirer">×</button>
                </div>
              </div>
              {isOpen && (
                <div className="a-slide-body">
                  <div className="a-row" style={{ marginTop: 0 }}>
                    <Btn type="button" variant="ghost" small onClick={() => setPick(i)}>Changer l’image / la vidéo</Btn>
                  </div>
                  <div className="a-form">
                    <BiField label="Surtitre (petite ligne jaune)" obj={s} field="kicker" set={(k, v) => up(i, { [k]: v })} />
                    <BiField label="Titre" obj={s} field="title" set={(k, v) => up(i, { [k]: v })} textarea rows={2} hint="Laissez vide pour afficher le titre « Guinée Fashion Festival » par défaut. Appuyez sur Entrée pour passer à la ligne." />
                    <BiField label="Texte" obj={s} field="text" set={(k, v) => up(i, { [k]: v })} textarea rows={3} />
                    <div className="a-form a-form-2">
                      <BiField label="Texte du bouton" obj={s} field="button_label" set={(k, v) => up(i, { [k]: v })} wide={false} />
                      <Field label="Lien du bouton" hint="Une page du site (ex. /candidatures) ou une adresse https://…"><Input value={s.button_url} onChange={v => up(i, { button_url: v })} placeholder="/candidatures" /></Field>
                    </div>
                    <Field label="Durée d’affichage (secondes)" hint={`Vide = durée par défaut (${defaultSeconds} s). Une vidéo est affichée jusqu’à sa fin.`}>
                      <Input type="number" min="3" max="60" value={s.duration ?? ''} onChange={v => up(i, { duration: v === '' ? '' : Number(v) })} placeholder={String(defaultSeconds)} />
                    </Field>
                    {hasContent(s) && <div><Btn type="button" variant="link" small onClick={() => up(i, { ...EMPTY })}>Rétablir le texte par défaut</Btn></div>}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {!slides.length && <p className="a-muted" style={{ margin: 0 }}>Aucune diapositive : le hero affiche les photos du défilé.</p>}
        <div><Btn type="button" variant="ghost" onClick={() => setPick('add')}>+ Ajouter des diapositives</Btn></div>
      </div>
      <span className="a-hint">Images (JPG, PNG, WebP), images animées (GIF, WebP animé) ou vidéos (MP4, WebM). Format paysage conseillé (16:9, 2400 px de large). Vidéos : courtes (10–20 s), légères (moins de 20 Mo), lues sans le son.</span>
      <MediaPicker open={pick !== null} onClose={() => setPick(null)} multiple={pick === 'add'} kind="" noEmbed onPick={onPick} />
    </div>
  );
}
