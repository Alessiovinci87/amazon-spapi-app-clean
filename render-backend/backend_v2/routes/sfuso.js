const express = require("express");
console.log("📍 File sfuso.js in uso:", __filename);

const router = express.Router();
console.log("✅ File sfuso.js caricato");
const { getDb } = require("../db/database");
const { calcolaLitriDaProduzione } = require("../utils/calcolaLitri");
const { registraStoricoProduzione } = require("../services/storicoProduzioniSfuso.service");





// ===============================
// GET tutti i record sfuso
// ===============================
router.get("/", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare("SELECT * FROM sfuso").all();

    // ✅ Conversione e normalizzazione
    const normalized = rows.map((r) => ({
      ...r,
      litri_disponibili: Number(r.litri_disponibili) || 0,
      litri_disponibili_old: Number(r.litri_disponibili_old) || 0,
      formato: (r.formato || "").toLowerCase().replace(/\s/g, ""), // es. "12 ml" → "12ml"
    }));

    res.json(normalized);
  } catch (err) {
    console.error("❌ Errore GET /sfuso:", err);
    res.status(500).json({ error: "Errore nel recupero sfuso" });
  }
});

// ===============================
// GET tutte le prenotazioni
// ===============================
router.get("/prenotazioni", (req, res) => {
  try {
    const db = getDb();

    const prenotazioni = db.prepare(`
      SELECT 
        id,
        id_sfuso,
        asin_prodotto,
        nome_prodotto,
        formato,
        stato,
        lotto,
        prodotti,
        litriImpegnati,
        priorita,
        dataRichiesta,
        dataInizio,
        dataFine,
        operatore,
        note
      FROM prenotazioni_sfuso
      ORDER BY dataRichiesta DESC
    `).all();

    res.json(prenotazioni);
  } catch (err) {
    console.error("❌ Errore GET /prenotazioni:", err);
    res.status(500).json({ error: "Errore caricamento prenotazioni" });
  }
});




// ===============================
// GET storico sfuso (raggruppato)
// ===============================
router.get("/storico", (req, res) => {
  try {
    const db = getDb();
    const rows = db

      .prepare("SELECT * FROM storico_sfuso ORDER BY data DESC")
      .all();

    console.log("📜 Record storico estratti:", rows.slice(0, 5));



    const grouped = {};

    rows.forEach((row) => {
      let key;

      // 1) Se è una prenotazione reale → raggruppa insieme
      if (row.id_prenotazione) {
        key = `pren-${row.id_prenotazione}`;
      }



      // 2) Le rettifiche NON vanno mai unite insieme
      else if (row.tipo === "RETTIFICA") {
        key = `rettifica-${row.id}`;   // una riga per ogni rettifica
      }

      // 3) Movimenti FIFO (OLD/NEW) devono raggrupparsi per lotto + id_sfuso
      else if (row.campo === "FIFO") {
        key = `fifo-${row.id_sfuso}-${row.lotto}`;
      }

      // 4) Tutto il resto → separato, non unificare mai
      else {
        key = `mov-${row.id}`;
      }


      if (!grouped[key]) {
        grouped[key] = {
          id_prenotazione: row.id_prenotazione || null,
          id_sfuso: row.id_sfuso,
          formato: row.formato,
          lotto: row.lotto,
          prodotti: row.prodotti,
          statoFinale: row.stato,
          priorita: row.priorita,
          note: "", // 🟡 campo per note cumulative
          movimenti: [],
        };
      }

      // 🔹 Aggiorna stato finale se serve
      if (
        ["CONFERMATA", "ANNULLATA", "IN LAVORAZIONE", "PRENOTAZIONE"].includes(
          (row.stato || "").toUpperCase()
        )
      ) {
        grouped[key].statoFinale = row.stato;
      }

      // 🔹 Accumula note se presenti, con data formattata
      // 🔹 Accumula note se presenti, ma evita duplicati
      if (row.nota && row.nota.trim() !== "") {
        const dataFormattata = new Date(row.data).toLocaleString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const notaFormattata = `[${dataFormattata}] ${row.nota}\n`;

        // ✅ Evita di aggiungere la stessa nota più volte
        if (!grouped[key].note.includes(row.nota)) {
          grouped[key].note += notaFormattata;
        }
      }


      // 🔹 Aggiunge movimento
      grouped[key].movimenti.push(row);
    });

    // 🔹 Ordina i movimenti cronologicamente
    Object.values(grouped).forEach((g) => {
      g.movimenti.sort((a, b) => new Date(a.data) - new Date(b.data));
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error("❌ Errore GET /storico:", err);
    res.status(500).json({ error: "Errore nel recupero storico sfuso" });
  }
});

// =====================================================
// GET storico sfuso inventario (solo rettifiche + carichi DDT)
// =====================================================
router.get("/storico-inventario", (req, res) => {
  try {
    const db = getDb();

    const rows = db
      .prepare(`
        SELECT 
          id,
          data,
          tipo,
          campo,
          nuovoValore,
          nota,
          operatore,
          formato,
          lotto,
          stato,
          id_sfuso,
          prodotti,
          priorita
        FROM storico_sfuso
        WHERE 
          LOWER(TRIM(tipo)) IN ('rettifica', 'carico ddt')
        ORDER BY datetime(data) DESC
      `)
      .all();

    console.log(`📜 Storico Sfuso Inventario — ${rows.length} record trovati`);

    const mapped = rows.map((r) => ({
      id: r.id,
      data: new Date(r.data).toLocaleString("it-IT"),
      tipo: r.tipo || "-",
      campo: r.campo,
      valore: r.nuovoValore,
      nota: r.nota || "-",
      operatore: r.operatore || "-",
      formato: r.formato || "-",
      lotto: r.lotto || "-",
      stato: r.stato || "-",
      id_sfuso: r.id_sfuso,
      prodotti: r.prodotti || 0,
      priorita: r.priorita || "-",
    }));

    res.json(mapped);
  } catch (err) {
    console.error("❌ Errore GET /sfuso/storico-inventario:", err);
    res.status(500).json({ error: "Errore nel recupero storico sfuso inventario" });
  }
});



// ===============================
// POST /prenotazione
// ===============================

// ===============================
// POST /prenotazione (aggiornata per ProduzioneCard.jsx)
// ===============================
router.post("/prenotazione", (req, res) => {
  const {
    id_sfuso,
    lotto,
    pezzi, // 👈 dal frontend
    accessori = {},
    priorita,
    note, // 👈 rinominato da nota
    operatore,
    asin_prodotto,
    nome_prodotto,
  } = req.body;

  try {
    const db = getDb();

    const sfusoRow = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id_sfuso);
    if (!sfusoRow)
      return res.status(404).json({ error: "Record sfuso non trovato" });

    // 🔹 Calcolo litri impegnati
    const litriImpegnati = Number(
      calcolaLitriDaProduzione(sfusoRow.formato, pezzi, sfusoRow.nome_prodotto).toFixed(3)
    );

    // ✅ Inserimento transazionale + ritorno esplicito
    const newRow = db.transaction(() => {
      const stmt = db.prepare(`
  INSERT INTO prenotazioni_sfuso 
    (id_sfuso, asin_prodotto, nome_prodotto, formato, litriImpegnati, lotto,
     prodotti, quantita_iniziale, quantita_finale,
     boccette, tappini, pennellini,
     priorita, stato, operatore, dataRichiesta)
  VALUES (
     ?, ?, ?, ?, ?, ?, 
     ?, ?, ?,                  -- prodotti + quantita_iniziale + quantita_finale
     ?, ?, ?,                  -- accessori
     ?, ?, ?, datetime('now','localtime')
  )
`);

      const info = stmt.run(
        id_sfuso,
        asin_prodotto || sfusoRow.asin_prodotto || null,
        nome_prodotto || sfusoRow.nome_prodotto || null,
        sfusoRow.formato,
        litriImpegnati,
        lotto || null,
        pezzi,                       // prodotti
        pezzi,                       // quantita_iniziale
        pezzi,                       // quantita_finale
        accessori.boccette || 0,
        accessori.tappini || 0,
        accessori.pennellini || 0,
        priorita || "MEDIA",
        "PRENOTAZIONE",
        operatore || "admin"
      );

      const newId = info.lastInsertRowid;
      console.log("🆕 ID prenotazione generato:", newId);

      if (!newId) throw new Error("Impossibile ottenere ID prenotazione");

      db.prepare(`
        INSERT INTO storico_sfuso 
        (tipo, campo, nuovoValore, nota, operatore, formato, stato, lotto, prodotti,
         boccette, tappini, pennellini, priorita, id_sfuso, id_prenotazione)
        VALUES ('PRENOTAZIONE','litriImpegnati',?,?,?,?,?,?,?,?,?,?,?,?,?);
      `).run(
        litriImpegnati,
        note || null,
        operatore || "admin",
        sfusoRow.formato,
        "PRENOTAZIONE",
        lotto || null,
        pezzi || null,
        accessori.boccette || 0,
        accessori.tappini || 0,
        accessori.pennellini || 0,
        priorita || "MEDIA",
        id_sfuso,
        newId
      );

      const row = db.prepare("SELECT * FROM prenotazioni_sfuso WHERE id = ?").get(newId);
      console.log("📦 Record prenotazione creato:", row);
      return row;
    })();

    if (!newRow) throw new Error("Insert fallita: nessuna riga restituita");

    console.log("✅ Prenotazione inserita con ID:", newRow.id);

    const prenotazioneCompleta = {
      ...newRow,
      id: Number(newRow.id),
      id_sfuso: Number(newRow.id_sfuso),
      litriImpegnati: Number(newRow.litriImpegnati),
      prodotti: newRow.prodotti != null ? Number(newRow.prodotti) : null,
      boccette: newRow.boccette != null ? Number(newRow.boccette) : 0,
      tappini: newRow.tappini != null ? Number(newRow.tappini) : 0,
      pennellini: newRow.pennellini != null ? Number(newRow.pennellini) : 0,
      priorita: newRow.priorita || "Media",
      stato: newRow.stato || "PRENOTAZIONE",
      lotto: newRow.lotto || null,
      dataRichiesta: newRow.dataRichiesta,
      dataInizio: newRow.dataInizio,
      dataFine: newRow.dataFine,
      note: newRow.note || null,
      operatore: newRow.operatore || operatore || "admin",
      nome_prodotto: newRow.nome_prodotto || sfusoRow.nome_prodotto || nome_prodotto || null,
      asin_prodotto: newRow.asin_prodotto || sfusoRow.asin_prodotto || asin_prodotto || null,
      formato: newRow.formato || sfusoRow.formato,
      lotto_old: sfusoRow.lotto_old || null,
      gruppo_fifo: newRow.gruppo_fifo || null,
    };

    res.status(201).json({
      ok: true,
      message: "Prenotazione creata con successo",
      prenotazione: prenotazioneCompleta,
    });
  } catch (err) {
    console.error("❌ Errore POST /prenotazione:", err.message);
    res.status(500).json({ error: err.message });
  }
});


router.get("/prenotazione/:id", (req, res) => {
  try {
    const db = getDb();
    const row = db.prepare(`SELECT * FROM prenotazioni_sfuso WHERE id = ?`).get(req.params.id);

    if (!row) {
      return res.status(404).json({ ok: false, message: "Prenotazione non trovata" });
    }

    res.json({ ok: true, data: row });
  } catch (err) {
    console.error("❌ Errore GET prenotazione/:id", err);
    res.status(500).json({ ok: false, message: err.message });
  }
});




// ===============================
// POST /api/v2/sfuso/popola-default
// 🔹 Popola il DB con tutti i prodotti 12ml, 10ml e oli cuticole (senza duplicati)
// ===============================
router.post("/popola-default", (req, res) => {
  console.log("🚀 Richiesta ricevuta su /api/v2/sfuso/popola-default");
  try {
    const db = getDb();
    console.log("✅ Connessione DB aperta correttamente");

    const sfusiDefault = [
      // --- 12ML ---
      { nome_prodotto: "Primer NO Acido 12ml", formato: "12ml", asin_collegati: ["B08JCWDCF2"] },
      { nome_prodotto: "Primer ACIDO 12ml", formato: "12ml", asin_collegati: ["B0BK9QLKN1"] },
      { nome_prodotto: "Rinforzante Calcio 12ml", formato: "12ml", asin_collegati: ["B094RK3P5T"] },
      { nome_prodotto: "Sciogli Cuticole 12ml", formato: "12ml", asin_collegati: ["B095KW4BS4"] },
      { nome_prodotto: 'Cuti Away Tipo "A" 12ml', formato: "12ml", asin_collegati: ["B0C4TF7MFH"] },
      { nome_prodotto: "Indurente 12ml", formato: "12ml", asin_collegati: ["B09DQ3KH7Q"] },
      { nome_prodotto: "Base Coat 12ml", formato: "12ml", asin_collegati: ["B09G32LP1C"] },
      { nome_prodotto: "Nail Anti Bite 12ml", formato: "12ml", asin_collegati: ["B0977FRJ6M"] },
      { nome_prodotto: "Nail Prep 12ml", formato: "12ml", asin_collegati: ["B08X21RXF1"] },
      { nome_prodotto: "Top Coat 12ml", formato: "12ml", asin_collegati: ["B09DQ62H25"] },
      { nome_prodotto: "Top Coat Opaco 12ml", formato: "12ml", asin_collegati: ["B09DQ5457F"] },
      { nome_prodotto: "Base Levigante Rosa 12ml", formato: "12ml", asin_collegati: [] },
      { nome_prodotto: "Base Levigante Bianca 12ml", formato: "12ml", asin_collegati: [] },
      { nome_prodotto: "Antifungo 12ml", formato: "12ml", asin_collegati: ["B0BY9Q4KTT", "B0DKTQXDR9"] },

      // --- 10ML ---
      { nome_prodotto: "Top Coat Ultra Shine 10ml", formato: "10ml", asin_collegati: ["B0CFBC4MCP"] },
      { nome_prodotto: "Top Coat NO Wipe 10ml", formato: "10ml", asin_collegati: ["B0CFB8PV37"] },
      { nome_prodotto: "Top Coat Matt 10ml", formato: "10ml", asin_collegati: ["B0CFBBL77X"] },

      // --- OLI CUTICOLE 12ML ---
      { nome_prodotto: "Olio cuticole Vaniglia 12ml", formato: "12ml", asin_collegati: ["B0963PF48B"] },
      { nome_prodotto: "Olio cuticole Limone 12ml", formato: "12ml", asin_collegati: ["B0963P222M"] },
      { nome_prodotto: "Olio cuticole Cioccolato 12ml", formato: "12ml", asin_collegati: ["B0963Q2987"] },
      { nome_prodotto: "Olio cuticole Arancia 12ml", formato: "12ml", asin_collegati: ["B0963Q6MSP"] },
      { nome_prodotto: "Olio cuticole Fragola 12ml", formato: "12ml", asin_collegati: ["B09VY51ZFF"] },
      { nome_prodotto: "Olio cuticole Ananas 12ml", formato: "12ml", asin_collegati: ["B09VY4M2R4"] },
      { nome_prodotto: "Olio cuticole Mela 12ml", formato: "12ml", asin_collegati: ["B0963P8M6Y"] },
      { nome_prodotto: "Olio cuticole Cocco 12ml", formato: "12ml", asin_collegati: ["B0CHMK6QTY"] },
      { nome_prodotto: "Olio cuticole Lavanda 12ml", formato: "12ml", asin_collegati: ["B0CHMLJD7K"] },
      { nome_prodotto: "Olio cuticole Frutas del Bosques 12ml", formato: "12ml", asin_collegati: ["B0CHMK39L9"] },
      { nome_prodotto: "Olio cuticole Banana 12ml", formato: "12ml", asin_collegati: ["B0CHMJ7HW8"] },
      { nome_prodotto: "Olio cuticole Caramello 12ml", formato: "12ml", asin_collegati: ["B0FJMF75RR"] },
      { nome_prodotto: "Olio cuticole Monoi 12ml", formato: "12ml", asin_collegati: ["B0FJMGRDBJ"] },
    ];

    const insertStmt = db.prepare(`
      INSERT INTO sfuso (
        nome_prodotto, formato, asin_collegati,
        litri_disponibili, litri_disponibili_old,
        lotto, lotto_old, fornitore, created_at
      )
      VALUES (?, ?, ?, 0, 0, '-', '-', '-', datetime('now','localtime'))
    `);

    const countBefore = db.prepare("SELECT COUNT(*) AS count FROM sfuso").get().count;

    const insertMany = db.transaction((arr) => {
      for (const item of arr) {
        const esiste = db
          .prepare("SELECT 1 FROM sfuso WHERE nome_prodotto = ? LIMIT 1")
          .get(item.nome_prodotto);
        if (!esiste) {
          insertStmt.run(
            item.nome_prodotto,
            item.formato,
            JSON.stringify(item.asin_collegati || [])
          );
        }
      }
    });
    insertMany(sfusiDefault);

    const countAfter = db.prepare("SELECT COUNT(*) AS count FROM sfuso").get().count;

    console.log("✅ Popolamento completato senza errori");

    res.json({
      ok: true,
      message: `Popolamento completato. Record aggiunti: ${countAfter - countBefore}`,
      totali: countAfter,
    });
  } catch (err) {
    console.error("🔍 Stack errore:", err.stack);
    console.error("❌ Errore /popola-default:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});



// ===============================
// POST nuovo record sfuso
// ===============================
router.post("/", (req, res) => {
  try {
    const db = getDb();
    const {
      nome_prodotto,
      formato,
      asin_collegati = [],
      litri_disponibili = 5,
      fornitore = "N/D",
    } = req.body;

    if (!nome_prodotto || !formato) {
      return res.status(400).json({ error: "Nome e formato sono obbligatori." });
    }

    const asinJson = JSON.stringify(asin_collegati);

    const stmt = db.prepare(`
      INSERT INTO sfuso 
      (nome_prodotto, formato, asin_collegati, litri_disponibili, litri_disponibili_old, lotto, lotto_old, fornitore, created_at)
      VALUES (?, ?, ?, ?, 0, '-', '-', ?, datetime('now','localtime'))
    `);

    const info = stmt.run(
      nome_prodotto,
      formato,
      asinJson,
      Number(litri_disponibili),
      fornitore
    );

    const newSfuso = db
      .prepare("SELECT * FROM sfuso WHERE id = ?")
      .get(info.lastInsertRowid);

    res.json(newSfuso);
  } catch (err) {
    console.error("❌ Errore POST /sfuso:", err);
    res.status(500).json({ error: "Errore durante la creazione dello sfuso." });
  }
});

// ============================================================
// PATCH /api/v2/sfuso/:id/asin → aggiorna asin_collegato
// ============================================================
router.patch("/:id/asin", (req, res) => {
  const { id } = req.params;
  const { asin } = req.body;

  console.log("🟣 PATCH /api/v2/sfuso/:id/asin", { id, asin });

  if (!asin) {
    return res.status(400).json({ ok: false, message: "ASIN mancante" });
  }

  try {
    const db = getDb();
    const result = db
      .prepare("UPDATE sfuso SET asin_collegato = ? WHERE id = ?")
      .run(asin, id);

    if (result.changes === 0) {
      console.warn(`⚠️ Nessun sfuso trovato con ID ${id}`);
      return res.status(404).json({ ok: false, message: "Sfuso non trovato" });
    }

    const updated = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);
    console.log(`✅ ASIN ${asin} associato allo sfuso ID ${id}`);

    res.json({
      ok: true,
      message: "ASIN associato con successo",
      updated,
    });
  } catch (err) {
    console.error("❌ Errore PATCH /api/v2/sfuso/:id/asin:", err.message);
    res.status(500).json({ ok: false, message: "Errore aggiornamento asin_collegato" });
  }
});


// =====================================================
// PATCH /sfuso/ricevi/:id → trasferisce litri_in_arrivo in litri_disponibili
// =====================================================
router.patch("/ricevi/:id", (req, res) => {
  const { id } = req.params;

  try {
    const db = getDb();

    // 1) Leggo il record
    const row = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);
    if (!row) {
      return res.status(404).json({ error: "Record sfuso non trovato" });
    }

    const inArrivo = Number(row.litri_in_arrivo || 0);
    if (!inArrivo || inArrivo <= 0) {
      return res.status(422).json({ error: "Nessun sfuso in arrivo da ricevere" });
    }

    // 2) Transazione atomica: disponibili += in_arrivo, in_arrivo = 0
    const apply = db.transaction(() => {
      db.prepare(`
        UPDATE sfuso
        SET 
          litri_disponibili = COALESCE(litri_disponibili, 0) + ?,
          litri_in_arrivo   = 0,
          updated_at        = datetime('now','localtime')
        WHERE id = ?
      `).run(inArrivo, id);

      // ritorno record aggiornato
      return db.prepare("SELECT id, nome_prodotto, formato, lotto, litri_disponibili, litri_in_arrivo FROM sfuso WHERE id = ?").get(id);
    });

    const updated = apply();

    console.log("✅ Ricezione sfuso:", {
      id: updated.id,
      nome: updated.nome_prodotto,
      formato: updated.formato,
      ricevuti_litri: inArrivo,
      disponibili_finali: updated.litri_disponibili
    });

    return res.json({
      ok: true,
      message: "Sfuso ricevuto con successo",
      sfuso: updated
    });
  } catch (err) {
    console.error("❌ Errore PATCH /sfuso/ricevi/:id:", err);
    return res.status(500).json({ error: "Errore durante la ricezione dello sfuso" });
  }
});



// =====================================================
// PATCH rettifica sfuso da Gestione Sfuso Inventario
// =====================================================
router.patch("/:id/rettifica", (req, res) => {
  const { id } = req.params;
  const { quantita, operatore, note } = req.body;

  if (!operatore || !note) {
    return res.status(400).json({ error: "Operatore e nota sono obbligatori" });
  }

  try {
    const db = getDb();
    const sfusoRow = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);

    if (!sfusoRow) {
      return res.status(404).json({ error: "Record sfuso non trovato" });
    }

    const valoreNumerico = Number(quantita);
    if (isNaN(valoreNumerico)) {
      return res.status(400).json({ error: "Valore non valido per sfuso" });
    }

    // ✅ Aggiorna la quantità
    db.prepare("UPDATE sfuso SET litri_disponibili = ?, updated_at = datetime('now','localtime') WHERE id = ?")
      .run(valoreNumerico, id);

    // ✅ Registra nella tabella sfuso_movimenti
    db.prepare(`
      INSERT INTO sfuso_movimenti 
      (id_sfuso, nome_prodotto, formato, lotto, fornitore, tipo, quantita, operatore, note)
      VALUES (?, ?, ?, ?, ?, 'RETTIFICA', ?, ?, ?)
    `).run(
      id,
      sfusoRow.formato === "12ml" ? "Prodotto 12ml" : "Prodotto 100ml",
      sfusoRow.formato || "N/D",
      sfusoRow.lotto || "",
      "N/D",
      valoreNumerico,
      operatore,
      note
    );

    // ✅ Registra anche nello storico_sfuso
    db.prepare(`
      INSERT INTO storico_sfuso
      (tipo, campo, nuovoValore, nota, operatore, formato, stato, id_sfuso, lotto, prodotti)
      VALUES ('RETTIFICA', 'litri_disponibili', ?, ?, ?, ?, 'RETTIFICA', ?, ?, NULL)
    `).run(
      valoreNumerico,
      note,
      operatore,
      sfusoRow.formato,
      id,
      sfusoRow.lotto
    );

    const updated = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);

    res.json({
      message: "✅ Rettifica completata con successo",
      updated,
    });
  } catch (err) {
    console.error("❌ Errore PATCH /sfuso/:id/rettifica:", err);
    res.status(500).json({ error: "Errore nella rettifica sfuso" });
  }
});


// ===============================
// PATCH /api/v2/sfuso/:id/rettifica-old
// ===============================
router.patch("/:id/rettifica-old", (req, res) => {
  const { id } = req.params;
  const { quantita_old, note, operatore } = req.body;

  if (quantita_old == null || !note || !operatore) {
    return res.status(400).json({ error: "Dati mancanti." });
  }

  try {
    const db = getDb();
    const sfusoRow = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);

    if (!sfusoRow) {
      return res.status(404).json({ error: "Record sfuso non trovato" });
    }

    // 🔹 Aggiorna quantità SFUSO_OLD
    db.prepare(`
      UPDATE sfuso 
      SET litri_disponibili_old = ?, updated_at = datetime('now','localtime') 
      WHERE id = ?
    `).run(quantita_old, id);

    // 🔹 Inserimento blindato nello storico (protegge da errori FK)
    try {
      let idSfusoValido = null;

      // Se esiste ed è numerico, lo usiamo
      if (sfusoRow && !isNaN(Number(sfusoRow.id))) {
        const check = db
          .prepare("SELECT id FROM sfuso WHERE id = ?")
          .get(Number(sfusoRow.id));

        if (check) idSfusoValido = Number(sfusoRow.id);
      }

      console.log("🧩 Rettifica-old → idSfusoValido finale:", idSfusoValido);

      // Se non esiste davvero nel DB, impostiamo NULL
      if (!idSfusoValido) {
        console.warn("⚠️ Nessun sfuso valido trovato → imposto NULL per sicurezza");
      }

      db.prepare(`
        INSERT INTO storico_sfuso 
        (tipo, campo, nuovoValore, nota, operatore, formato, stato, id_sfuso, lotto)
        VALUES ('RETTIFICA', 'litri_disponibili_old', ?, ?, ?, ?, 'RETTIFICA', ?, ?)
      `).run(
        quantita_old,
        note,
        operatore,
        sfusoRow.formato || "12ml",
        idSfusoValido ?? null, // 👈 forza NULL se c’è anche il minimo dubbio
        sfusoRow.lotto_old || sfusoRow.lotto || "-"
      );

    } catch (insertErr) {
      console.error(
        "❌ Errore inserimento storico_sfuso (rettifica-old):",
        insertErr.message
      );
      return res.status(500).json({
        error: "Errore inserimento storico_sfuso: " + insertErr.message,
      });
    }

    // 🔹 Recupera valori aggiornati
    const updated = db
      .prepare("SELECT id, litri_disponibili_old FROM sfuso WHERE id = ?")
      .get(id);

    res.json({ success: true, updated });
  } catch (err) {
    console.error("❌ Errore PATCH /rettifica-old dettagliato:");
    console.error("➡️ Messaggio:", err.message);
    console.error("➡️ Stack:", err.stack);
    res
      .status(500)
      .json({ error: "Errore nella rettifica sfuso: " + err.message });
  }
});


// =====================================================
// PATCH rettifica lotto da Inventario Sfuso
// =====================================================
router.patch("/:id/rettifica-lotto", (req, res) => {
  const { id } = req.params;
  const { nuovoLotto, dataInserimento, note, operatore } = req.body;

  if (!nuovoLotto || !dataInserimento || !operatore) {
    return res.status(400).json({ error: "Campi obbligatori mancanti (lotto, data o operatore)" });
  }


  try {
    const db = getDb();
    const sfusoRow = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);
    if (!sfusoRow) {
      return res.status(404).json({ error: "Record sfuso non trovato" });
    }

    // ✅ Aggiorna il lotto e la data nel DB
    db.prepare(`
      UPDATE sfuso
      SET lotto = ?, updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(nuovoLotto, id);

    // ✅ Registra il movimento
    db.prepare(`
      INSERT INTO sfuso_movimenti
      (id_sfuso, nome_prodotto, formato, lotto, fornitore, tipo, quantita, operatore, note)
      VALUES (?, ?, ?, ?, ?, 'RETTIFICA', 0, ?, ?)
    `).run(
      id,
      sfusoRow.nome_prodotto || "Senza nome",
      sfusoRow.formato || "N/D",
      nuovoLotto,
      sfusoRow.fornitore || "N/D",
      operatore,
      `Aggiornato lotto a ${nuovoLotto}${note ? `. ${note}` : ""}`
    );

    // ✅ Registra anche nello storico_sfuso
    db.prepare(`
      INSERT INTO storico_sfuso
      (tipo, campo, nuovoValore, nota, operatore, formato, stato, id_sfuso, lotto)
      VALUES ('RETTIFICA', 'lotto', ?, ?, ?, ?, 'RETTIFICA', ?, ?)
    `).run(
      nuovoLotto,
      note,
      operatore,
      sfusoRow.formato,
      id,
      nuovoLotto
    );

    const updated = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);

    res.json({
      message: "✅ Lotto aggiornato con successo",
      updated,
    });
  } catch (err) {
    console.error("❌ Errore PATCH /sfuso/:id/rettifica-lotto:", err);
    res.status(500).json({ error: "Errore nella rettifica del lotto" });
  }
});



// ===============================
// PATCH /api/v2/sfuso/:id/rettifica-lotto-old
// ===============================
router.patch("/:id/rettifica-lotto-old", (req, res) => {
  const { id } = req.params;
  const { nuovoLotto, dataInserimento, note, operatore } = req.body;

  if (!nuovoLotto || !dataInserimento || !operatore) {
    return res.status(400).json({ error: "Campi obbligatori mancanti (lotto, data o operatore)" });
  }

  try {
    const db = getDb();
    const sfusoRow = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);
    if (!sfusoRow) {
      return res.status(404).json({ error: "Record sfuso non trovato" });
    }

    // ✅ Aggiorna il lotto_old e la data
    db.prepare(`
      UPDATE sfuso
      SET lotto_old = ?, updated_at = datetime('now','localtime')
      WHERE id = ?
    `).run(nuovoLotto, id);

    // ✅ Registra in sfuso_movimenti
    db.prepare(`
      INSERT INTO sfuso_movimenti
      (id_sfuso, nome_prodotto, formato, lotto, fornitore, tipo, quantita, operatore, note)
      VALUES (?, ?, ?, ?, ?, 'RETTIFICA', 0, ?, ?)
    `).run(
      id,
      sfusoRow.nome_prodotto || "Senza nome",
      sfusoRow.formato || "N/D",
      nuovoLotto,
      sfusoRow.fornitore || "N/D",
      operatore,
      `Aggiornato lotto_old a ${nuovoLotto}. ${note}`
    );

    // ✅ Registra in storico_sfuso
    db.prepare(`
      INSERT INTO storico_sfuso
      (tipo, campo, nuovoValore, nota, operatore, formato, stato, id_sfuso, lotto)
      VALUES ('RETTIFICA', 'lotto_old', ?, ?, ?, ?, 'RETTIFICA', ?, ?)
    `).run(
      nuovoLotto,
      note,
      operatore,
      sfusoRow.formato,
      id,
      nuovoLotto
    );

    const updated = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);

    res.json({
      message: "✅ Lotto OLD aggiornato con successo",
      updated,
    });
  } catch (err) {
    console.error("❌ Errore PATCH /rettifica-lotto-old:", err);
    res.status(500).json({ error: "Errore nella rettifica del lotto OLD" });
  }
});



// ===============================
// PATCH rettifica diretta sfuso o lotto
// ===============================
router.patch("/:id", (req, res) => {

  console.log("PATCH sfuso → id:", req.params.id, "body:", req.body);
  const { id } = req.params;
  const { campo, nuovoValore, operatore, nota } = req.body;

  try {
    const db = getDb();
    const sfusoRow = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);
    if (!sfusoRow) return res.status(404).json({ error: "Record sfuso non trovato" });

    let updated;

    // 🔹 Rettifica litri sfuso
    if (campo === "sfuso") {
      const valoreNumerico = Number(nuovoValore);
      if (isNaN(valoreNumerico)) {
        return res.status(400).json({ error: "Valore non valido per sfuso" });
      }

      db.prepare(`UPDATE sfuso SET litri_disponibili = ? WHERE id = ?`).run(valoreNumerico, id);

      db.prepare(`
          INSERT INTO storico_sfuso 
          (tipo, campo, nuovoValore, nota, operatore, formato, stato, lotto,
          prodotti, boccette, tappini, pennellini, priorita, id_sfuso, id_prenotazione)
          VALUES ('RETTIFICA','SFUSO',?,?,?,?,?,?,?,?,?,?,?,?,?)
        `).run(
        valoreNumerico,
        nota || null,
        operatore || "admin",
        sfusoRow.formato,
        "PRENOTAZIONE",
        sfusoRow.lotto || null,
        null,
        0,
        0,
        0,
        "MEDIA",
        sfusoRow.id || id || null, // 🧩 correzione
        null
      );

      updated = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);
    }

    // 🔹 Rettifica lotto
    if (campo === "lotto") {
      db.prepare(`UPDATE sfuso SET lotto = ? WHERE id = ?`).run(nuovoValore, id);

      db.prepare(`
        INSERT INTO storico_sfuso 
        (tipo, campo, nuovoValore, nota, operatore, formato, stato, lotto, prodotti, boccette, tappini, pennellini, priorita, id_sfuso, id_prenotazione)
        VALUES ('RETTIFICA','LOTTO',?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        nuovoValore,
        nota || null,
        operatore || "admin",
        sfusoRow.formato,
        "PRENOTAZIONE",
        nuovoValore,
        null,
        0,
        0,
        0,
        "MEDIA",
        id,
        null
      );

      updated = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);
    }

    res.json(updated);
  } catch (err) {
    console.error("❌ Errore PATCH /sfuso/:id:", err);
    res.status(500).json({ error: "Errore nella rettifica sfuso" });
  }
});



// ===============================
// PATCH stato prenotazione
// ===============================
router.patch("/prenotazione/:id", async (req, res) => {
  const { id } = req.params;
  const { nuovoStato, prodotti, operatore } = req.body;

  // 🔧 Normalizza stato in uno dei soli valori accettati dal CHECK
  const normalizeStato = (s) => {
    const v = (s || "").toString().trim().toUpperCase();
    switch (v) {
      case "RETTIFICA":
        return "RETTIFICA";

      case "PRENOTAZIONE":
        return "PRENOTAZIONE";

      case "IN LAVORAZIONE":
      case "IN_CORSO":
        return "In lavorazione";

      case "CONFERMATA":
      case "CONFERMATO":
      case "COMPLETATA":
        return "Confermata";

      case "ANNULLATA":
      case "ANNULLATO":
      case "CANCELLED":
      case "CANCEL":
      case "ANNULLA":
        return "Annullata";

      case "COMPLETATO":       // maschile
        return "Confermata";

      case "COMPLETATE":
      case "COMPLETATI":
        return "Confermata";

      case "CONFERMATA":
      case "CONFERMATO":
      case "COMPLETATA":
      case "COMPLETATO":
      case "COMPLETATI":
      case "COMPLETATE":
        return "Confermata";



      default:
        return null;
    }
  };


  let stato = normalizeStato(nuovoStato);

  console.log("PATCH prenotazione", id, { nuovoStato, normalizzato: stato, operatore });

  try {
    const db = getDb();
    let pren = db.prepare("SELECT * FROM prenotazioni_sfuso WHERE id = ?").get(id);
    if (!pren) return res.status(404).json({ error: "Prenotazione non trovata" });

    // 🔹 Aggiorna solo le note (accumulo, non sovrascrivo)
    if (req.body.note !== undefined) {
      const nuovaNota = (req.body.note || "").trim();
      const timestamp = new Date().toLocaleString("it-IT");
      const notaFormattata = `[${timestamp}] ${nuovaNota}`;
      const notePrecedenti = pren.note ? pren.note.trim() + "\n" : "";
      const noteAggiornate = notePrecedenti + notaFormattata;

      db.prepare(`UPDATE prenotazioni_sfuso SET note = ? WHERE id = ?`).run(noteAggiornate, id);

      db.prepare(`
        INSERT INTO storico_sfuso 
        (tipo, campo, nuovoValore, nota, operatore, formato, stato, lotto,
         prodotti, boccette, tappini, pennellini, priorita, id_sfuso, id_prenotazione)
        VALUES ('RETTIFICA','note',?,?,?,?,?,?,?,?,?,?,?,?,?)
      `).run(
        noteAggiornate,
        nuovaNota,
        operatore || "admin",
        pren.formato,
        pren.stato,
        pren.lotto,
        pren.prodotti,
        pren.boccette || 0,
        pren.tappini || 0,
        pren.pennellini || 0,
        pren.priorita,
        pren.id_sfuso,
        pren.id
      );

      return res.json({ message: "Nota aggiornata", id, note: noteAggiornate });
    }

    // 🔧 Helper: conversione litri → prodotti
    const litriToProdotti = (litri, formato) => {
      if (formato === "12ml") return Math.floor(litri * 83);
      if (formato === "100ml") return Math.floor(litri * 10);
      return 0;
    };

    // 🔁 Funzione retry in caso di database locked
    function runWithRetry(fn, maxRetries = 5, delay = 200) {
      let attempts = 0;
      while (true) {
        try {
          return fn();
        } catch (err) {
          if (err.code === "SQLITE_BUSY" && attempts < maxRetries) {
            attempts++;
            console.warn(`⚠️ DB locked, retry ${attempts}/${maxRetries}`);
            const end = Date.now() + delay;
            while (Date.now() < end) { } // breve pausa bloccante
          } else {
            throw err;
          }
        }
      }
    }

    // 🔹 In lavorazione con logica FIFO
    if (stato === "In lavorazione") {
      console.log("🟡 Entrato nel ramo 'In lavorazione'");
      let gruppoFIFO = null;

      // ✅ Recupera prenotazione/sfuso aggiornati
      pren = db.prepare("SELECT * FROM prenotazioni_sfuso WHERE id = ?").get(id);
      const sfuso = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(pren.id_sfuso);
      if (!pren || !sfuso) return res.status(404).json({ error: "Prenotazione o sfuso non trovati" });

      let litriRichiesti = pren.litriImpegnati;
      let usoOld = 0;
      let usoNew = 0;

      // ✅ Calcolo FIFO (prima old, poi new)
      if (sfuso.litri_disponibili_old > 0) {
        usoOld = Math.min(litriRichiesti, sfuso.litri_disponibili_old);
        usoNew = litriRichiesti - usoOld;
      } else {
        usoNew = litriRichiesti;
      }

      // ✅ Caso 1: usa solo lotto OLD
      if (usoNew === 0) {
        runWithRetry(() => db.prepare(`
      UPDATE prenotazioni_sfuso 
      SET stato = ?, dataInizio = datetime('now','localtime'), lotto = ?
      WHERE id = ?
    `).run(stato, sfuso.lotto_old || sfuso.lotto, id));

        runWithRetry(() => db.prepare(`
      UPDATE sfuso 
      SET litri_disponibili_old = litri_disponibili_old - ?
      WHERE id = ?
    `).run(usoOld, sfuso.id));
      }

      // ✅ Caso 2: serve anche il lotto NEW
      else if (usoOld > 0 && usoNew > 0) {
        gruppoFIFO = `FIFO_${Date.now()}`;
        const prodottiOld = litriToProdotti(usoOld, pren.formato);
        const prodottiNew = litriToProdotti(usoNew, pren.formato);

        runWithRetry(() => db.prepare(`
      UPDATE prenotazioni_sfuso
      SET stato = ?, dataInizio = datetime('now','localtime'),
          lotto = ?, litriImpegnati = ?, prodotti = ?, gruppo_fifo = ?
      WHERE id = ?
    `).run(stato, sfuso.lotto_old, usoOld, prodottiOld, gruppoFIFO, id));

        const info = runWithRetry(() => db.prepare(`
      INSERT INTO prenotazioni_sfuso
      (id_sfuso, formato, litriImpegnati, lotto, prodotti,
       boccette, tappini, pennellini, priorita, stato,
       dataRichiesta, dataInizio, operatore, note, gruppo_fifo)
      VALUES (?,?,?,?,?,?,?,?,?, ?, datetime('now','localtime'),
              datetime('now','localtime'), ?, ?, ?)
    `).run(
          pren.id_sfuso,
          pren.formato,
          usoNew,
          sfuso.lotto,
          prodottiNew,
          pren.boccette || 0,
          pren.tappini || 0,
          pren.pennellini || 0,
          pren.priorita || "Media",
          stato,
          operatore || "admin",
          pren.note || null,
          gruppoFIFO
        ));

        const nuovoId = info.lastInsertRowid;
        console.log("✅ Prenotazione (lotto NEW) creata con ID:", nuovoId);

        runWithRetry(() => db.prepare(`
      UPDATE sfuso 
      SET 
        litri_disponibili_old = litri_disponibili_old - ?,
        litri_disponibili = litri_disponibili - ?
      WHERE id = ?
    `).run(usoOld, usoNew, sfuso.id));
      }

      // ✅ Caso 3: solo lotto NEW
      else if (usoOld === 0 && usoNew > 0) {
        runWithRetry(() => db.prepare(`
      UPDATE prenotazioni_sfuso 
      SET stato = ?, dataInizio = datetime('now','localtime'), lotto = ?
      WHERE id = ?
    `).run(stato, sfuso.lotto, id));

        runWithRetry(() => db.prepare(`
      UPDATE sfuso 
      SET litri_disponibili = litri_disponibili - ?
      WHERE id = ?
    `).run(usoNew, sfuso.id));
      }

      // Log generale


      if (gruppoFIFO) {
        runWithRetry(() => db.prepare(`
      UPDATE prenotazioni_sfuso SET gruppo_fifo = ? WHERE id = ?
    `).run(gruppoFIFO, id));
      }

      return res.json({ ok: true, message: "Prenotazione in lavorazione", id });
    }


    // 🔹 Modifica quantità
    // 🔹 Modifica quantità
    // 🔹 Modifica quantità DURANTE la produzione
    if (prodotti !== undefined) {

      // 📌 1) Quantità PRIMA della modifica
      const quantitaPrima = pren.prodotti;

      // 📌 2) Calcolo nuovi litri
      let nuoviLitri = 0;
      if (pren.formato === "12ml") nuoviLitri = prodotti / 83;
      if (pren.formato === "100ml") nuoviLitri = prodotti / 10;

      const quantitaDopo = prodotti;

      // 📌 3) Calcolo delta litri
      const delta = nuoviLitri - pren.litriImpegnati;

      // 📌 4) Aggiorna prenotazione
      db.prepare(
        `UPDATE prenotazioni_sfuso SET prodotti=?, litriImpegnati=? WHERE id=?`
      ).run(quantitaDopo, nuoviLitri, id);

      // 📌 5) Aggiorna litri disponibili nello sfuso
      db.prepare(
        `UPDATE sfuso SET litri_disponibili = litri_disponibili - ? WHERE id = ?`
      ).run(delta, pren.id_sfuso);

      // 📌 6) Ricarica prenotazione aggiornata
      const prenAgg = db.prepare("SELECT * FROM prenotazioni_sfuso WHERE id = ?").get(id);

      // 📌 7) Storico SFUSO
      db.prepare(`
    INSERT INTO storico_sfuso 
    (tipo, campo, nuovoValore, nota, operatore, formato, stato, lotto,
      prodotti, boccette, tappini, pennellini, priorita, id_sfuso, id_prenotazione)
    VALUES ('MODIFICA_PRODUZIONE','prodotti',?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).run(
        quantitaDopo,
        `da ${quantitaPrima} a ${quantitaDopo}`,
        operatore || "admin",
        prenAgg.formato,
        prenAgg.stato,
        prenAgg.lotto,
        quantitaDopo,
        prenAgg.boccette || 0,
        prenAgg.tappini || 0,
        prenAgg.pennellini || 0,
        prenAgg.priorita,
        prenAgg.id_sfuso,
        prenAgg.id
      );

      // 📌 8) Storico PRODUZIONE (quello della tua tabella frontend)


      // 📌 9) Risposta finale
      return res.json({
        ok: true,
        message: "Quantità aggiornata",
        id,
        quantitaPrima,
        quantitaDopo,
        nuoviLitri
      });
    }



    // 🔹 Conferma o Annulla
    if (stato === "Confermata" || stato === "Annullata") {

      if (stato === "COMPLETATA") {
        console.log("➡️ PATCH COMPLETATA", { id });

        runWithRetry(() =>
          db.prepare(`
      UPDATE prenotazioni_sfuso
      SET stato = 'COMPLETATA',
          dataFine = datetime('now','localtime')
      WHERE id = ?
    `).run(id)
        );

        // Registrazione storico
        runWithRetry(() =>
          db.prepare(`
      INSERT INTO storico_sfuso
      (tipo, campo, nuovoValore, nota, operatore, formato, stato, lotto,
        prodotti, boccette, tappini, pennellini, priorita, id_sfuso, id_prenotazione)
      VALUES ('PRODUZIONE','stato','COMPLETATA', ?, ?, ?, 'COMPLETATA',
        ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
            "Produzione completata",
            operatore || "admin",
            pren.formato,
            prenAgg.lotto,
            prenAgg.prodotti,
            prenAgg.boccette,
            prenAgg.tappini,
            prenAgg.pennellini,
            prenAgg.priorita,
            prenAgg.id_sfuso,
            id
          )
        );

        return res.json({ ok: true, message: "Produzione COMPLETATA", id });
      }

      console.log("➡️ PATCH CONFERMA/ANNULLA", { id, stato });

      // ✅ Aggiorna stato e data fine
      runWithRetry(() => db.prepare(`
    UPDATE prenotazioni_sfuso
    SET stato = ?, dataFine = datetime('now','localtime')
    WHERE id = ?
  `).run(stato, id));

      // ✅ In caso di annullamento → reintegro FIFO
      if (stato === "Annullata") {
        console.log("↩️ Annullo FIFO: reintegro tutti i lotti dello stesso gruppo");

        const prenAgg = db
          .prepare("SELECT * FROM prenotazioni_sfuso WHERE id = ?")
          .get(id);

        if (!prenAgg) {
          console.error("❌ prenAgg mancante durante annullamento!");
          return res.status(500).json({ error: "Prenotazione non trovata durante annullamento" });
        }

        // 1️⃣ Recupera gruppo FIFO
        const gruppo = prenAgg.gruppo_fifo;

        const prenotazioniFIFO = gruppo
          ? db.prepare(
            "SELECT id, id_sfuso, litriImpegnati, lotto FROM prenotazioni_sfuso WHERE gruppo_fifo = ?"
          ).all(gruppo)
          : [
            db
              .prepare(
                "SELECT id, id_sfuso, litriImpegnati, lotto FROM prenotazioni_sfuso WHERE id = ?"
              )
              .get(id),
          ];

        // 2️⃣ Reintegro litri su OLD/NEW in base al lotto
        prenotazioniFIFO.forEach((p) => {
          const sfuso = db
            .prepare(
              "SELECT formato, litri_disponibili, litri_disponibili_old, lotto, lotto_old FROM sfuso WHERE id = ?"
            )
            .get(p.id_sfuso);

          if (!sfuso) return;

          const usaOld =
            sfuso.lotto_old && p.lotto === sfuso.lotto_old
              ? "litri_disponibili_old"
              : "litri_disponibili";

          // Reintegro litri
          runWithRetry(() =>
            db
              .prepare(`UPDATE sfuso SET ${usaOld} = ${usaOld} + ABS(?) WHERE id = ?`)
              .run(p.litriImpegnati, p.id_sfuso)
          );

          // Storico SFUSO → reintegro
          runWithRetry(() =>
            db
              .prepare(
                `INSERT INTO storico_sfuso
          (tipo, campo, nuovoValore, nota, operatore, formato, stato,
           lotto, id_sfuso, id_prenotazione)
         VALUES ('RETTIFICA','FIFO',?,?,?,?,?,?,?,?)`
              )
              .run(
                p.litriImpegnati,
                "Reintegro dopo annullamento FIFO",
                operatore || "admin",
                sfuso.formato,
                "ANNULLATA",
                p.lotto,
                p.id_sfuso,
                p.id
              )
          );

          // 🔥 SALVO SUBITO I VALORI PRIMA DI TOCCARLI
          const quantitaOriginale = prenAgg.prodotti;            // ✔ corretto
          const litriOriginali = prenAgg.litriImpegnati;         // ✔ corretto

          const idProduzioneStorico =
            prenAgg.id_produzione && Number(prenAgg.id_produzione) > 0
              ? Number(prenAgg.id_produzione)
              : null;

          runWithRetry(() =>
            db.prepare(`
    INSERT INTO storico_produzioni_sfuso
    (id_produzione, id_sfuso, asin_prodotto, nome_prodotto, formato,
     quantita, litri_usati, evento, note, operatore)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ANNULLATA', ?, ?)
  `)
          ).run(
            idProduzioneStorico,
            prenAgg.id_sfuso,
            prenAgg.asin_prodotto,
            prenAgg.nome_prodotto,
            prenAgg.formato,
            quantitaOriginale,
            litriOriginali,
            "Prenotazione annullata",
            operatore || "admin"
          );




        });

        // 3️⃣ Storico SFUSO → ANNULLATA (come prima)
        runWithRetry(() =>
          db
            .prepare(
              `INSERT INTO storico_sfuso
        (tipo, campo, nuovoValore, nota, operatore, formato, stato, lotto,
         prodotti, boccette, tappini, pennellini, priorita, id_sfuso, id_prenotazione)
        VALUES ('Annullata','stato', ?, ?, ?, ?, 'Annullata', ?, ?, ?, ?, ?, ?, ?, ?)`
            )
            .run(
              "Annullata",
              "Prenotazione annullata",
              operatore || "admin",
              prenAgg.formato || "N/D",
              prenAgg.lotto,
              prenAgg.prodotti || 0,
              prenAgg.boccette || 0,
              prenAgg.tappini || 0,
              prenAgg.pennellini || 0,
              prenAgg.priorita,
              prenAgg.id_sfuso,
              prenAgg.id
            )
        );

        // 3️⃣ Storico PRODUZIONE → ANNULLATA
        // 🔹 ID PRODUZIONE STORICO — evita raggruppamenti sbagliati
        // Se NON esiste una produzione, NON impostare id_produzione
        // Se non esiste id_produzione → assegno un valore univoco fittizio


        console.log("📝 Storico PRODUZIONI_sfuso → ANNULLATA registrato");


        console.log("🟠 Prenotazione annullata e reintegrata correttamente");
      }


      const prenAgg = db.prepare("SELECT * FROM prenotazioni_sfuso WHERE id = ?").get(id);

      if (stato && stato.toLowerCase() === "confermata") stato = "Confermata";
      if (stato && stato.toLowerCase() === "annullata") stato = "Annullata";

      console.log("🔥 DEBUG CONFERMATA:", {
        stato,
        prenAgg_asin: prenAgg?.asin_prodotto,
        prenAgg_nome: prenAgg?.nome_prodotto,
        prenAgg_prodotti: prenAgg?.prodotti
      });

      // ✅ Se Confermata → aggiorna inventario prodotti
      if (stato === "Confermata") {
        try {
          const prodotto = db
            .prepare(`SELECT * FROM prodotti WHERE asin = ?`)
            .get(prenAgg.asin_prodotto);

          console.log("🔥 PRODOTTO TROVATO:", prodotto);

          if (prodotto) {
            runWithRetry(() =>
              db
                .prepare(`UPDATE prodotti SET pronto = pronto + ? WHERE asin = ?`)
                .run(prenAgg.prodotti, prodotto.asin)


            );

            console.log("🔥 UPDATE PRONTO ESEGUITO");

            runWithRetry(() =>
              db.prepare(`
                  INSERT INTO storico_movimenti
                    (asin_prodotto, nome_prodotto, tipo, delta_quantita, note, operatore, created_at)
                  VALUES (?, ?, 'PRODUZIONE', ?, ?, ?, datetime('now','localtime'))
                `).run(
                prodotto.asin,                         // asin_prodotto
                prodotto.nome,                         // nome_prodotto
                prenAgg.prodotti,                      // delta_quantita (quantità prodotta)
                `Produzione completata - Lotto ${prenAgg.lotto}`, // note
                operatore || "admin"                   // operatore
              )
            );


          } else {
            console.warn("⚠️ Nessun prodotto trovato per:", prenAgg.nome_prodotto);
          }
        } catch (err) {
          console.error("❌ Errore aggiornamento inventario pronto:", err);
        }
      }

      // Log generale
      runWithRetry(() =>
        db
          .prepare(`
      INSERT INTO storico_sfuso 
       (tipo, campo, nuovoValore, nota, operatore, formato, stato, lotto,
        prodotti, boccette, tappini, pennellini, priorita, id_sfuso, id_prenotazione)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    `)
          .run(
            "MODIFICA_PRODUZIONE",
            "stato",
            stato,
            `Cambio stato a ${stato}`,
            operatore || "admin",
            prenAgg.formato || "N/D",
            stato,
            prenAgg.lotto,
            prenAgg.prodotti,
            prenAgg.boccette || 0,
            prenAgg.tappini || 0,
            prenAgg.pennellini || 0,
            prenAgg.priorita,
            prenAgg.id_sfuso,
            prenAgg.id
          )
      );

      // Log specifico per annullamento

      if (stato === "Annullata") {
        console.log("📝 Registro storico ANNULLAMENTO");

        runWithRetry(() =>
          db
            .prepare(`
        INSERT INTO storico_sfuso
        (tipo, campo, nuovoValore, nota, operatore, formato, stato, lotto,
         prodotti, boccette, tappini, pennellini, priorita, id_sfuso, id_prenotazione)
        VALUES ('Annullata', 'stato', ?, ?, ?, ?, 'Annullata', ?, ?, ?, ?, ?, ?, ?, ?)
      `)
            .run(
              "Annullata",
              "Prenotazione annullata e litri reintegrati tramite FIFO",
              operatore || "admin",
              prenAgg.formato || "N/D",
              prenAgg.lotto,
              prenAgg.prodotti || 0,
              prenAgg.boccette || 0,
              prenAgg.tappini || 0,
              prenAgg.pennellini || 0,
              prenAgg.priorita,
              prenAgg.id_sfuso,
              prenAgg.id
            )
        );
      }




      console.log("✅ Prenotazione aggiornata:", stato);
      return res.json({ ok: true, message: `Prenotazione ${stato}`, id });
    }


    // 🔹 Se non c'era nulla da fare
    return res.json({ ok: true, message: "Nessuna modifica applicata", id });
  } catch (err) {
    console.error("❌ Errore PATCH prenotazione:", err);
    res.status(500).json({ error: "Errore aggiornamento prenotazione" });
  }
}); // ✅ chiusura corretta della route PATCH /prenotazione/:id


// ===============================
// PATCH Conferma produzione SFUSO → aggiorna inventario
// ===============================
router.patch("/prenotazione/:id/conferma", (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    // 🔹 Recupera prenotazione
    const prenotazione = db
      .prepare("SELECT * FROM prenotazioni_sfuso WHERE id = ?")
      .get(id);


    console.log("📦 Prenotazione trovata:", prenotazione);

    if (!prenotazione)
      return res.status(404).json({ error: "Prenotazione non trovata" });

    // 🔹 Verifica asin_prodotto valido
    if (!prenotazione.asin_prodotto) {
      console.warn("⚠️ Nessun ASIN associato, provo a recuperarlo dallo sfuso...");
      const sfusoRow = db.prepare("SELECT asin_collegati FROM sfuso WHERE id = ?").get(prenotazione.id_sfuso);
      if (sfusoRow && sfusoRow.asin_collegati) {
        const asinFallback = JSON.parse(sfusoRow.asin_collegati || "[]")[0] || null;
        if (asinFallback) {
          prenotazione.asin_prodotto = asinFallback;
          console.log("✅ ASIN recuperato automaticamente:", asinFallback);
          // aggiorno anche la prenotazione nel DB
          db.prepare("UPDATE prenotazioni_sfuso SET asin_prodotto = ? WHERE id = ?").run(asinFallback, prenotazione.id);
        } else {
          console.warn("⚠️ Nessun ASIN trovato nello sfuso, procedo comunque con conferma.");
        }
      } else {
        console.warn("⚠️ Nessuna riga sfuso valida trovata per recupero ASIN.");
      }
    }


    // 🔹 Aggiorna stato prenotazione → Confermata
    db.prepare(`
      UPDATE prenotazioni_sfuso
      SET stato = 'CONFERMATA',
          dataConferma = datetime('now','localtime')
      WHERE id = ?
    `).run(id);

    // 🔹 Aggiorna quantità 'pronto' nel prodotto corrispondente
    const updateInventario = db.prepare(`
  UPDATE prodotti
  SET pronto = pronto + ?
  WHERE asin = ?
`);

    const result = updateInventario.run(prenotazione.prodotti, prenotazione.asin_prodotto);

    // 🔹 Registra nello storico
    db.prepare(`
  INSERT INTO storico_sfuso 
  (tipo, campo, nuovoValore, nota, operatore, formato, stato, lotto, prodotti, id_sfuso)
  VALUES ('Confermata', 'pronto', ?, ?, ?, ?, 'Confermata', ?, ?, ?)
`).run(
      prenotazione.prodotti,
      req.body.nota || null,
      req.body.operatore || "admin",
      prenotazione.formato,
      prenotazione.lotto,
      prenotazione.prodotti,
      prenotazione.id_sfuso
    );

    console.log(
      `✅ Produzione confermata per ASIN ${prenotazione.asin_prodotto}: +${prenotazione.prodotti} pezzi`
    );

    res.json({
      ok: true,
      message: "Produzione confermata e quantità aggiornata",
      dettagli: { asin: prenotazione.asin_prodotto, aggiunti: prenotazione.prodotti, result },
    });
  } catch (err) {
    console.error("❌ Errore PATCH /prenotazione/:id/conferma dettagliato:", err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});



// ===============================
// DELETE /api/v2/sfuso/:id → elimina uno sfuso
// ===============================
router.delete("/:id", (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;

    console.log("🧩 DELETE sfuso id:", id);

    // Verifica se esiste
    const sfuso = db.prepare("SELECT * FROM sfuso WHERE id = ?").get(id);
    if (!sfuso) {
      console.warn("⚠️ Nessun record sfuso trovato con id:", id);
      return res.status(404).json({ error: "Record sfuso non trovato" });
    }

    // Elimina prima eventuali record collegati (prenotazioni o storico)
    db.prepare("DELETE FROM prenotazioni_sfuso WHERE id_sfuso = ?").run(id);
    db.prepare("DELETE FROM storico_sfuso WHERE id_sfuso = ?").run(id);

    // Elimina lo sfuso principale
    db.prepare("DELETE FROM sfuso WHERE id = ?").run(id);

    // Log su console
    console.log(`🗑️ Sfuso "${sfuso.nome_prodotto}" eliminato definitivamente`);

    // Risposta al client
    return res.json({
      success: true,
      message: `Sfuso "${sfuso.nome_prodotto}" eliminato correttamente.`,
    });
  } catch (err) {
    console.error("❌ Errore DELETE /sfuso/:id:", err);
    return res
      .status(500)
      .json({ error: "Errore durante l'eliminazione dello sfuso." });
  }
});


router.delete("/storico-inventario/reset", async (req, res) => {
  try {
    const db = getDb();
    await db.exec("DELETE FROM storico_sfuso");
    console.log("✅ Storico sfuso inventario svuotato con successo");
    res.json({ message: "Storico cancellato con successo" });
  } catch (err) {
    console.error("❌ Errore reset storico:", err.message);
    res.status(500).json({ message: "Errore nel reset dello storico", error: err.message });
  }
});


// ===============================
// GET /sfuso/ordini/:asin → mostra gli ordini fornitori collegati all'ASIN
// ===============================
router.get("/ordini/:asin", (req, res) => {
  const db = getDb();
  const { asin } = req.params;

  try {
    // Cerca tutti gli ordini legati all’ASIN specifico
    const query = `
      SELECT 
        o.id,
        o.asin,
        o.nome_prodotto,
        o.formato,
        o.quantita_litri,
        o.data_ordine,
        o.data_consegna_prevista,
        o.stato,
        f.nome AS fornitore
      FROM ordini_fornitori o
      LEFT JOIN fornitori f ON f.id = o.id_fornitore
      WHERE o.asin = ?
      ORDER BY datetime(o.data_ordine) DESC
    `;

    const ordini = db.prepare(query).all(asin);

    if (ordini.length === 0) {
      return res.json({
        asin,
        ordini: [],
        message: "Nessun ordine in arrivo per questo ASIN",
      });
    }

    res.json({
      asin,
      ordini,
    });
  } catch (err) {
    console.error("❌ Errore GET /sfuso/ordini/:asin:", err.message);
    res.status(500).json({ error: "Errore nel recupero ordini fornitori" });
  }
});


// =====================================================
// GET /api/v2/sfuso/liberi → sfusi non collegati a nessun prodotto
// =====================================================
router.get("/liberi", (req, res) => {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT s.id, s.nome_prodotto, s.formato
      FROM sfuso s
      WHERE NOT EXISTS (
        SELECT 1 FROM prodotti p WHERE p.id_sfuso_collegato = s.id
      )
      ORDER BY s.nome_prodotto
    `).all();

    res.json(rows);
  } catch (err) {
    console.error("❌ Errore GET /sfuso/liberi:", err);
    res.status(500).json({ error: "Errore nel recupero sfusi liberi" });
  }
});

// ============================================================
// GET /api/v2/sfuso/liberi → restituisce gli sfusi non collegati
// ============================================================
router.get("/liberi", (req, res) => {
  try {
    const db = getDb();
    const sfusiLiberi = db.prepare(`
      SELECT id, nome_prodotto, litri_disponibili
      FROM sfuso
      WHERE id NOT IN (
        SELECT id_sfuso_collegato FROM prodotti WHERE id_sfuso_collegato IS NOT NULL
      )
      AND stato = 'attivo'
      ORDER BY nome_prodotto
    `).all();

    res.json({ ok: true, sfusiLiberi });
  } catch (err) {
    console.error("❌ Errore GET /sfuso/liberi:", err.message);
    res.status(500).json({ ok: false, message: "Errore recupero sfusi liberi" });
  }
});



module.exports = router;
