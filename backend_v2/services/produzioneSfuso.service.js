// backend_v2/services/produzioneSfuso.service.js
const { getDb } = require("../db/database");
const { calcolaLitriDaProduzione } = require("../utils/calcolaLitri");
const magazzinoService = require("./magazzino.service");

const { registraStoricoProduzione } = require("./storicoProduzioniSfuso.service");

const { registraMovimentoScatolette } = require("./scatoletteStorico.service");


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

  // Calcolo litri stimati
  const litriStimati = calcolaLitriDaProduzione(formato, quantita, nome_prodotto);

  console.log("📌 [DEBUG] Sto per eseguire INSERT storico_produzioni_sfuso:", payload);

  // Inserisci produzione
  const stmt = db.prepare(`
    INSERT INTO produzioni_sfuso (id_sfuso, asin_prodotto, nome_prodotto, quantita, litri_usati, stato, note, operatore)
    VALUES (?, ?, ?, ?, ?, 'Pianificata', ?, ?)
  `);
  const result = stmt.run(id_sfuso, asin_prodotto, nome_prodotto, quantita, litriStimati, note, operatore);

  // 📜 Registra evento storico
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

  // 🛑 Validazione campi prenotazione
  if (!prenotazione.id_sfuso || !prenotazione.asin_prodotto || !prenotazione.prodotti) {
    throw new Error("Prenotazione incompleta, impossibile creare la produzione");
  }

  // 🧮 Calcolo litri stimati
  const litriStimati = calcolaLitriDaProduzione(
    prenotazione.formato,
    prenotazione.prodotti,
    prenotazione.nome_prodotto
  );

  // 🏭 Inserimento nuova produzione
  const stmt = db.prepare(`
    INSERT INTO produzioni_sfuso
      (id_sfuso, asin_prodotto, nome_prodotto, formato, quantita, litri_usati, stato, note, operatore)
    VALUES (?, ?, ?, ?, ?, ?, 'Pianificata', ?, ?)
  `);

  const result = stmt.run(
    prenotazione.id_sfuso,
    prenotazione.asin_prodotto,
    prenotazione.nome_prodotto,
    prenotazione.formato,
    prenotazione.prodotti,
    litriStimati,
    prenotazione.note || "",
    prenotazione.operatore || "system"
  );

  // 📝 Storico — CREATA (quantità iniziale e finale registrate correttamente)
  registraStoricoProduzione({
    id_produzione: result.lastInsertRowid,
    id_sfuso: prenotazione.id_sfuso,
    asin_prodotto: prenotazione.asin_prodotto,
    nome_prodotto: prenotazione.nome_prodotto,
    formato: prenotazione.formato,

    // Quantità iniziale esatta
    quantita_iniziale: prenotazione.quantita_iniziale ?? prenotazione.prodotti,

    // La quantità finale al momento della prenotazione coincide con quella iniziale
    quantita_finale: prenotazione.quantita_finale ?? prenotazione.prodotti,

    // Campo legacy usato ancora dal frontend
    quantita: prenotazione.quantita_finale ?? prenotazione.prodotti,

    litri_usati: litriStimati,
    evento: "CREATA",

    // Nota chiara: "da X a Y"
    note: `da ${prenotazione.quantita_iniziale ?? prenotazione.prodotti} a ${prenotazione.quantita_finale ?? prenotazione.prodotti}`,

    operatore: prenotazione.operatore || "system"
  });




  return {
    ok: true,
    id_produzione: result.lastInsertRowid,
    id_sfuso: prenotazione.id_sfuso,
    asin_prodotto: prenotazione.asin_prodotto,
    nome_prodotto: prenotazione.nome_prodotto,
    formato: prenotazione.formato,
    quantita: prenotazione.prodotti
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

  // 📝 Registra storico AGGIORNATA includendo quantita precedente e nuova
  registraStoricoProduzione({
    id_produzione: id,
    id_sfuso: before.id_sfuso,
    asin_prodotto: before.asin_prodotto,
    nome_prodotto: before.nome_prodotto,
    formato: before.formato,
    quantita: after.quantita,           // quantità nuova
    litri_usati: after.litri_usati,
    evento: "AGGIORNATA",
    note: data.note || "",
    operatore: data.operatore || before.operatore || "system",
    quantita_precedente: before.quantita   // ✨ IMPORTANTE (campo extra, anche se DB non lo salva)
  });

  // 🔄 Aggiorna tabella produzioni_sfuso
  db.prepare(`
    UPDATE produzioni_sfuso
    SET quantita = ?, litri_usati = ?, note = ?, stato = ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(after.quantita, after.litri_usati, after.note, after.stato, id);

  return after;
}



function completaProduzione(id, operatore = "system") {
  const db = getDb();

  console.log("==== ENTRA IN COMPLETA PRODUZIONE ====");


  const produzione = db.prepare(`SELECT * FROM produzioni_sfuso WHERE id = ?`).get(id);
  if (!produzione) throw new Error("Produzione non trovata");
  if (produzione.stato === "Completata") throw new Error("Produzione già completata");

  const sfuso = db.prepare(`SELECT * FROM sfuso WHERE id = ?`).get(produzione.id_sfuso);
  if (!sfuso) throw new Error("Sfuso collegato non trovato");

  // 🔥 Aggiorna immediatamente la prenotazione collegata
  db.prepare(`
  UPDATE prenotazioni_sfuso
  SET stato = 'Confermata',
      dataFine = datetime('now','localtime')
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

  // STEP 4 - Recupero accessori
  const { getAccessoriPerFormato } = require("./accessoriMapping.service");
  const accessoriDaUsare = getAccessoriPerFormato(produzione.formato);

  const accessoriCalcolati = accessoriDaUsare.map(acc => ({
    asin_accessorio: acc.asin_accessorio,
    quantita: quantitaTotalePezzi
  }));

  // ============================================
  // STEP 6B - SCALATURA SCATOLETTE
  // ============================================

  // recupero scatoletta del prodotto
  const scatoletta = db.prepare(`
  SELECT scatoletta, quantita
  FROM scatolette
  WHERE asin_prodotto = ?
`).get(produzione.asin_prodotto);

  if (!scatoletta) {
    throw new Error(`Scatoletta non trovata per ASIN: ${produzione.asin_prodotto}`);
  }

  // controllo disponibilità scatoletta
  if (scatoletta.quantita < quantitaTotalePezzi) {
    throw new Error(
      `Scatolette insufficienti: richieste ${quantitaTotalePezzi}, disponibili ${scatoletta.quantita}`
    );
  }

  // scalatura scatoletta
  db.prepare(`
  UPDATE scatolette
  SET quantita = quantita - ?
  WHERE asin_prodotto = ?
`).run(quantitaTotalePezzi, produzione.asin_prodotto);

  // storico scatoletta
  const quantitaFinale = db
    .prepare("SELECT quantita FROM scatolette WHERE asin_prodotto = ?")
    .get(produzione.asin_prodotto).quantita;

  console.log("📦 STO REGISTRANDO MOVIMENTO SCATOLETTE:", {
    asin: produzione.asin_prodotto,
    scatoletta: scatoletta.scatoletta,
    delta: -quantitaTotalePezzi,
    quantita_finale: quantitaFinale,
  });


  registraMovimentoScatolette({
    asin_prodotto: produzione.asin_prodotto,
    scatoletta: scatoletta.scatoletta,
    delta: -quantitaTotalePezzi,
    quantita_finale: quantitaFinale,
    nota: `Scalatura scatolette per produzione ${produzione.asin_prodotto}`,
    operatore,
  });




  // ============================
  // STEP 3 - Informazioni prodotto
  // ============================
  // STEP 3 - Informazioni prodotto



  console.log("ACCESSORI DA SCALARE:", accessoriCalcolati);

  // ============================
  // STEP 5 - Controllo scorte accessori
  // ============================
  for (const acc of accessoriCalcolati) {
    const row = db.prepare(`
      SELECT quantita, nome
      FROM accessori
      WHERE asin_accessorio = ?
    `).get(acc.asin_accessorio);

    if (!row) {
      throw new Error(`Accessorio non trovato in DB: ${acc.asin_accessorio}`);
    }

    if (row.quantita < acc.quantita) {
      throw new Error(
        `Scorte insufficienti per l'accessorio ${row.nome}: richiesti ${acc.quantita}, disponibili ${row.quantita}`
      );
    }
  }

  // ============================
  // Verifica litri
  // ============================
  const litriEffettivi = calcolaLitriDaProduzione(
    sfuso.formato,
    produzione.quantita,
    produzione.nome_prodotto
  );
  if (sfuso.litri_disponibili < litriEffettivi) {
    throw new Error(
      `Litri insufficienti: disponibili ${sfuso.litri_disponibili}, necessari ${litriEffettivi}`
    );
  }

  // ============================
  // TRANSAZIONE PRINCIPALE
  // ============================
  const tx = db.transaction(() => {

    // 🔻 Scala litri sfuso
    db.prepare(`
    UPDATE sfuso
    SET litri_disponibili = litri_disponibili - ?, updated_at = datetime('now','localtime')
    WHERE id = ?
  `).run(litriEffettivi, produzione.id_sfuso);

    // ============================================
    // STEP 6 - SCALATURA ACCESSORI
    // ============================================
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
        -acc.quantita, // delta negativo
        `Scalatura per produzione ${produzione.asin_prodotto}`,
        operatore
      );


    }

    // 📦 Movimento prodotti
    db.prepare(`
    INSERT INTO movimenti (tipo, asin_prodotto, delta_pronto, note, operatore)
    VALUES ('PRODUZIONE', ?, ?, ?, ?)
  `).run(
      produzione.asin_prodotto,
      produzione.quantita,
      produzione.note || "Completamento produzione",
      operatore
    );

    // 🧾 Aggiorna produzione
    db.prepare(`
    UPDATE produzioni_sfuso
    SET stato = 'Completata', litri_usati = ?, data_effettiva = datetime('now','localtime')
    WHERE id = ?
  `).run(litriEffettivi, id);

    console.log("📌 [DEBUG] COMPLETA PRODUZIONE → chiamo registraStoricoProduzione", {
      id_produzione: id,
      id_sfuso: produzione.id_sfuso,
      asin_prodotto: produzione.asin_prodotto,
      nome_prodotto: produzione.nome_prodotto,
      formato: produzione.formato,
      quantita: produzione.quantita,
      litri_usati: litriEffettivi,
      evento: "COMPLETATA"
    });


    console.log("📌 [DEBUG] Entrato in registraStoricoProduzione");

    // 📝 Storico produzione
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
      }
    };

  });

  const risultato = tx();

  console.log("✔ Transazione completata con successo:", risultato);

  db.prepare(`
    UPDATE config 
    SET value = value + 1 
    WHERE key = 'produzione_counter'
`).run();



  // Recupera la prenotazione collegata
  const pren = db.prepare(`
  SELECT prodotti
  FROM prenotazioni_sfuso
  WHERE id_produzione = ?
`).get(id);

  // Calcola il delta reale
  const delta = pren ? (produzione.quantita - pren.prodotti) : produzione.quantita;

  console.log("📌 DELTA PRODOTTO:", {
    quantita_prodotta: produzione.quantita,
    quantita_prenotata: pren?.prodotti,
    delta
  });

  // Aggiorna magazzino SOLO del delta
  let resultMagazzino = null;

  if (delta > 0) {
    resultMagazzino = magazzinoService.produceDelta({
      asin: produzione.asin_prodotto,
      qty: delta,
      note: `Produzione completata - ${produzione.nome_prodotto}`,
      operatore,
    });

    console.log("✔ produceDelta completata:", resultMagazzino);
  } else {
    console.log("⚪ Nessun aggiornamento magazzino (delta = 0)");
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

  // 📜 Registra evento storico
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