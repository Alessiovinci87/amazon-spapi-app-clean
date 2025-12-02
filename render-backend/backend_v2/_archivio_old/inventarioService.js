const { getDb } = require('../db/database');

/** 🔎 Tutti i prodotti */
function getAllProdotti() {
  const db = getDb();
  return db.prepare("SELECT * FROM prodotti").all();
}

/** 🔎 Ricetta per prodotto (solo da ricette_accessori) */
function getRicettaPerProdotto(asin) {
  const db = getDb();

  const prod = db
    .prepare(`SELECT family_code, categoria, pezzi_per_kit 
              FROM prodotti WHERE asin = ?`)
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
  if (prod.categoria === 'KIT' && prod.pezzi_per_kit > 1) {
    return ricetta.map(r => ({
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

function getImpegnatoPerProdotto(asin) {
  const db = getDb();
  return db
    .prepare(`
      SELECT s.progressivo, s.paese, SUM(r.quantita) as totale
      FROM spedizioni_righe r
      JOIN spedizioni s ON s.id = r.spedizione_id
      WHERE r.asin = ?
        AND s.stato IN ('BOZZA','CONFERMATA')
      GROUP BY s.progressivo, s.paese
    `)
    .all(asin);
}


/** ✏️ Imposta pronto (PRODUZIONE o RETTIFICA) */
function setProntoAssoluto({ asin, nuovoPronto, note = '', operatore = 'system' }) {
  const db = getDb();

  const tx = db.transaction(() => {
    const cur = db.prepare(`SELECT pronto FROM prodotti WHERE asin=?`).get(asin);
    if (!cur) throw new Error(`Prodotto non trovato: ${asin}`);

    const corrente = Number(cur.pronto);
    const delta = Number(nuovoPronto) - corrente;

    if (delta === 0) {
      return { asin, pronto: corrente, delta: 0, accessori: [] };
    }

    // 👇 sempre RETTIFICA, anche se delta > 0
    const tipoMovimento = 'RETTIFICA';

    // Rettifica → nota e operatore obbligatori
    if (!note || !note.trim()) throw new Error("Nota obbligatoria per rettifica");
    if (!operatore || !operatore.trim()) throw new Error("Operatore obbligatorio per rettifica");

    // Aggiorna pronto
    db.prepare(`UPDATE prodotti SET pronto=? WHERE asin=?`).run(nuovoPronto, asin);

    // 🔹 Inserimento movimento PRODUZIONE/RETTIFICA
    const result = db.prepare(
      `INSERT INTO movimenti (tipo, asin_prodotto, delta_pronto, note, operatore)
       VALUES (?, ?, ?, ?, ?)`
    ).run(tipoMovimento, asin, delta, note, operatore);

    const movimentoId = result.lastInsertRowid;
    const accessoriCoinvolti = [];

    // 🔹 PRODUZIONE → scala accessori
    if (delta > 0) {
      const acc = getRicettaPerProdotto(asin);
      console.log("🔎 Ricetta per prodotto (produzione)", asin, acc);

      // Controllo scorte
      for (const r of acc) {
        const consumo = delta * r.perUnita;
        if ((r.quantita ?? 0) - consumo < 0) {
          throw new Error(
            `Scorte insufficienti: ${r.asin_accessorio} (servono ${consumo}, hai ${r.quantita ?? 0})`
          );
        }
      }

      // Update quantità accessori
      const upd = db.prepare(
        `UPDATE accessori SET quantita = quantita - ? WHERE asin_accessorio = ?`
      );

      for (const r of acc) {
        const consumo = delta * r.perUnita;
        console.log("👉 Aggiorno accessorio", r.asin_accessorio, "consumo", consumo);
        upd.run(consumo, r.asin_accessorio);

        accessoriCoinvolti.push({ asin_accessorio: r.asin_accessorio, consumo });

        // 🔹 Inserisci CONSUMO_ACCESSORI
        db.prepare(
          `INSERT INTO movimenti (tipo, asin_accessorio, delta_quantita, note, id_riferimento, operatore)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          'CONSUMO_ACCESSORI',
          r.asin_accessorio,
          -consumo,
          `Consumo accessori per produzione ${asin}`,
          movimentoId,
          operatore
        );
      }
    }

    // 🔹 RETTIFICA (verso il basso) → reintegro accessori
    if (delta < 0) {
      const acc = getRicettaPerProdotto(asin);
      const reintegro = Math.abs(delta);
      console.log("🔎 Ricetta per prodotto (rettifica)", asin, acc);

      const upd = db.prepare(
        `UPDATE accessori SET quantita = quantita + ? WHERE asin_accessorio = ?`
      );

      for (const r of acc) {
        const qta = reintegro * r.perUnita;
        console.log("👉 Reintegro accessorio", r.asin_accessorio, "quantità", qta);
        upd.run(qta, r.asin_accessorio);

        accessoriCoinvolti.push({ asin_accessorio: r.asin_accessorio, reintegrato: qta });

        // 🔹 Inserisci REINTEGRO_ACCESSORI
        db.prepare(
          `INSERT INTO movimenti (tipo, asin_accessorio, delta_quantita, note, id_riferimento, operatore)
           VALUES (?, ?, ?, ?, ?, ?)`
        ).run(
          'REINTEGRO_ACCESSORI',
          r.asin_accessorio,
          qta,
          `Reintegro accessori da rettifica prodotto ${asin}`,
          movimentoId,
          operatore
        );
      }
    }

    const updated = db.prepare(`SELECT pronto FROM prodotti WHERE asin=?`).get(asin).pronto;
    return { asin, pronto: updated, delta, tipo: tipoMovimento, accessori: accessoriCoinvolti };
  });

  return tx();
}

/** ➕ Produzione a delta */
function produceDelta({ asin, qty, note = '', operatore = 'system' }) {
  if (qty <= 0) throw new Error('qty deve essere > 0');
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

module.exports = {
  getAllProdotti,
  getAccessoriAssociati,
  setProntoAssoluto,
  produceDelta,
  aggiornaSfusoLitri,
};
