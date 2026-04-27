// backend_v2/modules/feedback/feedbackService.js
// Servizio per scaricare e gestire il Seller Feedback via SP-API
// Report: GET_SELLER_FEEDBACK_DATA (TSV, 10 colonne fisse)

const axios = require("axios");
const zlib = require("zlib");
const { getAccessToken } = require("../auth/authService");
const { getDb } = require("../../db/database");
const logger = require("../../utils/logger");

const BASE_URL = "https://sellingpartnerapi-eu.amazon.com";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Marketplace EU supportati (riusa la stessa lista del catalog service)
const MARKETPLACES = [
  { code: "IT", marketplaceId: "APJ6JRA9NG5V4", paese: "Italia" },
  { code: "FR", marketplaceId: "A13V1IB3VIYZZH", paese: "Francia" },
  { code: "ES", marketplaceId: "A1RKKUPIHCS9HS", paese: "Spagna" },
  { code: "DE", marketplaceId: "A1PA6795UKMFR9", paese: "Germania" },
  { code: "UK", marketplaceId: "A1F83G8C2ARO7P", paese: "Regno Unito" },
  { code: "NL", marketplaceId: "A1805IZSGTT6HS", paese: "Olanda" },
  { code: "BE", marketplaceId: "AMEN7PMS3EDWL", paese: "Belgio" },
  { code: "PL", marketplaceId: "A1C3SOZRARQ6R3", paese: "Polonia" },
];

function getMarketplaceByCode(code) {
  return MARKETPLACES.find((m) => m.code === code?.toUpperCase());
}

/**
 * Crea un report Seller Feedback su SP-API.
 * NB: per CREARE il report basta il normale LWA token.
 * L'RDT serve solo dopo, per scaricare il DOCUMENT contenente PII.
 *
 * @param {string[]} marketplaceIds
 * @param {object} opts
 * @param {string} opts.dataStartTime - ISO8601 (es. "2025-01-01T00:00:00Z")
 * @param {string} opts.dataEndTime   - ISO8601
 * Restituisce { reportId }.
 */
async function createFeedbackReport(marketplaceIds, opts = {}) {
  const { access_token } = await getAccessToken();

  const body = {
    reportType: "GET_SELLER_FEEDBACK_DATA",
    marketplaceIds,
  };
  if (opts.dataStartTime) body.dataStartTime = opts.dataStartTime;
  if (opts.dataEndTime) body.dataEndTime = opts.dataEndTime;

  const res = await axios.post(
    `${BASE_URL}/reports/2021-06-30/reports`,
    body,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
        "Content-Type": "application/json",
      },
    }
  );
  return res.data;
}

/**
 * Recupera info ordine dalla cache locale o via Orders API SP-API.
 * Restituisce { marketplaceId, asin, title } oppure null se non recuperabile.
 *
 * Effettua DUE chiamate:
 *  - GET /orders/v0/orders/{id}            → MarketplaceId, PurchaseDate
 *  - GET /orders/v0/orders/{id}/orderItems → ASIN, Title (primo item)
 */
async function getOrderInfo(orderId) {
  if (!orderId) return null;
  const db = getDb();

  // Cache hit (solo se contiene almeno una info utile — altrimenti ri-tenta)
  const cached = db
    .prepare(`SELECT * FROM amazon_order_cache WHERE order_id = ?`)
    .get(orderId);
  if (cached && (cached.marketplace_id || cached.asin)) {
    logger.info(
      `  💾 [Orders] cache hit ${orderId} → mp=${cached.marketplace_id || "?"} asin=${cached.asin || "?"}`
    );
    return {
      marketplaceId: cached.marketplace_id,
      asin: cached.asin,
      title: cached.title,
      purchaseDate: cached.purchase_date,
      fromCache: true,
    };
  }
  if (cached) {
    logger.info(`  ♻️ [Orders] cache stale (NULL) per ${orderId} — ri-tento API`);
  }

  const { access_token } = await getAccessToken();

  let orderData = null;
  let itemsData = null;
  logger.info(`  🔍 [Orders] getOrder ${orderId}…`);
  try {
    const orderRes = await axios.get(
      `${BASE_URL}/orders/v0/orders/${encodeURIComponent(orderId)}`,
      {
        timeout: 20000,
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-amz-access-token": access_token,
        },
      }
    );
    orderData = orderRes.data?.payload || orderRes.data;
    logger.info(
      `  ✓ [Orders] getOrder ${orderId} → marketplace=${orderData?.MarketplaceId || "?"}`
    );
  } catch (err) {
    const status = err.response?.status;
    if (status === 429) {
      logger.warn(`  ⏳ [Orders] 429 su getOrder ${orderId} — attendo 30s`);
      await sleep(30000);
      return getOrderInfo(orderId); // retry
    }
    logger.warn(
      `  ⚠️ [Orders] getOrder ${orderId} fallito: ${status || ""} ${
        err.response?.data?.errors?.[0]?.message || err.message
      }`
    );
  }

  await sleep(250); // throttle Orders API

  logger.info(`  🔍 [Orders] getOrderItems ${orderId}…`);
  try {
    const itemsRes = await axios.get(
      `${BASE_URL}/orders/v0/orders/${encodeURIComponent(orderId)}/orderItems`,
      {
        timeout: 20000,
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-amz-access-token": access_token,
        },
      }
    );
    itemsData = itemsRes.data?.payload || itemsRes.data;
    logger.info(
      `  ✓ [Orders] getOrderItems ${orderId} → asin=${
        itemsData?.OrderItems?.[0]?.ASIN || "?"
      }`
    );
  } catch (err) {
    const status = err.response?.status;
    if (status === 429) {
      logger.warn(`  ⏳ [Orders] 429 su orderItems ${orderId} — attendo 30s`);
      await sleep(30000);
    } else {
      logger.warn(
        `  ⚠️ [Orders] orderItems ${orderId} fallito: ${status || ""} ${
          err.response?.data?.errors?.[0]?.message || err.message
        }`
      );
    }
  }

  const firstItem = itemsData?.OrderItems?.[0];
  const info = {
    marketplaceId: orderData?.MarketplaceId || null,
    asin: firstItem?.ASIN || null,
    title: firstItem?.Title || null,
    purchaseDate: orderData?.PurchaseDate || null,
  };

  // Salva in cache solo se almeno marketplaceId o asin sono presenti
  // (altrimenti la prossima volta ritentiamo invece di restituire NULL stale)
  if (info.marketplaceId || info.asin) {
    db.prepare(
      `INSERT OR REPLACE INTO amazon_order_cache
         (order_id, marketplace_id, asin, title, purchase_date, fetched_at)
         VALUES (?, ?, ?, ?, ?, ?)`
    ).run(
      orderId,
      info.marketplaceId,
      info.asin,
      info.title,
      info.purchaseDate,
      new Date().toISOString()
    );
  } else {
    logger.info(`  ⚠️ [Orders] info totalmente vuota per ${orderId} — non salvo in cache`);
  }

  return info;
}

/**
 * Lista i report Seller Feedback già esistenti per un marketplace.
 * Utile per riusare report DONE generati su schedule e bypassare CANCELLED/quota.
 *
 * @param {string[]} marketplaceIds
 * @param {string[]} statuses - default ['DONE']
 */
async function listFeedbackReports(marketplaceIds, statuses = ["DONE"]) {
  const { access_token } = await getAccessToken();
  const params = new URLSearchParams();
  params.set("reportTypes", "GET_SELLER_FEEDBACK_DATA");
  params.set("marketplaceIds", marketplaceIds.join(","));
  params.set("processingStatuses", statuses.join(","));
  params.set("pageSize", "10");
  // Cerca report degli ultimi 90 giorni (limite massimo Amazon)
  const since = new Date(Date.now() - 89 * 24 * 60 * 60 * 1000).toISOString();
  params.set("createdSince", since);

  const res = await axios.get(
    `${BASE_URL}/reports/2021-06-30/reports?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
      },
    }
  );
  return res.data?.reports || [];
}

/**
 * Controlla lo stato di un report. Polling-friendly.
 */
async function getReportStatus(reportId) {
  const { access_token } = await getAccessToken();
  const res = await axios.get(
    `${BASE_URL}/reports/2021-06-30/reports/${reportId}`,
    {
      headers: {
        Authorization: `Bearer ${access_token}`,
        "x-amz-access-token": access_token,
      },
    }
  );
  return res.data;
}

/**
 * Normalizza una stringa data nei vari formati emessi da Amazon
 * (DD/MM/YY, DD/MM/YYYY, YYYY-MM-DD, ecc.) in YYYY-MM-DD.
 */
function normalizeDate(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  if (!s) return null;

  // Già ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);

  // DD/MM/YY o DD/MM/YYYY (Amazon EU usa questo formato)
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
  if (m) {
    let [, dd, mm, yy] = m;
    if (yy.length === 2) yy = "20" + yy;
    return `${yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
  }

  // Fallback: prova Date()
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return s;
}

/**
 * Mappa header (case-insensitive, tutte le lingue EU) → indice di colonna.
 * Header noti dal report GET_SELLER_FEEDBACK_DATA per lingua:
 *   EN: Date | Rating      | Comments     | Your Response | Order ID          | Rater Email
 *   IT: Date | Rating      | Comments     | Response      | Numero ordine     | E-mail autore della valutazione
 *   FR: Date | Évaluation  | Commentaire  | Response      | Order ID          | E-mail de l'évaluateur
 *   ES: Date | Rating      | Comentarios  | Response      | Número de pedido  | E-mail del cliente
 *   DE: Datum| Bewertung   | Kommentare   | Antwort       | Bestellnummer     | E-Mail des Bewerters
 *   NL: Datum| Beoordeling | Opmerkingen  | Antwoord      | Bestelnummer      | E-mail van beoordelaar
 *   PL: Data | Ocena       | Komentarze   | Odpowiedź     | Numer zamówienia  | E-mail oceniającego
 *
 * Strategia: col[0]=date, col[1]=rating, col[2]=comments, col[3]=response,
 * col[4]=orderId, col[5]=raterEmail — ma usiamo pattern matching come fallback.
 */
function mapHeaderColumns(headerLine) {
  const cols = headerLine.split("\t").map((h) => h.trim().toLowerCase());

  // Normalizza accenti/diacritici per matching più robusto
  const normalize = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const normCols = cols.map(normalize);

  const find = (...patterns) => {
    for (let i = 0; i < normCols.length; i++) {
      for (const p of patterns) {
        if (normCols[i].includes(p)) return i;
      }
    }
    return -1;
  };

  const result = {
    date: find("date", "data", "datum"),
    rating: find("rating", "valutazione", "evaluation", "bewertung", "beoordeling", "ocena"),
    comments: find("comment", "commenti", "comentario", "kommentar", "opmerking", "komentarz"),
    response: find("response", "risposta", "antwort", "antwoord", "odpowiedz"),
    orderId: find("order id", "numero ordine", "pedido", "bestellnummer", "bestelnummer", "zamowienia"),
    raterEmail: find("rater email", "e-mail", "email", "bewerter"),
  };

  // Fallback posizionale: il report ha sempre 6 colonne nello stesso ordine
  if (cols.length === 6) {
    if (result.date === -1) result.date = 0;
    if (result.rating === -1) result.rating = 1;
    if (result.comments === -1) result.comments = 2;
    if (result.response === -1) result.response = 3;
    if (result.orderId === -1) result.orderId = 4;
    if (result.raterEmail === -1) result.raterEmail = 5;
  }

  return result;
}

/**
 * Scarica e decomprime il documento TSV del report.
 * Restituisce un array di righe parsate per HEADER detection.
 *
 * Schema reale GET_SELLER_FEEDBACK_DATA (6 colonne fisse, header localizzato per lingua):
 *   col0=Date | col1=Rating | col2=Comments | col3=Response | col4=OrderId | col5=RaterEmail
 *
 * NB: il report NON contiene ASIN — l'arricchimento avviene via Orders API.
 */
/**
 * Crea un Restricted Data Token (RDT) per scaricare un reportDocument che contiene
 * PII (email compratore, nome, ordini). Necessario per GET_SELLER_FEEDBACK_DATA
 * dopo la policy Amazon che restringe l'accesso ai dati buyer.
 *
 * @param {string} reportDocumentId
 * @returns {Promise<string|null>} il token, oppure null se la creazione fallisce
 */
async function createRestrictedDataToken(reportDocumentId) {
  try {
    const { access_token } = await getAccessToken();
    const body = {
      restrictedResources: [
        {
          method: "GET",
          path: `/reports/2021-06-30/documents/${reportDocumentId}`,
          // dataElements noti per feedback: buyerInfo include rater_email; "buyerInfo" è l'unico rilevante qui.
          dataElements: ["buyerInfo"],
        },
      ],
    };
    const res = await axios.post(
      `${BASE_URL}/tokens/2021-03-01/restrictedDataToken`,
      body,
      {
        headers: {
          Authorization: `Bearer ${access_token}`,
          "x-amz-access-token": access_token,
          "Content-Type": "application/json",
        },
      }
    );
    return res.data?.restrictedDataToken ?? null;
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.errors?.[0]?.message || err.message;
    logger.warn(`⚠️ [Feedback] createRDT fallito (${status || ""}): ${msg}`);
    return null;
  }
}

async function downloadFeedbackDocument(reportDocumentId) {
  logger.info(`  📑 [Feedback] reportDocumentId: ${reportDocumentId}`);

  // Strategia: tentiamo PRIMA con RDT (Amazon ha reso restricted GET_SELLER_FEEDBACK_DATA,
  // senza RDT il documento può tornare troncato). Se RDT non disponibile, fallback al
  // normale access token.
  let tokenToUse = await createRestrictedDataToken(reportDocumentId);
  let usedRdt = !!tokenToUse;
  if (!tokenToUse) {
    const { access_token } = await getAccessToken();
    tokenToUse = access_token;
  }
  logger.info(`  🔐 [Feedback] Download con ${usedRdt ? "RDT" : "LWA access_token"}`);

  const meta = await axios.get(
    `${BASE_URL}/reports/2021-06-30/documents/${reportDocumentId}`,
    {
      headers: {
        Authorization: `Bearer ${tokenToUse}`,
        "x-amz-access-token": tokenToUse,
      },
    }
  );

  const docResp = await axios.get(meta.data.url, {
    responseType: "arraybuffer",
  });
  let buffer = Buffer.from(docResp.data);
  if (meta.data.compressionAlgorithm === "GZIP") {
    buffer = zlib.gunzipSync(buffer);
  }

  // Il report Amazon può arrivare in UTF-16LE (con o senza BOM), UTF-16BE con BOM, o UTF-8.
  // Detection euristico per UTF-16LE senza BOM: se >50% dei byte in posizione dispari sono 0x00.
  let text;
  let encodingUsed = "utf8";
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    encodingUsed = "utf16le-bom";
    text = buffer.toString("utf16le").replace(/^\uFEFF/, "");
  } else if (buffer[0] === 0xfe && buffer[1] === 0xff) {
    encodingUsed = "utf16be-bom";
    const swapped = Buffer.alloc(buffer.length);
    for (let i = 0; i + 1 < buffer.length; i += 2) {
      swapped[i] = buffer[i + 1];
      swapped[i + 1] = buffer[i];
    }
    text = swapped.toString("utf16le").replace(/^\uFEFF/, "");
  } else {
    // Heuristic: Amazon a volte omette il BOM nei TSV UTF-16LE
    const sampleLen = Math.min(buffer.length, 400);
    let zerosOdd = 0;
    let totalOdd = 0;
    for (let i = 1; i < sampleLen; i += 2) {
      totalOdd++;
      if (buffer[i] === 0x00) zerosOdd++;
    }
    if (totalOdd > 10 && zerosOdd / totalOdd > 0.5) {
      encodingUsed = "utf16le-noBom";
      text = buffer.toString("utf16le").replace(/^\uFEFF/, "");
    } else {
      text = buffer.toString("utf-8").replace(/^\uFEFF/, "");
    }
  }

  const rawLines = text.split(/\r?\n/);
  logger.info(
    `📄 [Feedback] Documento scaricato: ${buffer.length} byte, ${rawLines.length} righe grezze (header incluso), encoding=${encodingUsed}`
  );
  if (rawLines.length > 0) logger.info(`📄 [Feedback] Header: ${rawLines[0].substring(0, 200)}`);
  if (rawLines.length > 1) logger.info(`📄 [Feedback] Prima riga dati: ${rawLines[1].substring(0, 200)}`);
  if (rawLines.length <= 1) return [];

  const headerLine = rawLines[0];
  const headerCols = headerLine.split("\t");
  const expectedCols = headerCols.length;
  logger.info(`📄 [Feedback] Header ha ${expectedCols} colonne`);

  const idx = mapHeaderColumns(headerLine);
  logger.info(`📄 [Feedback] Mappa colonne: ${JSON.stringify(idx)}`);

  // Parser tollerante: Amazon a volte lascia newline interni nei commenti.
  // Se una riga ha meno colonne dell'header, la concateno con la/le successive
  // finché non raggiunge il numero atteso (o fino a 5 righe max per riga logica).
  // Salta righe vuote prima di unirle.
  const logicalRows = [];
  let buf = null;
  let bufParts = 0;
  for (let i = 1; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line.trim() && !buf) continue; // riga vuota isolata: skip
    if (buf == null) {
      buf = line;
      bufParts = 1;
    } else {
      buf += "\n" + line;
      bufParts++;
    }
    const numCols = buf.split("\t").length;
    if (numCols >= expectedCols || bufParts >= 6) {
      if (buf.trim()) logicalRows.push(buf);
      buf = null;
      bufParts = 0;
    }
  }
  if (buf && buf.trim()) logicalRows.push(buf);

  logger.info(`📄 [Feedback] Righe logiche ricostruite: ${logicalRows.length} (dalle ${rawLines.length - 1} righe grezze dopo header)`);

  const parsed = logicalRows.map((line) => {
    const cols = line.split("\t");
    const get = (i) => (i >= 0 && i < cols.length ? (cols[i] || "").trim() : "");
    return {
      date: normalizeDate(get(idx.date)),
      rating: parseInt(get(idx.rating), 10) || 0,
      comments: get(idx.comments),
      response: get(idx.response),
      orderId: get(idx.orderId),
      raterEmail: get(idx.raterEmail),
      // ASIN sarà popolato successivamente via Orders API
      asin: null,
      _rawColCount: cols.length,
    };
  });

  // Diagnostica: quanti non passano il filtro rating 1-5 e perché
  const rating0 = parsed.filter(p => p.rating < 1 || p.rating > 5).length;
  const colsMismatch = parsed.filter(p => p._rawColCount < expectedCols).length;
  if (rating0 > 0 || colsMismatch > 0) {
    logger.warn(`📄 [Feedback] Scarti parsing: rating fuori range=${rating0}, colonne mancanti=${colsMismatch}`);
  }

  return parsed.map(({ _rawColCount, ...rest }) => rest);
}

/**
 * Polling completo: crea report, attende fino a DONE/CANCELLED/FATAL,
 * scarica e parsa.
 * @param {string[]} marketplaceIds
 * @param {object} opts
 * @param {number} opts.maxWaitMs - timeout totale (default 5min)
 * @param {number} opts.intervalMs - intervallo polling (default 8s)
 */
async function fetchFeedbackReport(marketplaceIds, opts = {}) {
  const maxWaitMs = opts.maxWaitMs ?? 5 * 60 * 1000;
  const intervalMs = opts.intervalMs ?? 8000;
  // Default: preferiamo i report scheduled esistenti (Amazon li genera automaticamente
  // e tipicamente sono più completi dei report on-demand). Fallback: nuovo report.
  const preferExisting = opts.preferExisting !== false;

  // 1) Prova a riusare un report DONE esistente (Amazon ne genera su schedule)
  if (preferExisting) {
    try {
      const existing = await listFeedbackReports(marketplaceIds, ["DONE"]);
      const withDoc = existing.find((r) => r.reportDocumentId);
      if (withDoc) {
        logger.info(
          `♻️ [Feedback] Riuso report esistente ${withDoc.reportId} (creato ${withDoc.createdTime})`
        );
        const rows = await downloadFeedbackDocument(withDoc.reportDocumentId);
        return { reportId: withDoc.reportId, rows, reused: true };
      }
      logger.info(`ℹ️ [Feedback] Nessun report DONE esistente — ne creo uno nuovo`);
    } catch (err) {
      logger.warn(`⚠️ [Feedback] listReports fallito: ${err.message} — proseguo con createReport`);
    }
  }

  // 2) Altrimenti crea un nuovo report on-demand
  const created = await createFeedbackReport(marketplaceIds, {
    dataStartTime: opts.dataStartTime,
    dataEndTime: opts.dataEndTime,
  });
  const reportId = created.reportId;
  if (!reportId) {
    throw new Error("SP-API non ha restituito reportId");
  }

  const startedAt = Date.now();
  let status;
  while (Date.now() - startedAt < maxWaitMs) {
    await sleep(intervalMs);
    status = await getReportStatus(reportId);
    if (
      status.processingStatus === "DONE" ||
      status.processingStatus === "CANCELLED" ||
      status.processingStatus === "FATAL"
    ) {
      break;
    }
  }

  // CANCELLED su GET_SELLER_FEEDBACK_DATA è il modo documentato di Amazon
  // di dire "nessun dato da restituire": non è un errore, è un report vuoto.
  if (status?.processingStatus === "CANCELLED") {
    return { reportId, rows: [], empty: true };
  }

  if (!status || status.processingStatus !== "DONE") {
    throw new Error(
      `Report non completato (status=${status?.processingStatus || "TIMEOUT"})`
    );
  }

  if (!status.reportDocumentId) {
    return { reportId, rows: [], empty: true };
  }

  const rows = await downloadFeedbackDocument(status.reportDocumentId);
  return { reportId, rows };
}

/**
 * Sincronizza il feedback per un marketplace e lo salva su DB.
 * Pipeline:
 *   1) Scarica report (riusa esistente DONE oppure crea on-demand con dataStartTime)
 *   2) Per ogni feedback con orderId → enrichment via Orders API (cached)
 *      → recupera marketplace_id reale + ASIN
 *   3) Salva nel DB usando il marketplace_id derivato dall'ordine
 *      (fallback al marketplace richiesto se enrichment fallisce)
 *   4) Dedup naturale: chiave = (order_id, rating, date)
 */
async function syncMarketplaceFeedback(code, opts = {}) {
  const mp = getMarketplaceByCode(code);
  if (!mp) throw new Error(`Marketplace sconosciuto: ${code}`);

  // dataStartTime serve sempre: senza il filtro Amazon restituisce CANCELLED.
  // Max 365gg: con range > 365 Amazon CANCELLA il report (verificato su marketplace IT/DE).
  const days = Math.max(1, Math.min(365, parseInt(opts.days, 10) || 365));
  const dataEndTime = new Date().toISOString();
  const dataStartTime = new Date(
    Date.now() - days * 24 * 60 * 60 * 1000
  ).toISOString();

  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(
    `INSERT INTO seller_feedback_sync (marketplace_id, last_sync, status, records)
     VALUES (?, ?, 'in_progress', 0)
     ON CONFLICT(marketplace_id) DO UPDATE SET
       status='in_progress', last_sync=excluded.last_sync`
  ).run(mp.marketplaceId, now);

  let result;
  try {
    // Primo tentativo: preferExisting=true (report scheduled, tipicamente più completi)
    result = await fetchFeedbackReport([mp.marketplaceId], {
      dataStartTime,
      dataEndTime,
      preferExisting: true,
    });
    logger.info(
      `🔁 [Feedback] ${mp.code}: primo fetch (preferExisting) → ${result.rows?.length ?? 0} righe${result.reused ? " (riusato scheduled)" : ""}`
    );

    // Se lo scheduled non c'è o ha pochissimi record, riprova on-demand forzando nuovo report
    if ((result.rows?.length ?? 0) <= 1) {
      logger.info(`🔁 [Feedback] ${mp.code}: fallback on-demand (nuovo report)…`);
      const onDemand = await fetchFeedbackReport([mp.marketplaceId], {
        dataStartTime,
        dataEndTime,
        preferExisting: false,
      });
      logger.info(
        `🔁 [Feedback] ${mp.code}: on-demand → ${onDemand.rows?.length ?? 0} righe`
      );
      // Tieni il risultato con più righe
      if ((onDemand.rows?.length ?? 0) > (result.rows?.length ?? 0)) {
        result = onDemand;
      }
    }
  } catch (err) {
    db.prepare(
      `UPDATE seller_feedback_sync SET status='error', last_sync=? WHERE marketplace_id=?`
    ).run(new Date().toISOString(), mp.marketplaceId);
    throw err;
  }

  // Filtra righe valide
  const totalRows = result.rows.length;
  const validRows = result.rows.filter((r) => r.rating >= 1 && r.rating <= 5);
  const scartate = totalRows - validRows.length;
  logger.info(
    `🗂  [Feedback] ${mp.code}: ${totalRows} righe parsate, ${validRows.length} valide (rating 1-5), ${scartate} scartate`
  );

  // Enrichment via Orders API: una passata sequenziale con throttling
  logger.info(`🔎 [Feedback] Enrichment di ${validRows.length} ordini via Orders API…`);
  const enriched = [];
  for (const r of validRows) {
    let info = null;
    if (r.orderId) {
      try {
        info = await getOrderInfo(r.orderId);
      } catch (e) {
        logger.warn(`  ⚠️ enrichment ${r.orderId}: ${e.message}`);
      }
    }
    enriched.push({
      ...r,
      asin: info?.asin || null,
      title: info?.title || null,
      // marketplace_id derivato dall'ordine (priorità) o fallback al richiesto
      marketplaceId: info?.marketplaceId || mp.marketplaceId,
    });
  }

  // Salva: dedup naturale via UPSERT su (order_id, rating)
  // Un feedback per ordine, marketplace_id derivato dall'ordine reale.
  const insertStmt = db.prepare(
    `INSERT INTO seller_feedback
     (marketplace_id, order_id, date, rating, comments, response,
      rater_email, asin, synced_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(order_id, rating) DO UPDATE SET
       marketplace_id = excluded.marketplace_id,
       date           = excluded.date,
       comments       = excluded.comments,
       response       = excluded.response,
       rater_email    = excluded.rater_email,
       asin           = COALESCE(excluded.asin, seller_feedback.asin),
       synced_at      = excluded.synced_at`
  );

  // Per emettere alert solo sui feedback NUOVI (non aggiornamenti), pre-calcolo
  // le chiavi già in DB. Chiave usata: `${order_id}|${rating}` (NULL order_id → "|rating").
  const existingKeys = new Set(
    db.prepare("SELECT order_id, rating FROM seller_feedback")
      .all()
      .map(r => `${r.order_id ?? ""}|${r.rating}`)
  );

  // Statement per emettere alert_event di nuovo feedback negativo
  const alertStmt = db.prepare(`
    INSERT INTO alert_events
      (asin, tipo, marketplace_id, messaggio, valore_attuale, valore_precedente, nome, source)
    VALUES (?, 'NEW_NEGATIVE_FEEDBACK', ?, ?, ?, NULL, ?, 'feedback')
  `);

  const syncedAt = new Date().toISOString();
  let savedCount = 0;
  let newAlerts = 0;
  const tx = db.transaction((rows) => {
    for (const r of rows) {
      const key = `${r.orderId ?? ""}|${r.rating}`;
      const isNew = !existingKeys.has(key);
      insertStmt.run(
        r.marketplaceId,
        r.orderId || null,
        r.date,
        r.rating,
        r.comments || null,
        r.response || null,
        r.raterEmail || null,
        r.asin || null,
        syncedAt
      );
      savedCount++;
      existingKeys.add(key);

      // Emit alert solo per feedback NUOVI (no re-sync) e 1-3★ (già filtrato, ma doppio controllo)
      if (isNew && r.rating >= 1 && r.rating <= 3) {
        try {
          const excerpt = (r.comments || "").slice(0, 140).replace(/\s+/g, " ").trim();
          const msg = `Nuovo feedback ${r.rating}★ [${mp.code}]${r.asin ? " · " + r.asin : ""}${excerpt ? " — " + excerpt : ""}`;
          alertStmt.run(
            r.asin || null,
            r.marketplaceId || mp.marketplaceId,
            msg,
            String(r.rating),
            excerpt ? excerpt.slice(0, 100) : null
          );
          newAlerts++;
        } catch (err) {
          logger.warn(`⚠️ [Feedback] emit alert fallito: ${err.message}`);
        }
      }
    }
  });
  tx(enriched);
  if (newAlerts > 0) {
    logger.info(`🚨 [Feedback] ${mp.code}: emessi ${newAlerts} alert NEW_NEGATIVE_FEEDBACK`);
  }

  db.prepare(
    `UPDATE seller_feedback_sync SET status='ok', last_sync=?, records=? WHERE marketplace_id=?`
  ).run(syncedAt, savedCount, mp.marketplaceId);

  return { marketplace: mp.code, records: savedCount, newAlerts, syncedAt };
}

/**
 * Legge i feedback dal DB con filtri.
 */
function getFeedback({ marketplace, stelle, asin, limit = 500 } = {}) {
  const db = getDb();
  const mp = marketplace ? getMarketplaceByCode(marketplace) : null;

  const where = [];
  const params = [];
  if (mp) {
    where.push("marketplace_id = ?");
    params.push(mp.marketplaceId);
  }
  if (asin) {
    where.push("asin = ?");
    params.push(asin);
  }
  if (Array.isArray(stelle) && stelle.length > 0) {
    where.push(`rating IN (${stelle.map(() => "?").join(",")})`);
    params.push(...stelle.map((s) => parseInt(s, 10)));
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const rows = db
    .prepare(
      `SELECT id, marketplace_id, order_id, date, rating, comments,
              response, asin, synced_at
       FROM seller_feedback
       ${whereSql}
       ORDER BY date DESC, id DESC
       LIMIT ?`
    )
    .all(...params, parseInt(limit, 10));

  return rows;
}

/**
 * Statistiche aggregate per un marketplace.
 */
function getStats({ marketplace } = {}) {
  const db = getDb();
  const mp = marketplace ? getMarketplaceByCode(marketplace) : null;
  const where = mp ? "WHERE marketplace_id = ?" : "";
  const params = mp ? [mp.marketplaceId] : [];

  const totaleRow = db
    .prepare(
      `SELECT COUNT(*) as totale, AVG(rating) as media FROM seller_feedback ${where}`
    )
    .get(...params);

  const distRows = db
    .prepare(
      `SELECT rating, COUNT(*) as count FROM seller_feedback ${where} GROUP BY rating`
    )
    .all(...params);

  const distMap = Object.fromEntries(distRows.map((r) => [r.rating, r.count]));
  const totale = totaleRow.totale || 0;

  const distribuzione = [5, 4, 3, 2, 1].map((stelle) => ({
    stelle,
    count: distMap[stelle] || 0,
    percentuale: totale > 0 ? Math.round(((distMap[stelle] || 0) / totale) * 100) : 0,
  }));

  return {
    totale,
    media: totale > 0 ? Number(totaleRow.media).toFixed(2) : "0.00",
    distribuzione,
  };
}

/**
 * Restituisce il catalogo del marketplace con feedback aggregato per ASIN.
 * Join product_catalog × seller_feedback. Include anche gli ASIN del catalogo
 * senza feedback (LEFT JOIN), così l'utente vede tutto il catalogo.
 */
function getCatalogWithFeedback({ marketplace } = {}) {
  const db = getDb();
  const mp = marketplace ? getMarketplaceByCode(marketplace) : null;
  if (!mp) return [];

  // country in product_catalog: usa code marketplace (IT, DE, ...)
  const country = mp.code;

  const rows = db
    .prepare(
      `
      SELECT
        pc.asin,
        pc.titolo,
        pc.image_url,
        COALESCE(agg.totale, 0)   AS totale,
        COALESCE(agg.media,  0)   AS media,
        COALESCE(agg.s5, 0)       AS s5,
        COALESCE(agg.s4, 0)       AS s4,
        COALESCE(agg.s3, 0)       AS s3,
        COALESCE(agg.s2, 0)       AS s2,
        COALESCE(agg.s1, 0)       AS s1
      FROM product_catalog pc
      LEFT JOIN (
        SELECT
          asin,
          COUNT(*)                                  AS totale,
          AVG(rating)                               AS media,
          SUM(CASE WHEN rating=5 THEN 1 ELSE 0 END) AS s5,
          SUM(CASE WHEN rating=4 THEN 1 ELSE 0 END) AS s4,
          SUM(CASE WHEN rating=3 THEN 1 ELSE 0 END) AS s3,
          SUM(CASE WHEN rating=2 THEN 1 ELSE 0 END) AS s2,
          SUM(CASE WHEN rating=1 THEN 1 ELSE 0 END) AS s1
        FROM seller_feedback
        WHERE marketplace_id = ? AND asin IS NOT NULL AND asin != ''
        GROUP BY asin
      ) agg ON agg.asin = pc.asin
      WHERE (pc.country = ? OR pc.marketplace_id = ?)
      ORDER BY totale DESC, pc.titolo ASC
      `
    )
    .all(mp.marketplaceId, country, mp.marketplaceId);

  // Aggiungi anche eventuali ASIN che hanno feedback ma NON sono in product_catalog
  const orphans = db
    .prepare(
      `
      SELECT
        f.asin,
        NULL                                          AS titolo,
        NULL                                          AS image_url,
        COUNT(*)                                       AS totale,
        AVG(rating)                                    AS media,
        SUM(CASE WHEN rating=5 THEN 1 ELSE 0 END)      AS s5,
        SUM(CASE WHEN rating=4 THEN 1 ELSE 0 END)      AS s4,
        SUM(CASE WHEN rating=3 THEN 1 ELSE 0 END)      AS s3,
        SUM(CASE WHEN rating=2 THEN 1 ELSE 0 END)      AS s2,
        SUM(CASE WHEN rating=1 THEN 1 ELSE 0 END)      AS s1
      FROM seller_feedback f
      WHERE f.marketplace_id = ?
        AND f.asin IS NOT NULL AND f.asin != ''
        AND NOT EXISTS (
          SELECT 1 FROM product_catalog pc
          WHERE pc.asin = f.asin AND (pc.country = ? OR pc.marketplace_id = ?)
        )
      GROUP BY f.asin
      ORDER BY totale DESC
      `
    )
    .all(mp.marketplaceId, country, mp.marketplaceId);

  return [...rows, ...orphans].map((r) => ({
    asin: r.asin,
    titolo: r.titolo,
    image_url: r.image_url,
    totale: r.totale,
    media: r.totale > 0 ? Number(r.media).toFixed(2) : "0.00",
    distribuzione: { 5: r.s5, 4: r.s4, 3: r.s3, 2: r.s2, 1: r.s1 },
  }));
}

/**
 * Ultimo stato di sync per marketplace (o tutti).
 */
function getSyncStatus({ marketplace } = {}) {
  const db = getDb();
  if (marketplace) {
    const mp = getMarketplaceByCode(marketplace);
    if (!mp) return null;
    return (
      db
        .prepare(
          `SELECT * FROM seller_feedback_sync WHERE marketplace_id = ?`
        )
        .get(mp.marketplaceId) || null
    );
  }
  return db.prepare(`SELECT * FROM seller_feedback_sync`).all();
}

/**
 * Scarica e ritorna il TSV RAW decodificato senza parsing, utile per la
 * diagnostica. Crea un nuovo report on-demand con dataStartTime (necessario).
 */
async function fetchRawTsv(code, opts = {}) {
  const mp = getMarketplaceByCode(code);
  if (!mp) throw new Error(`Marketplace sconosciuto: ${code}`);

  const days = Math.max(1, Math.min(365, parseInt(opts.days, 10) || 365));
  const dataEndTime = new Date().toISOString();
  const dataStartTime = new Date(Date.now() - days * 86400000).toISOString();

  // Crea nuovo report
  const created = await createFeedbackReport([mp.marketplaceId], { dataStartTime, dataEndTime });
  const reportId = created.reportId;
  if (!reportId) throw new Error("SP-API non ha restituito reportId");

  // Poll fino a DONE/CANCELLED/FATAL
  let status;
  const startedAt = Date.now();
  while (Date.now() - startedAt < 5 * 60 * 1000) {
    await sleep(8000);
    status = await getReportStatus(reportId);
    if (["DONE", "CANCELLED", "FATAL"].includes(status.processingStatus)) break;
  }
  if (status?.processingStatus === "CANCELLED") {
    return { marketplace: code, reportId, empty: true, note: "CANCELLED (Amazon: nessun dato nel periodo)" };
  }
  if (status?.processingStatus !== "DONE" || !status.reportDocumentId) {
    throw new Error(`Report non completato (${status?.processingStatus || "TIMEOUT"})`);
  }

  // Scarica doc raw, preferendo RDT (senza RDT i feedback restricted arrivano troncati)
  let tokenToUse = await createRestrictedDataToken(status.reportDocumentId);
  const usedRdtRaw = !!tokenToUse;
  if (!tokenToUse) {
    const { access_token } = await getAccessToken();
    tokenToUse = access_token;
  }
  const meta = await axios.get(
    `${BASE_URL}/reports/2021-06-30/documents/${status.reportDocumentId}`,
    { headers: { Authorization: `Bearer ${tokenToUse}`, "x-amz-access-token": tokenToUse } }
  );
  const docResp = await axios.get(meta.data.url, { responseType: "arraybuffer" });
  let buffer = Buffer.from(docResp.data);
  const compressionAlgorithm = meta.data.compressionAlgorithm || null;
  if (compressionAlgorithm === "GZIP") buffer = zlib.gunzipSync(buffer);

  // Decodifica robusta
  let encoding = "utf8";
  let tsv;
  if (buffer[0] === 0xff && buffer[1] === 0xfe) {
    encoding = "utf16le";
    tsv = buffer.toString("utf16le").replace(/^﻿/, "");
  } else {
    tsv = buffer.toString("utf-8").replace(/^﻿/, "");
  }
  const byteLength = buffer.length;
  const lineCount = tsv.split(/\r?\n/).filter(l => l.trim()).length;
  const firstBytes = Array.from(buffer.subarray(0, 16)).map(b => b.toString(16).padStart(2, "0")).join(" ");

  return {
    marketplace: code,
    reportId,
    compressionAlgorithm,
    byteLength,
    encoding,
    firstBytes,
    lineCount,
    usedRdt: usedRdtRaw,
    tsv,
  };
}

module.exports = {
  MARKETPLACES,
  getMarketplaceByCode,
  fetchFeedbackReport,
  listFeedbackReports,
  syncMarketplaceFeedback,
  getFeedback,
  getStats,
  getSyncStatus,
  getCatalogWithFeedback,
  fetchRawTsv,
};
