import Img from './Img.jsx';
import { Reveal } from './motion.jsx';
import { useSite } from '../lib/site.jsx';
import { useLang } from '../lib/i18n.jsx';

function groupByDay(programme = []) {
  const groups = [];
  for (const it of programme) {
    const g = groups.find(x => x.day === (it.day || ''));
    if (g) g.items.push(it); else groups.push({ day: it.day || '', items: [it] });
  }
  return groups;
}

/** Programme d'un événement : un bloc par jour (numéro, photo, ligne de temps et cartes). */
export default function ProgramDays({ programme = [], title }) {
  const { t, pick } = useLang();
  const site = useSite();
  const photos = site?.looks?.length ? site.looks : site?.heroImages || [];
  const groups = groupByDay(programme);
  if (!groups.length) return null;
  return (
    <section className="section prog-days">
      <div className="container">
        {title && <h2 className="h-display section-title">{title}</h2>}
        {groups.map((g, gi) => {
          const photo = photos.length ? photos[gi % photos.length] : null;
          const n = g.items.length;
          return (
            <div key={gi} className="prog-day">
              <aside className="prog-day-side">
                <Reveal as="span" className="prog-day-num h-outline" y={30} aria-hidden="true">{String(gi + 1).padStart(2, '0')}</Reveal>
                <h3 className="prog-day-name">{g.day || t('prog.highlights')}</h3>
                <p className="prog-day-count">{n} {t(n > 1 ? 'prog.moments' : 'prog.moment')}</p>
                {photo && <div className="prog-day-photo"><Img media={photo} sizes="(max-width:900px) 90vw, 32vw" /></div>}
              </aside>
              <ol className="prog-list">
                {g.items.map((it, i) => (
                  <Reveal as="li" key={i} className="prog-item" y={30} delay={i * 0.05}>
                    <span className="prog-time">{it.time || String(i + 1).padStart(2, '0')}</span>
                    <div className="prog-body">
                      <h4>{pick(it, 'title')}</h4>
                      {pick(it, 'desc') && <p>{pick(it, 'desc')}</p>}
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>
          );
        })}
      </div>
    </section>
  );
}
