import { useMemo, useState } from 'react';
import Page from '../components/Page.jsx';
import { PageHero, CallRows, Loader, PillTabs } from '../components/sections.jsx';
import { Marquee } from '../components/motion.jsx';
import { Newsletter } from '../components/Footer.jsx';
import { useApi } from '../lib/api.js';
import { useLang } from '../lib/i18n.jsx';

export default function Calls() {
  const { t } = useLang();
  const { data, loading } = useApi('calls');
  const [role, setRole] = useState('all');
  const calls = data || [];
  const roles = useMemo(() => ['all', ...new Set(calls.map(c => c.role_type || 'autre'))], [calls]);
  const list = calls.filter(c => role === 'all' || (c.role_type || 'autre') === role);
  const openCount = calls.filter(c => c.is_open).length;

  return (
    <Page title={t('calls.title')}>
      <PageHero kicker={`${openCount} ${t('calls.open').toLowerCase()}`} title={t('calls.title')} lead={t('calls.lead')} />
      <Marquee className="band band-yellow" speed={60}>
        {['Mannequins', 'Créateurs', 'Bénévoles', 'Photographes', 'Maquilleurs', 'Coiffeurs', 'Exposants'].map(w => <span key={w}>{w}<i>✦</i></span>)}
      </Marquee>
      <section className="section">
        <div className="container">
          <PillTabs items={roles.map(r => [r, r === 'all' ? t('gal.all') : t(`role.${r}`)])} value={role} onChange={setRole} />
          {loading ? <Loader /> : <CallRows calls={list} />}
        </div>
      </section>
      {!loading && openCount === 0 && (
        <section className="section"><div className="container narrow"><Newsletter /></div></section>
      )}
    </Page>
  );
}
