import { useState } from 'react';
import { api, useApi } from '../lib/api.js';
import { PageHead, Card, Btn, useToast, confirmDelete, fmtTime } from './ui.jsx';

export function Messages() {
  const { data, reload } = useApi('admin/messages');
  const toast = useToast();
  const [open, setOpen] = useState(null);
  const toggle = async m => {
    setOpen(open === m.id ? null : m.id);
    if (!m.is_read) { await api(`admin/messages/${m.id}`, { method: 'PATCH', body: { is_read: true } }); reload(); }
  };
  const del = async m => { if (!confirmDelete('ce message')) return; await api(`admin/messages/${m.id}`, { method: 'DELETE' }); toast('Message supprimé'); reload(); };
  return (
    <>
      <PageHead title="Messages" sub="Messages envoyés depuis la page Contact." />
      <Card>
        {(data || []).map(m => (
          <div key={m.id} className={`a-msg ${m.is_read ? '' : 'is-unread'} ${open === m.id ? 'is-open' : ''}`}>
            <button className="a-msg-head" onClick={() => toggle(m)}>
              <strong>{m.name}</strong><span>{m.subject || '(sans objet)'}</span><small>{fmtTime(m.created_at)}</small>
            </button>
            {open === m.id && (
              <div className="a-msg-body">
                <p className="a-pre">{m.message}</p>
                <p className="a-muted">{m.email}{m.phone ? ` · ${m.phone}` : ''}</p>
                <div className="a-row">
                  <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject || 'Guinée Fashion Festival'}`)}`}><Btn small>Répondre par e-mail</Btn></a>
                  <Btn small variant="ghost" onClick={async () => { await api(`admin/messages/${m.id}`, { method: 'PATCH', body: { is_read: false } }); reload(); }}>Marquer non lu</Btn>
                  <Btn small variant="danger" onClick={() => del(m)}>Supprimer</Btn>
                </div>
              </div>
            )}
          </div>
        ))}
        {data && !data.length && <p className="a-muted">Aucun message.</p>}
      </Card>
    </>
  );
}

export function Subscribers() {
  const { data, reload } = useApi('admin/subscribers');
  const toast = useToast();
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
        <Btn onClick={exportCsv} disabled={!list.length}>Exporter CSV</Btn>
      </PageHead>
      <Card>
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
