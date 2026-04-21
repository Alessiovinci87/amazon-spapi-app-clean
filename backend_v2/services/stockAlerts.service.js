// backend_v2/services/stockAlerts.service.js
const logger = require("../utils/logger");
// Helper per generare alert STOCK_LOW nella tabella alert_events
// quando lo stock di un prodotto (One Step / Top Coat / modulo custom)
// scende sotto la soglia minima configurata.
//
// Auto-clear: se lo stock torna sopra la soglia, l'alert non letto viene
// marcato come letto automaticamente.

function _processCheck(db, { asin, prod, source, modulo_label }) {
  if (!prod) return;

  const nomeMostrato = prod.codice_colore
    ? `${prod.codice_colore}${prod.nome ? " · " + prod.nome.slice(0, 40) : ""}`
    : (prod.nome ?? asin);

  if (prod.quantita < prod.soglia_minima) {
    // Verifica se esiste già un alert STOCK_LOW non letto per questa fonte+asin
    const existing = db.prepare(`
      SELECT id FROM alert_events
      WHERE asin = ? AND tipo = 'STOCK_LOW' AND letto = 0 AND source = ?
    `).get(asin, source);

    if (!existing) {
      const messaggio = `[${modulo_label}] ${nomeMostrato} — stock ${prod.quantita}/${prod.soglia_minima}`;
      db.prepare(`
        INSERT INTO alert_events (asin, tipo, messaggio, valore_attuale, valore_precedente, source, nome)
        VALUES (?, 'STOCK_LOW', ?, ?, ?, ?, ?)
      `).run(asin, messaggio, String(prod.quantita), String(prod.soglia_minima), source, nomeMostrato);
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
  } catch (e) { logger.warn({ err: e }, "checkSottoSogliaOnestep"); }
}

function checkSottoSogliaTopcoat(db, asin) {
  try {
    const prod = db.prepare(
      "SELECT nome, codice_colore, quantita, soglia_minima FROM topcoat_prodotti WHERE asin = ?"
    ).get(asin);
    _processCheck(db, { asin, prod, source: "topcoat", modulo_label: "Top Coat" });
  } catch (e) { logger.warn({ err: e }, "checkSottoSogliaTopcoat"); }
}

function checkSottoSogliaProdotti(db, asin) {
  try {
    const prod = db.prepare(
      "SELECT nome, pronto AS quantita, soglia_minima FROM prodotti WHERE asin = ?"
    ).get(asin);
    _processCheck(db, { asin, prod, source: "prodotti", modulo_label: "Prodotti" });
  } catch (e) { logger.warn({ err: e }, "checkSottoSogliaProdotti"); }
}

function checkSottoSogliaAccessori(db, asin_accessorio) {
  try {
    const prod = db.prepare(
      "SELECT nome, quantita, soglia_minima FROM accessori WHERE asin_accessorio = ?"
    ).get(asin_accessorio);
    if (!prod || !prod.soglia_minima) return;
    _processCheck(db, { asin: asin_accessorio, prod, source: "accessori", modulo_label: "Accessori" });
  } catch (e) { logger.warn({ err: e }, "checkSottoSogliaAccessori"); }
}

function checkSottoSogliaSfuso(db, id) {
  try {
    const row = db.prepare(
      "SELECT id, nome_prodotto AS nome, formato, litri_disponibili AS quantita, soglia_minima FROM sfuso WHERE id = ?"
    ).get(id);
    if (!row || !row.soglia_minima) return;
    _processCheck(db, { asin: String(row.id), prod: row, source: "sfuso", modulo_label: "Sfuso" });
  } catch (e) { logger.warn({ err: e }, "checkSottoSogliaSfuso"); }
}

// ─────────────────────────────────────────────────────────────────
// SFUSO INSUFFICIENTE: verifica che lo sfuso disponibile (OLD+NEW)
// copra i litri impegnati dalle prenotazioni aperte.
// ─────────────────────────────────────────────────────────────────
function _checkSfusoInsufficiente(db, sfusoRow) {
  const id = sfusoRow.id;
  const nome = sfusoRow.nome_prodotto || sfusoRow.nome || `Sfuso #${id}`;
  const disponibile = Number(sfusoRow.litri_disponibili || 0) + Number(sfusoRow.litri_disponibili_old || 0);
  const source = "sfuso_copertura";

  // Somma litri impegnati da prenotazioni aperte per questo sfuso
  const { totale_impegnati } = db.prepare(`
    SELECT COALESCE(SUM(litriImpegnati), 0) AS totale_impegnati
    FROM prenotazioni_sfuso
    WHERE id_sfuso = ? AND stato IN ('PRENOTAZIONE', 'In lavorazione')
  `).get(id);

  if (totale_impegnati <= 0) {
    // Nessuna prenotazione aperta → auto-clear
    db.prepare(`
      UPDATE alert_events SET letto = 1
      WHERE asin = ? AND tipo = 'SFUSO_INSUFFICIENTE' AND letto = 0 AND source = ?
    `).run(String(id), source);
    return false;
  }

  if (disponibile < totale_impegnati) {
    const existing = db.prepare(`
      SELECT id FROM alert_events
      WHERE asin = ? AND tipo = 'SFUSO_INSUFFICIENTE' AND letto = 0 AND source = ?
    `).get(String(id), source);

    if (!existing) {
      const deficit = (totale_impegnati - disponibile).toFixed(1);
      const messaggio = `[Sfuso] ${nome} — disponibili ${disponibile.toFixed(1)}L ma impegnati ${totale_impegnati.toFixed(1)}L (deficit ${deficit}L)`;
      db.prepare(`
        INSERT INTO alert_events (asin, tipo, messaggio, valore_attuale, valore_precedente, source, nome)
        VALUES (?, 'SFUSO_INSUFFICIENTE', ?, ?, ?, ?, ?)
      `).run(String(id), messaggio, String(disponibile.toFixed(1)), String(totale_impegnati.toFixed(1)), source, nome);
    }
    return true;
  } else {
    // Tornato sufficiente → auto-clear
    db.prepare(`
      UPDATE alert_events SET letto = 1
      WHERE asin = ? AND tipo = 'SFUSO_INSUFFICIENTE' AND letto = 0 AND source = ?
    `).run(String(id), source);
    return false;
  }
}

function checkSfusoCopertura(db) {
  try {
    const sfusoRows = db.prepare("SELECT * FROM sfuso").all();
    let insufficienti = 0;
    for (const row of sfusoRows) {
      if (_checkSfusoInsufficiente(db, row)) insufficienti++;
    }
    return insufficienti;
  } catch (e) { logger.warn({ err: e }, "checkSfusoCopertura"); return 0; }
}

// ─────────────────────────────────────────────────────────────────
// SCADENZA LOTTI: verifica se un lotto sfuso è in scadenza
// Alert generato se mancano meno di GIORNI_PREAVVISO alla scadenza
// ─────────────────────────────────────────────────────────────────
const GIORNI_PREAVVISO_SCADENZA = 30;

function checkScadenzaLotto(db, sfusoId) {
  try {
    const row = db.prepare(
      "SELECT id, formato, lotto, data_scadenza, litri_disponibili FROM sfuso WHERE id = ?"
    ).get(sfusoId);
    if (!row || !row.data_scadenza || !row.lotto) return;

    const source = "lotto_scadenza";
    const asin = String(row.id);
    const scadenza = new Date(row.data_scadenza);
    const oggi = new Date();
    oggi.setHours(0, 0, 0, 0);
    scadenza.setHours(0, 0, 0, 0);

    const giorniRimanenti = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));

    if (giorniRimanenti <= 0) {
      // Scaduto
      const existing = db.prepare(
        "SELECT id FROM alert_events WHERE asin = ? AND tipo = 'LOTTO_SCADUTO' AND letto = 0 AND source = ?"
      ).get(asin, source);
      if (!existing) {
        const messaggio = `[Sfuso ${row.formato}] Lotto ${row.lotto} SCADUTO il ${row.data_scadenza} — ${row.litri_disponibili}L rimanenti`;
        db.prepare(
          "INSERT INTO alert_events (asin, tipo, messaggio, valore_attuale, valore_precedente, source, nome) VALUES (?, 'LOTTO_SCADUTO', ?, ?, ?, ?, ?)"
        ).run(asin, messaggio, String(giorniRimanenti), row.data_scadenza, source, `Lotto ${row.lotto}`);
      }
      // Auto-clear alert "in scadenza" se presente
      db.prepare(
        "UPDATE alert_events SET letto = 1 WHERE asin = ? AND tipo = 'LOTTO_IN_SCADENZA' AND letto = 0 AND source = ?"
      ).run(asin, source);
    } else if (giorniRimanenti <= GIORNI_PREAVVISO_SCADENZA) {
      // In scadenza
      const existing = db.prepare(
        "SELECT id FROM alert_events WHERE asin = ? AND tipo = 'LOTTO_IN_SCADENZA' AND letto = 0 AND source = ?"
      ).get(asin, source);
      if (!existing) {
        const messaggio = `[Sfuso ${row.formato}] Lotto ${row.lotto} scade tra ${giorniRimanenti} giorni (${row.data_scadenza}) — ${row.litri_disponibili}L rimanenti`;
        db.prepare(
          "INSERT INTO alert_events (asin, tipo, messaggio, valore_attuale, valore_precedente, source, nome) VALUES (?, 'LOTTO_IN_SCADENZA', ?, ?, ?, ?, ?)"
        ).run(asin, messaggio, String(giorniRimanenti), row.data_scadenza, source, `Lotto ${row.lotto}`);
      }
    } else {
      // Lontano dalla scadenza → auto-clear
      db.prepare(
        "UPDATE alert_events SET letto = 1 WHERE asin = ? AND tipo IN ('LOTTO_IN_SCADENZA', 'LOTTO_SCADUTO') AND letto = 0 AND source = ?"
      ).run(asin, source);
    }
  } catch (e) { logger.warn({ err: e }, "checkScadenzaLotto"); }
}

function checkScadenzeTuttiLotti(db) {
  try {
    const sfusoRows = db.prepare(
      "SELECT id FROM sfuso WHERE data_scadenza IS NOT NULL AND lotto IS NOT NULL"
    ).all();
    let inScadenza = 0;
    let scaduti = 0;
    for (const row of sfusoRows) {
      checkScadenzaLotto(db, row.id);
      // Conta per stats
      const scadenza = new Date(db.prepare("SELECT data_scadenza FROM sfuso WHERE id = ?").get(row.id).data_scadenza);
      const oggi = new Date();
      oggi.setHours(0, 0, 0, 0);
      scadenza.setHours(0, 0, 0, 0);
      const giorni = Math.ceil((scadenza - oggi) / (1000 * 60 * 60 * 24));
      if (giorni <= 0) scaduti++;
      else if (giorni <= GIORNI_PREAVVISO_SCADENZA) inScadenza++;
    }
    return { scansionati: sfusoRows.length, inScadenza, scaduti };
  } catch (e) {
    logger.warn({ err: e }, "checkScadenzeTuttiLotti");
    return { scansionati: 0, inScadenza: 0, scaduti: 0 };
  }
}

function checkSottoSogliaScatolette(db, id) {
  try {
    const prod = db.prepare(
      "SELECT id, nome_prodotto AS nome, quantita, soglia_minima FROM scatolette WHERE id = ?"
    ).get(id);
    if (!prod || !prod.soglia_minima) return;
    _processCheck(db, { asin: `scatoletta:${prod.id}`, prod, source: "scatolette", modulo_label: "Scatolette" });
  } catch (e) { logger.warn({ err: e }, "checkSottoSogliaScatolette"); }
}

function checkSottoSogliaEtichette(db, id) {
  try {
    const prod = db.prepare(
      "SELECT id, nome, quantita, soglia_minima FROM etichette WHERE id = ?"
    ).get(id);
    if (!prod || !prod.soglia_minima) return;
    _processCheck(db, { asin: `etichetta:${prod.id}`, prod, source: "etichette", modulo_label: "Etichette" });
  } catch (e) { logger.warn({ err: e }, "checkSottoSogliaEtichette"); }
}

function checkSottoSogliaModulo(db, modulo_id, asin) {
  try {
    const m = db.prepare("SELECT slug, label FROM moduli_custom WHERE id = ?").get(modulo_id);
    if (!m) return;
    const prod = db.prepare(
      "SELECT nome, codice_colore, quantita, soglia_minima FROM moduli_prodotti WHERE asin = ? AND modulo_id = ?"
    ).get(asin, modulo_id);
    _processCheck(db, { asin, prod, source: `modulo:${m.slug}`, modulo_label: m.label });
  } catch (e) { logger.warn({ err: e }, "checkSottoSogliaModulo"); }
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
    prodotti:   { scansionati: 0, sottoSoglia: 0 },
    onestep:    { scansionati: 0, sottoSoglia: 0 },
    topcoat:    { scansionati: 0, sottoSoglia: 0 },
    moduli:     { scansionati: 0, sottoSoglia: 0 },
    accessori:  { scansionati: 0, sottoSoglia: 0 },
    sfuso:      { scansionati: 0, sottoSoglia: 0 },
    scatolette: { scansionati: 0, sottoSoglia: 0 },
    etichette:  { scansionati: 0, sottoSoglia: 0 },
    sfusoCopertura: { scansionati: 0, insufficienti: 0 },
    lottiScadenza:  { scansionati: 0, inScadenza: 0, scaduti: 0 },
  };

  // Conta gli alert STOCK_LOW non letti prima e dopo per misurare le modifiche
  const countOpen = () => db.prepare(
    "SELECT COUNT(*) AS n FROM alert_events WHERE tipo IN ('STOCK_LOW', 'SFUSO_INSUFFICIENTE') AND letto = 0"
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
    } catch (e) { logger.warn({ err: e }, "rigenera prodotti"); }

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
    } catch (e) { logger.warn({ err: e }, "rigenera onestep"); }

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
    } catch (e) { logger.warn({ err: e }, "rigenera topcoat"); }

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
    } catch (e) { logger.warn({ err: e }, "rigenera moduli custom"); }

    // ── Accessori ──────────────────────────────────────────────
    try {
      const accessori = db.prepare(
        "SELECT asin_accessorio, nome, quantita, soglia_minima FROM accessori WHERE soglia_minima > 0"
      ).all();
      for (const acc of accessori) {
        _processCheck(db, { asin: acc.asin_accessorio, prod: acc, source: "accessori", modulo_label: "Accessori" });
        stats.accessori.scansionati++;
        if (acc.quantita < acc.soglia_minima) stats.accessori.sottoSoglia++;
      }
    } catch (e) { logger.warn({ err: e }, "rigenera accessori"); }

    // ── Sfuso ──────────────────────────────────────────────────
    try {
      const sfusoRows = db.prepare(
        "SELECT id, nome_prodotto AS nome, formato, litri_disponibili AS quantita, soglia_minima FROM sfuso WHERE soglia_minima > 0"
      ).all();
      for (const row of sfusoRows) {
        _processCheck(db, { asin: String(row.id), prod: row, source: "sfuso", modulo_label: "Sfuso" });
        stats.sfuso.scansionati++;
        if (row.quantita < row.soglia_minima) stats.sfuso.sottoSoglia++;
      }
    } catch (e) { logger.warn({ err: e }, "rigenera sfuso"); }

    // ── Sfuso copertura ordini ─────────────────────────────────
    try {
      const allSfuso = db.prepare("SELECT * FROM sfuso").all();
      for (const row of allSfuso) {
        const insuff = _checkSfusoInsufficiente(db, row);
        stats.sfusoCopertura.scansionati++;
        if (insuff) stats.sfusoCopertura.insufficienti++;
      }
    } catch (e) { logger.warn({ err: e }, "rigenera sfuso copertura"); }

    // ── Scatolette ──────────────────────────────────────────────
    try {
      const scatolette = db.prepare(
        "SELECT id, nome_prodotto AS nome, quantita, soglia_minima FROM scatolette WHERE soglia_minima > 0"
      ).all();
      for (const row of scatolette) {
        _processCheck(db, { asin: `scatoletta:${row.id}`, prod: row, source: "scatolette", modulo_label: "Scatolette" });
        stats.scatolette.scansionati++;
        if (row.quantita < row.soglia_minima) stats.scatolette.sottoSoglia++;
      }
    } catch (e) { logger.warn({ err: e }, "rigenera scatolette"); }

    // ── Etichette ──────────────────────────────────────────────
    try {
      const etichette = db.prepare(
        "SELECT id, nome, quantita, soglia_minima FROM etichette WHERE soglia_minima > 0"
      ).all();
      for (const row of etichette) {
        _processCheck(db, { asin: `etichetta:${row.id}`, prod: row, source: "etichette", modulo_label: "Etichette" });
        stats.etichette.scansionati++;
        if (row.quantita < row.soglia_minima) stats.etichette.sottoSoglia++;
      }
    } catch (e) { logger.warn({ err: e }, "rigenera etichette"); }

    // ── Scadenze lotti ────────────────────────────────────────
    try {
      stats.lottiScadenza = checkScadenzeTuttiLotti(db);
    } catch (e) { logger.warn({ err: e }, "rigenera scadenze lotti"); }
  })();

  stats.totaleScansionati = stats.prodotti.scansionati + stats.onestep.scansionati + stats.topcoat.scansionati + stats.moduli.scansionati + stats.accessori.scansionati + stats.sfuso.scansionati + stats.scatolette.scansionati + stats.etichette.scansionati + stats.sfusoCopertura.scansionati + stats.lottiScadenza.scansionati;
  const apertiDopo = countOpen();
  stats.alertAperti = { prima: apertiPrima, dopo: apertiDopo, delta: apertiDopo - apertiPrima };

  return stats;
}

module.exports = {
  checkSottoSogliaProdotti,
  checkSottoSogliaOnestep,
  checkSottoSogliaTopcoat,
  checkSottoSogliaModulo,
  checkSottoSogliaAccessori,
  checkSottoSogliaSfuso,
  checkSottoSogliaScatolette,
  checkSottoSogliaEtichette,
  checkSfusoCopertura,
  checkScadenzaLotto,
  checkScadenzeTuttiLotti,
  rigeneraAlertSottoSoglia,
};
