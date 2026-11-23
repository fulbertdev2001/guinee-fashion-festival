import { useMemo, useState } from 'react';
import Page from '../components/Page.jsx';
import Img from '../components/Img.jsx';
import { Reveal } from '../components/motion.jsx';
import { PageHero, Loader, ButtonLink } from '../components/sections.jsx';
import { useApi } from '../lib/api.js';
import { useLang, fmtDate } from '../lib/i18n.jsx';

function PressCard({ a, i }) {
  const { t, pick, lang } = useLang();
  const body = (
    <>
      <div className="press-media">
        {a.cover ? <Img media={a.cover} sizes="(max-width:760px) 90vw, 30vw" /> : <span className="press-ph" aria-hidden="true">GFF<small>Presse</small></span>}
      </div>
      <div className="press-body">
        <p className="press-meta"><span>{a.outlet}</span>{a.published_at && <time dateTime={a.published_at}>{fmtDate(a.published_at, lang)}</time>}</p>
        <h3 className="press-title">{pick(a, 'title')}</h3>
        {pick(a, 'excerpt') && <p className="press-excerpt">{pick(a, 'excerpt')}</p>}
        {a.url && <span className="press-link">{t('press.read')} ↗</span>}
      </div>
    </>
  );
  return (
    <Reveal as="article" className="press-card" y={40} delay={(i % 3) * 0.08}>
      {a.url ? <a href={a.url} target="_blank" rel="noreferrer noopener">{body}</a> : <div>{body}</div>}
    </Reveal>
  );
}

export default function Press() {
  const { t } = useLang();
  const { data, loading } = useApi('press');
  const [year, setYear] = useState('all');
  const years = useMemo(() => [...new Set((data || []).map(a => (a.published_at || '').slice(0, 4)).filter(Boolean))].sort().reverse(), [data]);
  if (loading || !data) return <Page title={t('press.title')}><Loader /></Page>;
  const list = year === 'all' ? data : data.filter(a => (a.published_at || '').startsWith(year));
  return (
    <Page title={t('press.title')}>
      <PageHero kicker="Revue de presse" title={t('press.title')} lead={t('press.lead')} />
      <section className="section">
        <div className="container">
          {years.length > 1 && (
            <div className="filters is-flat">
              {['all', ...years].map(y => (
                <button key={y} className={`filter ${year === y ? 'is-active' : ''}`} onClick={() => setYear(y)}>
                  <span className="filter-label">{y === 'all' ? t('press.all') : y}</span>
                </button>
              ))}
            </div>
          )}
          {list.length ? <div className="press-grid">{list.map((a, i) => <PressCard key={a.id} a={a} i={i} />)}</div> : <p className="empty">{t('press.none')}</p>}
          <div className="btn-row"><ButtonLink to="/contact" variant="ghost">{t('press.contact')}</ButtonLink></div>
        </div>
      </section>
    </Page>
  );
}
