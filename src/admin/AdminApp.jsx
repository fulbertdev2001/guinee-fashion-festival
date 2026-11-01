import { useEffect, useState } from 'react';
import { Routes, Route, NavLink, Navigate, Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import { ToastProvider, Btn, Field, Input } from './ui.jsx';
import Dashboard from './Dashboard.jsx';
import { EventsList, EventEdit } from './Events.jsx';
import { ProjectsList, ProjectEdit } from './Projects.jsx';
import MediaLibrary from './MediaLibrary.jsx';
import { CallsList, CallEdit } from './Calls.jsx';
import Applications from './Applications.jsx';
import { Messages, Subscribers } from './Inbox.jsx';
import SiteSettings from './SiteSettings.jsx';
import Account from './Account.jsx';
import './admin.css';

function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async e => {
    e.preventDefault(); setBusy(true); setErr('');
    try { const r = await api('auth/login', { method: 'POST', body: { email, password } }); onLogin(r.user); }
    catch (x) { setErr(x.message); }
    setBusy(false);
  };
  return (
    <div className="a-login">
      <form onSubmit={submit} className="a-login-card">
        <img src="/logo-festival.svg" alt="Guinée Fashion Festival" className="a-login-logo" />
        <h1>Espace d’administration</h1>
        <Field label="E-mail"><Input type="email" value={email} onChange={setEmail} autoFocus required autoComplete="username" /></Field>
        <Field label="Mot de passe"><Input type="password" value={password} onChange={setPassword} required autoComplete="current-password" /></Field>
        {err && <p className="a-error">{err}</p>}
        <Btn disabled={busy}>{busy ? 'Connexion…' : 'Se connecter'}</Btn>
        <Link to="/" className="a-muted a-back">← Retour au site</Link>
      </form>
    </div>
  );
}

const NAV = [
  ['', 'Tableau de bord', '◎'],
  ['evenements', 'Événements', '◆'],
  ['galerie', 'Galerie (projets)', '▣'],
  ['medias', 'Médiathèque', '▤'],
  ['annonces', 'Appels à candidature', '✎'],
  ['candidatures', 'Candidatures reçues', '✉', 'applications_new'],
  ['messages', 'Messages', '☏', 'messages_unread'],
  ['abonnes', 'Newsletter', '@'],
  ['site', 'Textes & réglages', '⚙'],
  ['compte', 'Comptes', '☺'],
];

export default function AdminApp() {
  const [user, setUser] = useState(undefined);
  const [counts, setCounts] = useState({});
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    document.title = 'Admin — Guinée Fashion Festival';
    document.documentElement.classList.add('is-admin');
    api('auth/me').then(r => setUser(r.user)).catch(() => setUser(null));
    return () => document.documentElement.classList.remove('is-admin');
  }, []);
  useEffect(() => {
    if (!user) return;
    const load = () => api('admin/dashboard').then(d => setCounts(d.counts)).catch(() => {});
    load(); const i = setInterval(load, 60000);
    return () => clearInterval(i);
  }, [user]);

  if (user === undefined) return <div className="adm-loading">Chargement…</div>;
  if (!user) return <ToastProvider><Login onLogin={setUser} /></ToastProvider>;

  const logout = async () => { await api('auth/logout', { method: 'POST' }); setUser(null); };

  return (
    <ToastProvider>
      <div className={`adm ${navOpen ? 'nav-open' : ''}`}>
        <aside className="a-side">
          <Link to="/admin" className="a-brand"><img src="/logo-festival-dark.svg" alt="" /><span>Admin</span></Link>
          <nav onClick={() => setNavOpen(false)}>
            {NAV.map(([to, label, icon, badge]) => (
              <NavLink key={to} to={`/admin${to ? `/${to}` : ''}`} end={!to} className="a-nav">
                <i>{icon}</i><span>{label}</span>
                {badge && counts[badge] > 0 && <b className="a-nav-badge">{counts[badge]}</b>}
              </NavLink>
            ))}
          </nav>
          <div className="a-side-foot">
            <a href="/" target="_blank" rel="noreferrer" className="a-nav"><i>↗</i><span>Voir le site</span></a>
            <div className="a-user"><span>{user.name || user.email}</span><button onClick={logout}>Déconnexion</button></div>
          </div>
        </aside>
        <button className="a-burger" onClick={() => setNavOpen(o => !o)} aria-label="Menu">☰</button>
        <main className="a-main">
          <Routes>
            <Route index element={<Dashboard />} />
            <Route path="evenements" element={<EventsList />} />
            <Route path="evenements/:id" element={<EventEdit />} />
            <Route path="galerie" element={<ProjectsList />} />
            <Route path="galerie/:id" element={<ProjectEdit />} />
            <Route path="medias" element={<MediaLibrary />} />
            <Route path="annonces" element={<CallsList />} />
            <Route path="annonces/:id" element={<CallEdit />} />
            <Route path="candidatures" element={<Applications />} />
            <Route path="messages" element={<Messages />} />
            <Route path="abonnes" element={<Subscribers />} />
            <Route path="site" element={<SiteSettings />} />
            <Route path="compte" element={<Account user={user} />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </ToastProvider>
  );
}
