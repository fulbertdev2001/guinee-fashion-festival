import { useEffect, useState } from 'react';
import { api, useApi } from '../lib/api.js';
import { PageHead, Card, Btn, Field, Input, Select, Toggle, useToast } from './ui.jsx';

const PRESETS = {
  hostinger: { label: 'Hostinger', host: 'smtp.hostinger.com', port: 465, secure: true },
  gmail: { label: 'Gmail (mot de passe d’application requis)', host: 'smtp.gmail.com', port: 465, secure: true },
  brevo: { label: 'Brevo (Sendinblue)', host: 'smtp-relay.brevo.com', port: 587, secure: false },
  mailjet: { label: 'Mailjet', host: 'in-v3.mailjet.com', port: 587, secure: false },
  ovh: { label: 'OVH', host: 'ssl0.ovh.net', port: 465, secure: true },
  custom: { label: 'Autre fournisseur' },
};

export default function MailSettings() {
  const toast = useToast();
  const { data, reload } = useApi('admin/mail/settings');
  const status = useApi('admin/mail/status');
  const [v, setV] = useState(null);
  const [pass, setPass] = useState('');
  const [test, setTest] = useState('');
  const [busy, setBusy] = useState('');
  const [result, setResult] = useState(null);
  useEffect(() => { if (data && !v) setV({ ...data }); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!v) return <div className="a-muted">Chargement…</div>;
  const set = k => x => { setV(s => ({ ...s, [k]: x })); setResult(null); };
  const preset = k => { const p = PRESETS[k]; if (p.host) setV(s => ({ ...s, host: p.host, port: p.port, secure: p.secure })); };
  const detected = Object.entries(PRESETS).find(([, p]) => p.host === v.host)?.[0] || 'custom';
  const body = () => ({ ...v, pass: pass || undefined });

  const save = async () => {
    setBusy('save');
    try {
      await api('admin/mail/settings', { method: 'PUT', body: body() });
      toast('Paramètres e-mail enregistrés'); setPass(''); reload(); status.reload();
    } catch (e) { toast(e.message, 'error'); }
    setBusy('');
  };
  const sendTest = async () => {
    setBusy('test'); setResult(null);
    try {
      const r = await api('admin/mail/test', { method: 'POST', body: { to: test || undefined, settings: body() } });
      setResult({ ok: true, text: `E-mail de test envoyé à ${r.to}. Vérifiez la boîte de réception (et les courriers indésirables).` });
    } catch (e) { setResult({ ok: false, text: e.message }); }
    setBusy('');
  };

  return (
    <>
      <PageHead title="E-mails (SMTP)" sub="Paramètres d’envoi utilisés pour répondre aux messages et envoyer la newsletter.">
        <Btn onClick={save} disabled={busy === 'save'}>{busy === 'save' ? 'Enregistrement…' : 'Enregistrer'}</Btn>
      </PageHead>

      {status.data && (
        <div className={`a-banner ${status.data.configured ? 'is-ok' : 'is-warn'}`}>
          {status.data.configured
            ? <>Envoi d’e-mails <strong>actif</strong>{status.data.from ? <> — expéditeur : <code>{status.data.from}</code></> : null}.</>
            : <>Envoi d’e-mails <strong>non configuré</strong>. Il manque : {status.data.missing.join(', ')}.</>}
        </div>
      )}

      <div className="a-edit">
        <div className="a-edit-main">
          <Card title="Serveur d’envoi (SMTP)">
            <div className="a-form">
              <Field label="Fournisseur" hint="Choisissez-en un pour remplir automatiquement le serveur et le port.">
                <Select value={detected} onChange={preset} options={Object.entries(PRESETS).map(([k, p]) => [k, p.label])} />
              </Field>
              <div className="a-form a-form-2">
                <Field label="Serveur SMTP *"><Input value={v.host} onChange={set('host')} placeholder="smtp.hostinger.com" autoComplete="off" /></Field>
                <Field label="Port *"><Input type="number" value={v.port} onChange={x => set('port')(Number(x))} /></Field>
              </div>
              <Toggle checked={!!v.secure} onChange={set('secure')} label="Connexion sécurisée SSL (port 465). Désactivée pour le port 587 (STARTTLS)." />
              <div className="a-form a-form-2">
                <Field label="Identifiant *" hint="En général l’adresse e-mail complète."><Input value={v.user} onChange={set('user')} placeholder="contact@votre-domaine.com" autoComplete="off" /></Field>
                <Field label="Mot de passe" hint={v.has_pass ? 'Un mot de passe est enregistré (chiffré). Laissez vide pour le conserver.' : 'Le mot de passe de la boîte e-mail.'}>
                  <Input type="password" value={pass} onChange={x => { setPass(x); setResult(null); }} placeholder={v.has_pass ? '•••••••••••• (enregistré)' : ''} autoComplete="new-password" />
                </Field>
              </div>
            </div>
          </Card>

          <Card title="Expéditeur">
            <div className="a-form a-form-2">
              <Field label="Nom affiché"><Input value={v.from_name} onChange={set('from_name')} placeholder="Guinée Fashion Festival" /></Field>
              <Field label="Adresse expéditeur" hint="Doit être l’adresse de la boîte (identifiant) ; vide = identifiant."><Input type="email" value={v.from_email} onChange={set('from_email')} placeholder={v.user || 'contact@votre-domaine.com'} /></Field>
              <Field label="Adresse pour les réponses (optionnel)" hint="Si vide, les réponses vont à l’adresse expéditeur."><Input type="email" value={v.reply_to} onChange={set('reply_to')} /></Field>
              <Field label="Adresse publique du site" hint="Utilisée pour le logo et le lien de désinscription. Ex. https://www.votre-domaine.com"><Input value={v.site_url} onChange={set('site_url')} placeholder="https://" /></Field>
            </div>
          </Card>
        </div>

        <div className="a-edit-side">
          <Card title="Tester la configuration">
            <div className="a-form">
              <p className="a-hint" style={{ margin: 0 }}>Envoie un e-mail avec les valeurs ci-contre, même non enregistrées.</p>
              <Field label="Envoyer le test à" hint="Vide = votre adresse de connexion."><Input type="email" value={test} onChange={setTest} placeholder="vous@exemple.com" /></Field>
              <Btn variant="ghost" onClick={sendTest} disabled={busy === 'test' || !v.host || !v.user}>{busy === 'test' ? 'Envoi du test…' : 'Envoyer un e-mail de test'}</Btn>
              {result && <div className={`a-banner ${result.ok ? 'is-ok' : 'is-warn'}`} style={{ margin: 0 }}>{result.text}</div>}
            </div>
          </Card>
          <Card title="Envoi en masse">
            <div className="a-form">
              <Field label="Pause entre deux e-mails (ms)" hint="Les hébergeurs limitent le nombre d’e-mails par heure. 400 ms ≈ 150 e-mails/minute ; augmentez si vous êtes bloqué."><Input type="number" min="0" value={v.delay_ms} onChange={x => set('delay_ms')(Number(x))} /></Field>
            </div>
          </Card>
          <Card title="Où trouver ces informations ?">
            <p className="a-hint" style={{ margin: 0, lineHeight: 1.6 }}>
              <strong>Hostinger :</strong> hPanel › E-mails › créez la boîte (ex. contact@votre-domaine.com). Serveur <code>smtp.hostinger.com</code>, port <code>465</code> (SSL), identifiant = l’adresse complète, mot de passe = celui de la boîte.<br /><br />
              <strong>Gmail :</strong> activez la validation en 2 étapes puis créez un « mot de passe d’application ».
            </p>
          </Card>
        </div>
      </div>
    </>
  );
}
