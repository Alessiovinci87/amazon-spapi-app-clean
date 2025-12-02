
# 📦 Gestione Produzione e Accessori – Amazon SPAPI Tool

Questa guida descrive il flusso completo di gestione della produzione dei prodotti e la scalatura automatica degli accessori associati nel gestionale Amazon SP-API.

---

## ✅ Obiettivi raggiunti

- Salvataggio persistente del campo `pronto` nei prodotti
- Scalatura automatica degli accessori associati
- Aggiornamento e persistenza delle quantità accessori nel database
- Sincronizzazione completa al refresh o cambio pagina

---

## 🔁 Flusso di lavoro completo

### 1. Modifica del valore `pronto` in un prodotto

- Quando l’utente modifica il campo `pronto` e clicca su conferma:
  - Viene calcolato il **delta** (es. da 100 → 200 = `delta = 100`)
  - Viene eseguita una **PATCH** su `/api/inventario/:asin`
  - Il nuovo valore viene salvato nel DB e aggiornato nello stato locale
  - Se il `delta > 0`, viene attivata la **scalatura automatica accessori**

### 2. Scalatura automatica accessori

- La funzione `aggiornaAccessoriAutomatica()`:
  - Legge il formato del prodotto (`12ml` o `100ml`)
  - Seleziona gli accessori associati (`BOCCETTE`, `TAPPINI`, `PENNELLINI`)
  - Scala le quantità correnti (`quantita - delta`)
  - Esegue una PATCH su `/api/accessoriFix/:asin_accessorio` per ciascun accessorio

### 3. Salvataggio accessori nel database

- Backend:
  - `accessoriFixController.js` → route PATCH
  - `accessoriFixService.js` → query SQL `UPDATE accessori SET quantita = ? WHERE asin_accessorio = ?`
- I dati rimangono persistenti in SQLite

### 4. Ricarica e sincronizzazione

- All’avvio del componente `Inventario.jsx`, viene eseguito:

```js
useEffect(() => {
  fetchAccessori();
  fetchProdotti();
}, []);
```

- I dati vengono ricaricati da backend e mostrati nel frontend
- Il `localStorage` viene aggiornato come **backup** o per pre-caricamento immediato

---

## 🧠 Logica attuale

| Componente | Funzione | Ruolo |
|------------|----------|-------|
| `Inventario.jsx` | `handleConferma()` | Gestisce update e delta |
| `gestioneInventario.js` | `aggiornaAccessoriAutomatica()` | Scala accessori associati |
| `accessoriFixController.js` | `updateQuantitaAccessorio()` | Controller PATCH accessori |
| `accessoriFixService.js` | `updateQuantitaAccessorio()` | Query SQLite |
| `useEffect` | `fetchAccessori()` + `fetchProdotti()` | Ricarica dati da DB |

---

## 🟡 LocalStorage: uso e funzione

- **Serve come backup** in caso di fetch fallito (offline)
- **Velocizza il rendering** in alcune pagine
- Può essere rimosso se si vuole un sistema interamente centralizzato su backend

---

## ⚠️ Limiti attuali

| Punto | Stato | Note |
|-------|-------|------|
| Gestione `delta < 0` | ❌ | Gli accessori **non vengono ripristinati** |
| Rettifica manuale | 🔧 | Da implementare (opzione "Annulla produzione") |
| Storico movimenti | ❌ | Assente (consigliato per audit) |

---

## 🧾 Esempi tecnici

### PATCH prodotto pronto

```js
await fetch(`/api/inventario/${prodotto.asin}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ campo: "pronto", valore: valoreNumerico }),
});
```

### PATCH accessorio

```js
await fetch(`/api/accessoriFix/${accessorio.asin_accessorio}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ quantita: nuovaQuantita }),
});
```

---

## 📌 TODO consigliati

- [ ] Implementare storico movimenti (produzione, rettifiche)
- [ ] Gestire `delta < 0` con logica di ripristino o alert
- [ ] Aggiungere notifiche visive o toast di conferma
- [ ] Valutare rimozione del localStorage se superfluo

---

## 🔚 Conclusione

Questa architettura è ora **robusta, scalabile e persistente**, pronta per integrare funzionalità avanzate come lo **storico dei movimenti**, i **report di produzione**, e gli **alert automatici**.
