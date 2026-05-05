import React, { useState, useEffect, useRef, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import PageTopBar from "../components/PageTopBar";
import {
  Tag,
  Edit3,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Search,
  X,
  Bell,
  Printer,
  Package,
  Plus,
  Trash2,
  Loader2,
  AlertTriangle,
} from "lucide-react";

/* ── Shared UI ──────────────────────────────────────────── */

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 focus:border-cyan-500/60 transition-colors";

function StatTile({ icon: Icon, label, value, accent = "emerald" }) {
  const m = {
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    amber:   "bg-amber-500/10 border-amber-500/40 text-amber-400",
    rose:    "bg-rose-500/10 border-rose-500/40 text-rose-400",
  };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${m[accent]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{label}</div>
    </div>
  );
}

/* ── Helpers quantita ────────────────────────────────────── */

const getQuantitaAccent = (quantita, soglia) => {
  if (quantita === 0) return { bg: "bg-rose-500/10 border-rose-500/30", text: "text-rose-400" };
  if (typeof soglia === "number" && soglia > 0 && quantita < soglia) return { bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400" };
  return { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400" };
};

const getQuantitaIcon = (quantita, soglia) => {
  if (quantita === 0) return <AlertCircle className="w-3.5 h-3.5" />;
  if (typeof soglia === "number" && soglia > 0 && quantita < soglia) return <TrendingUp className="w-3.5 h-3.5" />;
  return <CheckCircle className="w-3.5 h-3.5" />;
};

// Netto = quantita - da_stampare
//  >0  copertura ok (verde)
//  =0  esattamente coperto (slate)
//  <0  da stampare (rosso)
const getNettoAccent = (netto) => {
  if (netto < 0) return { bg: "bg-rose-500/10 border-rose-500/30", text: "text-rose-400" };
  if (netto === 0) return { bg: "bg-slate-700/40 border-slate-600/40", text: "text-slate-300" };
  return { bg: "bg-emerald-500/10 border-emerald-500/30", text: "text-emerald-400" };
};

/* ── Componente principale ───────────────────────────────── */

const Etichette = () => {
  const { t } = useTranslation();
  const [rows, setRows] = useState([]);
  const [prodottiDisponibili, setProdottiDisponibili] = useState([]); // tutti i prodotti per dropdown mapping
  const [expandedCards, setExpandedCards] = useState({});
  const [searchTerm, setSearchTerm] = useState("");
  const [stampaModal, setStampaModal] = useState(null); // { etichetta, qty } | null
  const [stampaQty, setStampaQty] = useState("");
  const [stampaBusy, setStampaBusy] = useState(false);
  const [asinPicker, setAsinPicker] = useState({}); // { [etichettaId]: searchTerm }
  const isMagazzino = localStorage.getItem("auth") === "magazzino";

  const reload = async () => {
    // Carica le due risorse in modo indipendente: se una fallisce
    // l'altra deve comunque popolare l'UI.
    try {
      const r = await fetch("/api/v2/etichette");
      const j = await r.json();
      if (r.ok && Array.isArray(j.data)) {
        setRows(j.data);
      } else {
        toast.error(j?.error || `Errore caricamento etichette (HTTP ${r.status})`);
      }
    } catch (err) {
      toast.error(`Errore di rete su /etichette: ${err?.message || err}`);
    }

    try {
      const r = await fetch("/api/v2/etichette/prodotti");
      const j = await r.json();
      if (r.ok && Array.isArray(j.data)) {
        setProdottiDisponibili(j.data);
      } else {
        // Non bloccante: senza prodotti il picker mostra solo "nessun prodotto"
        console.warn("Errore /etichette/prodotti:", r.status, j);
      }
    } catch (err) {
      console.warn("Errore di rete su /etichette/prodotti:", err);
    }
  };

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleCardExpansion = (id) => {
    setExpandedCards((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleChange = (id, field, value) => {
    setRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const handleRettifica = async (row) => {
    const nuovaQuantita = prompt(t("etichette.prompt_rettifica", { nome: row.nome, quantita: row.quantita }), row.quantita);
    if (nuovaQuantita === null) return;
    try {
      const res = await fetch(`/api/v2/etichette/${row.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantita: Number(nuovaQuantita) }),
      });
      if (!res.ok) throw new Error();
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, quantita: Number(nuovaQuantita) } : r)));
      toast.success(t("etichette.toast_quantita_ok"));
    } catch { toast.error(t("etichette.toast_quantita_err")); }
  };

  const handleSoglia = async (row, val) => {
    const soglia = parseInt(val, 10);
    if (isNaN(soglia) || soglia < 0) return;
    try {
      await fetch(`/api/v2/etichette/${row.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soglia_minima: soglia }),
      });
      setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, soglia_minima: soglia } : r)));
      toast.success(t("etichette.toast_soglia_ok", { soglia }));
    } catch { toast.error(t("etichette.toast_soglia_err")); }
  };

  // Conferma stampa: riduce il debito da_stampare di N pezzi
  const apriStampaModal = (etichetta) => {
    setStampaModal(etichetta);
    setStampaQty(String(etichetta.da_stampare || 0));
  };
  const chiudiStampaModal = () => {
    setStampaModal(null);
    setStampaQty("");
  };
  const confermaStampa = async () => {
    if (!stampaModal) return;
    const qty = parseInt(stampaQty, 10);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Inserisci una quantità valida");
      return;
    }
    setStampaBusy(true);
    try {
      const res = await fetch(`/api/v2/etichette/${stampaModal.id}/conferma-stampa`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantita: qty }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Debito ridotto di ${qty} etichette`);
      chiudiStampaModal();
      await reload();
    } catch {
      toast.error("Errore conferma stampa");
    } finally {
      setStampaBusy(false);
    }
  };

  // Mapping prodotto → etichetta
  const aggiungiProdotto = async (etichettaId, asin) => {
    try {
      const res = await fetch(`/api/v2/etichette/${etichettaId}/prodotti`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asin }),
      });
      if (!res.ok) throw new Error();
      toast.success("Prodotto associato");
      setAsinPicker((p) => ({ ...p, [etichettaId]: "" }));
      await reload();
    } catch {
      toast.error("Errore associazione prodotto");
    }
  };
  const rimuoviProdotto = async (etichettaId, asin) => {
    try {
      const res = await fetch(
        `/api/v2/etichette/${etichettaId}/prodotti/${encodeURIComponent(asin)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error();
      toast.success("Prodotto disassociato");
      await reload();
    } catch {
      toast.error("Errore disassociazione");
    }
  };

  const filteredRows = rows.filter((row) => row.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  const totalEtichette = filteredRows.reduce((acc, row) => acc + (typeof row.quantita === "number" ? row.quantita : 0), 0);
  const totaleDaStampare = filteredRows.reduce((acc, row) => acc + (row.da_stampare || 0), 0);
  const etichetteSottoSoglia = filteredRows.filter((row) =>
    typeof row.quantita === "number" && row.quantita > 0
      && row.soglia_minima > 0 && row.quantita < row.soglia_minima
  ).length;
  const etichetteEsaurite = filteredRows.filter((row) => row.quantita === 0).length;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      <PageTopBar
        icon={Tag}
        iconAccent="cyan"
        eyebrow={t("etichette.topbar_eyebrow")}
        title={t("etichette.topbar_title")}
        backTo={isMagazzino ? "/magazzino" : "/dashboard"}
      />

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("common.magazzino")}</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("etichette.hero_title_main")} <span className="text-slate-500">{t("etichette.hero_title_suffix")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("etichette.intro")}
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Statistiche */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={CheckCircle} label={t("etichette.stat_totale", "Stock totale")} value={totalEtichette.toLocaleString()} accent="emerald" />
          <StatTile icon={Printer} label="Da stampare" value={totaleDaStampare.toLocaleString()} accent="rose" />
          <StatTile icon={TrendingUp} label="Sotto soglia" value={etichetteSottoSoglia} accent="amber" />
          <StatTile icon={AlertCircle} label={t("etichette.stat_esaurite", "Esaurite")} value={etichetteEsaurite} accent="rose" />
        </div>

        {/* Ricerca */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-md border bg-cyan-500/10 border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">{t("etichette.search_eyebrow")}</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">{t("etichette.search_title")}</h2>
              </div>
            </div>
            <div className="relative">
              <input type="text" placeholder={t("etichette.ph_search")} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              {searchTerm && (
                <button onClick={() => setSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Contatore */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-400" />
          <div className="px-5 sm:px-6 py-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Tag className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">{t("etichette.inventario_eyebrow")}</div>
              <p className="text-sm text-slate-300">
                <span className="text-cyan-400 font-medium">{filteredRows.length}</span> {filteredRows.length === 1 ? t("etichette.tipologia_singolare") : t("etichette.tipologia_plurale")}
              </p>
            </div>
          </div>
        </div>

        {/* Card etichette */}
        {filteredRows.length === 0 ? (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700/60" />
            <div className="px-5 sm:px-6 py-12 text-center">
              <Tag className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">{t("etichette.empty_text")}</p>
              {searchTerm && <p className="text-xs text-slate-600 mt-1">{t("etichette.empty_hint")}</p>}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {filteredRows.map((row) => {
              const isExpanded = expandedCards[row.id];
              const qAccent = getQuantitaAccent(row.quantita, row.soglia_minima);
              const daStampare = row.da_stampare || 0;
              const netto = (typeof row.netto === "number" ? row.netto : (row.quantita || 0) - daStampare);
              const nettoAccent = getNettoAccent(netto);
              const prodottiCollegati = Array.isArray(row.prodotti) ? row.prodotti : [];

              return (
                <div key={row.id} className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-all">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />

                  {/* Header */}
                  <div className="px-5 py-4 cursor-pointer hover:bg-slate-800/30 transition-colors" onClick={() => toggleCardExpansion(row.id)}>
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                        <Tag className="w-5 h-5 text-cyan-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate capitalize">{row.nome}</h3>
                        <div className="mt-1.5 flex flex-wrap gap-1.5 items-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${qAccent.bg} ${qAccent.text}`}
                                title="Stock fisico in giacenza">
                            {getQuantitaIcon(row.quantita, row.soglia_minima)}
                            {row.quantita.toLocaleString()} stock
                          </span>
                          {daStampare > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-rose-500/30 bg-rose-500/10 text-rose-400 text-[11px] font-medium"
                                  title="Etichette richieste da produzioni in lavorazione">
                              <Printer className="w-3 h-3" />
                              -{daStampare.toLocaleString()} pendenti
                            </span>
                          )}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-medium ${nettoAccent.bg} ${nettoAccent.text}`}
                                title="Stock netto = stock - pendenti">
                            netto: {netto > 0 ? "+" : ""}{netto.toLocaleString()}
                          </span>
                          {prodottiCollegati.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-slate-700 bg-slate-800/40 text-slate-400 text-[10px] font-medium"
                                  title="Prodotti collegati a questa etichetta">
                              <Package className="w-3 h-3" />
                              {prodottiCollegati.length}
                            </span>
                          )}
                        </div>
                      </div>
                      <button type="button" className="text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleCardExpansion(row.id); }}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Contenuto espanso */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-3 border-t border-slate-800 pt-4">
                      {/* Quantita + Rettifica */}
                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-md px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-400 mb-2">{t("etichette.lbl_quantita")}</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={row.quantita}
                            onChange={(e) => handleChange(row.id, "quantita", e.target.value)}
                            className="flex-1 bg-slate-700/60 border border-slate-600 rounded-md px-3 py-2 text-white text-lg font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-cyan-500/60"
                          />
                          <button onClick={() => handleRettifica(row)} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-[12px] font-medium transition-all">
                            <Edit3 className="w-3.5 h-3.5" /> {t("etichette.btn_rettifica")}
                          </button>
                        </div>
                      </div>

                      {/* Soglia alert */}
                      <div className="bg-amber-500/5 border border-amber-500/20 rounded-md px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-amber-400 mb-2 flex items-center gap-1">
                          <Bell className="w-3 h-3" /> {t("etichette.lbl_soglia_alert")}
                        </p>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            min="0"
                            value={row.soglia_minima || 0}
                            onChange={(e) => handleChange(row.id, "soglia_minima", e.target.value)}
                            onBlur={(e) => handleSoglia(row, e.target.value)}
                            className="w-32 bg-slate-700/60 border border-slate-600 rounded-md px-3 py-2 text-white text-sm font-semibold tabular-nums focus:outline-none focus:ring-1 focus:ring-amber-500/60"
                          />
                          <span className="text-xs text-slate-500">
                            {row.soglia_minima > 0
                              ? row.quantita < row.soglia_minima
                                ? t("etichette.soglia_sotto", { q: row.quantita, s: row.soglia_minima })
                                : t("etichette.soglia_sopra")
                              : t("etichette.soglia_imposta")}
                          </span>
                        </div>
                      </div>

                      {/* Da stampare + conferma */}
                      {daStampare > 0 && (
                        <div className="bg-rose-500/5 border border-rose-500/30 rounded-md px-4 py-3">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-rose-400 mb-2 flex items-center gap-1">
                            <Printer className="w-3 h-3" /> Etichette pendenti dalla produzione
                          </p>
                          <div className="flex items-center justify-between gap-3 flex-wrap">
                            <div>
                              <div className="text-2xl font-semibold text-rose-300 tabular-nums">
                                {daStampare.toLocaleString()}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5">
                                richieste da produzioni in lavorazione
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => apriStampaModal(row)}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 text-[12px] font-medium transition-all"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              Conferma stampa
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Alert stock */}
                      {row.quantita === 0 && (
                        <div className="bg-rose-500/5 border border-rose-500/30 rounded-md p-3 flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          <p className="text-rose-300 text-xs font-medium">{t("etichette.alert_esaurite")}</p>
                        </div>
                      )}
                      {typeof row.quantita === "number" && row.quantita > 0 && row.soglia_minima > 0 && row.quantita < row.soglia_minima && (
                        <div className="bg-amber-500/5 border border-amber-500/30 rounded-md p-3 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <p className="text-amber-300 text-xs font-medium">
                            Stock sotto la soglia minima ({row.soglia_minima.toLocaleString()})
                          </p>
                        </div>
                      )}

                      {/* Prodotti collegati */}
                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-md px-4 py-3">
                        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-400 mb-2 flex items-center gap-1">
                          <Package className="w-3 h-3" /> Prodotti collegati
                          <span className="text-slate-500 ml-auto">{prodottiCollegati.length}</span>
                        </p>
                        {prodottiCollegati.length > 0 ? (
                          <div className="space-y-1 mb-3">
                            {prodottiCollegati.map((p) => (
                              <div key={p.asin} className="flex items-center gap-2 text-xs bg-slate-900/40 border border-slate-800 rounded px-2 py-1.5">
                                <span className="font-mono text-slate-400">{p.asin}</span>
                                <span className="text-slate-300 truncate flex-1">{p.nome}</span>
                                {p.formato && (
                                  <span className="text-[10px] uppercase tracking-wider text-slate-500">{p.formato}</span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => rimuoviProdotto(row.id, p.asin)}
                                  title="Rimuovi associazione"
                                  className="text-slate-600 hover:text-rose-400 transition-colors"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-500 italic mb-3">
                            Nessun prodotto associato — il debito non verrà generato dalle produzioni
                          </p>
                        )}

                        {/* Aggiungi prodotto */}
                        <AddProdottoPicker
                          rowId={row.id}
                          searchTerm={asinPicker[row.id] || ""}
                          onSearch={(v) => setAsinPicker((p) => ({ ...p, [row.id]: v }))}
                          prodottiDisponibili={prodottiDisponibili.filter(
                            (p) => p.etichetta_id == null || p.etichetta_id === row.id
                          )}
                          alreadyLinkedAsin={prodottiCollegati.map((p) => p.asin)}
                          onPick={(asin) => aggiungiProdotto(row.id, asin)}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} {t("etichette.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>

      {/* === Modal Conferma Stampa === */}
      {stampaModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={chiudiStampaModal} />
          <div className="relative w-full max-w-md bg-slate-950 border border-slate-800 rounded-lg shadow-2xl overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-rose-400/60" />
            <div className="px-6 py-5 border-b border-slate-800 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-md bg-rose-500/10 border border-rose-500/40 flex items-center justify-center flex-shrink-0">
                  <Printer className="w-5 h-5 text-rose-400" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-white truncate">Conferma stampa etichette</h3>
                  <p className="text-xs text-slate-500 mt-0.5 truncate">{stampaModal.nome}</p>
                </div>
              </div>
              <button onClick={chiudiStampaModal} className="text-slate-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="px-2 py-2 rounded-md bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Stock</div>
                  <div className="text-lg font-semibold text-emerald-300 tabular-nums">{stampaModal.quantita?.toLocaleString() ?? 0}</div>
                </div>
                <div className="px-2 py-2 rounded-md bg-rose-500/5 border border-rose-500/30">
                  <div className="text-[10px] uppercase tracking-wider text-rose-400">Pendenti</div>
                  <div className="text-lg font-semibold text-rose-300 tabular-nums">{(stampaModal.da_stampare || 0).toLocaleString()}</div>
                </div>
                <div className="px-2 py-2 rounded-md bg-slate-900/60 border border-slate-800">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Netto</div>
                  <div className={`text-lg font-semibold tabular-nums ${
                    ((stampaModal.quantita || 0) - (stampaModal.da_stampare || 0)) < 0 ? "text-rose-300" : "text-emerald-300"
                  }`}>
                    {((stampaModal.quantita || 0) - (stampaModal.da_stampare || 0)).toLocaleString()}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-slate-400 mb-2">
                  Quantità etichette stampate
                </label>
                <input
                  type="number"
                  min="1"
                  autoFocus
                  value={stampaQty}
                  onChange={(e) => setStampaQty(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") confermaStampa(); }}
                  className={inputCls}
                />
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed flex items-start gap-1">
                  <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0 text-amber-400" />
                  La conferma riduce solo il debito di {stampaQty || "N"} unità. Lo stock fisico ({(stampaModal.quantita || 0).toLocaleString()}) NON viene modificato — usalo per inserire eventuali avanzi manualmente.
                </p>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/30 flex items-center justify-end gap-2">
              <button
                onClick={chiudiStampaModal}
                disabled={stampaBusy}
                className="px-4 py-2 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white text-sm transition-colors disabled:opacity-50"
              >
                Annulla
              </button>
              <button
                onClick={confermaStampa}
                disabled={stampaBusy || !stampaQty}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 text-sm font-medium transition-all disabled:opacity-50"
              >
                {stampaBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                Conferma stampa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* === Picker per aggiungere prodotti all'etichetta ===
   Il dropdown è renderizzato via Portal con position: fixed così esce
   dal container della card (che ha overflow-hidden per l'accent bar). */
function AddProdottoPicker({ rowId, searchTerm, onSearch, prodottiDisponibili, alreadyLinkedAsin, onPick }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const dropRef = useRef(null);
  const [coords, setCoords] = useState({ left: 0, top: 0, width: 0 });

  const recomputeCoords = () => {
    if (!wrapRef.current) return;
    const r = wrapRef.current.getBoundingClientRect();
    setCoords({ left: r.left, top: r.bottom + 4, width: r.width });
  };

  useLayoutEffect(() => {
    if (!open) return;
    recomputeCoords();
    const onScrollOrResize = () => recomputeCoords();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [open]);

  // Chiudi cliccando fuori
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (
        wrapRef.current && !wrapRef.current.contains(e.target) &&
        dropRef.current && !dropRef.current.contains(e.target)
      ) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const filtered = (prodottiDisponibili || [])
    .filter((p) => !alreadyLinkedAsin.includes(p.asin))
    .filter((p) => {
      const q = (searchTerm || "").toLowerCase();
      if (!q) return true;
      return (
        (p.asin || "").toLowerCase().includes(q) ||
        (p.nome || "").toLowerCase().includes(q)
      );
    })
    .slice(0, 50);

  return (
    <div ref={wrapRef} className="relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            placeholder="Cerca prodotto per ASIN o nome…"
            onChange={(e) => { onSearch(e.target.value); setOpen(true); }}
            onFocus={() => setOpen(true)}
            className="w-full pl-9 pr-3 py-2 bg-slate-900/60 border border-slate-700 rounded-md text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 focus:border-cyan-500/50"
          />
        </div>
        <button
          type="button"
          onClick={() => { setOpen((v) => !v); inputRef.current?.focus(); }}
          title={open ? "Nascondi elenco" : "Mostra elenco prodotti"}
          className="px-2.5 py-2 rounded-md border border-slate-700 bg-slate-900/60 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {open && createPortal(
        <div
          ref={dropRef}
          style={{ left: coords.left, top: coords.top, width: coords.width }}
          className="fixed z-[60] bg-slate-950 border border-slate-700 rounded-md shadow-2xl max-h-72 overflow-y-auto"
        >
          {filtered.length === 0 ? (
            <div className="px-3 py-3 text-sm text-slate-500 italic">
              {searchTerm ? "Nessun prodotto trovato" : "Inizia a digitare ASIN o nome…"}
            </div>
          ) : (
            filtered.map((p) => (
              <button
                key={p.asin}
                type="button"
                onClick={() => { onPick(p.asin); setOpen(false); }}
                className="w-full px-3 py-2.5 flex items-center gap-3 text-sm hover:bg-slate-800 text-left border-b border-slate-800/60 last:border-b-0"
              >
                <span className="font-mono text-[12px] text-cyan-400 flex-shrink-0">{p.asin}</span>
                <span className="text-slate-200 truncate flex-1">{p.nome || "(senza nome)"}</span>
                {p.formato && (
                  <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-400 flex-shrink-0">
                    {p.formato}
                  </span>
                )}
              </button>
            ))
          )}
          {filtered.length === 50 && (
            <div className="px-3 py-2 text-[11px] text-slate-600 italic border-t border-slate-800 bg-slate-900/40">
              Mostrati primi 50 risultati — affina la ricerca
            </div>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}

export default Etichette;
