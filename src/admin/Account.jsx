import { useState } from 'react';
import { api, useApi } from '../lib/api.js';
import { PageHead, Card, Btn, Field, Input, useToast, confirmDelete, fmt } from './ui.jsx';

export default function Account({ user }) {
  const toast = useToast();
  const { data: users, reload } = useApi('admin/users');
  const [pw, setPw] = useState({ current: '', next: '', confirm: '' });
  const [nu, setNu] = useState({ email: '', name: '', password: '' });
  const changePw = async e => {
    e.preventDefault();
    if (pw.next !== pw.confirm) return toast('Les deux mots de passe ne correspondent pas', 'error');
    try { await api('admin/password', { method: 'POST', body: pw }); toast('Mot de passe modifié'); setPw({ current: '', next: '', confirm: '' }); }
    catch (x) { toast(x.message, 'error'); }
  };
  const addUser = async e => {
    e.preventDefault();
    try { await api('admin/users', { method: 'POST', body: nu }); toast('Compte créé'); setNu({ email: '', name: '', password: '' }); reload(); }
    catch (x) { toast(x.message, 'error'); }
  };
  return (
    <>
      <PageHead title="Comptes" sub={`Connecté en tant que ${user.email}`} />
      <div className="a-grid-2">
        <Card title="Changer mon mot de passe">
          <form className="a-form" onSubmit={changePw}>
            <Field label="Mot de passe actuel"><Input type="password" value={pw.current} onChange={x => setPw(s => ({ ...s, current: x }))} autoComplete="current-password" /></Field>
            <Field label="Nouveau mot de passe" hint="8 caractères minimum"><Input type="password" value={pw.next} onChange={x => setPw(s => ({ ...s, next: x }))} autoComplete="new-password" /></Field>
            <Field label="Confirmer"><Input type="password" value={pw.confirm} onChange={x => setPw(s => ({ ...s, confirm: x }))} autoComplete="new-password" /></Field>
            <Btn>Modifier</Btn>
          </form>
        </Card>
        <Card title="Équipe (accès admin)">
          <table className="a-table"><tbody>
            {(users || []).map(u => (
              <tr key={u.id}><td><strong>{u.name || '—'}</strong><small>{u.email}</small></td><td className="a-muted">{fmt(u.created_at)}</td>
                <td className="a-row-actions">{u.id !== user.id && <button className="a-link is-danger" onClick={async () => { if (confirmDelete(`l’accès de ${u.email}`)) { await api(`admin/users/${u.id}`, { method: 'DELETE' }); reload(); } }}>Retirer</button>}</td></tr>
            ))}
          </tbody></table>
          <form className="a-form a-mt" onSubmit={addUser}>
            <h3 className="a-h3">Ajouter un membre</h3>
            <Field label="Nom"><Input value={nu.name} onChange={x => setNu(s => ({ ...s, name: x }))} /></Field>
            <Field label="E-mail"><Input type="email" value={nu.email} onChange={x => setNu(s => ({ ...s, email: x }))} /></Field>
            <Field label="Mot de passe provisoire"><Input value={nu.password} onChange={x => setNu(s => ({ ...s, password: x }))} /></Field>
            <Btn variant="ghost">Créer le compte</Btn>
          </form>
        </Card>
      </div>
    </>
  );
}
