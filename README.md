# 🅿️ Social Parking

Chi lascia il parcheggio avvisa chi lo cerca. Gratuito, anonimo, senza registrazione.
Un'unica base di codice produce **sito/PWA**, **app iOS** (App Store) e **app Android** (Google Play).

## Architettura

```
Next.js (export statico → out/)
 ├── Firebase Hosting ............ sito + PWA (www.siigep.tech)
 └── Capacitor ................... app native ios/ e android/
Firebase
 ├── Auth anonima ................ nessuna registrazione
 ├── Firestore + firestore.rules . dati e anti-cheat
 └── Cloud Functions (functions/)  push, punti, inviti, statistiche, pulizia
```

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | sviluppo su http://localhost:9002 |
| `npm run build` | build statica in `out/` |
| `npm test` | test logica (rilevamento auto, punti, codici invito) |
| `npm run test:rules` | test regole Firestore sull'emulatore |
| `npm run cap:ios` / `npm run cap:android` | build + apre Xcode / Android Studio |
| `npm run generate-icons` + `npm run cap:assets` | rigenera icone e splash |
| `npm run deploy:web` | pubblica il sito |
| `npm run deploy:backend` | pubblica Cloud Functions e regole |

Configurazione: copia `.env.example` in `.env.local` e inserisci il token Mapbox.

## Documentazione
- [`docs/PUBBLICAZIONE_STORE.md`](docs/PUBBLICAZIONE_STORE.md) – checklist passo-passo per App Store e Play Store
- [`docs/CRESCITA_VIRALE.md`](docs/CRESCITA_VIRALE.md) – meccaniche virali e piano di lancio
- [`store/`](store/) – testi delle schede store (IT/EN) e grafiche
