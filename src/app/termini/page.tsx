import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { CONTACT_EMAIL } from '@/lib/constants';

export const metadata: Metadata = { title: 'Termini di utilizzo – Social Parking' };

export default function TermsPage() {
  return (
    <LegalPage title="Termini di utilizzo" updated="30 settembre 2026">
      <p>Usando Social Parking accetti questi termini. Se non li accetti, non usare l&apos;App.</p>

      <h2>1. Il servizio</h2>
      <p>
        Social Parking è una community gratuita in cui gli automobilisti segnalano volontariamente i posti che stanno lasciando.
        Le informazioni sono fornite dagli utenti: <strong>non garantiamo che un posto sia effettivamente libero, legale, gratuito o adatto al tuo veicolo</strong>.
        Rispetta sempre il Codice della Strada e la segnaletica.
      </p>

      <h2>2. Sicurezza alla guida</h2>
      <p>Non usare il telefono mentre guidi. Consulta l&apos;App solo a veicolo fermo o affidala a un passeggero.</p>

      <h2>3. Comportamento</h2>
      <ul>
        <li>Non pubblicare segnalazioni false o fatte per ottenere punti.</li>
        <li>Non &quot;vendere&quot; posti pubblici né chiedere compensi per lo scambio.</li>
        <li>Rispetta gli altri utenti durante lo scambio del codice.</li>
      </ul>
      <p>Possiamo limitare o rimuovere l&apos;accesso a chi viola queste regole o manipola punti e classifiche.</p>

      <h2>4. Punti e badge</h2>
      <p>Punti, livelli e badge sono puramente simbolici, non hanno valore economico e non sono convertibili in denaro.</p>

      <h2>5. Responsabilità</h2>
      <p>
        Il servizio è fornito &quot;così com&apos;è&quot;. Nei limiti consentiti dalla legge non siamo responsabili per multe, danni, rimozioni
        forzate o controversie tra utenti derivanti dall&apos;uso delle segnalazioni.
      </p>

      <h2>6. Contatti</h2>
      <p>Per domande: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. Legge applicabile: italiana.</p>
    </LegalPage>
  );
}
