import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "sonner";
import RettificaLottoModal from "../components/sfuso/RettificaLottoModal";
import RettificaSfusoModal from "../components/sfuso/RettificaSfusoModal";
import { creaNuovaCard } from "../utils/creaNuovaCard";
import {
  ArrowLeft,
  Droplet,
  Plus,
  Search,
  FileText,
  Edit3,
  Truck,
  Package,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BarChart3,
  X,
  History,
} from "lucide-react";

/* ── Shared UI ──────────────────────────────────────────── */

const inputCls = "w-full bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/60 focus:border-cyan-500/60 transition-colors";

function SogliaSfusoInline({ id, soglia, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(soglia || 0));

  useEffect(() => { setVal(String(soglia || 0)); }, [soglia]);

  const salva = async () => {
    const num = Math.max(0, parseFloat(val) || 0);
    try {
      const res = await fetch(`/api/v2/sfuso-inventario/${id}/soglia`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soglia_minima: num }),
      });
      if (!res.ok) throw new Error();
      onUpdate(num);
      setEditing(false);
    } catch { toast.error("Errore aggiornamento soglia"); }
  };

  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-md px-3 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Soglia alert (L)</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <input type="number" min="0" step="0.1" value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => e.key === "Enter" && salva()} className="w-16 px-1.5 py-0.5 rounded bg-slate-950 border border-slate-700 text-white text-xs text-center tabular-nums focus:outline-none focus:border-cyan-500/50" autoFocus />
          <button onClick={salva} type="button" className="text-emerald-400 hover:text-emerald-300 text-[10px] font-medium">OK</button>
          <button onClick={() => { setEditing(false); setVal(String(soglia || 0)); }} type="button" className="text-slate-500 hover:text-slate-300 text-[10px]">✕</button>
        </div>
      ) : (
        <button onClick={() => setEditing(true)} type="button" className="text-sm text-white font-medium hover:text-cyan-300 transition-colors">
          {soglia > 0 ? `${soglia} L` : "—"}
        </button>
      )}
    </div>
  );
}

function ScadenzaLottoInline({ id, dataScadenza, paoMesi, onUpdate }) {
  const [editScad, setEditScad] = useState(false);
  const [editPao, setEditPao] = useState(false);
  const [scadVal, setScadVal] = useState(dataScadenza || "");
  const [paoVal, setPaoVal] = useState(String(paoMesi || ""));

  useEffect(() => { setScadVal(dataScadenza || ""); }, [dataScadenza]);
  useEffect(() => { setPaoVal(String(paoMesi || "")); }, [paoMesi]);

  const salvaScadenza = async () => {
    try {
      const res = await fetch(`/api/v2/sfuso/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campo: "data_scadenza", nuovoValore: scadVal || null }),
      });
      if (!res.ok) throw new Error();
      onUpdate("data_scadenza", scadVal || null);
      setEditScad(false);
    } catch { toast.error("Errore aggiornamento scadenza"); }
  };

  const salvaPao = async () => {
    try {
      const res = await fetch(`/api/v2/sfuso/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campo: "pao_mesi", nuovoValore: paoVal || null }),
      });
      if (!res.ok) throw new Error();
      onUpdate("pao_mesi", paoVal ? parseInt(paoVal, 10) : null);
      setEditPao(false);
    } catch { toast.error("Errore aggiornamento PAO"); }
  };

  // Calcola stato scadenza
  let statoScad = null;
  let giorniRim = null;
  if (dataScadenza) {
    const oggi = new Date(); oggi.setHours(0,0,0,0);
    const scad = new Date(dataScadenza); scad.setHours(0,0,0,0);
    giorniRim = Math.ceil((scad - oggi) / (1000*60*60*24));
    if (giorniRim <= 0) statoScad = "scaduto";
    else if (giorniRim <= 30) statoScad = "in_scadenza";
    else statoScad = "ok";
  }

  const scadColor = statoScad === "scaduto" ? "border-red-500/40 bg-red-500/5" :
                    statoScad === "in_scadenza" ? "border-amber-500/40 bg-amber-500/5" :
                    "border-slate-700/60 bg-slate-800/40";
  const scadText = statoScad === "scaduto" ? "text-red-400" :
                   statoScad === "in_scadenza" ? "text-amber-400" : "text-white";

  return (
    <div className={`grid grid-cols-2 gap-2`}>
      <div className={`rounded-md px-3 py-2 border ${scadColor}`}>
        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Scadenza lotto</p>
        {editScad ? (
          <div className="flex items-center gap-2">
            <input type="date" value={scadVal} onChange={e => setScadVal(e.target.value)} className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white" />
            <button onClick={salvaScadenza} type="button" className="text-emerald-400 hover:text-emerald-300 text-[10px] font-medium">OK</button>
            <button onClick={() => { setEditScad(false); setScadVal(dataScadenza || ""); }} type="button" className="text-slate-500 hover:text-slate-300 text-[10px]">✕</button>
          </div>
        ) : (
          <button onClick={() => setEditScad(true)} type="button" className={`text-sm font-medium hover:text-cyan-300 transition-colors ${scadText}`}>
            {dataScadenza ? (
              <>
                {new Date(dataScadenza).toLocaleDateString("it-IT")}
                {giorniRim !== null && (
                  <span className={`ml-1.5 text-[10px] ${scadText}`}>
                    ({giorniRim <= 0 ? "SCADUTO" : `${giorniRim}gg`})
                  </span>
                )}
              </>
            ) : "—"}
          </button>
        )}
      </div>
      <div className="bg-slate-800/40 border border-slate-700/60 rounded-md px-3 py-2">
        <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">PAO (mesi)</p>
        {editPao ? (
          <div className="flex items-center gap-2">
            <input type="number" min="0" value={paoVal} onChange={e => setPaoVal(e.target.value)} className="w-16 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white" placeholder="12" />
            <button onClick={salvaPao} type="button" className="text-emerald-400 hover:text-emerald-300 text-[10px] font-medium">OK</button>
            <button onClick={() => { setEditPao(false); setPaoVal(String(paoMesi || "")); }} type="button" className="text-slate-500 hover:text-slate-300 text-[10px]">✕</button>
          </div>
        ) : (
          <button onClick={() => setEditPao(true)} type="button" className="text-sm text-white font-medium hover:text-cyan-300 transition-colors">
            {paoMesi ? `${paoMesi}M` : "—"}
          </button>
        )}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent = "cyan" }) {
  const m = {
    cyan:    "bg-cyan-500/10 border-cyan-500/40 text-cyan-400",
    blue:    "bg-blue-500/10 border-blue-500/40 text-blue-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    amber:   "bg-amber-500/10 border-amber-500/40 text-amber-400",
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

/* ── Componente principale ───────────────────────────────── */

const Sfuso = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMagazzino = location.pathname.startsWith("/magazzino");
  const [sfusi, setSfusi] = useState([]);
  const [filtro, setFiltro] = useState("tutti");
  const [ricerca, setRicerca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [showSfusoModal, setShowSfusoModal] = useState(false);
  const [sfusoModalData, setSfusoModalData] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newSfuso, setNewSfuso] = useState({ nome: "", formato: "", asin_collegati: "", litri: 5 });
  const [ordiniPerSfuso, setOrdiniPerSfuso] = useState({});
  const [ricezioneMod, setRicezioneMod] = useState(null); // { ordine, sfusoId }
  const [ricezioneForm, setRicezioneForm] = useState({ quantita: "", numero_ddt: "", data_ricezione: "", lotto: "", data_scadenza: "" });

  const ENABLE_INVENTARIO_FETCH = false;

  const toggleCardExpansion = (cardId) => {
    setExpandedCards((prev) => ({ ...prev, [cardId]: !prev[cardId] }));
  };

  const handleAggiungiSfuso = async () => {
    if (!newSfuso.nome || !newSfuso.formato) { toast.info("Nome e formato sono obbligatori"); return; }
    const payload = {
      nome_prodotto: newSfuso.nome, formato: newSfuso.formato,
      asin_collegati: newSfuso.asin_collegati ? newSfuso.asin_collegati.split(",").map((a) => a.trim()) : [],
      litri_disponibili: Number(newSfuso.litri) || 5, fornitore: "N/D",
    };
    const nuovoSfuso = await creaNuovaCard("sfuso", payload);
    if (!nuovoSfuso) return;
    setSfusi((prev) => [...prev, nuovoSfuso]);
    setShowAddModal(false);
    setNewSfuso({ nome: "", formato: "", asin_collegati: "", litri: 5 });
  };

  const handleEliminaSfuso = async (id, nome) => {
    if (!window.confirm(`Sei sicuro di voler eliminare "${nome}"?`)) return;
    try {
      const res = await fetch(`/api/v2/sfuso/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione sfuso");
      setSfusi((prev) => prev.filter((s) => s.id !== id));
      toast.info(`Sfuso "${nome}" eliminato con successo.`);
    } catch (err) { console.error("Errore DELETE sfuso:", err); toast.error("Errore durante l'eliminazione dello sfuso."); }
  };

  const fetchProdotti = async () => {
    if (!ENABLE_INVENTARIO_FETCH) return;
    try { const res = await fetch("/api/v2/inventario"); if (!res.ok) return; await res.json(); } catch {}
  };

  const fetchSfusi = async () => {
    try {
      const res = await fetch("/api/v2/sfuso");
      const data = await res.json();
      const mapped = data.map((s) => ({
        id: s.id, nome: s.nome_prodotto || s.nome, formato: s.formato,
        quantita: Number(s.litri_disponibili || 0), quantita_old: Number(s.litri_disponibili_old || 0),
        lotto: s.lotto, lotto_old: s.lotto_old, fornitore: s.fornitore || "-",
        asin_collegati: JSON.parse(s.asin_collegati || "[]"),
        // Priorità: immagine Amazon dal catalog (se disponibile tramite ASIN collegato),
        // poi immagine salvata sul record sfuso, poi placeholder.
        immagine: s.image_url_amazon || s.immagine || "/images/no_image2.png",
        soglia_minima: Number(s.soglia_minima || 0),
        data_scadenza: s.data_scadenza || null, pao_mesi: s.pao_mesi || null,
      }));
      setSfusi(mapped);
      const ordiniMap = {};
      await Promise.all(mapped.map(async (sfuso) => {
        try {
          const resOrdini = await fetch(`/api/v2/fornitori/sfuso/${sfuso.id}/ordini`);
          if (!resOrdini.ok) { ordiniMap[sfuso.id] = []; return; }
          const ordini = await resOrdini.json();
          ordiniMap[sfuso.id] = ordini.filter((o) => o.stato === "In attesa");
        } catch { ordiniMap[sfuso.id] = []; }
      }));
      setOrdiniPerSfuso(ordiniMap);
    } catch (err) { console.error("Errore fetch sfusi:", err); }
  };

  const apriRicezione = (ordine, sfusoId) => {
    setRicezioneMod({ ordine, sfusoId });
    setRicezioneForm({
      quantita: String(ordine.quantita_litri),
      numero_ddt: "",
      data_ricezione: new Date().toISOString().slice(0, 10),
      lotto: "",
      data_scadenza: "",
    });
  };

  const confermaRicezione = async () => {
    if (!ricezioneMod) return;
    const { ordine } = ricezioneMod;
    const qta = Number(ricezioneForm.quantita);
    if (!qta || qta <= 0) { toast.error("Quantita non valida"); return; }
    if (!ricezioneForm.numero_ddt.trim()) { toast.error("Inserisci il numero DDT"); return; }
    try {
      const res = await fetch(`/api/v2/fornitori/ordini/${ordine.id}/ricevi`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantita_ricevuta: qta,
          numero_ddt: ricezioneForm.numero_ddt.trim(),
          data_ricezione: ricezioneForm.data_ricezione,
          lotto: ricezioneForm.lotto || undefined,
          data_scadenza: ricezioneForm.data_scadenza || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore ricezione");
      toast.success(data.message || "Ricezione confermata");
      setRicezioneMod(null);
      await fetchSfusi();
    } catch (err) { toast.error(err.message); }
  };

  useEffect(() => { fetchSfusi(); fetchProdotti(); }, []);

  const sfusiFiltrati = sfusi.filter((item) => {
    const nomeLower = item.nome?.toLowerCase() || "";
    const formatoLower = (item.formato || "").toLowerCase().replace(/\s/g, "");
    const filtroLower = (filtro || "").toLowerCase().replace(/\s/g, "");
    const matchFormato = filtroLower === "tutti" || formatoLower === filtroLower || formatoLower.includes(filtroLower) || (filtroLower === "oli" && nomeLower.includes("olio cuticole")) || (filtroLower === "100ml" && (formatoLower.includes("100") || formatoLower.includes("100ml")));
    const ricercaLower = ricerca.toLowerCase();
    const matchRicerca = nomeLower.includes(ricercaLower) || (Array.isArray(item.asin_collegati) ? item.asin_collegati.join(",").toLowerCase().includes(ricercaLower) : false);
    return matchFormato && matchRicerca;
  });

  const calcolaProdottiDaSfuso = (litri, nome, formato) => {
    const litriNum = Number(litri);
    if (!litriNum || litriNum <= 0) return 0;
    const f = (formato || "").toLowerCase().replace(/\s/g, "");
    let mlPerPezzo = 0;
    if (f.includes("12ml")) mlPerPezzo = 12; else if (f.includes("100ml")) mlPerPezzo = 100; else return 0;
    return Math.floor((litriNum * 1000) / mlPerPezzo);
  };

  const apriRettificaSfuso = (id, nome, tipo = "new") => { setSfusoModalData({ id, nome, tipo }); setShowSfusoModal(true); };

  const handleConfermaRettificaSfuso = async ({ quantita, nota, operatore }) => {
    if (!sfusoModalData) return;
    const { id, tipo } = sfusoModalData;
    const endpoint = tipo === "old" ? `/api/v2/sfuso/${id}/rettifica-old` : `/api/v2/sfuso/${id}/rettifica`;
    const payload = tipo === "old" ? { quantita_old: quantita, note: nota, operatore } : { quantita, note: nota, operatore };
    try {
      const res = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("Errore nel salvataggio rettifica sfuso.");
      const dataRes = await res.json();
      toast.success("Rettifica sfuso completata!");
      setSfusi((prev) => prev.map((s) => {
        if (s.id !== id) return s;
        if (tipo === "old") return { ...s, quantita_old: dataRes.updated?.litri_disponibili_old ?? dataRes.updated?.litri_disponibili ?? quantita };
        return { ...s, quantita: dataRes.updated?.litri_disponibili ?? dataRes.updated?.litri_disponibili_old ?? quantita };
      }));
    } catch (err) { console.error("Errore rettifica sfuso:", err); toast.error("Errore nella rettifica sfuso."); }
    finally { setShowSfusoModal(false); setSfusoModalData(null); }
  };

  const apriRettificaLotto = (id, nome, tipo = "new") => { setModalData({ id, nome, tipo }); setShowModal(true); };

  const handleConfermaRettifica = async ({ lotto, data, operatore }) => {
    if (!modalData) return;
    const { id, tipo } = modalData;
    const endpoint = tipo === "old" ? `/api/v2/sfuso/${id}/rettifica-lotto-old` : `/api/v2/sfuso/${id}/rettifica-lotto`;
    try {
      const res = await fetch(endpoint, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nuovoLotto: lotto, dataInserimento: data, operatore }) });
      if (!res.ok) throw new Error("Errore nel salvataggio lotto.");
      const dataRes = await res.json();
      toast.success("Lotto aggiornato con successo!");
      setSfusi((prev) => prev.map((s) => s.id === id ? (tipo === "old" ? { ...s, lotto_old: dataRes.updated.lotto_old || lotto } : { ...s, lotto: dataRes.updated.lotto || lotto }) : s));
    } catch (err) { console.error("Errore rettifica lotto:", err); toast.error("Errore nella rettifica del lotto."); }
    finally { setShowModal(false); setModalData(null); }
  };

  const totaleLitri = sfusi.reduce((sum, s) => sum + (s.quantita || 0) + (s.quantita_old || 0), 0);
  const totaleProdotti = sfusi.reduce((sum, s) => sum + calcolaProdottiDaSfuso(s.quantita_old || 0, s.nome, s.formato) + calcolaProdottiDaSfuso(s.quantita || 0, s.nome, s.formato), 0);
  const ordiniInArrivo = Object.values(ordiniPerSfuso).filter((arr) => arr.length > 0).length;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate(isMagazzino ? "/magazzino" : "/dashboard")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
              <Droplet className="w-[18px] h-[18px] text-cyan-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Inventario Sfuso</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Materiale liquido e lotti</span>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
            <button onClick={() => setShowAddModal(true)} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-[12px] font-medium transition-all">
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuovo Sfuso</span>
            </button>
            <button onClick={() => navigate("/storico-sfuso-inventario")} type="button" className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-[12px] font-medium transition-all">
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storico</span>
            </button>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Magazzino</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Inventario Sfuso <span className="text-slate-500">— materiale liquido e lotti.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Gestione materiale liquido e lotti. Monitora litri disponibili, lotti e ordini in arrivo.
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* Statistiche */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatTile icon={BarChart3} label="Prodotti sfusi" value={sfusi.length} accent="cyan" />
          <StatTile icon={Droplet} label="Totale litri" value={totaleLitri.toFixed(1)} accent="blue" />
          <StatTile icon={Package} label="Prodotti totali" value={totaleProdotti} accent="emerald" />
          <StatTile icon={Truck} label="In arrivo" value={ordiniInArrivo} accent="amber" />
        </div>

        {/* Filtri e ricerca */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-md border bg-cyan-500/10 border-cyan-500/30 flex items-center justify-center flex-shrink-0">
                <Search className="w-4 h-4 text-cyan-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">Filtri</div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">Filtri e ricerca</h2>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {["10ml", "12ml", "100ml", "oli", "tutti"].map((f) => (
                <button key={f} onClick={() => setFiltro(f)} type="button" className={`px-3 py-1.5 rounded-md text-[12px] font-medium transition-all ${filtro === f ? "bg-cyan-500/20 border border-cyan-500/40 text-cyan-300" : "bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-600"}`}>
                  {f === "tutti" ? "Tutti" : f === "oli" ? "Oli Cuticole" : f}
                </button>
              ))}
            </div>

            <div className="relative">
              <input type="text" placeholder="Cerca per nome, ASIN..." value={ricerca} onChange={(e) => setRicerca(e.target.value)} className={`${inputCls} pl-9 pr-9`} />
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              {ricerca && <button onClick={() => setRicerca("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200 transition-colors"><X className="w-4 h-4" /></button>}
            </div>
          </div>
        </div>

        {/* Contatore */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-cyan-400 to-blue-400" />
          <div className="px-5 sm:px-6 py-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
              <Droplet className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">Inventario</div>
              <p className="text-sm text-slate-300">
                <span className="text-cyan-400 font-medium">{sfusiFiltrati.length}</span> prodotti sfusi visualizzati
              </p>
            </div>
          </div>
        </div>

        {/* Card sfuso */}
        {sfusiFiltrati.length === 0 ? (
          <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-700/60" />
            <div className="px-5 sm:px-6 py-12 text-center">
              <Droplet className="w-10 h-10 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">Nessun prodotto trovato</p>
              <p className="text-xs text-slate-600 mt-1">Prova a modificare i filtri o aggiungi un nuovo prodotto sfuso</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {sfusiFiltrati.map((s) => {
              const isExpanded = expandedCards[s.id];
              const ordini = ordiniPerSfuso[s.id] || [];
              const hasOrdini = ordini.length > 0;
              const totaleInArrivo = ordini.reduce((sum, o) => sum + Number(o.quantita_litri || 0), 0);
              const fornitorePrincipale = hasOrdini ? ordini[0].fornitore_nome || ordini[0].fornitore || "-" : "-";

              return (
                <div key={s.id} className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden hover:border-slate-700 transition-all">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />

                  {/* Header */}
                  <div className="px-5 py-4 cursor-pointer hover:bg-slate-800/30 transition-colors" onClick={() => toggleCardExpansion(s.id)}>
                    <div className="flex items-center gap-4">
                      <img src={s.immagine || "/images/no_image2.png"} alt={s.nome} className="w-14 h-14 rounded-md object-cover border border-slate-700 flex-shrink-0" loading="lazy" onError={(e) => { if (!e.target.dataset.error) { e.target.src = "/images/no_image.jpg"; e.target.dataset.error = "true"; } }} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">{s.nome}</h3>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded border text-[11px] font-medium bg-cyan-500/10 border-cyan-500/30 text-cyan-400">{s.formato || "N/D"}</span>
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Droplet className="w-3 h-3" /> {((s.quantita_old || 0) + (s.quantita || 0)).toFixed(1)} L
                          </span>
                          {s.soglia_minima > 0 && ((s.quantita_old || 0) + (s.quantita || 0)) < s.soglia_minima && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[10px] text-rose-400 font-medium">
                              sotto soglia ({s.soglia_minima}L)
                            </span>
                          )}
                        </div>
                      </div>
                      <button type="button" className="text-slate-500 hover:text-slate-200 transition-colors flex-shrink-0" onClick={(e) => { e.stopPropagation(); toggleCardExpansion(s.id); }}>
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Contenuto espanso */}
                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-3 border-t border-slate-800 pt-4">
                      {/* ASIN collegati */}
                      {((Array.isArray(s.asin_collegati) && s.asin_collegati.length > 0) || s.asin_collegato) && (
                        <div className="flex flex-wrap gap-1.5">
                          {Array.isArray(s.asin_collegati) && s.asin_collegati.length > 0
                            ? s.asin_collegati.map((asin, i) => <span key={i} className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-[11px] font-mono">{asin}</span>)
                            : s.asin_collegato ? <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-[11px] font-mono">{s.asin_collegato}</span> : null}
                        </div>
                      )}

                      {/* Sezione OLD / NEW */}
                      <div className="bg-slate-800/40 border border-slate-700/60 rounded-md p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* SFUSO OLD */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 pb-2 border-b border-amber-500/30">
                              <Droplet className="w-3.5 h-3.5 text-amber-400" />
                              <h4 className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Sfuso OLD</h4>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Quantita (L)</p>
                              <p className="text-lg text-white font-semibold tabular-nums">{(s.quantita_old || 0).toFixed(1)} L</p>
                            </div>
                            <button onClick={() => apriRettificaSfuso(s.id, s.nome + " (OLD)", "old")} type="button" className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[12px] font-medium transition-all">
                              <Edit3 className="w-3.5 h-3.5" /> Rettifica Quantita
                            </button>
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Lotto</p>
                              <p className="text-sm text-white font-medium">{s.lotto_old || "-"}</p>
                            </div>
                            <button onClick={() => apriRettificaLotto(s.id, s.nome + " (OLD)", "old")} type="button" className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[12px] font-medium transition-all">
                              <Edit3 className="w-3.5 h-3.5" /> Rettifica Lotto
                            </button>
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Prodotti producibili</p>
                              <p className="text-sm text-white font-semibold tabular-nums">{calcolaProdottiDaSfuso(s.quantita_old || 0, s.nome, s.formato)} pz</p>
                            </div>
                          </div>

                          {/* SFUSO NEW */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 pb-2 border-b border-emerald-500/30">
                              <Droplet className="w-3.5 h-3.5 text-emerald-400" />
                              <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Sfuso NEW</h4>
                            </div>
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Quantita (L)</p>
                              <p className="text-lg text-white font-semibold tabular-nums">{(s.quantita || 0).toFixed(1)} L</p>
                            </div>
                            <button onClick={() => apriRettificaSfuso(s.id, s.nome + " (NEW)", "new")} type="button" className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[12px] font-medium transition-all">
                              <Edit3 className="w-3.5 h-3.5" /> Rettifica Quantita
                            </button>
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Lotto</p>
                              <p className="text-sm text-white font-medium">{s.lotto || "-"}</p>
                            </div>
                            <button onClick={() => apriRettificaLotto(s.id, s.nome + " (NEW)", "new")} type="button" className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[12px] font-medium transition-all">
                              <Edit3 className="w-3.5 h-3.5" /> Rettifica Lotto
                            </button>
                            <div className="bg-slate-900/60 border border-slate-700/40 rounded-md px-3 py-2">
                              <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Prodotti producibili</p>
                              <p className="text-sm text-white font-semibold tabular-nums">{calcolaProdottiDaSfuso(s.quantita || 0, s.nome, s.formato)} pz</p>
                            </div>
                          </div>
                        </div>

                        {/* Totali */}
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <div className="bg-cyan-500/5 border border-cyan-500/20 rounded-md px-3 py-2 text-center">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-cyan-400 mb-0.5">Totale litri</p>
                            <p className="text-xl font-semibold text-white tabular-nums">{((s.quantita_old || 0) + (s.quantita || 0)).toFixed(1)} L</p>
                          </div>
                          <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-md px-3 py-2 text-center">
                            <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-400 mb-0.5">Totale prodotti</p>
                            <p className="text-xl font-semibold text-white tabular-nums">{calcolaProdottiDaSfuso(s.quantita_old || 0, s.nome, s.formato) + calcolaProdottiDaSfuso(s.quantita || 0, s.nome, s.formato)} pz</p>
                          </div>
                        </div>
                      </div>

                      {/* Info aggiuntive */}
                      <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-md px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Quantita in arrivo</p>
                          <p className="text-sm text-white font-medium">{totaleInArrivo} L</p>
                        </div>
                        <div className="bg-slate-800/40 border border-slate-700/60 rounded-md px-3 py-2">
                          <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Fornitore</p>
                          <p className="text-sm text-white font-medium">{fornitorePrincipale}</p>
                        </div>
                        <SogliaSfusoInline id={s.id} soglia={s.soglia_minima} onUpdate={(val) => setSfusi(prev => prev.map(x => x.id === s.id ? { ...x, soglia_minima: val } : x))} />
                      </div>

                      {/* Scadenza lotto */}
                      <ScadenzaLottoInline
                        id={s.id}
                        dataScadenza={s.data_scadenza}
                        paoMesi={s.pao_mesi}
                        onUpdate={(field, val) => setSfusi(prev => prev.map(x => x.id === s.id ? { ...x, [field]: val } : x))}
                      />

                      {/* Ordini in arrivo */}
                      <div className={`rounded-md px-4 py-3 ${hasOrdini ? "bg-amber-500/5 border border-amber-500/20" : "bg-slate-800/40 border border-slate-700/60"}`}>
                        <div className="flex items-start gap-3">
                          <Truck className={`w-4 h-4 flex-shrink-0 mt-0.5 ${hasOrdini ? "text-amber-400" : "text-slate-600"}`} />
                          <div className="flex-1 space-y-1">
                            {!hasOrdini ? (
                              <p className="text-sm text-slate-500">Nessun ordine in arrivo</p>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-amber-300">In arrivo: {totaleInArrivo} L</p>
                                {ordini.map((o) => {
                                  const dataPrev = o.data_consegna_prevista ? new Date(o.data_consegna_prevista).toLocaleDateString("it-IT") : null;
                                  return (
                                    <div key={o.id} className="flex items-center justify-between gap-2 py-1">
                                      <p className="text-xs text-slate-400 flex-1">
                                        {dataPrev ? `entro ${dataPrev} — ` : ""}{o.quantita_litri} L da {o.fornitore_nome || "Fornitore"}
                                      </p>
                                      <button
                                        onClick={() => apriRicezione(o, s.id)}
                                        type="button"
                                        className="flex-shrink-0 px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-[11px] font-medium transition-all"
                                      >
                                        Ricevi
                                      </button>
                                    </div>
                                  );
                                })}
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Elimina */}
                      <button onClick={() => handleEliminaSfuso(s.id, s.nome)} type="button" className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/40 hover:border-rose-400/60 text-rose-300 hover:text-rose-200 text-sm font-medium transition-all">
                        <Trash2 className="w-4 h-4" /> Elimina Sfuso
                      </button>
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
          <span>© {new Date().getFullYear()} Nexus · Inventario Sfuso</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>

      {/* === Modal Ricezione Ordine === */}
      {ricezioneMod && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-emerald-400" />
                Ricezione Merce
              </h3>
              <button onClick={() => setRicezioneMod(null)} className="text-slate-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2">
                <p className="text-xs text-slate-500">Ordine #{ricezioneMod.ordine.id}</p>
                <p className="text-sm text-white">{ricezioneMod.ordine.quantita_litri} L da {ricezioneMod.ordine.fornitore_nome || "Fornitore"}</p>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Numero DDT *</label>
                <input
                  type="text" value={ricezioneForm.numero_ddt}
                  onChange={(e) => setRicezioneForm(p => ({ ...p, numero_ddt: e.target.value }))}
                  className={inputCls} placeholder="es. DDT-2026/0042"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Data ricezione *</label>
                <input
                  type="date" value={ricezioneForm.data_ricezione}
                  onChange={(e) => setRicezioneForm(p => ({ ...p, data_ricezione: e.target.value }))}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Quantita ricevuta (L) — {ricezioneMod.ordine.quantita_litri} L ordinati</label>
                <input
                  type="number" step="0.1" min="0.1" max={ricezioneMod.ordine.quantita_litri}
                  value={ricezioneForm.quantita}
                  onChange={(e) => setRicezioneForm(p => ({ ...p, quantita: e.target.value }))}
                  className={inputCls}
                />
                {Number(ricezioneForm.quantita) > 0 && Number(ricezioneForm.quantita) < ricezioneMod.ordine.quantita_litri && (
                  <p className="text-xs text-amber-400 mt-1">Ricezione parziale: i {(ricezioneMod.ordine.quantita_litri - Number(ricezioneForm.quantita)).toFixed(1)} L rimanenti resteranno in attesa</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Lotto</label>
                  <input
                    type="text" value={ricezioneForm.lotto}
                    onChange={(e) => setRicezioneForm(p => ({ ...p, lotto: e.target.value }))}
                    className={inputCls} placeholder="opzionale"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Scadenza lotto</label>
                  <input
                    type="date" value={ricezioneForm.data_scadenza}
                    onChange={(e) => setRicezioneForm(p => ({ ...p, data_scadenza: e.target.value }))}
                    className={inputCls}
                  />
                </div>
              </div>
            </div>
            <div className="p-5 border-t border-slate-800 flex gap-3">
              <button onClick={() => setRicezioneMod(null)} className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
                Annulla
              </button>
              <button onClick={confermaRicezione} className="flex-1 py-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-sm font-medium transition-all">
                Conferma Ricezione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === Modal Aggiungi Sfuso === */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md shadow-2xl">
            <div className="border-b border-slate-800 px-6 py-4 flex items-center gap-3">
              <div className="w-8 h-8 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                <Plus className="w-4 h-4 text-emerald-400" />
              </div>
              <h2 className="text-base font-semibold text-white">Nuovo Sfuso</h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2">Nome Prodotto *</label>
                <input type="text" value={newSfuso.nome} onChange={(e) => setNewSfuso({ ...newSfuso, nome: e.target.value })} className={inputCls} placeholder="Es. Base Coat UV" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2">Formato *</label>
                <select value={newSfuso.formato} onChange={(e) => setNewSfuso({ ...newSfuso, formato: e.target.value })} className={inputCls}>
                  <option value="">Seleziona formato...</option>
                  <option value="12ml">12ml</option>
                  <option value="100ml">100ml</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2">ASIN Collegati</label>
                <input type="text" value={newSfuso.asin_collegati} onChange={(e) => setNewSfuso({ ...newSfuso, asin_collegati: e.target.value })} className={inputCls} placeholder="B0ABC123, B0DEF456" />
                <p className="text-[10px] text-slate-600 mt-1">Separati da virgola</p>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-[0.14em] text-slate-500 block mb-2">Litri Iniziali</label>
                <input type="number" value={newSfuso.litri} onChange={(e) => setNewSfuso({ ...newSfuso, litri: e.target.value })} className={inputCls} min="0" step="0.1" />
              </div>
            </div>
            <div className="border-t border-slate-800 px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setShowAddModal(false)} type="button" className="px-4 py-2 rounded-md bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-sm font-medium transition-all">Annulla</button>
              <button onClick={handleAggiungiSfuso} type="button" className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium transition-all"><Plus className="w-3.5 h-3.5" /> Salva</button>
            </div>
          </div>
        </div>
      )}

      {/* === Modals Rettifica === */}
      {showModal && modalData && (
        <RettificaLottoModal nome={modalData.nome} onConferma={handleConfermaRettifica} onAnnulla={() => { setShowModal(false); setModalData(null); }} />
      )}
      {showSfusoModal && sfusoModalData && (
        <RettificaSfusoModal nome={sfusoModalData.nome} tipo={sfusoModalData.tipo} onConferma={handleConfermaRettificaSfuso} onAnnulla={() => { setShowSfusoModal(false); setSfusoModalData(null); }} />
      )}
    </div>
  );
};

export default Sfuso;
