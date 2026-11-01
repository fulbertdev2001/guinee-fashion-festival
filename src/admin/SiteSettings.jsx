import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { PageHead, Card, Btn, Field, Input, BiField, MediaPicker, Thumb, useToast } from './ui.jsx';

/** Liste ordonnée de médias stockée sous forme d'identifiants. */
function MediaIds({ ids = [], onChange, label, hint }) {
  const [media, setMedia] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (!ids.length) { setMedia([]); return; }
    api(`admin/media/by-ids?ids=${ids.join(',')}`).then(setMedia);
  }, [ids.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (i, d) => { const a = [...ids]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); onChange(a); };
  return (
    <div className="a-field is-wide">
      <span className="a-label">{label}</span>
      <div className="a-idlist">
        {media.map((m, i) => (
          <div key={m.id} className="a-idlist-item">
            <Thumb m={m} size={96} />
            <div>
              <button type="button" className="a-icon-btn" disabled={!i} onClick={() => move(i, -1)}>←</button>
              <button type="button" className="a-icon-btn" disabled={i === media.length - 1} onClick={() => move(i, 1)}>→</button>
              <button type="button" className="a-icon-btn is-danger" onClick={() => onChange(ids.filter(x => x !== m.id))}>×</button>
            </div>
          </div>
        ))}
        <button type="button" className="a-idlist-add" onClick={() => setOpen(true)}>+ Ajouter</button>
      </div>
      {hint && <span className="a-hint">{hint}</span>}
      <MediaPicker open={open} onClose={() => setOpen(false)} multiple kind="image" onPick={list => onChange([...ids, ...list.map(m => m.id).filter(id => !ids.includes(id))])} />
    </div>
  );
}

function SingleMedia({ id, onChange, label }) {
  return <MediaIds ids={id ? [id] : []} onChange={a => onChange(a[a.length - 1] || null)} label={label} />;
}

function Repeater({ items = [], onChange, render, empty, addLabel }) {
  const upd = (i, patch) => onChange(items.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const move = (i, d) => { const a = [...items]; const [x] = a.splice(i, 1); a.splice(i + d, 0, x); onChange(a); };
  return (
    <div className="a-repeat">
      {items.map((it, i) => (
        <div key={i} className="a-repeat-item">
          <div className="a-repeat-head"><strong>#{i + 1}</strong><div>
            <button type="button" className="a-icon-btn" disabled={!i} onClick={() => move(i, -1)}>↑</button>
            <button type="button" className="a-icon-btn" disabled={i === items.length - 1} onClick={() => move(i, 1)}>↓</button>
            <button type="button" className="a-icon-btn is-danger" onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>
          </div></div>
          <div className="a-form a-form-2">{render(it, p => upd(i, p))}</div>
        </div>
      ))}
      <Btn variant="ghost" small type="button" onClick={() => onChange([...items, { ...empty }])}>{addLabel}</Btn>
    </div>
  );
}

const TABS = [
  ['home', 'Accueil'], ['about', 'Le Festival'], ['pillars', 'Temps forts'], ['stats', 'Chiffres'],
  ['partners', 'Partenaires'], ['contact', 'Contact'], ['socials', 'Réseaux sociaux'], ['general', 'Général & SEO'],
];

export default function SiteSettings() {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [tab, setTab] = useState('home');
  const [dirty, setDirty] = useState({});
  useEffect(() => { api('admin/settings').then(setS); }, []);
  if (!s) return <div className="a-muted">Chargement…</div>;
  const val = s[tab] ?? (['stats', 'pillars', 'partners'].includes(tab) ? [] : {});
  const setVal = v => { setS(x => ({ ...x, [tab]: v })); setDirty(d => ({ ...d, [tab]: true })); };
  const setK = (k, v) => setVal({ ...val, [k]: v });
  const save = async () => {
    await api(`admin/settings/${tab}`, { method: 'PUT', body: { value: val } });
    setDirty(d => ({ ...d, [tab]: false })); toast('Enregistré — visible sur le site au prochain chargement');
  };

  return (
    <>
      <PageHead title="Textes & réglages" sub="Contenus éditoriaux, coordonnées et sélection d’images du site.">
        <Btn onClick={save} disabled={!dirty[tab]}>{dirty[tab] ? 'Enregistrer cet onglet' : 'Enregistré'}</Btn>
      </PageHead>
      <div className="a-tabs">
        {TABS.map(([k, l]) => <button key={k} className={tab === k ? 'is-on' : ''} onClick={() => setTab(k)}>{l}{dirty[k] && ' •'}</button>)}
      </div>
      <Card>
        <div className="a-form">
          {tab === 'home' && <>
            <BiField label="Surtitre du hero" obj={val} field="hero_kicker" set={setK} />
            <BiField label="Texte du hero" obj={val} field="hero_text" set={setK} textarea rows={3} />
            <BiField label="Manifeste (grand texte animé)" obj={val} field="manifesto" set={setK} textarea rows={3} />
            <MediaIds label="Images du hero (diaporama du podium)" ids={val.hero_images || []} onChange={v => setK('hero_images', v)} hint="Portraits plein pied conseillés. Défilent dans l’arche centrale." />
            <MediaIds label="Looks du défilé (rail horizontal)" ids={val.looks || []} onChange={v => setK('looks', v)} hint="Vide = photos des projets de catégorie « Défilé »." />
          </>}
          {tab === 'about' && <>
            <BiField label="Titre" obj={val} field="title" set={setK} />
            <BiField label="Introduction" obj={val} field="intro" set={setK} textarea rows={3} />
            <BiField label="Texte" obj={val} field="body" set={setK} textarea rows={8} hint="Une ligne vide = nouveau paragraphe." />
            <SingleMedia label="Image principale" id={val.image_id} onChange={v => setK('image_id', v)} />
            <SingleMedia label="Image secondaire" id={val.image2_id} onChange={v => setK('image2_id', v)} />
          </>}
          {tab === 'pillars' && <Repeater items={val} onChange={setVal} addLabel="+ Ajouter un temps fort" empty={{ title_fr: '', text_fr: '' }}
            render={(it, up) => <>
              <BiField label="Titre" obj={it} field="title" set={(k, v) => up({ [k]: v })} />
              <BiField label="Texte" obj={it} field="text" set={(k, v) => up({ [k]: v })} textarea rows={2} />
              <SingleMedia label="Image" id={it.image_id} onChange={v => up({ image_id: v })} />
            </>} />}
          {tab === 'stats' && <Repeater items={val} onChange={setVal} addLabel="+ Ajouter un chiffre" empty={{ value: '', label_fr: '' }}
            render={(it, up) => <>
              <Field label="Valeur (ex. 4, 15+, 1 200)"><Input value={it.value} onChange={v => up({ value: v })} /></Field>
              <BiField label="Libellé" obj={it} field="label" set={(k, v) => up({ [k]: v })} />
            </>} />}
          {tab === 'partners' && <Repeater items={val} onChange={setVal} addLabel="+ Ajouter un partenaire" empty={{ name: '', url: '' }}
            render={(it, up) => <>
              <Field label="Nom"><Input value={it.name} onChange={v => up({ name: v })} /></Field>
              <Field label="Site web"><Input value={it.url} onChange={v => up({ url: v })} placeholder="https://" /></Field>
              <SingleMedia label="Logo (optionnel — sinon le nom s’affiche)" id={it.logo_id} onChange={v => up({ logo_id: v })} />
            </>} />}
          {tab === 'contact' && <>
            <Field label="Téléphone"><Input value={val.phone} onChange={v => setK('phone', v)} /></Field>
            <Field label="E-mail"><Input value={val.email} onChange={v => setK('email', v)} /></Field>
            <Field label="Lieu principal"><Input value={val.venue} onChange={v => setK('venue', v)} /></Field>
            <BiField label="Adresse" obj={val} field="address" set={setK} />
            <BiField label="Horaires" obj={val} field="hours" set={setK} />
          </>}
          {tab === 'socials' && ['instagram', 'facebook', 'tiktok', 'youtube', 'linkedin'].map(k => (
            <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><Input value={val[k]} onChange={v => setK(k, v)} placeholder={`https://${k}.com/…`} /></Field>
          ))}
          {tab === 'general' && <>
            <Field label="Titre du site (onglet & partage)" wide><Input value={val.site_title} onChange={v => setK('site_title', v)} /></Field>
            <Field label="Description SEO" wide hint="~160 caractères, utilisée par Google et les réseaux sociaux."><Input value={val.seo_description} onChange={v => setK('seo_description', v)} /></Field>
            <BiField label="Bandeau d’annonce (haut de page)" obj={val} field="announcement" set={setK} hint="Laisser vide pour masquer le bandeau." />
            <Field label="Lien du bandeau"><Input value={val.announcement_link} onChange={v => setK('announcement_link', v)} placeholder="/candidatures" /></Field>
          </>}
        </div>
      </Card>
    </>
  );
}
