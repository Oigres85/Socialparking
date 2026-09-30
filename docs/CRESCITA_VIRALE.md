# Crescita virale – cosa c'è nell'app e come lanciarla

Social Parking è un **marketplace a due lati** (chi libera ↔ chi cerca): funziona solo se in una zona c'è abbastanza densità di utenti. La viralità quindi va **concentrata per quartiere**, non sparsa in tutta Italia.

## Meccaniche implementate

| Meccanica | Dove | Perché funziona |
|---|---|---|
| **Codice invito personale** + link `?ref=` | Profilo, lista vuota, testi condivisi | Doppio incentivo: +25 punti a chi invita, +10 a chi entra. Notifica push all'invitante quando l'amico arriva (chiude il loop). |
| **Card per le Storie** (1080×1920) | Dopo aver liberato un posto, badge, livello, profilo | Le immagini nelle Storie IG/WhatsApp portano molto più traffico di un link. Contiene il codice invito. |
| **Invito sullo stato vuoto** | "Nessun posto libero qui… ancora" | Trasforma il momento di frustrazione (cold start) in un invito. |
| **Livelli, badge, streak** | Profilo, celebrazioni | Motivano a liberare posti (lato offerta, il più scarso). Punti calcolati lato server: niente cheat. |
| **Impatto (minuti e CO₂ risparmiati)** | Profilo e card | Contenuto "di cui vantarsi" socialmente accettabile. |
| **Rilevamento ritorno all'auto** | Popup automatico | Chiede di liberare il posto nel momento giusto → più offerta. Ricorda anche dove hai parcheggiato: utilità quotidiana → retention. |
| **Push "qualcuno sta arrivando"** | Al proprietario del posto | Gratifica immediata di chi aiuta. |
| **Contatore reale** | Landing page | Social proof vero (niente numeri inventati, rischiosi in review). |
| **Deep link Universal/App Links** | Link invito | Chi ha già l'app atterra direttamente dentro. |

## Piano di lancio (4 settimane, poco tempo richiesto)

1. **Settimana 1 – Una zona sola.** Scegli 1 quartiere ad alta frustrazione (es. centro di Salerno / Lungomare, o una zona di Roma dove vai 2 giorni a settimana). Obiettivo: 50 utenti attivi lì, non 5.000 sparsi.
2. **Semina l'offerta.** Chi frequenta quella zona ogni giorno (negozianti, dipendenti, genitori all'uscita di scuola) libera posti a orari prevedibili: coinvolgi 2–3 gruppi WhatsApp di quartiere/scuola con un messaggio personale + card.
3. **Contenuto nativo.** Video verticali di 15 s "cerco parcheggio da 20 minuti… → notifica → posto trovato" per TikTok/Reels, con geotag locale. Il problema è universale e fa ridere: è la leva più economica.
4. **Local press e pagine social comunali** ("app nata a Salerno contro il traffico"). La CO₂ risparmiata è l'angolo per i media.
5. **Espandi solo quando la zona "funziona"** (un posto segnalato ogni ~10 minuti negli orari di punta). Poi la zona accanto.

## Metriche da guardare (Firebase Analytics)
- `parking_freed` / utenti attivi → salute dell'offerta
- `parking_booked` / `parking_freed` → match rate
- `share_triggered` e utenti arrivati con `referralClaims` → coefficiente virale (K)
- `return_to_car_detected` → quanti prompt diventano `parking_freed`

## Prossimi passi consigliati
- Geolocalizzazione in background (plugin nativo) per rilevare il ritorno all'auto anche ad app chiusa – richiede motivazione forte in review Apple.
- Richiesta di recensione in-app dopo il 3° scambio riuscito.
- Classifiche per quartiere (i dati ci sono già: `points` è calcolato lato server).
- Partnership con parcheggi/garage come fonte di posti e di ricavi.
