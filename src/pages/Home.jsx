import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useTransform } from 'framer-motion';
import Page from '../components/Page.jsx';
import { useActionCount } from '../components/SocialActions.jsx';
import { PartnersSlider } from '../components/Partners.jsx';
import HeroSlider from '../components/HeroSlider.jsx';
import Img from '../components/Img.jsx';
import Countdown from '../components/Countdown.jsx';
import {
  EASE_OUT, Marquee, Reveal, CountUp, useScrollProgress, useMediaQuery, Magnetic,
} from '../components/motion.jsx';
import {
  SectionHead, ButtonLink, PillarList, CallRows, ProjectCard, EventCard, Loader, Arrow, ClipReveal, clipDown,
} from '../components/sections.jsx';
import { useSite } from '../lib/site.jsx';
import { useLang, fmtRange, dateParts } from '../lib/i18n.jsx';

/* ---------- Manifeste : mots qui s'allument au scroll ---------- */
function Word({ children, p, range }) {
  const op = useTransform(p, range, [0.14, 1]);
  const y = useTransform(p, range, [8, 0]);
  return <><motion.span className="mw" style={{ opacity: op, y }}>{children}</motion.span>{' '}</>;
}
function Manifesto({ text, images = [] }) {
  const ref = useRef(null);
  const p = useScrollProgress(ref, 'through');
  const words = String(text || '').split(/\s+/).filter(Boolean);
  const N = words.length;
  const imgA = useTransform(p, [0, 1], [120, -160]);
  const imgB = useTransform(p, [0, 1], [-60, 140]);
  const rot = useTransform(p, [0, 1], [-8, 6]);
  return (
    <section className="manifesto" ref={ref}>
      {images[0] && <motion.div className="manifesto-img mi-a" style={{ y: imgA, rotate: rot }}><Img media={images[0]} sizes="22vw" /></motion.div>}
      {images[1] && <motion.div className="manifesto-img mi-b" style={{ y: imgB }}><Img media={images[1]} sizes="18vw" /></motion.div>}
      <div className="container">
        <p className="kicker">Manifeste — Mode & Artisanat</p>
        <p className="manifesto-text">
          {words.map((w, i) => <Word key={i} p={p} range={[0.2 + (i / N) * 0.45, 0.2 + ((i + 1) / N) * 0.45]}>{w}</Word>)}
        </p>
      </div>
    </section>
  );
}

/* ---------- Bande de photos paysage (défile de droite à gauche) ---------- */
function LandscapeStrip({ images = [] }) {
  const { t } = useLang();
  if (!images.length) return null;
  // assez d'éléments pour que la boucle soit continue même avec peu de photos
  const list = images.length >= 6 ? images : Array.from({ length: Math.ceil(6 / images.length) * images.length }, (_, i) => images[i % images.length]);
  return (
    <section className="landscape-strip" aria-label={t('home.strip')}>
      <Marquee speed={55} skew={false} steady className="strip-marquee">
        {list.map((m, i) => (
          <figure key={i} className="strip-item"><Img media={m} sizes="(max-width:760px) 70vw, 36vw" position="center 30%" /></figure>
        ))}
      </Marquee>
    </section>
  );
}

/* ---------- Mot du promoteur ---------- */
function Organizer({ home, photo }) {
  const { pick } = useLang();
  const paras = String(pick(home, 'organizer_message') || '').split('\n').map(x => x.trim()).filter(Boolean);
  if (home.organizer_hidden || !paras.length) return null;
  const [lead, ...rest] = paras;
  return (
    <section className="section is-bone organizer">
      <div className="container organizer-grid">
        <div className="organizer-text">
          <Reveal as="p" className="kicker" y={20}>{pick(home, 'organizer_kicker')}</Reveal>
          <Reveal as="span" className="organizer-mark" y={20} aria-hidden="true">“</Reveal>
          <Reveal as="p" className="h-serif organizer-lead" delay={0.05}>{lead}</Reveal>
          {rest.map((para, i) => <Reveal as="p" key={i} className="body-text" delay={0.1 + i * 0.05}>{para}</Reveal>)}
          <Reveal className="organizer-sign" delay={0.2}>
            <strong>{home.organizer_name}</strong>
            <span>{pick(home, 'organizer_role')}</span>
          </Reveal>
        </div>
        <Reveal className={`organizer-photo ${photo ? '' : 'is-empty'}`} delay={0.1}>
          {photo ? <Img media={photo} sizes="(max-width:760px) 80vw, 32vw" /> : <img className="organizer-ph" src="/logo-festival-dark.svg" alt="" />}
          <span className="organizer-photo-tag">{home.organizer_name}</span>
        </Reveal>
      </div>
    </section>
  );
}

/* ---------- Prochaine édition ---------- */
function NextEvent({ event, others = [] }) {
  const { t, pick, lang } = useLang();
  const ref = useRef(null);
  const p = useScrollProgress(ref, 'through');
  const imgY = useTransform(p, [0, 1], ['-12%', '12%']);
  const nActions = useActionCount(event?.slug);
  if (!event) return null;
  const a = dateParts(event.start_date, lang), b = dateParts(event.end_date || event.start_date, lang);
  return (
    <section className="next-event" ref={ref}>
      <div className="container next-event-grid">
        <div className="next-event-info">
          <Reveal as="p" className="kicker">{t('home.next')}</Reveal>
          <motion.div className="big-date" aria-label={fmtRange(event.start_date, event.end_date, lang)} initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.3 }}>
            {[a.day, '—', b.day].map((x, i) => (
              <span key={i} className="split-mask"><motion.span className="split-word" variants={{ hidden: { y: '100%' }, show: { y: '0%' } }}
                transition={{ duration: 1.1, ease: EASE_OUT, delay: i * 0.1 }}>{x}</motion.span></span>
            ))}
            <span className="big-date-month">{b.month} {b.year}</span>
          </motion.div>
          <Reveal as="h2" className="h-title">{pick(event, 'title')}</Reveal>
          <Reveal as="p" className="lead" delay={0.1}>{pick(event, 'excerpt')}</Reveal>
          <Reveal className="next-event-venue" delay={0.15}><span className="kicker">{t('ev.where')}</span>{[event.venue, event.city].filter(Boolean).join(', ')}</Reveal>
          <Reveal delay={0.2}><p className="kicker cd-title">{t('home.countdown')}</p><Countdown start={event.start_date} end={event.end_date} /></Reveal>
          <Reveal className="btn-row" delay={0.25}>
            <ButtonLink to={`/evenements/${event.slug}`}>{t('cta.program')}</ButtonLink>
            {nActions > 0 && <ButtonLink to={`/evenements/${event.slug}#actions-sociales`} variant="ghost">{t('cta.actions')}</ButtonLink>}
            <ButtonLink to="/candidatures" variant="ghost">{t('cta.calls')}</ButtonLink>
          </Reveal>
        </div>
        <div className="next-event-wrap">
          <ClipReveal className="next-event-media" variants={clipDown} duration={1.5}>
            <motion.div style={{ y: imgY, height: '124%', marginTop: '-12%', position: 'relative' }}><Img media={event.cover} sizes="(max-width:760px) 100vw, 45vw" /></motion.div>
          </ClipReveal>
          <span className="next-event-stamp">{pick(event, 'subtitle')}</span>
        </div>
      </div>
      {others.length > 0 && (
        <div className="container other-events">
          <p className="kicker">{t('home.upcoming')}</p>
          <div className="event-grid">{others.map(ev => <EventCard key={ev.id} ev={ev} />)}</div>
        </div>
      )}
    </section>
  );
}

/* ---------- Le défilé : rail horizontal épinglé ---------- */
function LooksRail({ looks = [] }) {
  const { t, pick } = useLang();
  const ref = useRef(null);
  const track = useRef(null);
  const mobile = useMediaQuery('(max-width: 760px)');
  const p = useScrollProgress(ref, 'sticky');
  const [dist, setDist] = useState(0);
  useLayoutEffect(() => {
    const m = () => setDist(Math.max(0, (track.current?.scrollWidth || 0) - window.innerWidth));
    m(); window.addEventListener('resize', m);
    const t2 = setTimeout(m, 800);
    return () => { window.removeEventListener('resize', m); clearTimeout(t2); };
  }, [looks.length, mobile]);
  const x = useTransform(p, [0, 1], [0, -dist]);
  const bar = useTransform(p, [0, 1], [0, 1]);
  if (!looks.length) return null;

  const cards = looks.map((m, i) => <LookCard key={m.id} m={m} i={i} p={p} n={looks.length} pick={pick} />);
  return (
    <section className={`looks ${mobile ? 'is-mobile' : ''}`} ref={ref} style={mobile ? undefined : { height: `calc(${dist}px + 100vh)` }}>
      <div className="looks-sticky">
        <div className="looks-head container">
          <h2 className="h-display">{t('home.looks')}</h2>
          <p className="lead">{t('home.looksSub')}</p>
        </div>
        {mobile ? <div className="looks-track is-scroll">{cards}<div className="looks-end-pad" /></div> : (
          <motion.div className="looks-track" ref={track} style={{ x }}>
            <div className="looks-intro"><span className="h-outline">Runway</span></div>
            {cards}
            <div className="looks-end">
              <ButtonLink to="/galerie">{t('cta.gallery')}</ButtonLink>
            </div>
          </motion.div>
        )}
        {!mobile && <div className="looks-progress"><motion.i style={{ scaleX: bar }} /></div>}
      </div>
    </section>
  );
}
function LookCard({ m, i, p, n, pick }) {
  const local = useTransform(p, [Math.max(0, (i - 2) / n), Math.min(1, (i + 2) / n)], ['-8%', '8%']);
  return (
    <figure className={`look ${i % 2 ? 'is-low' : ''}`}>
      <div className="look-media"><motion.div className="look-media-in" style={{ x: local }}><Img media={m} sizes="(max-width:760px) 75vw, 28vw" /></motion.div></div>
      <figcaption>
        <span className="look-num">Look {String(i + 1).padStart(2, '0')}</span>
        <span className="look-alt">{pick(m, 'alt')}</span>
      </figcaption>
    </figure>
  );
}

/* ---------- Chiffres ---------- */
function Stats({ stats = [] }) {
  const { pick } = useLang();
  if (!stats.length) return null;
  return (
    <section className="stats">
      <div className="container stats-grid">
        {stats.map((s, i) => (
          <Reveal key={i} className="stat" delay={i * 0.08}>
            <span className="stat-value"><CountUp value={s.value} /></span>
            <span className="stat-label">{pick(s, 'label')}</span>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ========================================================= */
export default function Home({ intro }) {
  const site = useSite();
  const { t, pick } = useLang();
  const [delay] = useState(() => (intro ? 2.7 : 0.6));
  if (!site) return <Page><Loader /></Page>;
  const [next, ...others] = site.upcoming || [];
  const heroImages = site.heroImages?.length ? site.heroImages : site.looks;

  return (
    <Page label="Guinée Fashion Festival" className="home">
      <HeroSlider slides={heroImages} event={next} home={site.home} delay={delay} />

      <Marquee className="band band-yellow" speed={70}>
        {['Mode', 'Artisanat', 'Défilés', 'Exposition & vente', 'B to B', 'Formation', 'Conakry'].map(w => <span key={w}>{w}<i>✦</i></span>)}
      </Marquee>

      <LandscapeStrip images={site.landscape} />

      <Manifesto text={pick(site.home, 'manifesto')} images={[site.about?.image, site.about?.image2]} />

      <Organizer home={site.home} photo={site.organizerPhoto} />

      <NextEvent event={next} others={others} />

      <LooksRail looks={site.looks} />

      <section className="section programme">
        <div className="container">
          <SectionHead kicker="01 — 07" title={t('home.programme')} sub={pick(site.about, 'intro')}
            action={<ButtonLink to="/festival" variant="ghost">{t('cta.discover')}</ButtonLink>} />
          <PillarList pillars={site.pillars} />
        </div>
      </section>

      <Stats stats={site.stats} />

      <section className="section gallery-teaser">
        <div className="container">
          <SectionHead kicker={t('nav.gallery')} title={t('home.galleryTitle')} sub={t('home.gallerySub')}
            action={<ButtonLink to="/galerie">{t('cta.gallery')}</ButtonLink>} />
          <div className="project-grid">
            {(site.projects || []).slice(0, 4).map((p, i) => <ProjectCard key={p.id} project={p} index={i} size={i === 0 ? 'lg' : 'md'} />)}
          </div>
        </div>
      </section>

      <section className="section casting">
        <Marquee className="casting-marquee" speed={50} reverse>
          {['Casting call', 'Open call', 'Casting call', 'Rejoignez-nous'].map((w, i) => <span key={i} className="h-outline">{w}<i>✦</i></span>)}
        </Marquee>
        <div className="container">
          <SectionHead kicker={t('nav.calls')} title={t('home.callsTitle')} sub={t('home.callsSub')}
            action={<ButtonLink to="/candidatures">{t('cta.calls')}</ButtonLink>} />
          <CallRows calls={site.calls} />
        </div>
      </section>

      {site.partners?.length > 0 && (
        <section className="partners partners-section">
          <div className="container partners-head">
            <p className="kicker">{t('home.partners')}</p>
            <ButtonLink to="/festival" variant="ghost">{t('cta.discover')}</ButtonLink>
          </div>
          <PartnersSlider partners={site.partners} />
        </section>
      )}

      <section className="cta-final">
        <div className="container">
          <Reveal as="p" className="kicker">Guinée Fashion Festival</Reveal>
          <Link to="/candidatures" className="cta-final-link" data-cursor={t('cta.apply')}>
            <span className="h-giant"><span>{t('cta.apply')}</span><Magnetic><span className="cta-final-arrow"><Arrow /></span></Magnetic></span>
          </Link>
        </div>
      </section>
    </Page>
  );
}
