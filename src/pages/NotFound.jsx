import Page from '../components/Page.jsx';
import { ButtonLink } from '../components/sections.jsx';
import { SplitLetters } from '../components/motion.jsx';
import { useLang } from '../lib/i18n.jsx';

export default function NotFound() {
  const { t } = useLang();
  return (
    <Page title="404">
      <section className="notfound">
        <div className="container">
          <h1 className="nf-code"><SplitLetters text="404" inView={false} delay={0.5} stagger={0.1} /></h1>
          <p className="h-title">{t('nf.title')}</p>
          <p className="lead">{t('nf.text')}</p>
          <ButtonLink to="/">{t('nav.home')}</ButtonLink>
        </div>
      </section>
    </Page>
  );
}
