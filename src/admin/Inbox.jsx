import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, useApi } from '../lib/api.js';
import { PageHead, Card, Btn, Field, Input, Textarea, Modal, Badge, useToast, confirmDelete, fmtTime } from './ui.jsx';

/** Bandeau d'état de la configuration e-mail (variables SMTP du fichier .env). */
function MailBanner() {
  const { data } = useApi('admin/mail/status');
  if (!data || (data.configured && !data.dryRun)) return null;
  return (
    <div className={`a-banner ${data.configured ? 'is-info' : 'is-warn'}`}>
      {data.configured
        ? <><strong>Mode test :</strong> les e-mails ne sont pas envoyés, ils sont enregistrés dans le dossier <code>private/outbox</code> du serveur (MAIL_DRY_RUN).</>
        : <><strong>Envoi d’e-mails non configuré</strong> (il manque : {data.missing.join(', ')}). <Link to="/admin/email" className="a-link-strong">Configurer le SMTP →</Link></>}
    </div>
  );
}

/* ====================== Messages ====================== */
function ReplyModal({ m, open, onClose, onSent }) {
  const toast = useToast();
  const status = useApi('admin/mail/status').data;
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setSubject(`Re: ${m.subject || 'Votre message'}`); setBody(`Bonjour ${m.name || ''},\n\n\n\nCordialement,\nL’équipe du Guinée Fashion Festival`); } }, [open, m.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const send = async () => {
    setBusy(true);
    try { await api(`admin/messages/${m.id}/reply`, { method: 'POST', body: { subject, body } }); toast(`Réponse envoyée à ${m.email}`); onSent(); onClose(); }
    catch (e) { toast(e.message, 'error'); onSent(); }
    setBusy(false);
  };
  return (
    <Modal open={open} onClose={onClose} title={`Répondre à ${m.name || m.email}`} wide
      footer={<><a className="a-link" href={`mailto:${m.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`}>Ouvrir dans mon application mail</a><Btn onClick={send} disabled={busy || !body.trim() || (status && !status.configured)}>{busy ? 'Envoi…' : 'Envoyer la réponse'}</Btn></>}>
      <div className="a-form">
        {status && !status.configured && <div className="a-banner is-warn">Envoi d’e-mails non configuré (il manque : {status.missing.join(', ')}). <Link to="/admin/email" className="a-link-strong">Configurer le SMTP →</Link></div>}
        <Field label="À"><Input value={m.email} readOnly /></Field>
        <Field label="Objet"><Input value={subject} onChange={setSubject} /></Field>
        <Field label="Votre réponse" hint="Le message d’origine est rappelé automatiquement sous votre réponse."><Textarea value={body} onChange={setBody} rows={10} /></Field>
      </div>
    </Modal>
  );
}

export function Messages() {
  const { data, reload } = useApi('admin/messages');
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const [reply, setReply] = useState(null);
  const toggle = async m => {
    setOpen(open === m.id ? null : m.id);
    if (!m.is_read) { await api(`admin/messages/${m.id}`, { method: 'PATCH', body: { is_read: true } }); reload(); }
  };
  const del = async m => { if (!confirmDelete('ce message')) return; await api(`admin/messages/${m.id}`, { method: 'DELETE' }); toast('Message supprimé'); reload(); };
  const cur = (data || []).find(m => m.id === reply);
  return (
    <>
      <PageHead title="Messages" sub="Messages envoyés depuis la page Contact. Répondez directement par e-mail depuis ici." />
      <MailBanner />
      <Card>
        {(data || []).map(m => (
          <div key={m.id} className={`a-msg ${m.is_read ? '' : 'is-unread'} ${open === m.id ? 'is-open' : ''}`}>
            <button className="a-msg-head" onClick={() => toggle(m)}>
              <strong>{m.name}</strong><span>{m.subject || '(sans objet)'}{m.replies?.some(r => r.status === 'sent') && <Badge tone="green"> Répondu</Badge>}</span><small>{fmtTime(m.created_at)}</small>
            </button>
            {open === m.id && (
              <div className="a-msg-body">
                <p className="a-pre">{m.message}</p>
                <p className="a-muted">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                {m.replies?.length > 0 && (
                  <div className="a-replies">
                    {m.replies.map(r => (
                      <div key={r.id} className={`a-reply ${r.status === 'failed' ? 'is-failed' : ''}`}>
                        <small>{r.status === 'failed' ? `Échec d’envoi — ${r.error || ''}` : 'Réponse envoyée'} · {fmtTime(r.created_at)}</small>
                        <p className="a-pre">{r.body}</p>
                      </div>
                    ))}
                  </div>
                )}
                <div className="a-row">
                  <Btn small onClick={() => setReply(m.id)}>Répondre par e-mail</Btn>
                  <Btn small variant="ghost" onClick={async () => { await api(`admin/messages/${m.id}`, { method: 'PATCH', body: { is_read: false } }); reload(); }}>Marquer non lu</Btn>
                  <Btn small variant="danger" onClick={() => del(m)}>Supprimer</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
        {data && !data.length && <p className="a-muted">Aucun message.</p>}
      </Card>
      {cur && <ReplyModal m={cur} open onClose={() => setReply(null)} onSent={reload} />}
    </>
  );
}

/* ====================== Newsletter ====================== */
const EMPTY_NL = { subject: '', body: '', button_label: '', button_url: '' };

function Composer({ count, onClose, onSent }) {
  const toast = useToast();
  const status = useApi('admin/mail/status').data;
  const [v, setV] = useState(EMPTY_NL);
  const [test, setTest] = useState('');
  const [html, setHtml] = useState('');
  const [busy, setBusy] = useState('');
  const set = k => x => setV(s => ({ ...s, [k]: x }));
  const ok = v.subject.trim() && v.body.trim();
  useEffect(() => {
    const t = setTimeout(() => api('admin/newsletter/preview', { method: 'POST', body: v }).then(r => setHtml(r.html)).catch(() => {}), 350);
    return () => clearTimeout(t);
  }, [v]);
  const sendTest = async () => {
    setBusy('test');
    try { const r = await api('admin/newsletter/test', { method: 'POST', body: { ...v, to: test || undefined } }); toast(`Test envoyé à ${r.to}`); }
    catch (e) { toast(e.message, 'error'); }
    setBusy('');
  };
  const sendAll = async () => {
    if (!window.confirm(`Envoyer « ${v.subject} » à ${count} abonné(s) ?\n\nL’envoi est définitif et ne peut pas être annulé.`)) return;
    setBusy('all');
    try { await api('admin/newsletter/send', { method: 'POST', body: v }); toast('Envoi lancé'); onSent(); onClose(); }
    catch (e) { toast(e.message, 'error'); }
    setBusy('');
  };
  return (
    <Card title="Nouvelle newsletter" actions={<Btn variant="link" small onClick={onClose}>Fermer</Btn>}>
      {status && !status.configured && <div className="a-banner is-warn">Envoi d’e-mails non configuré (il manque : {status.missing.join(', ')}). <Link to="/admin/email" className="a-link-strong">Configurer le SMTP →</Link></div>}
      <div className="a-nl">
        <div className="a-form">
          <Field label="Objet de l’e-mail *"><Input value={v.subject} onChange={set('subject')} placeholder="Ex. Les castings 2027 sont ouverts" /></Field>
          <Field label="Message *" hint="Une ligne vide = nouveau paragraphe. « ## Titre » pour un intertitre, **gras** pour du gras. Les liens https:// deviennent cliquables."><Textarea value={v.body} onChange={set('body')} rows={12} /></Field>
          <div className="a-form a-form-2">
            <Field label="Texte du bouton (optionnel)"><Input value={v.button_label} onChange={set('button_label')} placeholder="Postuler maintenant" /></Field>
            <Field label="Lien du bouton"><Input value={v.button_url} onChange={set('button_url')} placeholder="https://" /></Field>
          </div>
          <div className="a-nl-test">
            <Field label="Envoyer un test à" hint="Laissez vide pour utiliser votre adresse de connexion."><Input type="email" value={test} onChange={setTest} placeholder="vous@exemple.com" /></Field>
            <Btn variant="ghost" onClick={sendTest} disabled={!ok || busy}>{busy === 'test' ? 'Envoi…' : 'Envoyer le test'}</Btn>
          </div>
          <Btn onClick={sendAll} disabled={!ok || !!busy || !count}>{busy === 'all' ? 'Lancement…' : `Envoyer à ${count} abonné(s)`}</Btn>
        </div>
        <div className="a-nl-preview">
          <span className="a-label">Aperçu</span>
          <iframe title="Aperçu de la newsletter" srcDoc={html} sandbox="" />
        </div>
      </div>
    </Card>
  );
}

function Campaigns({ refresh }) {
  const { data, reload } = useApi('admin/newsletter/campaigns', [refresh]);
  const sending = (data || []).some(c => c.status === 'sending');
  useEffect(() => { if (!sending) return; const i = setInterval(reload, 2500); return () => clearInterval(i); }, [sending, reload]);
  if (!data?.length) return null;
  const tone = { sending: 'blue', done: 'green', interrupted: 'red' };
  const label = { sending: 'En cours…', done: 'Terminé', interrupted: 'Interrompu' };
  return (
    <Card title="Envois précédents">
      <table className="a-table is-list">
        <thead><tr><th>Objet</th><th>Date</th><th>Envoyés</th><th>Statut</th></tr></thead>
        <tbody>
          {data.map(c => (
            <tr key={c.id}>
              <td><strong>{c.subject}</strong>{c.last_error && <small className="a-warn">{c.last_error}</small>}</td>
              <td className="a-muted">{fmtTime(c.created_at)}</td>
              <td>{c.sent} / {c.total}{c.failed > 0 && <small className="a-warn">{c.failed} échec(s)</small>}</td>
              <td><Badge tone={tone[c.status]}>{label[c.status]}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function Subscribers() {
  const { data, reload } = useApi('admin/subscribers');
  const toast = useToast();
  const [compose, setCompose] = useState(false);
  const [tick, setTick] = useState(0);
  const list = data || [];
  const exportCsv = () => {
    const blob = new Blob(['﻿email;date\n' + list.map(s => `${s.email};${s.created_at}`).join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'newsletter.csv'; a.click();
  };
  const copy = async () => { await navigator.clipboard.writeText(list.map(s => s.email).join(', ')); toast('Adresses copiées'); };
  return (
    <>
      <PageHead title="Newsletter" sub={`${list.length} abonné(s) inscrits depuis le site.`}>
        <Btn variant="ghost" onClick={copy} disabled={!list.length}>Copier les e-mails</Btn>
        <Btn variant="ghost" onClick={exportCsv} disabled={!list.length}>Exporter CSV</Btn>
        <Btn onClick={() => setCompose(true)} disabled={compose}>Écrire une newsletter</Btn>
      </PageHead>
      <MailBanner />
      {compose && <Composer count={list.length} onClose={() => setCompose(false)} onSent={() => setTick(t => t + 1)} />}
      <Campaigns refresh={tick} />
      <Card title="Abonnés">
        <table className="a-table is-list">
          <thead><tr><th>E-mail</th><th>Inscription</th><th /></tr></thead>
          <tbody>
            {list.map(s => (
              <tr key={s.id}><td>{s.email}</td><td>{fmtTime(s.created_at)}</td>
                <td className="a-row-actions"><button className="a-link is-danger" onClick={async () => { if (confirmDelete(s.email)) { await api(`admin/subscribers/${s.id}`, { method: 'DELETE' }); reload(); } }}>Retirer</button></td></tr>
            ))}
          </tbody>
        </table>
        {data && !list.length && <p className="a-muted">Aucun abonné pour l’instant.</p>}
      </Card>
    </>
  );
}
