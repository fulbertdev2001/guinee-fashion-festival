import { useState } from 'react';
import Page from '../components/Page.jsx';
import Countdown from '../components/Countdown.jsx';
import { Reveal } from '../components/motion.jsx';
import { PageHero, Loader, ButtonLink } from '../components/sections.jsx';
import { useApi } from '../lib/api.js';
import { useLang, fmtRange } from '../lib/i18n.jsx';

function groupByDay(programme = []) {
  const groups = [];
  for (const it of programme) {
    const g = groups.find(x => x.day === (it.day || ''));
    if (g) g.items.push(it); else groups.push({ day: it.day || '', items: [it] });
  }
  return groups;
}

export default function Programme() {
  const { t, pick, lang } = useLang();
  const { data, loading } = useApi('programme');
  const [sel, setSel] = useState(0);
  if (loading || !data) return <Page title={t('prog.title')}><Loader /></Page>;

  // éditions ayant un programme : à venir d'abord, puis la dernière édition passée
  const editions = [
    ...data.upcoming.map(e => ({ ev: e, past: false })),
    ...data.past.slice(0, 1).map(e => ({ ev: e, past: true })),
  ].filter(x => x.ev.programme?.length);
  const cur = editions[Math.min(sel, editions.length - 1)];

  return (
    <Page title={t('prog.title')}>
      <PageHero kicker="Mode & Artisanat" title={t('prog.title')} lead={t('prog.lead')} />

      {!cur ? (
        <section className="section"><div className="container"><p className="empty">{t('prog.none')}</p></div></section>
      ) : (
        <>
          {editions.length > 1 && (
            <div className="container">
              <div className="filters is-flat prog-tabs" role="tablist">
                {editions.map((x, i) => (
                  <button key={x.ev.id} role="tab" aria-selected={i === sel} className={`filter ${i === sel ? 'is-active' : ''}`} onClick={() => setSel(i)}>
                    <span className="filter-label">{pick(x.ev, 'title')}{x.past ? ` · ${t('prog.past')}` : ''}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <section className="ev-info prog-info">
            <div className="container ev-info-grid">
              <div><span className="kicker">{t('ev.when')}</span><strong>{fmtRange(cur.ev.start_date, cur.ev.end_date, lang)}</strong></div>
              <div><span className="kicker">{t('ev.where')}</span><strong>{[cur.ev.venue, cur.ev.city].filter(Boolean).join(', ')}</strong></div>
              <div className="ev-info-cd">{!cur.past && <Countdown start={cur.ev.start_date} end={cur.ev.end_date} compact />}</div>
              <div className="ev-info-actions"><ButtonLink to={`/evenements/${cur.ev.slug}`} variant="ghost">{t('prog.details')}</ButtonLink></div>
            </div>
          </section>

          <section className="section is-bone">
            <div className="container">
              <div className="timeline">
                {groupByDay(cur.ev.programme).map((g, gi) => (
                  <div key={`${cur.ev.id}-${gi}`} className="timeline-day">
                    {g.day && <div className="timeline-day-label"><span>{g.day}</span></div>}
                    <div className="timeline-items">
                      {g.items.map((it, i) => (
                        <Reveal key={i} className="timeline-item" y={30} delay={i * 0.05}>
                          <span className="timeline-time">{it.time || String(i + 1).padStart(2, '0')}</span>
                          <div>
                            <h3>{pick(it, 'title')}</h3>
                            {pick(it, 'desc') && <p>{pick(it, 'desc')}</p>}
                          </div>
                        </Reveal>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </Page>
  );
}
