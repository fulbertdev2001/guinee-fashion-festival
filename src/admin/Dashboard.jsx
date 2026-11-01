import { Link } from 'react-router-dom';
import { useApi } from '../lib/api.js';
import { PageHead, Card, StatusBadge, fmt, fmtTime, Btn } from './ui.jsx';

export default function Dashboard() {
  const { data } = useApi('admin/dashboard');
  if (!data) return <div className="a-muted">Chargement…</div>;
  const c = data.counts;
  const tiles = [
    ['Candidatures à traiter', c.applications_new, '/admin/candidatures', 'yellow'],
    ['Appels ouverts', c.calls_open, '/admin/annonces'],
    ['Événements à venir', c.upcoming, '/admin/evenements'],
    ['Projets galerie', c.projects, '/admin/galerie'],
    ['Médias', c.media, '/admin/medias'],
    ['Messages non lus', c.messages_unread, '/admin/messages'],
    ['Abonnés newsletter', c.subscribers, '/admin/abonnes'],
    ['Candidatures (total)', c.applications, '/admin/candidatures'],
  ];
  return (
    <>
      <PageHead title="Tableau de bord" sub="Vue d’ensemble du site Guinée Fashion Festival">
        <Link to="/admin/evenements/new"><Btn variant="ghost">+ Événement</Btn></Link>
        <Link to="/admin/annonces/new"><Btn>+ Appel à candidature</Btn></Link>
      </PageHead>
      <div className="a-tiles">
        {tiles.map(([l, n, to, tone]) => (
          <Link key={l} to={to} className={`a-tile ${tone ? `is-${tone}` : ''}`}><b>{n}</b><span>{l}</span></Link>
        ))}
      </div>
      <div className="a-grid-2">
        <Card title="Dernières candidatures" actions={<Link to="/admin/candidatures" className="a-link">Tout voir →</Link>}>
          {data.recentApplications.length ? (
            <table className="a-table">
              <tbody>
                {data.recentApplications.map(a => (
                  <tr key={a.id}>
                    <td><Link to={`/admin/candidatures?id=${a.id}`} className="a-link-strong">{a.first_name} {a.last_name}</Link><small>{a.call_title}</small></td>
                    <td><StatusBadge s={a.status} /></td>
                    <td className="a-muted">{fmtTime(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="a-muted">Aucune candidature pour l’instant.</p>}
        </Card>
        <Card title="Appels à candidature" actions={<Link to="/admin/annonces" className="a-link">Gérer →</Link>}>
          <table className="a-table">
            <tbody>
              {data.perCall.map(p => (
                <tr key={p.id}>
                  <td><Link to={`/admin/annonces/${p.id}`} className="a-link-strong">{p.title_fr}</Link><small>Date limite : {fmt(p.deadline)}</small></td>
                  <td><StatusBadge s={p.status} /></td>
                  <td><Link to={`/admin/candidatures?call=${p.id}`} className="a-link">{p.n} reçue(s)</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
      {data.recentMessages.length > 0 && (
        <Card title="Derniers messages" actions={<Link to="/admin/messages" className="a-link">Tout voir →</Link>}>
          <table className="a-table"><tbody>
            {data.recentMessages.map(m => (
              <tr key={m.id} className={m.is_read ? '' : 'is-unread'}><td><strong>{m.name}</strong><small>{m.subject || '—'}</small></td><td className="a-muted">{fmtTime(m.created_at)}</td></tr>
            ))}
          </tbody></table>
        </Card>
      )}
    </>
  );
}
