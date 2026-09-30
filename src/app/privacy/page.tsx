import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';
import { CONTACT_EMAIL } from '@/lib/constants';

export const metadata: Metadata = { title: 'Privacy Policy – Social Parking' };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="30 settembre 2026">
      <p>
        Social Parking (&quot;l&apos;App&quot;) è una community che permette a chi lascia un parcheggio di segnalarlo a chi
        lo sta cercando. Questa informativa, resa ai sensi del Regolamento UE 2016/679 (GDPR), spiega quali dati trattiamo e perché.
        Abbiamo progettato l&apos;App per raccogliere il minimo indispensabile: <strong>non chiediamo nome, email, numero di telefono né registrazione</strong>.
      </p>

      <h2>1. Titolare del trattamento</h2>
      <p>Il titolare è il gestore del sito www.siigep.tech, contattabile all&apos;indirizzo <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</p>

      <h2>2. Dati trattati</h2>
      <ul>
        <li><strong>Identificativo anonimo</strong>: generato automaticamente al primo avvio (Firebase Anonymous Authentication). Non è collegato alla tua identità.</li>
        <li><strong>Posizione precisa</strong>: usata solo mentre l&apos;App è aperta per mostrarti i posti vicini, riconoscere quando hai parcheggiato e avvisarti quando si libera un posto vicino. L&apos;ultima posizione nota viene salvata per inviarti le notifiche pertinenti.</li>
        <li><strong>Segnalazioni di parcheggio</strong>: coordinate del posto liberato, orario, stato (libero/prenotato) e codice di prenotazione temporaneo. Vengono cancellate automaticamente dopo circa un&apos;ora.</li>
        <li><strong>Token per le notifiche push</strong>: se le attivi, un identificativo tecnico fornito da Apple, Google o dal browser.</li>
        <li><strong>Statistiche di gioco</strong>: punti, livello, badge, giorni consecutivi, codice invito e l&apos;eventuale codice dell&apos;amico che ti ha invitato.</li>
        <li><strong>Dati di utilizzo</strong>: eventi anonimi di utilizzo (es. &quot;parcheggio liberato&quot;) tramite Firebase Analytics, per migliorare l&apos;App.</li>
      </ul>
      <p>La posizione dell&apos;auto rilevata automaticamente resta <strong>solo sul tuo dispositivo</strong> e non viene inviata ai nostri server finché non decidi di liberare il posto.</p>

      <h2>3. Finalità e base giuridica</h2>
      <ul>
        <li>Fornire il servizio richiesto (art. 6.1.b GDPR): mappa, segnalazioni, prenotazioni, notifiche.</li>
        <li>Sicurezza e prevenzione abusi (art. 6.1.f GDPR).</li>
        <li>Statistiche aggregate di utilizzo (art. 6.1.f GDPR).</li>
      </ul>
      <p>Non vendiamo i tuoi dati, non li usiamo per pubblicità profilata e non li condividiamo con terzi per finalità di marketing.</p>

      <h2>4. Cosa vedono gli altri utenti</h2>
      <p>Gli altri utenti vedono soltanto la posizione dei posti liberati e il codice di prenotazione durante lo scambio. Non vedono mai la tua posizione in tempo reale né alcun dato identificativo.</p>

      <h2>5. Fornitori (responsabili del trattamento)</h2>
      <ul>
        <li>Google Firebase (Authentication, Firestore, Cloud Functions, Cloud Messaging, Analytics) – server UE/USA con Clausole Contrattuali Standard.</li>
        <li>Mapbox – visualizzazione della mappa.</li>
        <li>Apple Push Notification service e Google Firebase Cloud Messaging – consegna delle notifiche.</li>
      </ul>

      <h2>6. Conservazione</h2>
      <ul>
        <li>Segnalazioni di parcheggio: circa 1 ora.</li>
        <li>Profilo anonimo (punti, badge, ultima posizione, token push): finché usi l&apos;App o fino alla cancellazione.</li>
      </ul>

      <h2>7. I tuoi diritti ed eliminazione dei dati</h2>
      <p>
        Puoi eliminare in qualsiasi momento tutti i tuoi dati direttamente dall&apos;App: <strong>Profilo → Elimina i miei dati</strong>.
        L&apos;operazione è immediata e irreversibile. Puoi inoltre esercitare i diritti di accesso, rettifica, cancellazione, limitazione,
        portabilità e opposizione scrivendo a <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, e proporre reclamo al Garante per la protezione dei dati personali.
        Maggiori dettagli alla pagina <a href="/elimina-dati/">Eliminazione dati</a>.
      </p>

      <h2>8. Minori</h2>
      <p>L&apos;App è pensata per automobilisti e non è rivolta a minori di 14 anni.</p>

      <h2>9. Modifiche</h2>
      <p>Eventuali modifiche saranno pubblicate su questa pagina con la data di aggiornamento.</p>
    </LegalPage>
  );
}
