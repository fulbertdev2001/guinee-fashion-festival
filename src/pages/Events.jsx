import { Link } from 'react-router-dom';
import Page from '../components/Page.jsx';
import Img from '../components/Img.jsx';
import Countdown from '../components/Countdown.jsx';
import { Reveal } from '../components/motion.jsx';
import { PageHero, Loader, ButtonLink, Arrow, ClipReveal, clipRight } from '../components/sections.jsx';
import { useApi } from '../lib/api.js';
import { useLang, fmtRange, dateParts } from '../lib/i18n.jsx';

function UpcomingBlock({ ev, i }) {
  const { t, pick, lang } = useLang();
  const a = dateParts(ev.start_date, lang), b = dateParts(ev.end_date || ev.start_date, lang);
  return (
    <article className={`upcoming ${i % 2 ? 'is-rev' : ''}`}>
      <ClipReveal className="upcoming-media" variants={clipRight} duration={1.4}>
        <Link to={`/evenements/${ev.slug}`} data-cursor={t('cta.discover')}><Img media={ev.cover} sizes="(max-width:760px) 100vw, 55vw" /></Link>
      </ClipReveal>
      <div className="upcoming-body">
        <Reveal className="upcoming-date">
          <span className="ud-days">{a.day}{b.day !== a.day ? `—${b.day}` : ''}</span>
          <span className="ud-month">{b.month} {b.year}</span>
        </Reveal>
        <Reveal as="h2" className="h-title" delay={0.05}>{pick(ev, 'title')}</Reveal>
        <Reveal as="p" className="kicker" delay={0.1}>{fmtRange(ev.start_date, ev.end_date, lang)} · {[ev.venue, ev.city].filter(Boolean).join(', ')}</Reveal>
        <Reveal as="p" className="lead" delay={0.15}>{pick(ev, 'excerpt')}</Reveal>
        <Reveal delay={0.2}><Countdown start={ev.start_date} end={ev.end_date} /></Reveal>
        <Reveal className="btn-row" delay={0.25}>
          <ButtonLink to={`/evenements/${ev.slug}`}>{t('cta.program')}</ButtonLink>
          {ev.ticket_url && <ButtonLink href={ev.ticket_url} variant="ghost" target="_blank" rel="noreferrer">{t('cta.tickets')}</ButtonLink>}
        </Reveal>
      </div>
    </article>
  );
}

export default function Events() {
  const { t, pick, lang } = useLang();
  const up = useApi('events?scope=upcoming');
  const past = useApi('events?scope=past');
  return (
    <Page title={t('ev.title')}>
      <PageHero kicker="Agenda" title={t('ev.title')} lead={t('ev.lead')} />
      <section className="section">
        <div className="container">
          <p className="kicker section-label">{t('ev.upcoming')}</p>
          {up.loading ? <Loader /> : up.data?.length ? up.data.map((ev, i) => <UpcomingBlock key={ev.id} ev={ev} i={i} />)
            : <p className="empty">{t('ev.none')}</p>}
        </div>
      </section>
      {past.data?.length > 0 && (
        <section className="section is-bone">
          <div className="container">
            <p className="kicker section-label">{t('ev.past')}</p>
            <div className="archive">
              {past.data.map((ev, i) => (
                <Reveal key={ev.id} delay={i * 0.05}>
                  <Link to={`/evenements/${ev.slug}`} className="archive-row" data-cursor={t('cta.view')}>
                    <span className="archive-year">{dateParts(ev.start_date, lang).year}</span>
                    <span className="archive-title">{pick(ev, 'title')}</span>
                    <span className="archive-meta">{fmtRange(ev.start_date, ev.end_date, lang)} · {ev.venue || ev.city}</span>
                    <span className="archive-thumb"><Img media={ev.cover} sizes="200px" /></span>
                    <Arrow />
                  </Link>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </Page>
  );
}
