import { useRef } from 'react';
import { motion, useTransform } from 'framer-motion';
import Page from '../components/Page.jsx';
import Img from '../components/Img.jsx';
import { Reveal, Marquee, CountUp, useScrollProgress, EASE_OUT } from '../components/motion.jsx';
import { PageHero, SectionHead, ButtonLink, Loader } from '../components/sections.jsx';
import { useSite } from '../lib/site.jsx';
import { useLang } from '../lib/i18n.jsx';

function ImagePair({ a, b }) {
  const ref = useRef(null);
  const p = useScrollProgress(ref);
  const y1 = useTransform(p, [0, 1], ['10%', '-10%']);
  const y2 = useTransform(p, [0, 1], ['-5%', '25%']);
  return (
    <div className="img-pair" ref={ref}>
      {a && <motion.div className="img-pair-a" style={{ y: y1 }}><Img media={a} sizes="(max-width:760px) 80vw, 40vw" /></motion.div>}
      {b && <motion.div className="img-pair-b" style={{ y: y2 }}><Img media={b} sizes="(max-width:760px) 60vw, 26vw" /></motion.div>}
    </div>
  );
}

export default function Festival() {
  const site = useSite();
  const { t, pick } = useLang();
  if (!site) return <Page><Loader /></Page>;
  const a = site.about || {};
  return (
    <Page title={t('about.title')}>
      <PageHero kicker="Mode & Artisanat" title={t('about.title')} lead={pick(a, 'title')} />

      <section className="section about">
        <div className="container about-grid">
          <div className="about-text">
            <Reveal as="p" className="h-serif about-intro">{pick(a, 'intro')}</Reveal>
            {pick(a, 'body').split('\n').filter(Boolean).map((para, i) => <Reveal as="p" key={i} delay={i * 0.05} className="body-text">{para}</Reveal>)}
            <Reveal className="btn-row"><ButtonLink to="/evenements">{t('nav.events')}</ButtonLink><ButtonLink to="/contact" variant="ghost">{t('nav.contact')}</ButtonLink></Reveal>
          </div>
          <ImagePair a={a.image} b={a.image2} />
        </div>
      </section>

      <Marquee className="band band-black" speed={60}>
        {['Indigo', 'Tissage', 'Cuir', 'Vannerie', 'Couture', 'Bogolan', 'Teinture'].map(w => <span key={w}>{w}<i>✦</i></span>)}
      </Marquee>

      <section className="section">
        <div className="container">
          <SectionHead kicker="01 — 07" title={t('about.pillars')} />
          <div className="pillar-cards">
            {(site.pillars || []).map((p, i) => (
              <motion.article key={i} className="pillar-card" initial={{ opacity: 0, y: 60 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }} transition={{ duration: 1, ease: EASE_OUT, delay: (i % 3) * 0.1 }}>
                <div className="pillar-card-media"><Img media={p.image} sizes="(max-width:760px) 90vw, 30vw" /></div>
                <span className="pillar-num">{String(i + 1).padStart(2, '0')}</span>
                <h3>{pick(p, 'title')}</h3>
                <p>{pick(p, 'text')}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {site.stats?.length > 0 && (
        <section className="stats is-yellow">
          <div className="container stats-grid">
            {site.stats.map((s, i) => (
              <Reveal key={i} className="stat" delay={i * 0.08}>
                <span className="stat-value"><CountUp value={s.value} /></span>
                <span className="stat-label">{pick(s, 'label')}</span>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {site.partners?.length > 0 && (
        <section className="section">
          <div className="container">
            <SectionHead kicker={t('home.partners')} title={t('about.partners')} />
            <div className="partner-grid">
              {site.partners.map((p, i) => {
                const inner = p.logo ? <img src={p.logo.mid} alt={p.name} /> : <span>{p.name}</span>;
                return (
                  <Reveal key={i} className="partner-cell" delay={(i % 4) * 0.05} y={20}>
                    {p.url ? <a href={p.url} target="_blank" rel="noreferrer">{inner}</a> : inner}
                  </Reveal>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </Page>
  );
}
