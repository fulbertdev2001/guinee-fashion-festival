import { useRef } from 'react';
import { useParams } from 'react-router-dom';
import { motion, useTransform } from 'framer-motion';
import Page from '../components/Page.jsx';
import Img from '../components/Img.jsx';
import Countdown from '../components/Countdown.jsx';
import { Reveal, EASE_OUT, useScrollProgress } from '../components/motion.jsx';
import { Loader, CallRows, ProjectCard, ButtonLink } from '../components/sections.jsx';
import { useApi } from '../lib/api.js';
import { useLang, fmtRange } from '../lib/i18n.jsx';
import NotFound from './NotFound.jsx';

function icsHref(ev, title) {
  const d = s => s.replace(/-/g, '');
  const end = new Date(`${ev.end_date || ev.start_date}T12:00:00`); end.setDate(end.getDate() + 1);
  const body = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GFF//FR', 'BEGIN:VEVENT',
    `UID:${ev.slug}@guineefashionfestival`, `DTSTART;VALUE=DATE:${d(ev.start_date)}`,
    `DTEND;VALUE=DATE:${end.toISOString().slice(0, 10).replace(/-/g, '')}`,
    `SUMMARY:${title}`, `LOCATION:${[ev.venue, ev.city].filter(Boolean).join(', ')}`,
    `URL:${window.location.href}`, 'END:VEVENT', 'END:VCALENDAR',
  ].join('\r\n');
  return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
}

export default function EventDetail() {
  const { slug } = useParams();
  const { t, pick, lang } = useLang();
  const { data: ev, loading, error } = useApi(`events/${slug}`);
  const ref = useRef(null);
  const p = useScrollProgress(ref, 'sticky');
  const scale = useTransform(p, [0, 1], [1, 0.82]);
  const radius = useTransform(p, [0, 1], [0, 40]);
  const titleY = useTransform(p, [0, 1], ['0%', '60%']);
  if (error?.status === 404) return <NotFound />;
  if (loading || !ev) return <Page><Loader /></Page>;

  const title = pick(ev, 'title');
  const groups = [];
  for (const it of ev.programme || []) {
    const g = groups.find(x => x.day === (it.day || ''));
    if (g) g.items.push(it); else groups.push({ day: it.day || '', items: [it] });
  }

  return (
    <Page title={title} label={title}>
      <section className="ev-hero" ref={ref}>
        <div className="ev-hero-sticky">
          <motion.div className="ev-hero-media" style={{ scale, borderRadius: radius }}>
            <motion.div className="fill" initial={{ scale: 1.25 }} animate={{ scale: 1 }} transition={{ duration: 2.2, ease: EASE_OUT }}>
              <Img media={ev.cover} sizes="100vw" eager position="center 30%" />
            </motion.div>
            <div className="ev-hero-shade" />
          </motion.div>
          <motion.div className="ev-hero-title container" style={{ y: titleY }}>
            <motion.p className="kicker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}>{pick(ev, 'subtitle')}</motion.p>
            <h1 className="h-giant">
              {title.split(' ').map((w, i) => (
                <span key={i} className="split-mask is-w"><motion.span className="split-word" initial={{ y: '110%' }} animate={{ y: 0 }}
                  transition={{ duration: 1.2, ease: EASE_OUT, delay: 0.6 + i * 0.08 }}>{w}</motion.span></span>
              ))}
            </h1>
          </motion.div>
        </div>
      </section>

      <section className="ev-info">
        <div className="container ev-info-grid">
          <div><span className="kicker">{t('ev.when')}</span><strong>{fmtRange(ev.start_date, ev.end_date, lang)}</strong></div>
          <div><span className="kicker">{t('ev.where')}</span><strong>{[ev.venue, ev.city].filter(Boolean).join(', ')}</strong>{ev.address && <small>{ev.address}</small>}</div>
          <div className="ev-info-cd"><Countdown start={ev.start_date} end={ev.end_date} compact /></div>
          <div className="ev-info-actions">
            <a className="btn btn-ghost" href={icsHref(ev, title)} download={`${ev.slug}.ics`}><span className="btn-text">{t('ev.addCal')}</span></a>
            {ev.ticket_url && <ButtonLink href={ev.ticket_url} target="_blank" rel="noreferrer">{t('cta.tickets')}</ButtonLink>}
          </div>
        </div>
      </section>

      {pick(ev, 'body') && (
        <section className="section">
          <div className="container narrow">
            {pick(ev, 'body').split('\n').filter(Boolean).map((para, i) => (
              <Reveal as="p" key={i} className={i === 0 ? 'h-serif ev-lead' : 'body-text'} delay={i * 0.04}>{para}</Reveal>
            ))}
          </div>
        </section>
      )}

      {groups.length > 0 && (
        <section className="section is-bone">
          <div className="container">
            <h2 className="h-display section-title">{t('ev.programme')}</h2>
            <div className="timeline">
              {groups.map((g, gi) => (
                <div key={gi} className="timeline-day">
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
      )}

      {ev.calls?.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="h-display section-title">{t('ev.calls')}</h2>
            <CallRows calls={ev.calls} />
          </div>
        </section>
      )}

      {ev.projects?.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="h-display section-title">{t('ev.gallery')}</h2>
            <div className="project-grid">{ev.projects.map((p, i) => <ProjectCard key={p.id} project={p} index={i} />)}</div>
          </div>
        </section>
      )}
    </Page>
  );
}
