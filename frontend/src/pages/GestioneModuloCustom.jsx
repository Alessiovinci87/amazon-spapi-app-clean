import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft, Package, ShoppingCart, History,
  Plus, Trash2, Edit3, Check, X, AlertTriangle,
  Search, RefreshCw, ChevronDown, ChevronUp, Truck, ImageOff, Upload, Settings
} from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

// ─── helpers ──────────────────────────────────────────────
const STATO_ORDINE_COLOR = {
  bozza:             "bg-slate-500/10 text-slate-300 border border-slate-500/30",
  confermato:        "bg-blue-500/10 text-blue-300 border border-blue-500/30",
  in_attesa:         "bg-amber-500/10 text-amber-300 border border-amber-500/30",
  ricevuto_parziale: "bg-orange-500/10 text-orange-300 border border-orange-500/30",
  ricevuto:          "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30",
  annullato:         "bg-red-500/10 text-red-300 border border-red-500/30",
};
const STATO_ORDINE_LABEL_KEY = {
  bozza: "stato_bozza",
  confermato: "stato_confermato",
  in_attesa: "stato_in_attesa",
  ricevuto_parziale: "stato_ricevuto_parziale",
  ricevuto: "stato_ricevuto",
  annullato: "stato_annullato",
};

const TIPO_MOV_COLOR = {
  CARICO_ORDINE: "text-green-400",
  SCARICO_DDT:   "text-red-400",
  RETTIFICA:     "text-amber-400",
};
const TIPO_MOV_LABEL_KEY = {
  CARICO_ORDINE: "tipo_carico_ordine",
  SCARICO_DDT:   "tipo_scarico_ddt",
  RETTIFICA:     "tipo_rettifica",
};

function StatoChip({ stato }) {
  const { t } = useTranslation();
  const color = STATO_ORDINE_COLOR[stato] ?? "bg-slate-700 text-slate-300";
  const label = STATO_ORDINE_LABEL_KEY[stato] ? t(`gestioneModuloCustom.${STATO_ORDINE_LABEL_KEY[stato]}`) : stato;
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>{label}</span>;
}

function fmt(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("it-IT");
}

// Overlay del codice colore sull'immagine prodotto.
// stile = "numerico"  → numero grosso centrato (come One Step)
// stile = "testuale"  → banda nera in basso con nome (come Top Coat)
// size  = "lg" | "md" | "sm" | "xs"
function CodiceOverlay({ codice, stile, size = "md" }) {
  if (!codice) return null;
  if (stile === "numerico") {
    const cls = {
      lg: "text-5xl px-4 py-2 rounded-xl tracking-widest",
      md: "text-3xl px-2 py-0.5 rounded-lg tracking-wider",
      sm: "text-base px-1 rounded",
      xs: "text-xs px-1 rounded",
    }[size];
    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <span className={`bg-black/55 backdrop-blur-[2px] text-white font-bold ${cls}`}>{codice}</span>
      </div>
    );
  }
  // testuale
  const cls = {
    lg: "text-sm py-1",
    md: "text-xs py-0.5",
    sm: "text-[9px] py-0.5",
    xs: "text-[8px] py-0.5",
  }[size];
  return (
    <div className={`absolute bottom-0 left-0 right-0 bg-black/65 backdrop-blur-[2px] px-1 pointer-events-none ${cls}`}>
      <div className="text-white font-semibold text-center truncate leading-tight">{codice}</div>
    </div>
  );
}

// Etichetta laterale del codice colore (sotto il titolo)
// numerico → "#001" rosa monospace
// testuale → "Trasparente" rosa semibold
function CodiceLabel({ codice, stile, className = "" }) {
  if (!codice) return null;
  if (stile === "numerico") {
    return <span className={`text-xs font-mono font-bold text-pink-400 ${className}`}>#{codice}</span>;
  }
  return <span className={`text-xs font-semibold text-pink-400 truncate ${className}`}>{codice}</span>;
}

// ══════════════════════════════════════════════════════════
// TAB INVENTARIO
// ══════════════════════════════════════════════════════════
function TabInventario({ slug, stile }) {
  const { t } = useTranslation();
  const [prodotti, setProdotti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modale aggiungi — multi-select
  const [showAggiungi, setShowAggiungi] = useState(false);
  const [disponibili, setDisponibili] = useState([]);
  const [loadingDisp, setLoadingDisp] = useState(false);
  const [searchDisp, setSearchDisp] = useState("");
  // { [asin]: { codice_colore: string } }
  const [selezione, setSelezione] = useState({});
  const [sogliaGlobale, setSogliaGlobale] = useState(10);
  const [importing, setImporting] = useState(false);

  // Editing inline codice_colore
  const [editingColore, setEditingColore] = useState(null); // asin
  const [editColoreVal, setEditColoreVal] = useState("");

  // Sync immagini
  const [syncing, setSyncing] = useState(false);

  // Upload immagine manuale
  const [uploadingAsin, setUploadingAsin] = useState(null);

  // Reset totale (test data)
  const [showReset, setShowReset] = useState(false);
  const [resetConferma, setResetConferma] = useState("");
  const [resetting, setResetting] = useState(false);

  // Modale rettifica
  const [rettificaProd, setRettificaProd] = useState(null);
  const [nuovaQta, setNuovaQta] = useState("");
  const [noteRett, setNoteRett] = useState("");

  // Modale soglia
  const [sogliaProd, setSogliaProd] = useState(null);
  const [nuovaSoglia, setNuovaSoglia] = useState("");

  async function carica() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/moduli/${slug}/prodotti`);
      const json = await res.json();
      setProdotti(Array.isArray(json) ? json : []);
    } catch { toast.error(t("gestioneModuloCustom.errore_caricamento_prodotti")); }
    finally { setLoading(false); }
  }

  useEffect(() => { carica(); }, []);

  async function apriAggiungi() {
    setShowAggiungi(true);
    setSelezione({});
    setSearchDisp("");
    setSogliaGlobale(10);
    setLoadingDisp(true);
    try {
      const res = await fetch(`/api/v2/moduli/${slug}/prodotti/disponibili`);
      const json = await res.json();
      setDisponibili(Array.isArray(json) ? json : []);
    } catch { toast.error(t("gestioneModuloCustom.errore_caricamento_disponibili")); }
    finally { setLoadingDisp(false); }
  }

  function toggleSelezione(asin) {
    setSelezione(prev => {
      if (prev[asin]) {
        const next = { ...prev };
        delete next[asin];
        return next;
      }
      return { ...prev, [asin]: { codice_colore: "" } };
    });
  }

  function selezionaTutti() {
    const next = {};
    dispFiltrati.forEach(p => { next[p.asin] = selezione[p.asin] ?? { codice_colore: "" }; });
    setSelezione(next);
  }

  function deselezionaTutti() { setSelezione({}); }

  function setCodiceColore(asin, val) {
    setSelezione(prev => ({ ...prev, [asin]: { ...prev[asin], codice_colore: val } }));
  }

  async function importaMassivo() {
    const selezionati = Object.keys(selezione);
    if (selezionati.length === 0) { toast.error(t("gestioneModuloCustom.seleziona_almeno_un_prodotto")); return; }
    setImporting(true);
    let ok = 0;
    for (const asin of selezionati) {
      const prod = disponibili.find(p => p.asin === asin);
      if (!prod) continue;
      try {
        await fetch(`/api/v2/moduli/${slug}/prodotti`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            asin: prod.asin,
            sku: prod.sku ?? null,
            nome: prod.nome ?? null,
            image_url: prod.image_url ?? null,
            codice_colore: selezione[asin]?.codice_colore || null,
            soglia_minima: Number(sogliaGlobale) || 10,
          }),
        });
        ok++;
      } catch { /* continua con gli altri */ }
    }
    setImporting(false);
    toast.success(t("gestioneModuloCustom.colori_aggiunti", { count: ok }));
    setShowAggiungi(false);
    carica();
  }

  async function eliminaProdotto(asin) {
    if (!confirm(t("gestioneModuloCustom.conferma_eliminazione_prodotto"))) return;
    try {
      await fetch(`/api/v2/moduli/${slug}/prodotti/${asin}`, { method: "DELETE" });
      toast.success(t("gestioneModuloCustom.prodotto_rimosso"));
      carica();
    } catch { toast.error(t("gestioneModuloCustom.errore_eliminazione")); }
  }

  async function eseguiReset() {
    if (resetConferma !== "RESET" || resetting) return;
    setResetting(true);
    try {
      const res = await fetch(`/api/v2/moduli/${slug}/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conferma: "RESET" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(t("gestioneModuloCustom.reset_completato", { ordini: json.eliminati.ordini, movimenti: json.eliminati.movimenti, stockAzzerato: json.eliminati.stockAzzerato }));
      setShowReset(false);
      setResetConferma("");
      carica();
    } catch (e) { toast.error(t("gestioneModuloCustom.errore_reset", { msg: e.message })); }
    finally { setResetting(false); }
  }

  async function uploadImmagine(asin, file) {
    setUploadingAsin(asin);
    try {
      const fd = new FormData();
      fd.append("immagine", file);
      const res = await fetch(`/api/v2/moduli/${slug}/prodotti/${asin}/immagine`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(t("gestioneModuloCustom.immagine_caricata"));
      carica();
    } catch (e) { toast.error(t("gestioneModuloCustom.errore_upload", { msg: e.message })); }
    finally { setUploadingAsin(null); }
  }

  async function syncImmagini() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/v2/moduli/${slug}/sync-images`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(t("gestioneModuloCustom.immagini_aggiornate", { aggiornati: json.aggiornati, totale: json.totale }));
      carica();
    } catch (e) { toast.error(t("gestioneModuloCustom.errore_sync_immagini", { msg: e.message })); }
    finally { setSyncing(false); }
  }

  async function salvaColore(asin) {
    try {
      await fetch(`/api/v2/moduli/${slug}/prodotti/${asin}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ codice_colore: editColoreVal.trim() || null }),
      });
      toast.success(t("gestioneModuloCustom.codice_colore_aggiornato"));
      setEditingColore(null);
      carica();
    } catch { toast.error(t("gestioneModuloCustom.errore_salvataggio")); }
  }

  async function confermaRettifica() {
    if (!rettificaProd || nuovaQta === "") return;
    try {
      const res = await fetch(`/api/v2/moduli/${slug}/rettifica`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asin: rettificaProd.asin,
          nuova_quantita: Number(nuovaQta),
          note: noteRett || undefined,
          operatore: "ufficio",
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("gestioneModuloCustom.rettifica_registrata"));
      setRettificaProd(null);
      carica();
    } catch { toast.error(t("gestioneModuloCustom.errore_rettifica")); }
  }

  async function aggiornaSoglia() {
    if (!sogliaProd) return;
    try {
      await fetch(`/api/v2/moduli/${slug}/prodotti/${sogliaProd.asin}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soglia_minima: Number(nuovaSoglia) }),
      });
      toast.success(t("gestioneModuloCustom.soglia_aggiornata"));
      setSogliaProd(null);
      carica();
    } catch { toast.error(t("gestioneModuloCustom.errore_aggiornamento_soglia")); }
  }

  const searchQ = stile === "numerico" ? search.trim().replace(/^#/, "") : search.trim();
  const searchNum = stile === "numerico" ? parseInt(searchQ, 10) : NaN;

  const filtrati = prodotti
    .filter(p => {
      if (!searchQ) return true;
      const q = searchQ.toLowerCase();
      if ((p.nome ?? "").toLowerCase().includes(q)) return true;
      if ((p.asin ?? "").toLowerCase().includes(q)) return true;
      if (stile === "numerico") {
        // confronto numerico: "2" trova "002"
        if (!isNaN(searchNum) && p.codice_colore && parseInt(p.codice_colore, 10) === searchNum) return true;
      } else {
        // ricerca testuale
        if ((p.codice_colore ?? "").toLowerCase().includes(q)) return true;
      }
      return false;
    })
    .sort((a, b) => {
      if (stile === "numerico") {
        const na = a.codice_colore ? parseInt(a.codice_colore, 10) : Infinity;
        const nb = b.codice_colore ? parseInt(b.codice_colore, 10) : Infinity;
        if (na !== nb) return na - nb;
        return (a.nome ?? "").localeCompare(b.nome ?? "");
      }
      // testuale
      const ca = a.codice_colore ?? "";
      const cb = b.codice_colore ?? "";
      if (!ca && cb) return 1;
      if (ca && !cb) return -1;
      if (ca !== cb) return ca.localeCompare(cb);
      return (a.nome ?? "").localeCompare(b.nome ?? "");
    });

  const dispFiltrati = disponibili.filter(p =>
    !searchDisp ||
    (p.nome ?? "").toLowerCase().includes(searchDisp.toLowerCase()) ||
    (p.asin ?? "").toLowerCase().includes(searchDisp.toLowerCase())
  );

  const numSelezionati = Object.keys(selezione).length;
  const tuttiSelezionati = dispFiltrati.length > 0 && dispFiltrati.every(p => selezione[p.asin]);

  return (
    <div>
      {/* Header barra */}
      <div className="flex gap-3 mb-5 flex-wrap items-center">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={stile === "numerico" ? t("gestioneModuloCustom.placeholder_search_numerico") : t("gestioneModuloCustom.placeholder_search_testuale")}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          />
        </div>
        <button onClick={carica} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white" title={t("gestioneModuloCustom.title_ricarica")}>
          <RefreshCw className="w-4 h-4" />
        </button>
        <button
          onClick={syncImmagini}
          disabled={syncing || prodotti.length === 0}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm font-medium transition-colors"
          title={t("gestioneModuloCustom.title_sync_img")}
        >
          <ImageOff className="w-4 h-4" />
          {syncing ? t("gestioneModuloCustom.sync") : t("gestioneModuloCustom.sync_img")}
        </button>
        <button
          onClick={apriAggiungi}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-pink-600 hover:bg-pink-500 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> {t("gestioneModuloCustom.aggiungi_colori")}
        </button>
      </div>

      {/* Statistiche rapide */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{prodotti.length}</div>
          <div className="text-xs text-slate-400 mt-0.5">{t("gestioneModuloCustom.colori_in_catalogo")}</div>
        </div>
        <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-amber-400">
            {prodotti.filter(p => p.quantita < p.soglia_minima).length}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">{t("gestioneModuloCustom.sotto_soglia")}</div>
        </div>
        <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-white">{prodotti.reduce((s, p) => s + p.quantita, 0)}</div>
          <div className="text-xs text-slate-400 mt-0.5">{t("gestioneModuloCustom.unita_totali")}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">{t("gestioneModuloCustom.caricamento")}</div>
      ) : filtrati.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          {prodotti.length === 0 ? t("gestioneModuloCustom.nessun_colore_in_catalogo") : t("gestioneModuloCustom.nessun_risultato")}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {filtrati.map(p => {
            const sottoSoglia = p.quantita < p.soglia_minima;
            const editingThis = editingColore === p.asin;
            return (
              <div
                key={p.asin}
                className={`relative bg-slate-800 border rounded-xl overflow-hidden flex flex-col transition-all ${sottoSoglia ? "border-amber-500/60" : "border-slate-700"}`}
              >
                {sottoSoglia && (
                  <div className="absolute top-1.5 right-1.5 z-10">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  </div>
                )}

                {/* Immagine con numero sovrapposto + pulsante upload */}
                <div className="aspect-square bg-slate-900 relative flex items-center justify-center overflow-hidden group/img">
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.nome ?? p.asin} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-10 h-10 text-slate-600" />
                  )}
                  {/* Numero colore centrato */}
                  <CodiceOverlay codice={p.codice_colore} stile={stile} size="lg" />
                  {/* Upload immagine — appare al hover */}
                  <label
                    className="absolute bottom-1 right-1 p-1.5 rounded-lg bg-black/60 text-slate-300 hover:text-white cursor-pointer opacity-0 group-hover/img:opacity-100 transition-opacity z-10"
                    title={t("gestioneModuloCustom.title_carica_immagine")}
                  >
                    {uploadingAsin === p.asin
                      ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      : <Upload className="w-3.5 h-3.5" />
                    }
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { if (e.target.files[0]) uploadImmagine(p.asin, e.target.files[0]); e.target.value = ""; }}
                    />
                  </label>
                </div>

                {/* Info */}
                <div className="p-2 flex flex-col gap-1 flex-1">
                  {/* Codice colore — inline editable */}
                  {editingThis ? (
                    <div className="flex gap-1">
                      <input
                        autoFocus
                        value={editColoreVal}
                        onChange={e => setEditColoreVal(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") salvaColore(p.asin); if (e.key === "Escape") setEditingColore(null); }}
                        placeholder={stile === "numerico" ? t("gestioneModuloCustom.placeholder_codice_numerico") : t("gestioneModuloCustom.placeholder_codice_testuale")}
                        className={`flex-1 min-w-0 bg-slate-700 border border-pink-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none ${stile === "numerico" ? "font-mono" : ""}`}
                      />
                      <button onClick={() => salvaColore(p.asin)} className="text-green-400 hover:text-green-300">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingColore(null)} className="text-slate-500 hover:text-slate-300">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingColore(p.asin); setEditColoreVal(p.codice_colore ?? ""); }}
                      className="text-left group flex items-center gap-1"
                      title={stile === "numerico" ? t("gestioneModuloCustom.title_modifica_numero") : t("gestioneModuloCustom.title_modifica_nome")}
                    >
                      {p.codice_colore ? (
                        <CodiceLabel codice={p.codice_colore} stile={stile} />
                      ) : (
                        <span className="text-xs text-slate-600 italic">{stile === "numerico" ? t("gestioneModuloCustom.placeholder_aggiungi_numero") : t("gestioneModuloCustom.placeholder_aggiungi_nome")}</span>
                      )}
                      <Edit3 className="w-2.5 h-2.5 text-slate-600 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}

                  <div className="text-xs text-slate-200 leading-tight">
                    {p.nome ?? p.asin}
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(p.asin); toast.success(t("gestioneModuloCustom.asin_copiato", { asin: p.asin })); }}
                    className="text-xs text-slate-600 hover:text-pink-400 font-mono text-left transition-colors"
                    title={t("gestioneModuloCustom.title_copia_asin")}
                  >
                    {p.asin}
                  </button>

                  {/* Stock */}
                  <div className={`text-center py-1 rounded-md mt-1 ${sottoSoglia ? "bg-amber-900/40" : "bg-slate-700/50"}`}>
                    <span className={`text-xl font-bold ${sottoSoglia ? "text-amber-400" : "text-white"}`}>
                      {p.quantita}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">/ {p.soglia_minima}</span>
                  </div>

                  {/* Nota "in arrivo" — visibile solo se ci sono ordini attivi */}
                  {p.qta_in_arrivo > 0 && (
                    <div className="mt-1 px-2 py-1 rounded-md bg-blue-900/30 border border-blue-700/40 flex items-center gap-1.5">
                      <Truck className="w-3 h-3 text-blue-400 flex-shrink-0" />
                      <div className="text-[10px] text-blue-200 leading-tight">
                        <span className="font-bold">+{p.qta_in_arrivo}</span> {t("gestioneModuloCustom.in_arrivo")}
                        {p.prima_consegna && <> · {new Date(p.prima_consegna).toLocaleDateString("it-IT", { day: "2-digit", month: "2-digit" })}</>}
                      </div>
                    </div>
                  )}

                  {/* Azioni */}
                  <div className="flex gap-1 mt-1">
                    <button
                      onClick={() => { setRettificaProd(p); setNuovaQta(p.quantita); setNoteRett(""); }}
                      className="flex-1 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 font-medium transition-colors"
                    >
                      {t("gestioneModuloCustom.rettifica")}
                    </button>
                    <button
                      onClick={() => { setSogliaProd(p); setNuovaSoglia(p.soglia_minima); }}
                      className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-amber-400 transition-colors"
                      title={t("gestioneModuloCustom.title_modifica_soglia")}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => eliminaProdotto(p.asin)}
                      className="p-1 rounded bg-slate-700 hover:bg-red-900/50 text-slate-400 hover:text-red-400 transition-colors"
                      title={t("gestioneModuloCustom.title_rimuovi_dal_catalogo")}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* DANGER ZONE — reset dati di test */}
      <div className="mt-12 pt-6 border-t border-slate-800">
        <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div>
              <div className="text-sm font-bold text-red-300">{t("gestioneModuloCustom.zona_pericolosa")}</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {t("gestioneModuloCustom.zona_pericolosa_desc_pre")}<span className="text-slate-200 font-semibold">{t("gestioneModuloCustom.catalogo_colori_resta_invariato")}</span>{t("gestioneModuloCustom.zona_pericolosa_desc_post")}
              </div>
            </div>
          </div>
          <button
            onClick={() => { setResetConferma(""); setShowReset(true); }}
            className="px-4 py-2 rounded-lg bg-red-900/50 hover:bg-red-900 border border-red-700/50 text-red-300 hover:text-white text-sm font-medium transition-colors flex-shrink-0 flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            {t("gestioneModuloCustom.reset_ordini_e_stock")}
          </button>
        </div>
      </div>

      {/* MODALE RESET */}
      {showReset && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-700/60 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-red-900/40">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">{t("gestioneModuloCustom.conferma_reset")}</h3>
            </div>
            <p className="text-sm text-slate-300 mb-2">
              {t("gestioneModuloCustom.stai_per_eliminare")}
            </p>
            <ul className="text-sm text-slate-400 mb-3 space-y-1 pl-4">
              <li>• {t("gestioneModuloCustom.reset_lista_ordini")}</li>
              <li>• {t("gestioneModuloCustom.reset_lista_storico")}</li>
              <li>• {t("gestioneModuloCustom.reset_lista_stock", { count: prodotti.length })}</li>
            </ul>
            <div className="bg-emerald-950/30 border border-emerald-900/40 rounded-lg p-2.5 mb-3">
              <p className="text-xs text-emerald-300">
                {t("gestioneModuloCustom.catalogo_resta_invariato_pre")}<span className="font-bold">{t("gestioneModuloCustom.catalogo_colori")}</span>{t("gestioneModuloCustom.catalogo_resta_invariato_mid", { count: prodotti.length })}<span className="font-bold">{t("gestioneModuloCustom.invariati")}</span>{t("gestioneModuloCustom.catalogo_resta_invariato_post")}
              </p>
            </div>
            <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-300 font-medium">
                {t("gestioneModuloCustom.operazione_irreversibile_pre")}<span className="underline">{t("gestioneModuloCustom.irreversibile")}</span>{t("gestioneModuloCustom.operazione_irreversibile_post")}
              </p>
            </div>
            <label className="text-xs text-slate-400 block mb-1">
              {t("gestioneModuloCustom.per_confermare_scrivi_pre")}<span className="font-mono font-bold text-red-300">RESET</span>{t("gestioneModuloCustom.per_confermare_scrivi_post")}
            </label>
            <input
              autoFocus
              value={resetConferma}
              onChange={e => setResetConferma(e.target.value)}
              placeholder="RESET"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono mb-4 focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowReset(false); setResetConferma(""); }}
                disabled={resetting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm font-medium"
              >
                {t("gestioneModuloCustom.annulla")}
              </button>
              <button
                onClick={eseguiReset}
                disabled={resetConferma !== "RESET" || resetting}
                className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:bg-red-950 disabled:cursor-not-allowed disabled:text-slate-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {resetting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t("gestioneModuloCustom.cancellazione")}
                  </>
                ) : t("gestioneModuloCustom.cancella_tutto")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE AGGIUNGI — multi-select con codice colore */}
      {showAggiungi && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white">{t("gestioneModuloCustom.aggiungi_colori_al_catalogo")}</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t("gestioneModuloCustom.prodotti_disponibili_selezionati", { disponibili: disponibili.length, selezionati: numSelezionati })}
                </p>
              </div>
              <button onClick={() => setShowAggiungi(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Barra cerca + seleziona tutti */}
            <div className="p-4 border-b border-slate-800 flex gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchDisp}
                  onChange={e => setSearchDisp(e.target.value)}
                  placeholder={t("gestioneModuloCustom.placeholder_search_nome_asin")}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
                />
              </div>
              <button
                onClick={tuttiSelezionati ? deselezionaTutti : selezionaTutti}
                className="whitespace-nowrap px-3 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-xs text-slate-300 font-medium"
              >
                {tuttiSelezionati ? t("gestioneModuloCustom.deseleziona_tutti") : t("gestioneModuloCustom.seleziona_tutti")}
              </button>
            </div>

            {/* Lista prodotti */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingDisp ? (
                <div className="text-center py-8 text-slate-500">{t("gestioneModuloCustom.caricamento")}</div>
              ) : dispFiltrati.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  {disponibili.length === 0 ? t("gestioneModuloCustom.tutti_prodotti_gia_in_catalogo") : t("gestioneModuloCustom.nessun_risultato")}
                </div>
              ) : (
                dispFiltrati.map(p => {
                  const sel = !!selezione[p.asin];
                  return (
                    <div
                      key={p.asin}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        sel ? "border-pink-500 bg-pink-900/15" : "border-slate-700 bg-slate-800"
                      }`}
                    >
                      {/* Checkbox click area */}
                      <button onClick={() => toggleSelezione(p.asin)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${sel ? "border-pink-500 bg-pink-500" : "border-slate-600"}`}>
                          {sel && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="w-10 h-10 rounded-lg bg-slate-900 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm text-slate-100 font-medium truncate">{p.nome ?? p.asin}</div>
                          <div className="text-xs text-slate-500 font-mono">{p.asin}</div>
                        </div>
                      </button>
                      {/* Codice colore per questo prodotto */}
                      {sel && (
                        <input
                          value={selezione[p.asin]?.codice_colore ?? ""}
                          onChange={e => setCodiceColore(p.asin, e.target.value)}
                          onClick={e => e.stopPropagation()}
                          placeholder={stile === "numerico" ? t("gestioneModuloCustom.placeholder_n_colore") : t("gestioneModuloCustom.placeholder_nome")}
                          className={`${stile === "numerico" ? "w-24 font-mono text-center" : "w-32"} bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 flex-shrink-0`}
                        />
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer: soglia globale + pulsante import */}
            <div className="p-4 border-t border-slate-800 flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs text-slate-400 whitespace-nowrap">{t("gestioneModuloCustom.soglia_minima")}</label>
                <input
                  type="number"
                  min={0}
                  value={sogliaGlobale}
                  onChange={e => setSogliaGlobale(e.target.value)}
                  className="w-20 bg-slate-800 border border-slate-700 rounded-lg px-2 py-1.5 text-sm text-center text-white focus:outline-none focus:border-slate-500"
                />
              </div>
              <button
                onClick={importaMassivo}
                disabled={importing || numSelezionati === 0}
                className="flex-1 py-2.5 rounded-xl bg-pink-600 hover:bg-pink-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
              >
                {importing ? t("gestioneModuloCustom.importazione") : (numSelezionati > 0 ? t("gestioneModuloCustom.aggiungi_n_colori", { n: numSelezionati }) : t("gestioneModuloCustom.aggiungi_colori_btn"))}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE RETTIFICA */}
      {rettificaProd && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{t("gestioneModuloCustom.rettifica_stock")}</h3>
              <button onClick={() => setRettificaProd(null)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex items-center gap-3 mb-4 p-3 bg-slate-800 rounded-xl">
              {rettificaProd.image_url && (
                <img src={rettificaProd.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />
              )}
              <div>
                <div className="text-sm text-slate-200 font-medium">{rettificaProd.nome ?? rettificaProd.asin}</div>
                <div className="text-xs text-slate-500">{t("gestioneModuloCustom.stock_attuale", { n: rettificaProd.quantita })}</div>
              </div>
            </div>
            <label className="text-xs text-slate-400 block mb-1">{t("gestioneModuloCustom.nuova_quantita")}</label>
            <input
              type="number"
              min={0}
              value={nuovaQta}
              onChange={e => setNuovaQta(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-3 focus:outline-none focus:border-slate-500"
            />
            <label className="text-xs text-slate-400 block mb-1">{t("gestioneModuloCustom.note_opzionale")}</label>
            <input
              value={noteRett}
              onChange={e => setNoteRett(e.target.value)}
              placeholder={t("gestioneModuloCustom.placeholder_note_rettifica")}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 mb-4 focus:outline-none focus:border-slate-500"
            />
            <div className="flex gap-2">
              <button onClick={() => setRettificaProd(null)} className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm">
                {t("gestioneModuloCustom.annulla")}
              </button>
              <button onClick={confermaRettifica} className="flex-1 py-2 rounded-lg bg-green-700 hover:bg-green-600 text-white text-sm font-medium">
                {t("gestioneModuloCustom.conferma")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE SOGLIA */}
      {sogliaProd && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{t("gestioneModuloCustom.soglia_minima_titolo")}</h3>
              <button onClick={() => setSogliaProd(null)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              {t("gestioneModuloCustom.sotto_soglia_desc")}
            </p>
            <input
              type="number"
              min={0}
              value={nuovaSoglia}
              onChange={e => setNuovaSoglia(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white mb-4 focus:outline-none focus:border-slate-500"
            />
            <div className="flex gap-2">
              <button onClick={() => setSogliaProd(null)} className="flex-1 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm">
                {t("gestioneModuloCustom.annulla")}
              </button>
              <button onClick={aggiornaSoglia} className="flex-1 py-2 rounded-lg bg-amber-700 hover:bg-amber-600 text-white text-sm font-medium">
                {t("gestioneModuloCustom.salva")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// TAB ORDINI
// ══════════════════════════════════════════════════════════
function TabOrdini({ slug, stile }) {
  const { t } = useTranslation();
  const [ordini, setOrdini] = useState([]);
  const [loading, setLoading] = useState(true);
  const [espanso, setEspanso] = useState(null);
  const [showNuovo, setShowNuovo] = useState(false);
  const [vista, setVista] = useState("attivi");      // attivi | storico | tutti
  const [statoFine, setStatoFine] = useState("");    // "" | bozza | confermato | ricevuto_parziale | ricevuto | annullato

  // Form nuovo ordine
  const [fornitore, setFornitore] = useState("");
  const [dataConsegna, setDataConsegna] = useState("");
  const [noteOrdine, setNoteOrdine] = useState("");
  const [prodottiCatalogo, setProdottiCatalogo] = useState([]);
  const [righeNuove, setRigheNuove] = useState([]); // [{asin, nome, image_url, quantita_ordinata}]

  // Ricezione
  const [ricezioneOrdine, setRicezioneOrdine] = useState(null);
  const [confermandoRicezione, setConfermandoRicezione] = useState(false);
  const [righeRicezione, setRigheRicezione] = useState({}); // {id_riga: quantita_ricevuta}

  async function carica() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/moduli/${slug}/ordini`);
      const json = await res.json();
      setOrdini(Array.isArray(json) ? json : []);
    } catch { toast.error(t("gestioneModuloCustom.errore_caricamento_ordini")); }
    finally { setLoading(false); }
  }

  async function caricaCatalogo() {
    const res = await fetch(`/api/v2/moduli/${slug}/prodotti`);
    const json = await res.json();
    setProdottiCatalogo(Array.isArray(json) ? json : []);
  }

  useEffect(() => { carica(); }, []);

  async function apriNuovoOrdine() {
    await caricaCatalogo();
    setFornitore("");
    setDataConsegna("");
    setNoteOrdine("");
    setRigheNuove([]);
    setShowNuovo(true);
  }

  function aggiungiRiga(prod) {
    if (righeNuove.find(r => r.asin === prod.asin)) return;
    setRigheNuove(prev => [...prev, { asin: prod.asin, nome: prod.nome, image_url: prod.image_url, codice_colore: prod.codice_colore ?? null, quantita_ordinata: 1 }]);
  }

  function rimuoviRiga(asin) {
    setRigheNuove(prev => prev.filter(r => r.asin !== asin));
  }

  function aggiornaQtaRiga(asin, val) {
    setRigheNuove(prev => prev.map(r => r.asin === asin ? { ...r, quantita_ordinata: Number(val) } : r));
  }

  async function creaOrdine() {
    if (!fornitore.trim()) { toast.error(t("gestioneModuloCustom.inserisci_fornitore")); return; }
    if (righeNuove.length === 0) { toast.error(t("gestioneModuloCustom.aggiungi_almeno_un_prodotto")); return; }
    try {
      const res = await fetch(`/api/v2/moduli/${slug}/ordini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fornitore: fornitore.trim(),
          data_consegna_prevista: dataConsegna || null,
          note: noteOrdine || null,
          operatore: "ufficio",
          righe: righeNuove.map(r => ({ asin: r.asin, quantita_ordinata: r.quantita_ordinata })),
        }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("gestioneModuloCustom.ordine_creato"));
      setShowNuovo(false);
      carica();
    } catch { toast.error(t("gestioneModuloCustom.errore_creazione_ordine")); }
  }

  async function aggiornaStatoOrdine(id, stato) {
    try {
      await fetch(`/api/v2/moduli/${slug}/ordini/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stato }),
      });
      toast.success(t("gestioneModuloCustom.stato_aggiornato"));
      carica();
    } catch { toast.error(t("gestioneModuloCustom.errore_aggiornamento_stato")); }
  }

  function apriRicezione(ordine) {
    const init = {};
    for (const r of ordine.righe ?? []) {
      init[r.id] = r.quantita_ordinata - (r.quantita_ricevuta ?? 0);
    }
    setRigheRicezione(init);
    setRicezioneOrdine(ordine);
  }

  async function confermaRicezione() {
    if (!ricezioneOrdine || confermandoRicezione) return; // guard anti doppio-click
    setConfermandoRicezione(true);
    try {
      const righe = Object.entries(righeRicezione).map(([id_riga, quantita_ricevuta]) => ({
        id_riga: Number(id_riga),
        quantita_ricevuta: Number(quantita_ricevuta),
      }));
      const res = await fetch(`/api/v2/moduli/${slug}/ordini/${ricezioneOrdine.id}/ricevi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatore: "magazzino", righe }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("gestioneModuloCustom.ricezione_registrata"));
      setRicezioneOrdine(null);
      carica();
    } catch { toast.error(t("gestioneModuloCustom.errore_ricezione")); }
    finally { setConfermandoRicezione(false); }
  }

  const prodottiInRiga = prodottiCatalogo
    .filter(p => !righeNuove.find(r => r.asin === p.asin))
    .sort((a, b) => {
      if (stile === "numerico") {
        const na = a.codice_colore ? parseInt(a.codice_colore, 10) : Infinity;
        const nb = b.codice_colore ? parseInt(b.codice_colore, 10) : Infinity;
        if (na !== nb) return na - nb;
        return (a.nome ?? "").localeCompare(b.nome ?? "");
      }
      const ca = a.codice_colore ?? "";
      const cb = b.codice_colore ?? "";
      if (!ca && cb) return 1;
      if (ca && !cb) return -1;
      if (ca !== cb) return ca.localeCompare(cb);
      return (a.nome ?? "").localeCompare(b.nome ?? "");
    });

  // Conteggi per stato
  const conteggi = ordini.reduce((acc, o) => {
    acc[o.stato] = (acc[o.stato] ?? 0) + 1;
    return acc;
  }, {});
  const numAttivi  = ordini.filter(o => !["annullato", "ricevuto"].includes(o.stato)).length;
  const numStorico = ordini.filter(o =>  ["annullato", "ricevuto"].includes(o.stato)).length;

  // Stati validi all'interno di ogni vista (per il dropdown contestuale)
  const STATI_PER_VISTA = {
    attivi:  [
      { key: "bozza",             label: t("gestioneModuloCustom.stato_bozze") },
      { key: "confermato",        label: t("gestioneModuloCustom.stato_confermati") },
      { key: "ricevuto_parziale", label: t("gestioneModuloCustom.stato_parziali") },
    ],
    storico: [
      { key: "ricevuto",  label: t("gestioneModuloCustom.stato_ricevuti") },
      { key: "annullato", label: t("gestioneModuloCustom.stato_annullati") },
    ],
    tutti: [
      { key: "bozza",             label: t("gestioneModuloCustom.stato_bozze") },
      { key: "confermato",        label: t("gestioneModuloCustom.stato_confermati") },
      { key: "ricevuto_parziale", label: t("gestioneModuloCustom.stato_parziali") },
      { key: "ricevuto",          label: t("gestioneModuloCustom.stato_ricevuti") },
      { key: "annullato",         label: t("gestioneModuloCustom.stato_annullati") },
    ],
  };

  // Filtra prima per vista, poi per stato fine (se impostato)
  const ordiniFiltrati = ordini
    .filter(o => {
      // Step 1: vista
      if (vista === "attivi"  && ["annullato", "ricevuto"].includes(o.stato)) return false;
      if (vista === "storico" && !["annullato", "ricevuto"].includes(o.stato)) return false;
      // Step 2: stato fine
      if (statoFine && o.stato !== statoFine) return false;
      return true;
    })
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const VISTE = [
    { key: "attivi",  label: t("gestioneModuloCustom.vista_attivi"),  count: numAttivi  },
    { key: "storico", label: t("gestioneModuloCustom.vista_storico"), count: numStorico },
    { key: "tutti",   label: t("gestioneModuloCustom.vista_tutti"),   count: ordini.length },
  ];

  // Quando cambia vista resetta il filtro fine (evita combinazioni impossibili)
  function cambiaVista(nuovaVista) {
    setVista(nuovaVista);
    setStatoFine("");
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div className="flex gap-2 items-center">
          <button onClick={carica} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-sm text-slate-500">{t("gestioneModuloCustom.ordini_count", { filtrati: ordiniFiltrati.length, totale: ordini.length })}</span>
        </div>
        <button
          onClick={apriNuovoOrdine}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-white text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> {t("gestioneModuloCustom.nuovo_ordine")}
        </button>
      </div>

      {/* Segmented control + dropdown filtro fine */}
      <div className="flex gap-3 mb-5 items-center flex-wrap">
        {/* Segmented control: 3 viste principali */}
        <div className="inline-flex bg-slate-900 border border-slate-700 rounded-xl p-1">
          {VISTE.map(v => (
            <button
              key={v.key}
              onClick={() => cambiaVista(v.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                vista === v.key
                  ? "bg-blue-500/20 text-blue-200 shadow border border-blue-500/40"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {v.label}
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                vista === v.key ? "bg-blue-800 text-blue-100" : "bg-slate-800 text-slate-500"
              }`}>{v.count}</span>
            </button>
          ))}
        </div>

        {/* Dropdown filtro fine */}
        <div className="flex items-center gap-2">
          <select
            value={statoFine}
            onChange={e => setStatoFine(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500 cursor-pointer"
          >
            <option value="">{t("gestioneModuloCustom.filtra_per_stato")}</option>
            {STATI_PER_VISTA[vista].map(s => (
              <option key={s.key} value={s.key}>
                {s.label} ({conteggi[s.key] ?? 0})
              </option>
            ))}
          </select>
          {statoFine && (
            <button
              onClick={() => setStatoFine("")}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              title={t("gestioneModuloCustom.title_rimuovi_filtro")}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">{t("gestioneModuloCustom.caricamento")}</div>
      ) : ordiniFiltrati.length === 0 ? (
        <div className="text-center py-16 text-slate-500">
          {ordini.length === 0 ? t("gestioneModuloCustom.nessun_ordine_registrato") : t("gestioneModuloCustom.nessun_ordine_filtro")}
        </div>
      ) : (
        <div className="space-y-3">
          {ordiniFiltrati.map(o => {
            const aperto = espanso === o.id;
            const puoRicevere = ["confermato", "in_attesa", "ricevuto_parziale"].includes(o.stato);
            return (
              <div key={o.id} className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-750 transition-colors"
                  onClick={() => setEspanso(aperto ? null : o.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md bg-blue-900/40 border border-blue-700/40 text-blue-300 font-mono font-bold text-sm">
                        #{String(o.id).padStart(4, "0")}
                      </span>
                      <span className="font-semibold text-white">{o.fornitore}</span>
                      <StatoChip stato={o.stato} />
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {t("gestioneModuloCustom.creato", { data: fmt(o.created_at) })}
                      {o.data_consegna_prevista && t("gestioneModuloCustom.consegna_prevista", { data: fmt(o.data_consegna_prevista) })}
                      {o.num_righe > 0 && t("gestioneModuloCustom.righe_pz", { righe: o.num_righe, pz: o.tot_ordinato })}
                    </div>
                  </div>
                  {aperto ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                </button>

                {aperto && (
                  <div className="px-4 pb-4 border-t border-slate-700">
                    {/* Righe */}
                    <div className="mt-3 space-y-2">
                      {(o.righe ?? [])
                        .slice()
                        .sort((a, b) => {
                          if (stile === "numerico") {
                            const na = a.codice_colore ? parseInt(a.codice_colore, 10) : Infinity;
                            const nb = b.codice_colore ? parseInt(b.codice_colore, 10) : Infinity;
                            return na - nb;
                          }
                          return (a.codice_colore ?? "").localeCompare(b.codice_colore ?? "");
                        })
                        .map(r => (
                        <div key={r.id} className="flex items-center gap-3 bg-slate-900 rounded-lg p-2">
                          {/* Immagine quadrata con numero colore sovrapposto */}
                          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
                            {r.image_url ? (
                              <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-5 h-5 text-slate-600" />
                            )}
                            <CodiceOverlay codice={r.codice_colore} stile={stile} size="sm" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <CodiceLabel codice={r.codice_colore} stile={stile} />
                              <span className="text-sm text-slate-200 truncate">{r.nome ?? r.asin}</span>
                            </div>
                            <div className="text-xs text-slate-500">{t("gestioneModuloCustom.ord_ric", { ord: r.quantita_ordinata, ric: r.quantita_ricevuta ?? 0 })}</div>
                          </div>
                          <StatoChip stato={r.stato ?? "in_attesa"} />
                        </div>
                      ))}
                    </div>

                    {/* Azioni */}
                    <div className="flex gap-2 mt-4 flex-wrap">
                      {o.stato === "bozza" && (
                        <button
                          onClick={() => aggiornaStatoOrdine(o.id, "confermato")}
                          className="px-3 py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white text-xs font-medium"
                        >
                          {t("gestioneModuloCustom.conferma_ordine")}
                        </button>
                      )}
                      {puoRicevere && (
                        <button
                          onClick={() => apriRicezione(o)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-700 hover:bg-green-600 text-white text-xs font-medium"
                        >
                          <Truck className="w-3.5 h-3.5" /> {t("gestioneModuloCustom.registra_ricezione")}
                        </button>
                      )}
                      {o.stato !== "annullato" && o.stato !== "ricevuto" && (
                        <button
                          onClick={() => aggiornaStatoOrdine(o.id, "annullato")}
                          className="px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-900 text-red-400 text-xs font-medium"
                        >
                          {t("gestioneModuloCustom.annulla_ordine")}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* MODALE NUOVO ORDINE */}
      {showNuovo && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">{t("gestioneModuloCustom.nuovo_ordine_fornitore")}</h3>
              <button onClick={() => setShowNuovo(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Dati ordine */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t("gestioneModuloCustom.fornitore_label")}</label>
                  <input
                    value={fornitore}
                    onChange={e => setFornitore(e.target.value)}
                    placeholder={t("gestioneModuloCustom.placeholder_nome_fornitore")}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t("gestioneModuloCustom.data_consegna_prevista_label")}</label>
                  <input
                    type="date"
                    value={dataConsegna}
                    onChange={e => setDataConsegna(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-slate-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">{t("gestioneModuloCustom.note_label")}</label>
                  <input
                    value={noteOrdine}
                    onChange={e => setNoteOrdine(e.target.value)}
                    placeholder={t("gestioneModuloCustom.placeholder_note_ordine")}
                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-slate-500"
                  />
                </div>
              </div>

              {/* Layout a due colonne: selezione | carrello */}
              <div className="grid grid-cols-2 gap-5" style={{ minHeight: 0 }}>

                {/* COLONNA SX: griglia prodotti disponibili */}
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-slate-400 font-medium">
                    {t("gestioneModuloCustom.prodotti_disponibili", { n: prodottiInRiga.length })}
                  </div>
                  {prodottiInRiga.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">{t("gestioneModuloCustom.tutti_prodotti_gia_in_ordine")}</p>
                  ) : (
                    <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1">
                      {prodottiInRiga.map(p => (
                        <button
                          key={p.asin}
                          onClick={() => aggiungiRiga(p)}
                          className="w-full flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl hover:border-blue-500 text-left transition-colors overflow-hidden group p-2"
                        >
                          {/* Immagine quadrata grande con numero */}
                          <div className="w-24 h-24 relative bg-slate-900 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-10 h-10 text-slate-600" />
                            )}
                            <CodiceOverlay codice={p.codice_colore} stile={stile} size="md" />
                          </div>
                          {/* Info estese */}
                          <div className="flex-1 min-w-0 py-1">
                            <div className="text-sm text-slate-100 leading-snug font-medium">{p.nome ?? p.asin}</div>
                            <div className="text-xs text-slate-500 font-mono mt-1">{p.asin}</div>
                            <div className="text-xs text-slate-400 mt-1">{t("gestioneModuloCustom.stock_attuale_label")}<span className="text-slate-200 font-semibold">{p.quantita}</span></div>
                          </div>
                          <div className="p-2 rounded-full bg-blue-600/20 group-hover:bg-blue-600 transition-colors flex-shrink-0">
                            <Plus className="w-4 h-4 text-blue-400 group-hover:text-white" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* COLONNA DX: carrello ordine */}
                <div className="flex flex-col gap-2">
                  <div className="text-xs text-slate-400 font-medium">
                    {t("gestioneModuloCustom.nell_ordine", { prodotti: righeNuove.length, pz: righeNuove.reduce((s, r) => s + r.quantita_ordinata, 0) })}
                  </div>
                  {righeNuove.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-slate-600 text-sm border border-dashed border-slate-700 rounded-xl">
                      {t("gestioneModuloCustom.clicca_prodotti_aggiungere")}
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto max-h-[60vh] pr-1">
                      {righeNuove.map(r => (
                        <div key={r.asin} className="flex items-center gap-3 bg-slate-800 border border-slate-700 rounded-xl p-2">
                          {/* Immagine quadrata grande con numero */}
                          <div className="relative w-24 h-24 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0 flex items-center justify-center">
                            {r.image_url ? (
                              <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-10 h-10 text-slate-600" />
                            )}
                            <CodiceOverlay codice={r.codice_colore} stile={stile} size="md" />
                          </div>
                          <div className="flex-1 min-w-0 py-1">
                            <div className="text-sm text-slate-100 leading-snug font-medium">{r.nome ?? r.asin}</div>
                            <div className="text-xs text-slate-500 font-mono mt-1">{r.asin}</div>
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={r.quantita_ordinata}
                            onChange={e => aggiornaQtaRiga(r.asin, e.target.value)}
                            className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-2 text-base text-center text-white focus:outline-none focus:border-slate-500"
                          />
                          <button onClick={() => rimuoviRiga(r.asin)} className="text-slate-500 hover:text-red-400 transition-colors flex-shrink-0">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-5 border-t border-slate-800 flex gap-3">
              <button onClick={() => setShowNuovo(false)} className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm">
                {t("gestioneModuloCustom.annulla")}
              </button>
              <button onClick={creaOrdine} className="flex-1 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-white text-sm font-medium">
                {t("gestioneModuloCustom.crea_ordine_n", { n: righeNuove.length })}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALE RICEZIONE */}
      {ricezioneOrdine && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white">{t("gestioneModuloCustom.registra_ricezione")}</h3>
              <button onClick={() => setRicezioneOrdine(null)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(ricezioneOrdine.righe ?? []).filter(r => r.stato !== "ricevuto").map(r => (
                <div key={r.id} className="flex items-center gap-3 bg-slate-800 rounded-xl p-3">
                  {r.image_url ? (
                    <img src={r.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
                      <Package className="w-5 h-5 text-slate-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-slate-200 truncate">{r.nome ?? r.asin}</div>
                    <div className="text-xs text-slate-500">{t("gestioneModuloCustom.ordinato_ricevuto_finora", { ord: r.quantita_ordinata, ric: r.quantita_ricevuta ?? 0 })}</div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    value={righeRicezione[r.id] ?? ""}
                    onChange={e => setRigheRicezione(prev => ({ ...prev, [r.id]: e.target.value }))}
                    className="w-20 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-sm text-center text-white focus:outline-none"
                  />
                </div>
              ))}
            </div>
            <div className="p-5 border-t border-slate-800 flex gap-3">
              <button
                onClick={() => setRicezioneOrdine(null)}
                disabled={confermandoRicezione}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300 text-sm"
              >
                {t("gestioneModuloCustom.annulla")}
              </button>
              <button
                onClick={confermaRicezione}
                disabled={confermandoRicezione}
                className="flex-1 py-2.5 rounded-xl bg-green-700 hover:bg-green-600 disabled:bg-green-900 disabled:cursor-not-allowed text-white text-sm font-medium flex items-center justify-center gap-2"
              >
                {confermandoRicezione ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t("gestioneModuloCustom.registrazione_in_corso")}
                  </>
                ) : t("gestioneModuloCustom.conferma_ricezione")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// TAB STORICO MOVIMENTI
// ══════════════════════════════════════════════════════════
function TabStorico({ slug, stile }) {
  const { t } = useTranslation();
  const [movimenti, setMovimenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState("");
  const [filtroAsin, setFiltroAsin] = useState("");
  const [gruppiAperti, setGruppiAperti] = useState(new Set());

  const carica = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: 500 });
      if (filtroTipo) params.set("tipo", filtroTipo);
      if (filtroAsin) params.set("asin", filtroAsin);
      const res = await fetch(`/api/v2/moduli/${slug}/movimenti?${params}`);
      const json = await res.json();
      setMovimenti(Array.isArray(json) ? json : []);
    } catch { toast.error(t("gestioneModuloCustom.errore_caricamento_storico")); }
    finally { setLoading(false); }
  }, [filtroTipo, filtroAsin]);

  useEffect(() => { carica(); }, [carica]);

  function toggleGruppo(key) {
    setGruppiAperti(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Raggruppa i movimenti: stessa "fonte" (ordine/DDT) → un solo gruppo
  // Ogni gruppo = { key, tipo, riferimento_id, data_min, righe[], totale }
  // I movimenti senza riferimento (es. RETTIFICA) restano come gruppi singoli.
  const gruppi = [];
  const indexMap = new Map();
  for (const m of movimenti) {
    let key;
    if (m.riferimento_tipo && m.riferimento_id != null) {
      key = `${m.riferimento_tipo}:${m.riferimento_id}`;
    } else {
      key = `mov:${m.id}`; // standalone (RETTIFICA o senza ref)
    }
    if (!indexMap.has(key)) {
      const g = {
        key,
        tipo: m.tipo,
        riferimento_tipo: m.riferimento_tipo,
        riferimento_id: m.riferimento_id,
        data_min: m.created_at,
        data_max: m.created_at,
        righe: [],
        totale: 0,
      };
      indexMap.set(key, g);
      gruppi.push(g);
    }
    const g = indexMap.get(key);
    g.righe.push(m);
    g.totale += m.quantita;
    if (new Date(m.created_at) < new Date(g.data_min)) g.data_min = m.created_at;
    if (new Date(m.created_at) > new Date(g.data_max)) g.data_max = m.created_at;
  }

  // Ordina i gruppi per data più recente in cima
  gruppi.sort((a, b) => new Date(b.data_max) - new Date(a.data_max));

  return (
    <div>
      {/* Filtri */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <select
          value={filtroTipo}
          onChange={e => setFiltroTipo(e.target.value)}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500"
        >
          <option value="">{t("gestioneModuloCustom.tutti_i_tipi")}</option>
          <option value="CARICO_ORDINE">{t("gestioneModuloCustom.tipo_carico_ordine")}</option>
          <option value="SCARICO_DDT">{t("gestioneModuloCustom.tipo_scarico_ddt")}</option>
          <option value="RETTIFICA">{t("gestioneModuloCustom.tipo_rettifica")}</option>
        </select>
        <input
          value={filtroAsin}
          onChange={e => setFiltroAsin(e.target.value)}
          placeholder={t("gestioneModuloCustom.placeholder_filtra_asin")}
          className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
        />
        <button onClick={carica} className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </button>
        <span className="text-xs text-slate-500 self-center">{t("gestioneModuloCustom.eventi_movimenti_totali", { eventi: gruppi.length, movimenti: movimenti.length })}</span>
      </div>

      {loading ? (
        <div className="text-center py-16 text-slate-500">{t("gestioneModuloCustom.caricamento")}</div>
      ) : gruppi.length === 0 ? (
        <div className="text-center py-16 text-slate-500">{t("gestioneModuloCustom.nessun_movimento_trovato")}</div>
      ) : (
        <div className="space-y-2">
          {gruppi.map(g => {
            const tipoColor = TIPO_MOV_COLOR[g.tipo] ?? "text-slate-400";
            const tipoLabel = TIPO_MOV_LABEL_KEY[g.tipo] ? t(`gestioneModuloCustom.${TIPO_MOV_LABEL_KEY[g.tipo]}`) : g.tipo;
            const aperto = gruppiAperti.has(g.key);
            const standalone = g.righe.length === 1 && !g.riferimento_id;
            const segno = g.totale > 0 ? "+" : "";

            // Etichetta gruppo
            let etichetta;
            if (g.riferimento_tipo === "ordine") etichetta = t("gestioneModuloCustom.ordine_n", { n: String(g.riferimento_id).padStart(4, "0") });
            else if (g.riferimento_tipo === "ddt") etichetta = t("gestioneModuloCustom.ddt_n", { n: g.riferimento_id });
            else etichetta = tipoLabel;

            return (
              <div key={g.key} className="bg-slate-800 border border-slate-700/50 rounded-xl overflow-hidden">
                <button
                  onClick={() => !standalone && toggleGruppo(g.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left ${standalone ? "" : "hover:bg-slate-750 cursor-pointer"}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center flex-shrink-0">
                    {g.tipo === "CARICO_ORDINE" && <Truck className="w-4 h-4 text-green-400" />}
                    {g.tipo === "SCARICO_DDT"   && <Package className="w-4 h-4 text-red-400" />}
                    {g.tipo === "RETTIFICA"     && <Edit3 className="w-4 h-4 text-amber-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-bold ${tipoColor}`}>{etichetta}</span>
                      <span className="text-xs text-slate-500">· {tipoLabel}</span>
                      {!standalone && (
                        <span className="text-xs text-slate-500">{t("gestioneModuloCustom.n_prodotti", { n: g.righe.length })}</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">
                      {standalone && g.righe[0]?.nome && <span className="mr-2 text-slate-400">{g.righe[0].nome}</span>}
                      {standalone && g.righe[0]?.note && <span className="mr-2">{g.righe[0].note}</span>}
                      {fmt(g.data_max)}
                      {g.righe[0]?.operatore && <span className="ml-1">· {g.righe[0].operatore}</span>}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className={`text-lg font-bold ${g.totale > 0 ? "text-green-400" : g.totale < 0 ? "text-red-400" : "text-slate-400"}`}>
                      {segno}{g.totale}
                    </div>
                    <div className="text-xs text-slate-600">{standalone ? "" : t("gestioneModuloCustom.totale")}</div>
                  </div>
                  {!standalone && (
                    aperto ? <ChevronUp className="w-4 h-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
                  )}
                </button>

                {/* Dettaglio righe (se gruppo aperto) */}
                {aperto && !standalone && (
                  <div className="px-4 pb-3 border-t border-slate-700/50 space-y-1.5 pt-3">
                    {g.righe
                      .slice()
                      .sort((a, b) => (a.codice_colore ?? "").localeCompare(b.codice_colore ?? ""))
                      .map(m => (
                      <div key={m.id} className="flex items-center gap-3 bg-slate-900 rounded-lg px-3 py-2">
                        {/* Immagine con numero colore */}
                        <div className="relative w-10 h-10 rounded-lg overflow-hidden bg-slate-800 flex-shrink-0 flex items-center justify-center">
                          {m.image_url ? (
                            <img src={m.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-4 h-4 text-slate-600" />
                          )}
                          <CodiceOverlay codice={m.codice_colore} stile={stile} size="xs" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <CodiceLabel codice={m.codice_colore} stile={stile} />
                            <span className="text-xs text-slate-300 truncate">{m.nome ?? m.asin}</span>
                          </div>
                          <div className="text-[10px] text-slate-600">{m.asin}</div>
                        </div>
                        <div className={`text-sm font-bold flex-shrink-0 ${m.quantita > 0 ? "text-green-400" : "text-red-400"}`}>
                          {m.quantita > 0 ? "+" : ""}{m.quantita}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════
// PAGINA PRINCIPALE
// ══════════════════════════════════════════════════════════
const TAB_DEFS = [
  { id: "inventario", labelKey: "tab_inventario",        icon: Package },
  { id: "ordini",     labelKey: "tab_ordini_fornitore",  icon: ShoppingCart },
  { id: "storico",    labelKey: "tab_storico_movimenti", icon: History },
];

export default function GestioneModuloCustom() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { slug } = useParams();
  const [tab, setTab] = useState("inventario");
  const [modulo, setModulo] = useState(null);
  const [loadingModulo, setLoadingModulo] = useState(true);

  // Picker emoji
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [editIcona, setEditIcona] = useState("");
  const [savingIcona, setSavingIcona] = useState(false);

  // Modale impostazioni completa (nome + delete)
  const [showSettings, setShowSettings] = useState(false);
  const [editLabel, setEditLabel] = useState("");
  const [savingSettings, setSavingSettings] = useState(false);
  const [confermaDelete, setConfermaDelete] = useState("");
  const [deleting, setDeleting] = useState(false);
  // Modale eliminazione diretta
  const [showDelete, setShowDelete] = useState(false);

  function caricaModulo() {
    setLoadingModulo(true);
    fetch(`/api/v2/moduli/${slug}`)
      .then(r => r.ok ? r.json() : Promise.reject(r))
      .then(setModulo)
      .catch(() => setModulo(null))
      .finally(() => setLoadingModulo(false));
  }

  useEffect(() => { caricaModulo(); /* eslint-disable-next-line */ }, [slug]);

  function apriSettings() {
    setEditLabel(modulo.label);
    setConfermaDelete("");
    setShowSettings(true);
  }

  function apriEmojiPicker() {
    setEditIcona(modulo.icona ?? "📦");
    setShowEmojiPicker(true);
  }

  async function salvaIcona(nuovaIcona) {
    if (savingIcona) return;
    setSavingIcona(true);
    try {
      const res = await fetch(`/api/v2/moduli/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icona: nuovaIcona || "📦" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("gestioneModuloCustom.emoji_aggiornata"));
      setShowEmojiPicker(false);
      caricaModulo();
    } catch (e) { toast.error(t("gestioneModuloCustom.errore_generico", { msg: e.message })); }
    finally { setSavingIcona(false); }
  }

  async function salvaSettings() {
    if (!editLabel.trim()) { toast.error(t("gestioneModuloCustom.nome_non_vuoto")); return; }
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/v2/moduli/${slug}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: editLabel.trim() }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("gestioneModuloCustom.nome_aggiornato"));
      setShowSettings(false);
      caricaModulo();
    } catch (e) { toast.error(t("gestioneModuloCustom.errore_generico", { msg: e.message })); }
    finally { setSavingSettings(false); }
  }

  async function eliminaModulo() {
    if (confermaDelete !== "DELETE" || deleting) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/v2/moduli/${slug}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conferma: "DELETE" }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(t("gestioneModuloCustom.modulo_eliminato"));
      navigate("/uffici/inventario");
    } catch (e) { toast.error(t("gestioneModuloCustom.errore_eliminazione_modulo", { msg: e.message })); setDeleting(false); }
  }

  if (loadingModulo) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-500 flex items-center justify-center">{t("gestioneModuloCustom.caricamento_modulo")}</div>
    );
  }
  if (!modulo) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">{t("gestioneModuloCustom.modulo_non_trovato", { slug })}</p>
        <button onClick={() => navigate("/uffici/inventario")} className="px-4 py-2 bg-slate-800 rounded-lg hover:bg-slate-700">{t("gestioneModuloCustom.torna_inventario")}</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-4">
          <button
            onClick={() => navigate("/uffici/inventario")}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {/* Emoji cliccabile per cambiarla rapidamente */}
          <button
            onClick={apriEmojiPicker}
            className="text-3xl p-2 rounded-xl bg-slate-800 hover:bg-slate-700 border-2 border-transparent hover:border-purple-500 transition-all"
            title={t("gestioneModuloCustom.title_cambia_emoji")}
          >
            {modulo.icona ?? "📦"}
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{modulo.label}</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("gestioneModuloCustom.modulo_personalizzato", { stile: modulo.stile_codice === "numerico" ? t("gestioneModuloCustom.stile_numerico") : t("gestioneModuloCustom.stile_testuale") })}
            </p>
          </div>
          <button
            onClick={apriSettings}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-sm transition-colors"
            title={t("gestioneModuloCustom.title_impostazioni_modulo")}
          >
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">{t("gestioneModuloCustom.impostazioni")}</span>
          </button>
          <button
            onClick={() => { setConfermaDelete(""); setShowDelete(true); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-900/40 hover:bg-red-900/70 border border-red-800/50 text-red-300 hover:text-red-200 text-sm transition-colors"
            title={t("gestioneModuloCustom.title_elimina_modulo")}
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">{t("gestioneModuloCustom.elimina")}</span>
          </button>
        </div>
      </div>

      {/* MODALE ELIMINAZIONE DIRETTA */}
      {showDelete && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border-2 border-red-700/60 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-red-900/40">
                <AlertTriangle className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-white">{t("gestioneModuloCustom.elimina_modulo_titolo", { nome: modulo.label })}</h3>
            </div>
            <p className="text-sm text-slate-300 mb-2">{t("gestioneModuloCustom.stai_per_eliminare_modulo")}</p>
            <ul className="text-sm text-slate-400 mb-4 space-y-1 pl-4">
              <li>• {t("gestioneModuloCustom.del_lista_catalogo")}</li>
              <li>• {t("gestioneModuloCustom.del_lista_ordini")}</li>
              <li>• {t("gestioneModuloCustom.del_lista_storico")}</li>
              <li>• {t("gestioneModuloCustom.del_lista_immagini")}</li>
            </ul>
            <div className="bg-red-950/30 border border-red-900/40 rounded-lg p-3 mb-4">
              <p className="text-xs text-red-300 font-medium">
                {t("gestioneModuloCustom.operazione_irreversibile_corta_pre")}<span className="underline">{t("gestioneModuloCustom.irreversibile")}</span>{t("gestioneModuloCustom.operazione_irreversibile_corta_post")}
              </p>
            </div>
            <label className="text-xs text-slate-400 block mb-1">
              {t("gestioneModuloCustom.per_confermare_scrivi_pre")}<span className="font-mono font-bold text-red-300">DELETE</span>{t("gestioneModuloCustom.per_confermare_scrivi_post")}
            </label>
            <input
              autoFocus
              value={confermaDelete}
              onChange={(e) => setConfermaDelete(e.target.value)}
              placeholder="DELETE"
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono mb-4 focus:outline-none focus:border-red-500"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setShowDelete(false); setConfermaDelete(""); }}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm font-medium"
              >
                {t("gestioneModuloCustom.annulla")}
              </button>
              <button
                onClick={eliminaModulo}
                disabled={confermaDelete !== "DELETE" || deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-700 hover:bg-red-600 disabled:bg-red-950 disabled:cursor-not-allowed disabled:text-slate-500 text-white text-sm font-bold transition-colors flex items-center justify-center gap-2"
              >
                {deleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t("gestioneModuloCustom.eliminazione")}
                  </>
                ) : t("gestioneModuloCustom.elimina_definitivamente")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PICKER EMOJI rapido */}
      {showEmojiPicker && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white">{t("gestioneModuloCustom.scegli_emoji")}</h3>
              <button onClick={() => setShowEmojiPicker(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Grid emoji beauty / cosmetica */}
            <p className="text-xs text-slate-500 mb-2">{t("gestioneModuloCustom.selezione_rapida")}</p>
            <div className="grid grid-cols-8 gap-1 mb-4 bg-slate-800/40 p-2 rounded-lg">
              {["💅","✨","💎","💖","🌟","🪄","🧴","💄","👑","🎀","🌸","🦋","🌺","💋","🎨","🌈"].map(emoji => (
                <button
                  key={emoji}
                  onClick={() => salvaIcona(emoji)}
                  disabled={savingIcona}
                  className={`text-2xl p-2 rounded-lg hover:bg-slate-700 transition-colors ${modulo.icona === emoji ? "bg-purple-900/40 ring-2 ring-purple-500" : ""}`}
                >
                  {emoji}
                </button>
              ))}
            </div>

            {/* Inserimento manuale */}
            <div className="bg-slate-800/40 border border-dashed border-slate-700 rounded-lg p-3">
              <label className="text-xs text-slate-400 block mb-1.5">{t("gestioneModuloCustom.incolla_emoji_personalizzata")}</label>
              <div className="flex gap-2">
                <input
                  value={editIcona}
                  onChange={(e) => setEditIcona(e.target.value)}
                  placeholder={t("gestioneModuloCustom.placeholder_incolla_qui")}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-2xl text-center text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={() => salvaIcona(editIcona)}
                  disabled={savingIcona || !editIcona}
                  className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium"
                >
                  {t("gestioneModuloCustom.usa")}
                </button>
              </div>
              <div className="mt-2 text-[11px] text-slate-500 leading-relaxed">
                <div className="font-semibold text-slate-400 mb-1">{t("gestioneModuloCustom.come_digitare_emoji")}</div>
                • <span className="text-slate-300">{t("gestioneModuloCustom.windows")}</span>: <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px]">Win</kbd> + <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px]">.</kbd>{t("gestioneModuloCustom.tasto_punto")}<br />
                • <span className="text-slate-300">{t("gestioneModuloCustom.mac")}</span>: <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px]">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-slate-800 rounded text-slate-300 font-mono text-[10px]">{t("gestioneModuloCustom.spazio")}</kbd><br />
                • {t("gestioneModuloCustom.emoji_helper_post")}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODALE IMPOSTAZIONI */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">{t("gestioneModuloCustom.impostazioni_modulo_titolo")}</h3>
              <button onClick={() => setShowSettings(false)} className="text-slate-500 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-400 block mb-1">{t("gestioneModuloCustom.nome_del_modulo")}</label>
                <input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-xs text-slate-500">
                <span className="text-slate-400">{t("gestioneModuloCustom.emoji_label")}</span> {modulo.icona ?? "📦"} · <span className="italic">{t("gestioneModuloCustom.cliccala_header_cambiare")}</span>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-2 text-xs text-slate-500">
                <span className="text-slate-400">{t("gestioneModuloCustom.stile_label")}</span> {modulo.stile_codice === "numerico" ? t("gestioneModuloCustom.stile_numerico_full") : t("gestioneModuloCustom.stile_testuale_full")} · <span className="italic">{t("gestioneModuloCustom.non_modificabile_creazione")}</span>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowSettings(false)}
                disabled={savingSettings}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300 text-sm"
              >
                {t("gestioneModuloCustom.annulla")}
              </button>
              <button
                onClick={salvaSettings}
                disabled={savingSettings || !editLabel.trim()}
                className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-medium"
              >
                {savingSettings ? t("gestioneModuloCustom.salvataggio") : t("gestioneModuloCustom.salva")}
              </button>
            </div>

            {/* Sezione elimina */}
            <div className="mt-6 pt-5 border-t border-slate-800">
              <div className="bg-red-950/20 border border-red-900/40 rounded-xl p-3">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm font-bold text-red-300">{t("gestioneModuloCustom.elimina_modulo")}</div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {t("gestioneModuloCustom.elimina_modulo_desc_pre")}<span className="font-semibold">{t("gestioneModuloCustom.tutti_suoi_dati")}</span>{t("gestioneModuloCustom.elimina_modulo_desc_post")}
                    </div>
                  </div>
                </div>
                <input
                  value={confermaDelete}
                  onChange={(e) => setConfermaDelete(e.target.value)}
                  placeholder={t("gestioneModuloCustom.placeholder_scrivi_delete")}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono mb-2 focus:outline-none focus:border-red-500"
                />
                <button
                  onClick={eliminaModulo}
                  disabled={confermaDelete !== "DELETE" || deleting}
                  className="w-full py-2 rounded-lg bg-red-700 hover:bg-red-600 disabled:bg-red-950 disabled:cursor-not-allowed disabled:text-slate-500 text-white text-sm font-bold transition-colors"
                >
                  {deleting ? t("gestioneModuloCustom.eliminazione") : t("gestioneModuloCustom.elimina_modulo_definitivamente")}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-slate-900/50 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex gap-1">
            {TAB_DEFS.map(td => {
              const Icon = td.icon;
              return (
                <button
                  key={td.id}
                  onClick={() => setTab(td.id)}
                  className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                    tab === td.id
                      ? "border-pink-500 text-pink-400"
                      : "border-transparent text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t(`gestioneModuloCustom.${td.labelKey}`)}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Contenuto */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        {tab === "inventario" && <TabInventario slug={slug} stile={modulo.stile_codice} />}
        {tab === "ordini"     && <TabOrdini     slug={slug} stile={modulo.stile_codice} />}
        {tab === "storico"    && <TabStorico    slug={slug} stile={modulo.stile_codice} />}
      </div>
    </div>
  );
}
