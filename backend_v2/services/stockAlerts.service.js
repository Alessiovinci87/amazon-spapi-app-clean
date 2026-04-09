// backend_v2/services/stockAlerts.service.js
// Helper per generare alert STOCK_LOW nella tabella alert_events
// quando lo stock di un prodotto (One Step / Top Coat / modulo custom)
// scende sotto la soglia minima configurata.
//
// Auto-clear: se lo stock torna sopra la soglia, l'alert non letto viene
// marcato come letto automaticamente.

function _processCheck(db, { asin, prod, source, modulo_label }) {
  if (!prod) return;

  if (prod.quantita < prod.soglia_minima) {
    // Verifica se esiste già un alert STOCK_LOW non letto per questa fonte+asin
    const existing = db.prepare(`
      SELECT id FROM alert_events
      WHERE asin = ? AND tipo = 'STOCK_LOW' AND letto = 0 AND source = ?
    `).get(asin, source);

    if (!existing) {
      const nomeMostrato = prod.codice_colore
        ? `${prod.codice_colore}${prod.nome ? " · " + prod.nome.slice(0, 40) : ""}`
        : (prod.nome ?? asin);
      const messaggio = `[${modulo_label}] ${nomeMostrato} — stock ${prod.quantita}/${prod.soglia_minima}`;
      db.prepare(`
        INSERT INTO alert_events (asin, tipo, messaggio, valore_attuale, valore_precedente, source)
        VALUES (?, 'STOCK_LOW', ?, ?, ?, ?)
      `).run(asin, messaggio, String(prod.quantita), String(prod.soglia_minima), source);
    }
  } else {
    // Stock tornato sopra soglia → auto-clear degli alert aperti per questa fonte+asin
    db.prepare(`
      UPDATE alert_events SET letto = 1
      WHERE asin = ? AND tipo = 'STOCK_LOW' AND letto = 0 AND source = ?
    `).run(asin, source);
  }
}

function checkSottoSogliaOnestep(db, asin) {
  try {
    const prod = db.prepare(
      "SELECT nome, codice_colore, quantita, soglia_minima FROM onestep_prodotti WHERE asin = ?"
    ).get(asin);
    _processCheck(db, { asin, prod, source: "onestep", modulo_label: "One Step" });
  } catch (e) { console.warn("⚠️ checkSottoSogliaOnestep:", e.message); }
}

function checkSottoSogliaTopcoat(db, asin) {
  try {
    const prod = db.prepare(
      "SELECT nome, codice_colore, quantita, soglia_minima FROM topcoat_prodotti WHERE asin = ?"
    ).get(asin);
    _processCheck(db, { asin, prod, source: "topcoat", modulo_label: "Top Coat" });
  } catch (e) { console.warn("⚠️ checkSottoSogliaTopcoat:", e.message); }
}

function checkSottoSogliaProdotti(db, asin) {
  try {
    const prod = db.prepare(
      "SELECT nome, pronto AS quantita, soglia_minima FROM prodotti WHERE asin = ?"
    ).get(asin);
    _processCheck(db, { asin, prod, source: "prodotti", modulo_label: "Prodotti" });
  } catch (e) { console.warn("⚠️ checkSottoSogliaProdotti:", e.message); }
}

function checkSottoSogliaModulo(db, modulo_id, asin) {
  try {
    const m = db.prepare("SELECT slug, label FROM moduli_custom WHERE id = ?").get(modulo_id);
    if (!m) return;
    const prod = db.prepare(
      "SELECT nome, codice_colore, quantita, soglia_minima FROM moduli_prodotti WHERE asin = ? AND modulo_id = ?"
    ).get(asin, modulo_id);
    _processCheck(db, { asin, prod, source: `modulo:${m.slug}`, modulo_label: m.label });
  } catch (e) { console.warn("⚠️ checkSottoSogliaModulo:", e.message); }
}

// ─────────────────────────────────────────────────────────────────
// RIGENERA: scansione completa di tutti i prodotti dei moduli.
// Per ogni prodotto sotto soglia crea l'alert (se manca);
// per ogni prodotto tornato sopra soglia auto-clear degli alert aperti.
// Ritorna il conteggio per modulo: { onestep, topcoat, moduli, totaleScansionati }.
// ─────────────────────────────────────────────────────────────────
function rigeneraAlertSottoSoglia(db) {
  const stats = {
    totaleScansionati: 0,
    prodotti: { scansionati: 0, sottoSoglia: 0 },
    onestep:  { scansionati: 0, sottoSoglia: 0 },
    topcoat:  { scansionati: 0, sottoSoglia: 0 },
    moduli:   { scansionati: 0, sottoSoglia: 0 },
  };

  // Conta gli alert STOCK_LOW non letti prima e dopo per misurare le modifiche
  const countOpen = () => db.prepare(
    "SELECT COUNT(*) AS n FROM alert_events WHERE tipo = 'STOCK_LOW' AND letto = 0"
  ).get().n;

  const apertiPrima = countOpen();

  db.transaction(() => {
    // ── Prodotti inventario ───────────────────────────────────
    try {
      const prodotti = db.prepare(
        "SELECT asin, nome, pronto AS quantita, soglia_minima FROM prodotti"
      ).all();
      for (const prod of prodotti) {
        _processCheck(db, { asin: prod.asin, prod, source: "prodotti", modulo_label: "Prodotti" });
        stats.prodotti.scansionati++;
        if (prod.quantita < prod.soglia_minima) stats.prodotti.sottoSoglia++;
      }
    } catch (e) { console.warn("⚠️ rigenera prodotti:", e.message); }

    // ── One Step ───────────────────────────────────────────────
    try {
      const onestep = db.prepare(
        "SELECT asin, nome, codice_colore, quantita, soglia_minima FROM onestep_prodotti"
      ).all();
      for (const prod of onestep) {
        _processCheck(db, { asin: prod.asin, prod, source: "onestep", modulo_label: "One Step" });
        stats.onestep.scansionati++;
        if (prod.quantita < prod.soglia_minima) stats.onestep.sottoSoglia++;
      }
    } catch (e) { console.warn("⚠️ rigenera onestep:", e.message); }

    // ── Top Coat ───────────────────────────────────────────────
    try {
      const topcoat = db.prepare(
        "SELECT asin, nome, codice_colore, quantita, soglia_minima FROM topcoat_prodotti"
      ).all();
      for (const prod of topcoat) {
        _processCheck(db, { asin: prod.asin, prod, source: "topcoat", modulo_label: "Top Coat" });
        stats.topcoat.scansionati++;
        if (prod.quantita < prod.soglia_minima) stats.topcoat.sottoSoglia++;
      }
    } catch (e) { console.warn("⚠️ rigenera topcoat:", e.message); }

    // ── Moduli custom ──────────────────────────────────────────
    try {
      const moduli = db.prepare("SELECT id, slug, label FROM moduli_custom").all();
      for (const m of moduli) {
        const prodotti = db.prepare(
          "SELECT asin, nome, codice_colore, quantita, soglia_minima FROM moduli_prodotti WHERE modulo_id = ?"
        ).all(m.id);
        for (const prod of prodotti) {
          _processCheck(db, { asin: prod.asin, prod, source: `modulo:${m.slug}`, modulo_label: m.label });
          stats.moduli.scansionati++;
          if (prod.quantita < prod.soglia_minima) stats.moduli.sottoSoglia++;
        }
      }
    } catch (e) { console.warn("⚠️ rigenera moduli custom:", e.message); }
  })();

  stats.totaleScansionati = stats.prodotti.scansionati + stats.onestep.scansionati + stats.topcoat.scansionati + stats.moduli.scansionati;
  const apertiDopo = countOpen();
  stats.alertAperti = { prima: apertiPrima, dopo: apertiDopo, delta: apertiDopo - apertiPrima };

  return stats;
}

module.exports = {
  checkSottoSogliaProdotti,
  checkSottoSogliaOnestep,
  checkSottoSogliaTopcoat,
  checkSottoSogliaModulo,
  rigeneraAlertSottoSoglia,
};
