import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { CONTACT_EMAIL } from '@/lib/constants';

export const metadata: Metadata = { title: 'Eliminazione dati – Social Parking' };

/** Pagina richiesta da Google Play ("Data deletion URL") e utile per la review Apple. */
export default function DeleteDataPage() {
  return (
    <LegalPage title="Eliminazione dei dati" updated="30 settembre 2026">
      <p>Social Parking non richiede registrazione: il tuo profilo è anonimo e legato solo al dispositivo.</p>

      <h2>Dall&apos;App (immediato)</h2>
      <ul>
        <li>Apri Social Parking.</li>
        <li>Tocca il pulsante del profilo in alto a destra (emoji e punti).</li>
        <li>Scorri in fondo e tocca <strong>Elimina i miei dati</strong>, poi conferma.</li>
      </ul>
      <p>Vengono cancellati definitivamente: profilo anonimo, punti, badge, codice invito, ultima posizione, token delle notifiche e tutte le tue segnalazioni di parcheggio.</p>

      <h2>Via email</h2>
      <p>
        Se non hai più accesso all&apos;App, scrivi a <a href={`mailto:${CONTACT_EMAIL}?subject=Eliminazione%20dati%20Social%20Parking`}>{CONTACT_EMAIL}</a>
        {' '}indicando il tuo codice invito (lo trovi nel profilo). Evaderemo la richiesta entro 30 giorni.
      </p>

      <h2>Dati conservati</h2>
      <p>Non conserviamo alcun dato personale dopo l&apos;eliminazione. Possono restare solo contatori aggregati e anonimi (es. &quot;posti liberati oggi&quot;).</p>
    </LegalPage>
  );
}
