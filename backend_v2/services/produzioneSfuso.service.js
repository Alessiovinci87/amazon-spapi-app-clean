// backend_v2/services/produzioneSfuso.service.js
const { getDb } = require("../db/database");
const { calcolaLitriDaProduzione } = require("../utils/calcolaLitri");
const magazzinoService = require("./magazzino.service");
const { registraStoricoProduzione } = require("./storicoProduzioniSfuso.service");
const { registraMovimentoScatolette } = require("./scatoletteStorico.service");
const { getAccessoriPerFormato } = require("./accessoriMapping.service");

/* =========================================================
   🎛️ SERVICE PRODUZIONI SFUSO
   Gestione creazione, aggiornamento, completamento e storico
========================================================= */

function getAllProduzioni(stato) {
  const db = getDb();
  let query = "SELECT * FROM produzioni_sfuso";
  if (stato) query += " WHERE stato = ?";
  const stmt = db.prepare(query);
  return stato ? stmt.all(stato) : stmt.all();
}

/* =========================================================
   ➕ CREA NUOVA PRODUZIONE
========================================================= */
function creaProduzione({ id_sfuso, asin_prodotto, nome_prodotto, formato, quantita, note = "", operatore = "system" }) {
  const db = getDb();
  if (!id_sfuso || !asin_prodotto || !quantita) {
    throw new Error("Campi obbligatori mancanti: id_sfuso, asin_prodotto, quantita");
  }

  const litriStimati = calcolaLitriDaProduzione(formato, quantita, nome_prodotto);

  const result = db.prepare(`
    INSERT INTO produzioni_sfuso (id_sfuso, asin_prodotto, nome_prodotto, quantita, litri_usati, stato, note, operatore)
    VALUES (?, ?, ?, ?, ?, 'Pianificata', ?, ?)
  `).run(id_sfuso, asin_prodotto, nome_prodotto, quantita, litriStimati, note, operatore);

  registraStoricoProduzione({
    id_produzione: result.lastInsertRowid,
    id_sfuso,
    asin_prodotto,
    nome_prodotto,
    quantita,
    litri_usati: litriStimati,
    evento: "CREATA",
    note,
    operatore,
  });

  return {
    id: result.lastInsertRowid,
    id_sfuso,
    asin_prodotto,
    nome_prodotto,
    quantita,
    litri_usati: litriStimati,
    stato: "Pianificata",
  };
}

/* =========================================================
   🔄 CREA PRODUZIONE A PARTIRE DA UNA PRENOTAZIONE
========================================================= */
function creaProduzioneDaPrenotazione(prenotazione) {
  const db = getDb();

  // 🔧 Normalizzazione campi (accetta varianti di nomi)
  const id_sfuso = prenotazione.id_sfuso || prenotazione.idSfuso || prenotazione.sfuso_id;
  let asin_prodotto = prenotazione.asin_prodotto || prenotazione.asinProdotto || prenotazione.asin;
  const prodotti = prenotazione.prodotti || prenotazione.quantita || prenotazione.pezzi || prenotazione.qty;
  const formato = prenotazione.formato || "";
  let nome_prodotto = prenotazione.nome_prodotto || prenotazione.nomeProdotto || prenotazione.nome || "";
  const note = prenotazione.note || prenotazione.nota || "";
  const operatore = prenotazione.operatore || "system";

  // 🔧 Se manca asin_prodotto o nome_prodotto, recuperali dalla tabella sfuso
  if ((!asin_prodotto || !nome_prodotto) && id_sfuso) {
    const sfusoRow = db.prepare(`
      SELECT nome_prodotto, asin_collegati
      FROM sfuso
      WHERE id = ?
    `).get(id_sfuso);

    if (sfusoRow) {
      if (!nome_prodotto && sfusoRow.nome_prodotto) {
        nome_prodotto = sfusoRow.nome_prodotto;
      }
      if (!asin_prodotto && sfusoRow.asin_collegati) {
        try {
          const asinList = JSON.parse(sfusoRow.asin_collegati || "[]");
          if (asinList.length > 0) {
            asin_prodotto = asinList[0];
          }
        } catch (e) {
          console.warn("⚠️ Errore parsing asin_collegati:", e.message);
        }
      }
    }
  }

  // 🛑 Validazione campi prenotazione
  if (!id_sfuso || !asin_prodotto || !prodotti) {
    throw new Error(`Prenotazione incompleta: id_sfuso=${id_sfuso}, asin_prodotto=${asin_prodotto}, prodotti=${prodotti}`);
  }

  const litriStimati = calcolaLitriDaProduzione(formato, prodotti, nome_prodotto);

  const result = db.prepare(`
    INSERT INTO produzioni_sfuso
      (id_sfuso, asin_prodotto, nome_prodotto, formato, quantita, litri_usati, stato, note, operatore)
    VALUES (?, ?, ?, ?, ?, ?, 'Pianificata', ?, ?)
  `).run(id_sfuso, asin_prodotto, nome_prodotto, formato, prodotti, litriStimati, note, operatore);

  registraStoricoProduzione({
    id_produzione: result.lastInsertRowid,
    id_sfuso,
    asin_prodotto,
    nome_prodotto,
    formato,
    quantita_iniziale: prenotazione.quantita_iniziale ?? prodotti,
    quantita_finale: prenotazione.quantita_finale ?? prodotti,
    quantita: prenotazione.quantita_finale ?? prodotti,
    litri_usati: litriStimati,
    evento: "CREATA",
    note: `da ${prenotazione.quantita_iniziale ?? prodotti} a ${prenotazione.quantita_finale ?? prodotti}`,
    operatore,
  });

  return {
    ok: true,
    id_produzione: result.lastInsertRowid,
    id_sfuso,
    asin_prodotto,
    nome_prodotto,
    formato,
    quantita: prodotti,
  };
}

/* =========================================================
   ✏️ AGGIORNA PRODUZIONE
========================================================= */
function aggiornaProduzione(id, data) {
  const db = getDb();

  const before = db.prepare(`SELECT * FROM produzioni_sfuso WHERE id = ?`).get(id);
  if (!before) throw new Error("Produzione non trovata");

  const after = { ...before, ...data };

  registraStoricoProduzione({
    id_produzione: id,
    id_sfuso: before.id_sfuso,
    asin_prodotto: before.asin_prodotto,
    nome_prodotto: before.nome_prodotto,
    formato: before.formato,
    quantita: after.quantita,
    litri_usati: after.litri_usati,
    evento: "AGGIORNATA",
    note: data.note || "",
    operatore: data.operatore || before.operatore || "system",
  });

  db.prepare(`
    UPDATE produzioni_sfuso
    SET quantita = ?, litri_usati = ?, note = ?, stato = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(after.quantita, after.litri_usati, after.note, after.stato, id);

  return after;
}

/* =========================================================
   ✅ COMPLETA PRODUZIONE
========================================================= */
function completaProduzione(id, operatore = "system") {
  const db = getDb();

  const produzione = db.prepare(`SELECT * FROM produzioni_sfuso WHERE id = ?`).get(id);
  if (!produzione) throw new Error("Produzione non trovata");
  if (produzione.stato === "Completata") throw new Error("Produzione già completata");

  const sfuso = db.prepare(`SELECT * FROM sfuso WHERE id = ?`).get(produzione.id_sfuso);
  if (!sfuso) throw new Error("Sfuso collegato non trovato");

  // Aggiorna la prenotazione collegata
  db.prepare(`
    UPDATE prenotazioni_sfuso
    SET stato = 'Confermata', dataFine = datetime('now','localtime')
    WHERE id_produzione = ?
  `).run(id);

  const prodotto = db.prepare(`
    SELECT asin, nome, formato, pezzi_per_kit, isKit
    FROM prodotti
    WHERE asin = ?
  `).get(produzione.asin_prodotto);

  if (!prodotto) {
    throw new Error(`Prodotto non trovato per ASIN: ${produzione.asin_prodotto}`);
  }

  const pezziPerKit = prodotto.isKit ? (prodotto.pezzi_per_kit || 1) : 1;
  const quantitaTotalePezzi = produzione.quantita * pezziPerKit;

  const accessoriDaUsare = getAccessoriPerFormato(produzione.formato);
  const accessoriCalcolati = accessoriDaUsare.map(acc => ({
    asin_accessorio: acc.asin_accessorio,
    quantita: quantitaTotalePezzi,
  }));

  // Scalatura scatolette
  const scatoletta = db.prepare(`
    SELECT scatoletta, quantita
    FROM scatolette
    WHERE asin_prodotto = ?
  `).get(produzione.asin_prodotto);

  if (!scatoletta) {
    throw new Error(`Scatoletta non trovata per ASIN: ${produzione.asin_prodotto}`);
  }

  if (scatoletta.quantita < quantitaTotalePezzi) {
    throw new Error(
      `Scatolette insufficienti: richieste ${quantitaTotalePezzi}, disponibili ${scatoletta.quantita}`
    );
  }

  db.prepare(`
    UPDATE scatolette
    SET quantita = quantita - ?
    WHERE asin_prodotto = ?
  `).run(quantitaTotalePezzi, produzione.asin_prodotto);

  const quantitaFinale = db
    .prepare("SELECT quantita FROM scatolette WHERE asin_prodotto = ?")
    .get(produzione.asin_prodotto).quantita;

  registraMovimentoScatolette({
    asin_prodotto: produzione.asin_prodotto,
    scatoletta: scatoletta.scatoletta,
    delta: -quantitaTotalePezzi,
    quantita_finale: quantitaFinale,
    nota: `Scalatura scatolette per produzione ${produzione.asin_prodotto}`,
    operatore,
  });

  // Controllo scorte accessori
  for (const acc of accessoriCalcolati) {
    const row = db.prepare(`
      SELECT quantita, nome
      FROM accessori
      WHERE asin_accessorio = ?
    `).get(acc.asin_accessorio);

    if (!row) throw new Error(`Accessorio non trovato in DB: ${acc.asin_accessorio}`);
    if (row.quantita < acc.quantita) {
      throw new Error(
        `Scorte insufficienti per l'accessorio ${row.nome}: richiesti ${acc.quantita}, disponibili ${row.quantita}`
      );
    }
  }

  // Verifica litri
  const litriEffettivi = calcolaLitriDaProduzione(sfuso.formato, produzione.quantita, produzione.nome_prodotto);
  if (sfuso.litri_disponibili < litriEffettivi) {
    throw new Error(
      `Litri insufficienti: disponibili ${sfuso.litri_disponibili}, necessari ${litriEffettivi}`
    );
  }

  // Transazione principale
  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE sfuso
      SET litri_disponibili = litri_disponibili - ?, updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(litriEffettivi, produzione.id_sfuso);

    for (const acc of accessoriCalcolati) {
      db.prepare(`
        UPDATE accessori
        SET quantita = quantita - ?
        WHERE asin_accessorio = ?
      `).run(acc.quantita, acc.asin_accessorio);

      db.prepare(`
        INSERT INTO storico_movimenti
        (asin_accessorio, nome_prodotto, delta_quantita, note, operatore, tipo, created_at)
        VALUES (
          ?,
          (SELECT nome FROM accessori WHERE asin_accessorio = ?),
          ?,
          ?,
          ?,
          'SCALATURA_ACCESSORI',
          datetime('now','localtime')
        )
      `).run(
        acc.asin_accessorio,
        acc.asin_accessorio,
        -acc.quantita,
        `Scalatura per produzione ${produzione.asin_prodotto}`,
        operatore
      );
    }

    db.prepare(`
      INSERT INTO movimenti (tipo, asin_prodotto, delta_pronto, note, operatore)
      VALUES ('PRODUZIONE', ?, ?, ?, ?)
    `).run(produzione.asin_prodotto, produzione.quantita, produzione.note || "Completamento produzione", operatore);

    db.prepare(`
      UPDATE produzioni_sfuso
      SET stato = 'Completata', litri_usati = ?, data_effettiva = datetime('now','localtime')
      WHERE id = ?
    `).run(litriEffettivi, id);

    registraStoricoProduzione({
      id_produzione: id,
      id_sfuso: produzione.id_sfuso,
      asin_prodotto: produzione.asin_prodotto,
      nome_prodotto: produzione.nome_prodotto,
      formato: produzione.formato,
      quantita: produzione.quantita_finale || produzione.quantita,
      litri_usati: litriEffettivi,
      evento: "COMPLETATA",
      note: produzione.note,
      operatore,
    });

    return {
      ok: true,
      produzioneAggiornata: {
        ...produzione,
        stato: "Completata",
        litri_usati: litriEffettivi,
      },
    };
  });

  const risultato = tx();

  db.prepare(`
    UPDATE config
    SET value = value + 1
    WHERE key = 'produzione_counter'
  `).run();

  // Aggiorna magazzino solo del delta rispetto alla prenotazione
  const pren = db.prepare(`
    SELECT prodotti FROM prenotazioni_sfuso WHERE id_produzione = ?
  `).get(id);

  const delta = pren ? (produzione.quantita - pren.prodotti) : produzione.quantita;
  let resultMagazzino = null;

  if (delta > 0) {
    resultMagazzino = magazzinoService.produceDelta({
      asin: produzione.asin_prodotto,
      qty: delta,
      note: `Produzione completata - ${produzione.nome_prodotto}`,
      operatore,
    });
  }

  return {
    ...risultato,
    magazzino: resultMagazzino,
  };
}

/* =========================================================
   ❌ ELIMINA PRODUZIONE
========================================================= */
function eliminaProduzione(id) {
  const db = getDb();
  const prod = db.prepare(`SELECT * FROM produzioni_sfuso WHERE id = ?`).get(id);
  if (!prod) throw new Error("Produzione non trovata");
  if (prod.stato === "Completata") throw new Error("Impossibile eliminare una produzione completata");

  db.prepare(`DELETE FROM produzioni_sfuso WHERE id = ?`).run(id);

  registraStoricoProduzione({
    id_produzione: id,
    id_sfuso: prod.id_sfuso,
    asin_prodotto: prod.asin_prodotto,
    nome_prodotto: prod.nome_prodotto,
    quantita: prod.quantita,
    litri_usati: prod.litri_usati,
    evento: "ELIMINATA",
    note: prod.note,
    operatore: prod.operatore || "system",
  });

  return true;
}

/* =========================================================
   EXPORT
========================================================= */
module.exports = {
  getAllProduzioni,
  creaProduzione,
  creaProduzioneDaPrenotazione,
  aggiornaProduzione,
  completaProduzione,
  eliminaProduzione,
};
