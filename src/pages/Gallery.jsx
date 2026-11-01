import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import Page from '../components/Page.jsx';
import { PageHero, ProjectCard, Loader, PillTabs } from '../components/sections.jsx';
import { Marquee } from '../components/motion.jsx';
import Img from '../components/Img.jsx';
import { useApi } from '../lib/api.js';
import { useLang } from '../lib/i18n.jsx';

export default function Gallery() {
  const { t } = useLang();
  const { data, loading } = useApi('projects');
  const [filter, setFilter] = useState('all');
  const projects = data || [];

  const filters = useMemo(() => {
    const cats = [...new Set(projects.map(p => p.category || 'autre'))];
    const f = [['all', t('gal.all')], ...cats.map(c => [c, t(`cat.${c}`)])];
    if (projects.some(p => p.counts?.video)) f.push(['video', t('cat.video')]);
    return f;
  }, [projects, t]);

  const list = projects.filter(p => filter === 'all' || (filter === 'video' ? p.counts?.video : (p.category || 'autre') === filter));
  const strip = projects.flatMap(p => p.preview || []).slice(0, 14);

  return (
    <Page title={t('gal.title')}>
      <PageHero kicker={`${projects.length} projets`} title={t('gal.title')} lead={t('gal.lead')} />

      {strip.length > 3 && (
        <div className="gallery-strip" aria-hidden="true">
          <Marquee speed={35} skew={false}>
            {strip.map((m, i) => <div key={m.id + '-' + i} className={`gs-item ${i % 3 === 1 ? 'is-tall' : ''}`}><Img media={m} sizes="240px" /></div>)}
          </Marquee>
        </div>
      )}

      <section className="section gallery-section">
        <div className="container">
          <PillTabs items={filters} value={filter} onChange={setFilter}
            count={k => (k === 'all' ? projects.length : projects.filter(p => (k === 'video' ? p.counts?.video : (p.category || 'autre') === k)).length)} />
          {loading ? <Loader /> : (
            <div className="project-grid is-gallery" key={filter}>
              {list.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: i * 0.06 }} className={`pg-cell ${i % 3 === 0 ? 'is-wide' : ''}`}>
                  <ProjectCard project={p} index={i} size={i % 3 === 0 ? 'lg' : 'md'} />
                </motion.div>
              ))}
            </div>
          )}
          {!loading && !list.length && <p className="empty">{t('gal.empty')}</p>}
        </div>
      </section>
    </Page>
  );
}
