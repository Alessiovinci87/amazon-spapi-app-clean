// 📁 utils/classificaProdotto.js
// 🔧 Classifica i prodotti in base a formato, categoria e flag kit/accessorio.
// ✅ Versione aggiornata con fallback e riconoscimento flessibile (12ml, 100ml, 5L, kit, accessori, ecc.)

export function classificaProdotto(p) {
  const nome = String(p.nome || "").trim().toLowerCase();
  const categoria = String(p.categoria || "").trim().toLowerCase();
  const family = String(p.family_code || "").trim().toLowerCase();
  const formato = String(p.formato || "").trim().toLowerCase();
  const isKit = Boolean(p.isKit || p.pezziPerKit);
  const isAccessorio = Boolean(p.isAccessorio);

  // 🔧 fallback automatico se tutti i campi chiave sono vuoti
  const testoCompleto = `${nome} ${categoria} ${family} ${formato}`;
  if (!testoCompleto || testoCompleto.length < 2) {
    return { macro: "altro", sotto: "Altro" };
  }

  // 🔹 Riconoscimento flessibile dei formati
  const has12 = /12\s*ml|ml\s*12/i.test(testoCompleto);
  const has100 = /100\s*ml|ml\s*100/i.test(testoCompleto);
  const has5l = /(5\s*l|5lt|5\s*litri|5000\s*ml|5\.000\s*ml)/i.test(testoCompleto);

  // 🔸 ACCESSORI
  if (isAccessorio || categoria.includes("accessori")) {
    return { macro: "accessori", sotto: null };
  }

  // 🔸 KIT
  if (isKit) {
    if (has12 || categoria.includes("12ml")) {
      return { macro: "kit+12ml", sotto: normalizzaSottoCategoria(p) };
    }
    return { macro: "kit", sotto: normalizzaSottoCategoria(p) };
  }

  // 🔸 FORMATI PRINCIPALI
  if (
    has12 ||
    categoria.includes("12ml") ||
    categoria.includes("preparatori") ||
    categoria.includes("oli cuticole") ||
    categoria.includes("top") ||
    categoria.includes("base") ||
    categoria.includes("trattamenti")
  ) {
    return { macro: "12ml", sotto: normalizzaSottoCategoria(p) };
  }

  if (has100) return { macro: "100ml", sotto: null };
  if (has5l) return { macro: "5litri", sotto: null };

  // 🔸 Fallback finale
  return { macro: "altro", sotto: "Altro" };
}

/**
 * 🧩 Normalizza le sotto-categorie (solo 12ml)
 */
function normalizzaSottoCategoria(p) {
  const testo = `${p.nome || ""} ${p.categoria || ""}`.toLowerCase();

  // 🟢 1) SEMIPERMANENTE / ONE STEP
  if (
    testo.includes("one step") ||
    testo.includes("semipermanente") ||
    testo.includes("1 step")
  ) {
    return "Semipermanente One Step";
  }

  // 🔹 2) TOP / BASE COAT
  if (
    testo.includes("top") ||
    testo.includes("base") ||
    testo.includes("coat") ||
    testo.includes("no wipe") ||
    testo.includes("nowipe") ||
    testo.includes("ultra shine") ||
    testo.includes("ultrashine") ||
    testo.includes("finish") ||
    testo.includes("sigillante") ||
    testo.includes("rubber top") ||
    testo.includes("matte top") ||
    testo.includes("opaco top")
  ) {
    return "Top / Base Coat UV";
  }

  // 🔹 3) PREPARATORI
  if (
    testo.includes("prep") ||
    testo.includes("primer") ||
    testo.includes("preparator") ||
    testo.includes("disidratante") ||
    testo.includes("deidratante") ||
    testo.includes("adhesion")
  ) {
    return "Preparatori unghie";
  }

  // 🔹 4) OLI CUTICOLE
  if (testo.includes("olio") || testo.includes("cuticol") || testo.includes("oil")) {
    return "Oli Cuticole";
  }

  // 🔹 5) TRATTAMENTI
  if (
    testo.includes("trattamento") ||
    testo.includes("treatment") ||
    testo.includes("rinforzante") ||
    testo.includes("strength") ||
    testo.includes("care") ||
    testo.includes("indurente") ||
    testo.includes("remover")
  ) {
    return "Trattamenti unghie";
  }

  // 🔹 Fallback
  return "Altro";
}
