const { getDb } = require("../db/database");
const {
  distinguiTipoMovimento,
  validaCampiRettifica,
} = require("../modules/inventory/helpers/movimentoValidator");

const { calcolaMovimentiAccessori } = require("../modules/inventory/helpers/movimentiAccessori");
const { registraMovimento } = require("../modules/inventory/helpers/transazioneMovimenti");

/* =========================================================
    📦 SERVICE MAGAZZINO
    Gestisce la logica core di prodotti e accessori
========================================================= */

/** 🔎 Tutti i prodotti */
function getAllProdotti() {
  const db = getDb();
  return db.prepare("SELECT * FROM prodotti").all();
}

/** 🔎 Ricetta per prodotto (solo da ricette_accessori) */
function getRicettaPerProdotto(asin) {
  const db = getDb();

  const prod = db
    .prepare(
      `SELECT family_code, categoria, pezzi_per_kit 
       FROM prodotti WHERE asin = ?`
    )
    .get(asin);

  if (!prod) throw new Error(`Prodotto non trovato: ${asin}`);

  const ricetta = db
    .prepare(
      `SELECT ra.asin_accessorio, ra.perUnita, a.quantita
       FROM ricette_accessori ra
       JOIN accessori a ON a.asin_accessorio = ra.asin_accessorio
       WHERE ra.family_code = ?
       ORDER BY a.nome`
    )
    .all(prod.family_code);

  // Se è un KIT → moltiplica per pezzi_per_kit
  if (prod.categoria === "KIT" && prod.pezzi_per_kit > 1) {
    return ricetta.map((r) => ({
      ...r,
      perUnita: r.perUnita * prod.pezzi_per_kit,
    }));
  }

  return ricetta;
}

/** 🔎 Accessori associati */
function getAccessoriAssociati(asin) {
  return getRicettaPerProdotto(asin);
}

/** 🔎 Quantità impegnata per prodotto */
function getImpegnatoPerProdotto(asin) {
  const db = getDb();
  return db
    .prepare(
      `
      SELECT s.progressivo, s.paese, SUM(r.quantita) as totale
      FROM spedizioni_righe r
      JOIN spedizioni s ON s.id = r.spedizione_id
      WHERE r.asin = ?
        AND s.stato IN ('BOZZA','CONFERMATA')
      GROUP BY s.progressivo, s.paese
    `
    )
    .all(asin);
}

/** ✏️ Imposta pronto (PRODUZIONE o RETTIFICA) */
function setProntoAssoluto({ asin, nuovoPronto, note = "", operatore = "system" }) {
  console.log("📌 setProntoAssoluto() → asin:", asin, "nuovoPronto:", nuovoPronto);

  const db = getDb();
  const tx = db.transaction(() => {
    const cur = db.prepare(`SELECT pronto FROM prodotti WHERE asin=?`).get(asin);
    if (!cur) throw new Error(`Prodotto non trovato: ${asin}`);

    const corrente = Number(cur.pronto);
    const nuovo = Number(nuovoPronto);
    const delta = nuovo - corrente;

    if (delta === 0) {
      return { asin, pronto: corrente, delta: 0, tipo: "NESSUNA", accessori: [] };
    }

    // ✅ Distinzione automatica: produzione o rettifica
    const tipoMovimento = delta > 0 ? "PRODUZIONE" : "RETTIFICA";

    // Solo per rettifica i campi devono essere obbligatori
    if (tipoMovimento === "RETTIFICA") {
      if (!note || !note.trim()) throw new Error("Nota obbligatoria per rettifica");
      if (!operatore || !operatore.trim()) throw new Error("Operatore obbligatorio per rettifica");
    }

    const result = db.prepare(`UPDATE prodotti SET pronto=? WHERE asin=?`).run(nuovo, asin);
    console.log("📌 UPDATE prodotti → changes:", result.changes);


    registraMovimento({
      tipo: tipoMovimento,
      asin_prodotto: asin,
      delta_pronto: delta,
      note,
      operatore,
    });

    return { asin, pronto: nuovo, delta, tipo: tipoMovimento };
  });

  return tx(); // ✅ Restituisce solo l’oggetto risultato
}

/** ➕ Produzione a delta */

function produceDelta({ asin, qty, note = "", operatore = "system" }) {
  console.log("📌 produceDelta() chiamato con:", { asin, qty });
  if (qty <= 0) throw new Error("qty deve essere > 0");
  const db = getDb();
  const cur = db.prepare(`SELECT pronto FROM prodotti WHERE asin=?`).get(asin);
  if (!cur) throw new Error(`Prodotto non trovato: ${asin}`);
  const nuovo = Number(cur.pronto) + Number(qty);
  return setProntoAssoluto({ asin, nuovoPronto: nuovo, note, operatore });
}

/** 💾 Aggiorna litri di sfuso */
function aggiornaSfusoLitri(asin, sfusoLitri) {
  const db = getDb();
  db.prepare(`UPDATE prodotti SET sfusoLitri = ? WHERE asin = ?`).run(sfusoLitri, asin);
  return { asin, sfusoLitri };
}

/** 🔎 Solo nomi prodotti */
function getNomiProdotti() {
  const db = getDb();

  // Selezioniamo solo colonne che siamo sicuri esistano nel DB attuale.
  // Se in futuro aggiungi colonne, le gestiamo dopo.
  return db
    .prepare(`
      SELECT asin, nome, categoria, pronto
      FROM prodotti
      ORDER BY nome ASC
    `)
    .all();
}

/** ✅ SERVICE: getAllProdottiNomi */
const getAllProdottiNomi = async () => { // Usiamo 'const' invece di 'exports.fn' per poterla esportare in basso
  const db = getDb();
  // CORREZIONE 1: Rimossa la colonna 'prezzo'
  const stmt = db.prepare(`
    SELECT asin, nome, formato, categoria, pronto
    FROM prodotti
    ORDER BY nome ASC
  `);

  // CORREZIONE 2: Usa .all() per restituire tutti i risultati (NON .get())
  return stmt.all();
};

module.exports = {
  getAllProdotti,
  getRicettaPerProdotto,
  getAccessoriAssociati,
  getImpegnatoPerProdotto,
  setProntoAssoluto,
  produceDelta,
  aggiornaSfusoLitri,
  getNomiProdotti,
  // CORREZIONE 3: Esportiamo la funzione in modo che il controller possa usarla
  getAllProdottiNomi,
};