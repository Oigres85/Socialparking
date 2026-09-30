# Pubblicazione su App Store e Google Play

Checklist in ordine. ⏱️ = tempo stimato. 🔑 = serve un account/pagamento.

## 0. Prerequisiti (una tantum)
- 🔑 **Apple Developer Program** – 99 $/anno (developer.apple.com). Serve un **Mac con Xcode** per compilare iOS (in alternativa: servizio cloud come Ionic Appflow o Codemagic).
- 🔑 **Google Play Console** – 25 $ una tantum. ⚠️ Gli account personali nuovi devono fare un **test chiuso con almeno 12 tester per 14 giorni** prima della pubblicazione: avvialo subito. Un account "organizzazione" (serve D-U-N-S) ne è esente.
- Verifica che l'email `privacy@siigep.tech` esista (usata in Privacy/Termini, `src/lib/constants.ts`).
- ⚠️ **`appId` = `tech.siigep.socialparking`** (`capacitor.config.ts`): dopo la prima pubblicazione non si cambia più.

## 1. Backend Firebase ⏱️ 30 min
```bash
npm i -g firebase-tools && firebase login
firebase functions:secrets:set VAPID_PRIVATE_KEY   # chiave privata VAPID (quella della pubblica in src/firebase/config.ts)
npm --prefix functions install
npm run deploy:backend                             # Functions + regole + indici
```
- Console Firebase → Authentication → abilita **Anonimo**.
- Il progetto deve essere sul piano **Blaze** (pay-as-you-go) per le Cloud Functions: con questi volumi il costo resta di norma nei limiti gratuiti. Imposta un **budget alert** a 5 €.
- Se il database Firestore è in Europa (`eur3`), imposta `region: 'europe-west1'` in `functions/src/index.ts` (vedi nota nel file).
- ⚠️ Le vecchie "server action" non esistono più: il sito va ripubblicato con `npm run deploy:web` (export statico su Firebase Hosting). Se il dominio era servito da **App Hosting**, spostalo su Hosting o elimina il backend App Hosting.

## 2. Notifiche push native ⏱️ 30 min
1. Console Firebase → Impostazioni progetto → **Aggiungi app** Android (`tech.siigep.socialparking`) → scarica `google-services.json` in `android/app/`.
2. **Aggiungi app** iOS (stesso bundle id) → scarica `GoogleService-Info.plist` → trascinalo in Xcode dentro `App/App` (spunta "Copy items" e il target App).
3. Apple Developer → Keys → crea una chiave **APNs** (.p8) → caricala in Firebase → Cloud Messaging → Configurazione app Apple.
4. In Xcode → target App → Signing & Capabilities: verifica **Push Notifications**, **Background Modes › Remote notifications**, **Associated Domains** (già nel file `App.entitlements`).

## 3. Deep link degli inviti ⏱️ 10 min
- `public/.well-known/apple-app-site-association`: sostituisci `TEAMID` con il tuo Apple Team ID.
- `public/.well-known/assetlinks.json`: incolla l'impronta **SHA-256** della chiave di firma (Play Console → Integrità dell'app).
- `npm run deploy:web`.

## 4. Build ⏱️ 20 min
```bash
cp .env.example .env.local        # token Mapbox (limitato ai domini dell'app)
npm install
npm run cap:ios                   # apre Xcode → Product › Archive → Distribuisci su App Store Connect
npm run cap:android               # apre Android Studio → Build › Generate Signed Bundle (.aab)
```
Firma Android: crea la chiave una volta sola e **conservala in un posto sicuro** (se la perdi non puoi più aggiornare l'app, a meno di usare Play App Signing – consigliato):
```bash
keytool -genkey -v -keystore android/upload-keystore.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000
```
poi crea `android/keystore.properties` (non committato):
```
storeFile=../upload-keystore.jks
storePassword=...
keyAlias=upload
keyPassword=...
```
Ad ogni aggiornamento incrementa `versionCode` (android/app/build.gradle) e `CURRENT_PROJECT_VERSION` (Xcode).

## 5. Schede store ⏱️ 1 ora
Testi pronti in `store/listing-it.md` e `store/listing-en.md`; grafiche in `store/graphics/`.

**Screenshot** (obbligatori): iPhone 6,9" (1320×2868) e telefono Android. Consiglio: 5 schermate con didascalia grande in alto:
1. Mappa con posti liberi – "Trova parcheggio in 1 minuto"
2. Codice prenotazione – "Prenota con un tap"
3. Popup ritorno all'auto – "Ti ricorda di liberare il posto"
4. Profilo con livello e badge – "Guadagna punti aiutando gli altri"
5. Card condivisa – "Invita gli amici della tua zona"

**App Store Connect → Privacy dell'app** (coerente con `ios/App/App/PrivacyInfo.xcprivacy`):
- Posizione precisa → Funzionalità dell'app → non collegata all'identità → nessun tracciamento
- ID utente e ID dispositivo → Funzionalità dell'app → non collegati
- Interazione con il prodotto → Analisi → non collegata

**Google Play → Sicurezza dei dati**: stessi dati; "I dati sono criptati in transito: Sì"; "Gli utenti possono richiedere l'eliminazione: Sì" → URL `https://www.siigep.tech/elimina-dati/`.
- Privacy policy URL: `https://www.siigep.tech/privacy/`
- Classificazione contenuti: questionario → nessun contenuto sensibile (PEGI 3)
- Categoria: **Mappe e navigazione** (Play) / **Navigazione** (App Store)

## 6. Note per la revisione Apple
Da incollare in "Note per il revisore":
> L'app non richiede login (accesso anonimo). Per provarla: tocca INIZIA, consenti la posizione, attiva "Ricerca parcheggi". Per vedere un posto, da un secondo dispositivo tocca "Libera parcheggio" entro 200 m. La posizione è usata solo con app aperta ("When In Use"). Eliminazione dati: Profilo (in alto a destra) → Elimina i miei dati.

Punti che Apple controlla e che l'app ora soddisfa: niente "wrapper di un sito" (plugin nativi per posizione, push, aptica, condivisione), permessi motivati, privacy manifest, eliminazione account in-app, niente richiesta di installare una PWA dentro l'app nativa.

## 7. Dopo il lancio
- Compila `APP_STORE_URL` e `PLAY_STORE_URL` in `src/lib/constants.ts` e ripubblica il sito: la landing mostrerà il pulsante "Scarica".
- Aggiungi nel `<head>` lo smart banner iOS: `<meta name="apple-itunes-app" content="app-id=XXXXXXXXX">`.
