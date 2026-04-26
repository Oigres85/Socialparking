# 🧪 Guida di Test - Funzionalità Nuove Social Parking

## 🚀 Setup

- **Dev Server**: http://localhost:9002
- **Environment**: Local testing con GPS simulato
- **Browser**: Chrome/Firefox con DevTools aperti (F12)

---

## 📍 TEST 1: Rilevamento Parcheggio (90 secondi di stop)

### Obiettivo
Verificare che il pop-up "PARCHEGGIO RILEVATO!" compaia dopo 90 secondi di stazionamento

### Step
1. Apri http://localhost:9002
2. **Consenti geolocalizzazione** quando richiesto
3. Aspetta che la mappa si carichi (localizzazione Roma)
4. **Rimani fermo** nella stessa posizione per 90 secondi
   - Verifica in DevTools (F12 → Console) che il timer progredisce
   - Output atteso: "timeRemainingForAlert: 90 → 0"

### Expected Output
- ✅ Dopo ~90s: Pop-up nero con **"PARCHEGGIO RILEVATO!"** e emoji 🅿️
- ✅ Pulsante "LIBERA PARCHEGGIO" visibile
- ✅ Pulsante "NON ORA" per dismissare

### Fallback Test
- Se GPS non disponibile: Simula manualmente nei hook di React DevTools
  - Apri Components → Home → use-parking-detection
  - Modifica `isParkingDetected` a `true`

---

## 🗺️ TEST 2: Geofencing (200m di raggio)

### Obiettivo
Verificare che il geofencing monitora l'uscita dal parcheggio e la rientrata

### Step
1. **Completare TEST 1** (avere il pop-up di rilevamento)
2. Clicca "LIBERA PARCHEGGIO"
   - Pop-up scompare, banner "PARCHEGGIO LIBERATO" appare
   - Coordinate salvate in `parkingLocation`

3. **Simulare uscita dal parcheggio (>200m)**:
   - Apri DevTools → Console
   - Modifica la posizione utente:
   ```javascript
   // Simulare movimento >200m
   window.dispatchEvent(new CustomEvent('geolocation-update', {
     detail: { latitude: 41.905, longitude: 12.496 }
   }));
   ```
   - Verifica: `hasExited` diventa `true`

4. **Simulare rientrata a piedi (<80m)**:
   - Ritorna vicino al parcheggio originale
   - Verifica: `hasReentered` diventa `true`
   - Console log atteso: "Rientrata a piedi - segnala posto libero"

### Expected Output
- ✅ Geofence area visibile sulla mappa (cerchio 200m)
- ✅ Quando esci: notifica o flag `hasExited=true`
- ✅ Quando rientri <80m: alert "Rientrata a piedi"

---

## 🔔 TEST 3: Web Push VAPID

### Obiettivo
Verificare che le notifiche push funzionano correttamente

### Step
1. Apri http://localhost:9002
2. Consenti notifiche quando richiesto
3. Verifica che il Service Worker sia registrato:
   - DevTools → Application → Service Workers
   - Dovrebbe essere "active and running"

4. Testa ricezione push:
   - Apri DevTools → Application → Service Workers
   - Clicca "Push" accanto al SW registrato
   - Payload di test:
   ```json
   {
     "title": "Parcheggio disponibile!",
     "body": "Un nuovo posto si è liberato a 200m da te",
     "icon": "/icon-192.png",
     "badge": "/icon-192.png",
     "tag": "parking-alert"
   }
   ```

5. **Verifica notifica**:
   - Notifica dovrebbe apparire in alto a sinistra
   - Click sulla notifica dovrebbe portare all'app

### Expected Output
- ✅ Notifica visibile con icona e testo
- ✅ Vibrazione del device (se supportato)
- ✅ Click apre l'app e mette in focus

---

## 📊 TEST 4: UI Dynamics

### Obiettivo
Verificare che il pulsante "LIBERA PARCHEGGIO" e il testo "INIZIA AD AIUTARE" appaiono/scompaiono correttamente

### Step
1. Apri http://localhost:9002
2. **Stato iniziale** (prima del rilevamento):
   - ✅ Pulsante "LIBERA PARCHEGGIO" **nascosto**
   - ✅ Testo "INIZIA AD AIUTARE LA COMMUNITY!" **nascosto**
   - ✅ Ricerca e switch per toggle ricerca visibili

3. **Dopo 90s di stop** (rilevamento parcheggio):
   - ✅ Pop-up "PARCHEGGIO RILEVATO!" appare
   - ✅ Pulsante "LIBERA PARCHEGGIO" compare con animazione fade-in

4. **Dopo aver cliccato "NON ORA"**:
   - Pop-up scompare
   - Pulsante scompare
   - Timer reset, torna allo stato iniziale

### Expected Output
- ✅ Transizioni fluide con animazioni
- ✅ Nessun layout shift brusco
- ✅ Stato UI coerente

---

## 🎯 TEST 5: Integration Test

### Obiettivo
Test completo del flusso: rilevamento → parcheggio → geofencing

### Scenario
1. Arriva al parcheggio
2. Rimane fermo 90s → Pop-up
3. Clicca "LIBERA PARCHEGGIO" → Parcheggio salvato
4. Si allontana >200m → Geofencing attivo
5. Riceve notifica → Rientra

### Expected Timeline
```
00:00 - Arriva al parcheggio
01:30 - Pop-up rilevamento
01:35 - Clicca "LIBERA PARCHEGGIO"
02:00 - Si allontana a piedi
05:00 - Raggiunge >200m: hasExited=true
06:00 - Riceve notifica push
07:00 - Rientra <80m: hasReentered=true
```

---

## 🐛 Debugging

### Console Logs
```javascript
// Controllare stato rilevamento
console.log('isParkingDetected:', isParkingDetected);
console.log('timeRemainingForAlert:', timeRemainingForAlert);

// Controllare geofencing
console.log('isInsideGeofence:', isInsideGeofence);
console.log('hasExited:', hasExited);
console.log('hasReentered:', hasReentered);
```

### DevTools Tips
- **React DevTools**: Inspect `useParkingDetection` hook state
- **Network**: Verifica che le push subscription siano salvate in Firestore
- **Application**: Controlla Service Worker e Push notifications
- **Console**: Cerca errori legati a GPS/Geolocation

---

## ✅ Checklist Finale

- [ ] Rilevamento parcheggio (90s) funziona
- [ ] Pop-up appare al rilevamento
- [ ] Pulsante "LIBERA PARCHEGGIO" visibile solo dopo rilevamento
- [ ] Geofencing monitora uscita (200m)
- [ ] Rientrata a piedi (<80m) rilevata
- [ ] Web Push riceve notifiche
- [ ] Service Worker registrato e attivo
- [ ] Nessun errore in console
- [ ] Transizioni UI fluide
- [ ] GPS funzionante

---

## 📱 Test su Mobile

Per testare su dispositivo fisico:
1. Connetti a rete locale: `http://192.168.1.101:9002`
2. Installazione PWA: Menu → "Installa app"
3. Testa geolocalizzazione reale (non simulata)
4. Verifica GPS accuracy dopo 30s di lock

---

**Ultima modifica**: 2026-04-26  
**Versione**: 1.0.0
