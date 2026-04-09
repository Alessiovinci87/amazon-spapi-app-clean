import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  History,
  Search,
  X,
  Package,
  Factory,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  Save,
  Play,
  XCircle,
  FileText,
  Wrench,
  LogOut,
} from "lucide-react";
import { triggerReloadInventario } from "../utils/globalEvents";
import { fetchJSON, buildUrl } from "../utils/api";
import { normalizeState } from "../utils/statoUtils";

/* ── Helpers ─────────────────────────────────────────────── */

function getAccessoryList(formato) {
  const f = formato.toLowerCase();
  if (f === "12ml") return "Boccetta 12ml, Pennellino 12ml, Tappino 12ml, Scatoletta, Etichetta";
  if (f === "100ml") return "Boccetta 100ml, Tappino 100ml, Etichetta";
  if (f.includes("kit") && f.includes("12")) return "2x Boccetta 12ml, 2x Pennellino 12ml, 2x Tappino 12ml, 2x Scatoletta, 2x Etichetta";
  if (f.includes("kit") && f.includes("9")) return "9x Boccetta 12ml, 9x Pennellino 12ml, 9x Tappino 12ml, 9x Scatoletta, 1x Etichetta Fragranza";
  return "Accessori non definiti";
}

function PriorityBadge({ priorita }) {
  const p = (priorita || "").toLowerCase();
  const map = {
    alta: { cls: "bg-rose-500/10 border-rose-500/30 text-rose-400", label: "Alta" },
    media: { cls: "bg-amber-500/10 border-amber-500/30 text-amber-400", label: "Media" },
    bassa: { cls: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400", label: "Bassa" },
  };
  const b = map[p] || { cls: "bg-slate-500/10 border-slate-500/30 text-slate-400", label: "N/A" };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium ${b.cls}`}>{b.label}</span>;
}

function formatDate(dateString) {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch { return dateString; }
}

/* ── Stili condivisi ─────────────────────────────────────── */
const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-violet-500/60 focus:border-violet-500/60 transition-colors";

function StatTile({ icon: Icon, label, value, accent = "violet" }) {
  const m = { violet: "bg-violet-500/10 border-violet-500/40 text-violet-400", emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400", amber: "bg-amber-500/10 border-amber-500/40 text-amber-400", rose: "bg-rose-500/10 border-rose-500/40 text-rose-400" };
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

function StatButton({ icon: Icon, label, value, accent, onClick }) {
  const m = { emerald: "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:border-emerald-400/60", rose: "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:border-rose-400/60" };
  return (
    <button onClick={onClick} type="button" className={`relative bg-slate-900/60 border rounded-lg px-5 py-3 flex items-center justify-between transition-all ${m[accent]}`}>
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span className="text-2xl font-semibold text-white tabular-nums">{value}</span>
    </button>
  );
}

/* ── Card prenotazione (riusata per entrambe le colonne) ── */

function PrenotazioneCard({ p, variant, onToggle, onSalvaNota, onAggiornaStato, onConfermaProduzione, onUpdateLocal }) {
  const isAttiva = variant === "attiva";
  const accent = isAttiva ? "emerald" : "amber";
  const barCls = isAttiva ? "bg-emerald-400/60" : "bg-amber-400/60";
  const cleanName = (p.nome_prodotto || "-").replace(/\(NUOVO\)|\(VECCHIO\)/gi, "").trim();

  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${barCls}`} />
      <div className="px-5 py-4 sm:px-6 sm:py-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-white truncate mb-1.5">{cleanName}</h3>
            <PriorityBadge priorita={p.priorita} />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-2xl font-semibold text-white tabular-nums">{p.prodotti}</span>
            <button onClick={() => onToggle(p.id)} type="button" className="text-slate-500 hover:text-slate-200 transition-colors">
              {p.expanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Dettagli espansi */}
        {p.expanded && (
          <div className="space-y-3 pt-3 border-t border-slate-800">
            {/* Info grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Formato", value: p.formato },
                { label: "Litri", value: p.litriImpegnati?.toFixed(1) },
                { label: "Lotto", value: p.lotto || "-" },
                { label: "Data", value: formatDate(p.dataRichiesta) },
              ].map((item) => (
                <div key={item.label} className="bg-slate-800/40 border border-slate-700/60 rounded-md px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">{item.label}</p>
                  <p className="text-sm text-white font-medium truncate">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Accessori */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-md px-4 py-2.5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-blue-400 mb-1 flex items-center gap-1">
                <Wrench className="w-3 h-3" /> Accessori
              </p>
              <p className="text-[13px] text-blue-200">{getAccessoryList(p.formato)}</p>
            </div>

            {/* Note precedenti (solo in lavorazione) */}
            {!isAttiva && p.note && (
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-md px-4 py-2.5">
                <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-1 flex items-center gap-1">
                  <FileText className="w-3 h-3" /> Note
                </p>
                <p className="text-[13px] text-slate-300">{p.note}</p>
              </div>
            )}

            {/* Nota input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={isAttiva ? (p.note ?? "") : ""}
                defaultValue={isAttiva ? undefined : ""}
                placeholder="Aggiungi nota..."
                onChange={(e) => onUpdateLocal(p.id, isAttiva ? { note: e.target.value } : { nuovaNota: e.target.value })}
                className={inputCls}
              />
              <button onClick={() => onSalvaNota(p.id, isAttiva ? p.note : p.nuovaNota)} type="button" className="px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-400 transition-all flex-shrink-0">
                <Save className="w-4 h-4" />
              </button>
            </div>

            {/* Azioni */}
            {isAttiva ? (
              <button
                disabled={!p.id}
                onClick={() => p.id && onAggiornaStato(p.id, "in_corso")}
                type="button"
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-4 h-4" /> In Lavorazione
              </button>
            ) : (
              <>
                {/* Quantità prodotta + data + conferma */}
                <div className="bg-slate-800/40 border border-slate-700/60 rounded-md px-4 py-3">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-2">Quantità prodotta</p>
                  <div className="flex gap-2 items-stretch">
                    <input
                      type="number" min="1" max={p.prodotti} defaultValue={p.prodotti}
                      onChange={(e) => onUpdateLocal(p.id, { quantitaProdotta: Math.min(Number(e.target.value), p.prodotti) })}
                      className="w-24 bg-slate-700/60 border border-slate-600 rounded-md px-3 py-2 text-white text-lg font-semibold text-center tabular-nums focus:outline-none focus:ring-1 focus:ring-emerald-500/60"
                    />
                    <input
                      type="date" required
                      value={p.dataProduzione ?? new Date().toISOString().split("T")[0]}
                      onChange={(e) => onUpdateLocal(p.id, { dataProduzione: e.target.value })}
                      className={`flex-1 ${inputCls}`}
                    />
                    <button onClick={() => onConfermaProduzione(p)} type="button" className="px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 transition-all flex-shrink-0" title="Conferma">
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  </div>
                  {p.quantitaProdotta != null && p.quantitaProdotta < p.prodotti && (
                    <p className="text-[11px] text-amber-400 mt-2">{p.prodotti - p.quantitaProdotta} unità resteranno pendenti</p>
                  )}
                </div>

                <button onClick={() => onAggiornaStato(p.id, "annullato")} type="button" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 text-sm font-medium transition-all">
                  <XCircle className="w-4 h-4" /> Annulla
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Componente principale ───────────────────────────────── */

const GestioneProduzioneMagazzino = () => {
  const navigate = useNavigate();
  const [prenotazioni, setPrenotazioni] = useState([]);
  const [sfusoData, setSfusoData] = useState([]);
  const [filterSearchTerm, setFilterSearchTerm] = useState("");

  const fetchSfuso = async () => { try { setSfusoData(await fetchJSON("sfuso")); } catch {} };
  const fetchPrenotazioni = async () => { try { setPrenotazioni(await fetchJSON("sfuso/prenotazioni")); } catch {} };
  const ricaricaDati = async () => { await Promise.all([fetchPrenotazioni(), fetchSfuso()]); };

  useEffect(() => { fetchSfuso(); fetchPrenotazioni(); }, []);

  const registraStoricoProduzione = async (p, evento) => {
    try {
      await fetch(buildUrl("storico-produzioni-sfuso"), {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id_produzione: p.id_produzione || null, id_prenotazione: p.id || null,
          id_sfuso: p.id_sfuso || null, asin_prodotto: p.asin_prodotto || null,
          nome_prodotto: p.nome_prodotto || null, formato: p.formato || null,
          quantita: Number(p.quantita ?? p.prodotti ?? 0),
          litri_usati: Number(p.litri_usati ?? p.litriImpegnati ?? 0),
          evento: evento.toUpperCase(), note: p.note || "", operatore: "magazzino",
          data_evento: p.data_evento || null,
        }),
      });
    } catch {}
  };

  const handleAggiornaStato = async (id, nuovoStato) => {
    try {
      const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nuovoStato: normalizeState(nuovoStato), operatore: "magazzino" }),
      });
      if (!res.ok) throw new Error();
      await ricaricaDati();
    } catch { toast.error("Errore durante aggiornamento stato"); }
  };

  const handleConfermaProduzione = async (p) => {
    const qtaProdotta = p.quantitaProdotta != null ? Number(p.quantitaProdotta) : p.prodotti;
    const dataProd = p.dataProduzione || new Date().toISOString().split("T")[0];
    try {
      const resCrea = await fetch(buildUrl("produzioni-sfuso/crea-da-prenotazione"), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...p, prodotti: qtaProdotta }) });
      const dataCrea = await resCrea.json();
      const idProduzione = dataCrea?.id_produzione;
      if (!idProduzione) { toast.error("ID produzione mancante"); return; }
      const res = await fetch(buildUrl(`produzioni-sfuso/${idProduzione}/completa`), { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operatore: "magazzino" }) });
      if (!res.ok) throw new Error();
      await registraStoricoProduzione({ ...p, id_produzione: idProduzione, quantita: qtaProdotta, data_evento: dataProd }, "COMPLETATA");
      const resPatch = await fetch(`/api/v2/sfuso/prenotazione/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nuovoStato: "confermata", quantitaProdotta: qtaProdotta, operatore: "magazzino" }) });
      const dataPatch = await resPatch.json();
      if (dataPatch.parziale) toast.success(dataPatch.message);
      await ricaricaDati();
      triggerReloadInventario();
    } catch { toast.error("Errore conferma produzione"); }
  };

  const handleSalvaNota = async (id, nota) => {
    try {
      const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note: nota, operatore: "magazzino" }) });
      if (!res.ok) throw new Error();
      await fetchPrenotazioni();
    } catch {}
  };

  const updateLocal = (id, fields) => {
    setPrenotazioni((prev) => prev.map((row) => (row.id === id ? { ...row, ...fields } : row)));
  };

  const toggleExpand = (id) => {
    setPrenotazioni((prev) => prev.map((p) => (p.id === id ? { ...p, expanded: !p.expanded } : p)));
  };

  const getFiltered = (stato) => {
    const sn = normalizeState(stato);
    return prenotazioni.filter((p) => {
      if (normalizeState(p.stato) !== sn) return false;
      if (filterSearchTerm.trim()) {
        const term = filterSearchTerm.toLowerCase();
        if (!(p.nome_prodotto || "").toLowerCase().includes(term) && !(p.asin_prodotto || "").toLowerCase().includes(term)) return false;
      }
      return true;
    });
  };

  const attive = getFiltered("pending");
  const inLavorazione = getFiltered("in_corso");
  const nCompletate = prenotazioni.filter((p) => normalizeState(p.stato) === "completato").length;
  const nAnnullate = prenotazioni.filter((p) => normalizeState(p.stato) === "annullato").length;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/magazzino")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-violet-500/10 border border-violet-500/40 flex items-center justify-center flex-shrink-0">
              <Factory className="w-[18px] h-[18px] text-violet-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Gestione Produzione</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Nexus · Magazzino</span>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <button onClick={() => navigate("/magazzino/storici/sfuso")} type="button" className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-xs font-medium transition-all">
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storico</span>
            </button>
            <button onClick={() => navigate("/magazzino")} type="button" className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Magazzino
            </button>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Magazzino</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Gestione Produzione <span className="text-slate-500">— prenotazioni e lavorazioni.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Gestisci prenotazioni e produzioni ricevute dagli uffici.
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <StatTile icon={Package} label="Prenotazioni" value={attive.length} accent="emerald" />
          <StatTile icon={Clock} label="In lavorazione" value={inLavorazione.length} accent="amber" />
          <div className="contents sm:contents">
            <StatButton icon={CheckCircle} label="Completate" value={nCompletate} accent="emerald" onClick={() => navigate("/magazzino/storici/sfuso?stato=completato")} />
            <StatButton icon={XCircle} label="Annullate" value={nAnnullate} accent="rose" onClick={() => navigate("/magazzino/storici/sfuso?stato=annullato")} />
          </div>
        </div>

        {/* Search */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-violet-400/60" />
          <div className="px-6 py-4 sm:px-8">
            <div className="relative">
              <input type="text" placeholder="Cerca per nome prodotto o ASIN..." value={filterSearchTerm} onChange={(e) => setFilterSearchTerm(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              {filterSearchTerm && (
                <button onClick={() => setFilterSearchTerm("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Griglia due colonne */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Colonna Prenotazioni Attive */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
                <Package className="w-[18px] h-[18px] text-emerald-400" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Prenotazioni</div>
                <h2 className="text-base font-semibold text-white">Attive</h2>
              </div>
              <span className="ml-auto px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium tabular-nums">{attive.length}</span>
            </div>

            {attive.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-8 text-center">
                <Package className="w-7 h-7 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nessuna prenotazione attiva</p>
              </div>
            ) : (
              attive.map((p, idx) => (
                <PrenotazioneCard
                  key={p.id ?? `pren-${idx}`}
                  p={p} variant="attiva"
                  onToggle={toggleExpand}
                  onSalvaNota={handleSalvaNota}
                  onAggiornaStato={handleAggiornaStato}
                  onConfermaProduzione={handleConfermaProduzione}
                  onUpdateLocal={updateLocal}
                />
              ))
            )}
          </div>

          {/* Colonna In Lavorazione */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/40 flex items-center justify-center">
                <Clock className="w-[18px] h-[18px] text-amber-400" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500">Produzione</div>
                <h2 className="text-base font-semibold text-white">In Lavorazione</h2>
              </div>
              <span className="ml-auto px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-medium tabular-nums">{inLavorazione.length}</span>
            </div>

            {inLavorazione.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-8 text-center">
                <Clock className="w-7 h-7 text-slate-700 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Nessuna lavorazione in corso</p>
              </div>
            ) : (
              inLavorazione.map((p) => (
                <PrenotazioneCard
                  key={p.id}
                  p={p} variant="lavorazione"
                  onToggle={toggleExpand}
                  onSalvaNota={handleSalvaNota}
                  onAggiornaStato={handleAggiornaStato}
                  onConfermaProduzione={handleConfermaProduzione}
                  onUpdateLocal={updateLocal}
                />
              ))
            )}
          </div>
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>Nexus · Gestione Produzione</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default GestioneProduzioneMagazzino;
