import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Page from '../components/Page.jsx';
import Img from '../components/Img.jsx';
import Lightbox from '../components/Lightbox.jsx';
import { Reveal } from '../components/motion.jsx';
import { Loader, ButtonLink } from '../components/sections.jsx';
import { useApi } from '../lib/api.js';
import { useLang, fmtDate } from '../lib/i18n.jsx';
import NotFound from './NotFound.jsx';

const fmtSize = n => (n > 1048576 ? `${(n / 1048576).toFixed(1).replace('.', ',')} Mo` : `${Math.max(1, Math.round((n || 0) / 1024))} Ko`);

function GalleryTile({ m, i, onOpen }) {
  const { t } = useLang();
  const ratio = m.width && m.height ? m.width / m.height : 16 / 9;
  return (
    <Reveal as="div" className="press-gallery-item" y={30} delay={(i % 3) * 0.06}>
      <button className={`tile tile-${m.kind}`} onClick={() => onOpen(i)} data-cursor={m.kind === 'image' ? t('cta.view') : t('cta.play')}>
        <div className="tile-inner" style={{ aspectRatio: ratio }}>
          {m.kind === 'image' && <Img media={m} sizes="(max-width:760px) 90vw, 40vw" />}
          {m.kind === 'video' && (m.poster ? <Img media={m.poster} sizes="40vw" /> : <video src={`${m.src}#t=0.5`} muted playsInline preload="metadata" className="tile-video" />)}
          {m.kind === 'embed' && (m.thumb ? <img src={m.thumb} alt="" className="tile-embed-thumb" loading="lazy" /> : <div className="tile-embed-ph">{m.provider}</div>)}
          {m.kind !== 'image' && <span className="play-badge"><i>▶</i></span>}
        </div>
      </button>
    </Reveal>
  );
}

export default function PressDetail() {
  const { slug } = useParams();
  const { t, pick, lang } = useLang();
  const { data: a, loading, error } = useApi(`press/${slug}`);
  const [lb, setLb] = useState(null);
  if (error?.status === 404) return <NotFound />;
  if (loading || !a) return <Page><Loader /></Page>;
  const title = pick(a, 'title');
  const paras = (pick(a, 'body') || '').split('\n').map(x => x.trim()).filter(Boolean);
  return (
    <Page title={title} label={t('press.title')}>
      <article className="press-article">
        <header className="press-article-head">
          <div className="container narrow">
            <Link to="/presse" className="press-back">← {t('press.back')}</Link>
            <p className="press-article-meta">
              {a.outlet && <span>{a.outlet}</span>}
              {a.published_at && <time dateTime={a.published_at}>{fmtDate(a.published_at, lang)}</time>}
            </p>
            <h1 className="h-display press-article-title">{title}</h1>
            {pick(a, 'excerpt') && <p className="h-serif press-article-lead">{pick(a, 'excerpt')}</p>}
          </div>
        </header>

        {a.cover && (
          <div className="container narrow"><Reveal className="press-article-cover"><Img media={a.cover} sizes="(max-width:980px) 100vw, 980px" eager /></Reveal></div>
        )}

        {(paras.length > 0 || a.url) && (
          <section className="section press-article-body">
            <div className="container narrow">
              {paras.map((p, i) => <Reveal as="p" key={i} className="body-text" delay={Math.min(i, 6) * 0.03}>{p}</Reveal>)}
              {a.url && <div className="btn-row"><ButtonLink href={a.url} target="_blank" rel="noreferrer noopener" variant="ghost">{t('press.source')}</ButtonLink></div>}
            </div>
          </section>
        )}

        {a.gallery?.length > 0 && (
          <section className="section press-gallery-section">
            <div className="container">
              <p className="kicker section-label">{t('press.gallery')}</p>
              <div className="press-gallery">
                {a.gallery.map((m, i) => <GalleryTile key={m.id} m={m} i={i} onOpen={setLb} />)}
              </div>
            </div>
          </section>
        )}

        {a.files?.length > 0 && (
          <section className="section press-docs-section">
            <div className="container narrow">
              <p className="kicker section-label">{t('press.docs')}</p>
              <ul className="press-docs">
                {a.files.map(d => (
                  <Reveal as="li" key={d.id} className="press-doc" y={20}>
                    <span className="press-doc-badge" aria-hidden="true">PDF</span>
                    <span className="press-doc-name">{d.name}<small>{fmtSize(d.size)}</small></span>
                    <span className="press-doc-actions">
                      <a className="btn btn-ghost" href={d.url} target="_blank" rel="noreferrer"><span className="btn-text">{t('press.open')}</span></a>
                      <a className="btn btn-yellow" href={d.url} download={d.name}><span className="btn-text">{t('press.download')}</span></a>
                    </span>
                  </Reveal>
                ))}
              </ul>
            </div>
          </section>
        )}
      </article>
      {lb !== null && <Lightbox items={a.gallery} index={lb} onClose={() => setLb(null)} onIndex={setLb} title={title} />}
    </Page>
  );
}
