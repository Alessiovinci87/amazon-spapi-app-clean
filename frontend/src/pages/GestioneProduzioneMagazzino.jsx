import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  History,
  Filter,
  Search,
  X,
  Package,
  Factory,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Save,
  Play,
  XCircle,
  FileText,
  Wrench,
  BarChart3,
} from "lucide-react";
import { triggerReloadInventario } from "../utils/globalEvents";
import { fetchJSON, buildUrl } from "../utils/api";
import { normalizeState } from "../utils/statoUtils";

// ========== FUNZIONE ACCESSORI ==========
function getAccessoryList(formato) {
  const f = formato.toLowerCase();
  if (f === "12ml") return "Boccetta 12ml, Pennellino 12ml, Tappino 12ml, Scatoletta, Etichetta";
  if (f === "100ml") return "Boccetta 100ml, Tappino 100ml, Etichetta";
  if (f.includes("kit") && f.includes("12"))
    return "2× Boccetta 12ml, 2× Pennellino 12ml, 2× Tappino 12ml, 2× Scatoletta, 2× Etichetta";
  if (f.includes("kit") && f.includes("9"))
    return "9× Boccetta 12ml, 9× Pennellino 12ml, 9× Tappino 12ml, 9× Scatoletta, 1× Etichetta Fragranza";
  return "Accessori non definiti";
}

// ========== FUNZIONE PRIORITÀ ==========
function getPriorityBadge(priorita) {
  const p = (priorita || "").toLowerCase();
  const badges = {
    alta: { emoji: "🔴", color: "bg-red-600", label: "Alta" },
    media: { emoji: "🟠", color: "bg-orange-600", label: "Media" },
    bassa: { emoji: "🟢", color: "bg-green-600", label: "Bassa" }
  };
  
  const badge = badges[p] || { emoji: "⚪", color: "bg-zinc-600", label: "N/A" };
  
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 ${badge.color} text-white rounded-full text-xs font-semibold`}>
      <span>{badge.emoji}</span>
      {badge.label}
    </span>
  );
}

const GestioneProduzioneMagazzino = () => {
  const navigate = useNavigate();
  const [prenotazioni, setPrenotazioni] = useState([]);
  const [sfusoData, setSfusoData] = useState([]);
  const [filterSearchTerm, setFilterSearchTerm] = useState("");

  // ========== FETCH ==========
  const fetchSfuso = async () => {
    try {
      const data = await fetchJSON("sfuso");
      setSfusoData(data);
    } catch (err) {
      console.error("❌ Errore fetch sfuso:", err);
    }
  };

  const fetchPrenotazioni = async () => {
    try {
      const data = await fetchJSON("sfuso/prenotazioni");
      setPrenotazioni(data);
    } catch (err) {
      console.error("❌ Errore fetch prenotazioni:", err);
    }
  };

  const ricaricaDati = async () => {
    await Promise.all([fetchPrenotazioni(), fetchSfuso()]);
  };

  useEffect(() => {
    fetchSfuso();
    fetchPrenotazioni();
  }, []);

  // ========== STORICO ==========
  const registraStoricoProduzione = async (p, evento) => {
    try {
      const payload = {
        id_produzione: p.id_produzione || null,
        id_prenotazione: p.id || null,
        id_sfuso: p.id_sfuso || null,
        asin_prodotto: p.asin_prodotto || null,
        nome_prodotto: p.nome_prodotto || null,
        formato: p.formato || null,
        quantita: Number(p.quantita ?? p.prodotti ?? 0),
        litri_usati: Number(p.litri_usati ?? p.litriImpegnati ?? 0),
        evento: evento.toUpperCase(),
        note: p.note || "",
        operatore: "magazzino"
      };

      await fetch(buildUrl("storico-produzioni-sfuso"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.error("❌ Errore registraStoricoProduzione:", err);
    }
  };

  // ========== AGGIORNA STATO ==========
  const handleAggiornaStato = async (id, nuovoStato) => {
    const statoNormalizzato = normalizeState(nuovoStato);
    try {
      const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nuovoStato: statoNormalizzato,
          operatore: "magazzino"
        }),
      });
      if (!res.ok) throw new Error("Errore aggiornamento stato");
      await ricaricaDati();
    } catch (err) {
      console.error("❌ Errore aggiornamento stato:", err);
      toast.error("Errore durante aggiornamento stato");
    }
  };

  // ========== MODIFICA QUANTITÀ ==========
  const handleModificaQuantita = async (id, nuovaQuantita) => {
    try {
      const quantitaNumerica = Number(nuovaQuantita);
      if (isNaN(quantitaNumerica) || quantitaNumerica <= 0) {
        toast.info("Quantità non valida");
        return;
      }
      const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prodotti: quantitaNumerica, operatore: "magazzino" }),
      });
      if (!res.ok) throw new Error();
      await ricaricaDati();
    } catch (err) {
      console.error("❌ Errore modifica quantità:", err);
    }
  };

  // ========== CONFERMA PRODUZIONE ==========
  const handleConfermaProduzione = async (p) => {
    try {
      const resCrea = await fetch(buildUrl("produzioni-sfuso/crea-da-prenotazione"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p)
      });
      const dataCrea = await resCrea.json();
      const idProduzione = dataCrea?.id_produzione;
      if (!idProduzione) {
        toast.error("ID produzione mancante");
        return;
      }
      const res = await fetch(buildUrl(`produzioni-sfuso/${idProduzione}/completa`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ operatore: "magazzino" })
      });
      if (!res.ok) throw new Error();
      await registraStoricoProduzione({ ...p, id_produzione: idProduzione }, "COMPLETATA");
      await handleAggiornaStato(p.id, "confermata");
      await ricaricaDati();
      triggerReloadInventario();
    } catch (err) {
      console.error("❌ Errore conferma produzione:", err);
      toast.error("Errore conferma produzione");
    }
  };

  // ========== SALVA NOTA ==========
  const handleSalvaNota = async (id, nota) => {
    try {
      const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: nota, operatore: "magazzino" }),
      });
      if (!res.ok) throw new Error();
      await fetchPrenotazioni();
    } catch (err) {
      console.error("❌ Errore salvataggio nota:", err);
    }
  };

  // ========== FORMATTAZIONE DATA ==========
  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      const seconds = String(date.getSeconds()).padStart(2, '0');
      return `${day}/${month}/${year} - ${hours}:${minutes}:${seconds}`;
    } catch (err) {
      return dateString;
    }
  };

  // ========== FILTRI ==========
  const getFilteredPrenotazioni = (stato) => {
    const statoNormalizzato = normalizeState(stato);
    return prenotazioni.filter((p) => {
      if (normalizeState(p.stato) !== statoNormalizzato) return false;
      if (filterSearchTerm.trim()) {
        const term = filterSearchTerm.toLowerCase();
        const nome = (p.nome_prodotto || "").toLowerCase();
        const asin = (p.asin_prodotto || "").toLowerCase();
        if (!nome.includes(term) && !asin.includes(term)) return false;
      }
      return true;
    });
  };

  const prenotazioniInLavorazione = getFilteredPrenotazioni("in_corso");
  const prenotazioniAttive = getFilteredPrenotazioni("pending");

  const toggleExpand = (id) => {
    setPrenotazioni((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, expanded: !p.expanded } : p
      )
    );
  };

  // ========== RENDER ==========
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Factory className="w-8 h-8 text-purple-400" />
                Gestione Produzione Magazzino
              </h1>
              <p className="text-zinc-400">Gestisci prenotazioni e produzioni</p>
            </div>
            
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/storico-produzioni-sfuso")}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-colors"
              >
                <History className="w-4 h-4" />
                Storico
              </button>
              
              <button
                onClick={() => navigate("/magazzino")}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Magazzino
              </button>
            </div>
          </div>
        </div>

        {/* ========== FILTRO RICERCA ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Filter className="w-5 h-5 text-purple-400" />
            Filtra Prenotazioni
          </h2>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Cerca per nome prodotto o ASIN..."
              value={filterSearchTerm}
              onChange={(e) => setFilterSearchTerm(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white px-12 py-3 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
            />
            <Search className="w-5 h-5 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
            {filterSearchTerm && (
              <button
                onClick={() => setFilterSearchTerm("")}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          
          {filterSearchTerm && (
            <div className="mt-3 px-3 py-2 bg-purple-900/20 border border-purple-700/30 rounded-lg">
              <p className="text-sm text-purple-400">
                Filtrando per: <strong>{filterSearchTerm}</strong>
              </p>
            </div>
          )}
        </div>

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/20 border border-purple-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-purple-600 rounded-full">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{prenotazioni.length}</p>
            <p className="text-sm text-purple-200 font-medium">Totali</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-blue-600 rounded-full">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {prenotazioni.filter((p) => normalizeState(p.stato) === "pending").length}
            </p>
            <p className="text-sm text-blue-200 font-medium">Prenotazioni</p>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-yellow-600 rounded-full">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {prenotazioni.filter((p) => normalizeState(p.stato) === "in_corso").length}
            </p>
            <p className="text-sm text-yellow-200 font-medium">In Lavorazione</p>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-green-600 rounded-full">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {prenotazioni.filter((p) => normalizeState(p.stato) === "completato").length}
            </p>
            <p className="text-sm text-green-200 font-medium">Completate</p>
          </div>
        </div>

        {/* ========== GRIGLIA PRENOTAZIONI ========== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* PRENOTAZIONI ATTIVE */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Package className="w-6 h-6" />
                Prenotazioni Attive
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  {prenotazioniAttive.length}
                </span>
              </h2>
            </div>

            <div className="p-6">
              {prenotazioniAttive.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-400">Nessuna prenotazione attiva</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prenotazioniAttive.map((p, idx) => {
                    const stableKey = p.id ?? p.tempKey ?? `pren-${idx}`;
                    const hasId = Boolean(p.id);
                    
                    return (
                      <div
                        key={stableKey}
                        className="bg-zinc-800 border border-emerald-700/50 rounded-xl p-5 hover:border-emerald-600 hover:shadow-lg hover:shadow-emerald-900/20 transition-all"
                      >
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-white mb-2">
                              {(p.nome_prodotto || "-").replace(/\(NUOVO\)|\(VECCHIO\)/gi, "").trim()}
                            </h3>
                            {getPriorityBadge(p.priorita)}
                          </div>
                          
                          <button
                            onClick={() => toggleExpand(p.id)}
                            className="text-zinc-400 hover:text-white transition-colors"
                          >
                            {p.expanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                          </button>
                        </div>

                        {/* Quantità */}
                        <div className="text-center bg-zinc-900 rounded-lg py-4 mb-4">
                          <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Quantità</p>
                          <p className="text-5xl font-extrabold text-emerald-400">{p.prodotti}</p>
                        </div>

                        {/* Dettagli Espansi */}
                        {p.expanded && (
                          <div className="space-y-4 pt-4 border-t border-zinc-700">
                            {/* Grid Info */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="bg-zinc-900 rounded-lg p-3">
                                <p className="text-xs text-zinc-400 mb-1">Formato</p>
                                <p className="text-white font-semibold">{p.formato}</p>
                              </div>
                              <div className="bg-zinc-900 rounded-lg p-3">
                                <p className="text-xs text-zinc-400 mb-1">Litri</p>
                                <p className="text-emerald-400 font-semibold">{p.litriImpegnati?.toFixed(1)}</p>
                              </div>
                              <div className="bg-zinc-900 rounded-lg p-3">
                                <p className="text-xs text-zinc-400 mb-1">Lotto</p>
                                <p className="text-white font-semibold">{p.lotto || "-"}</p>
                              </div>
                              <div className="bg-zinc-900 rounded-lg p-3">
                                <p className="text-xs text-zinc-400 mb-1">Data</p>
                                <p className="text-white text-xs">{formatDate(p.dataRichiesta)}</p>
                              </div>
                            </div>

                            {/* Accessori */}
                            <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                              <p className="text-xs text-blue-400 font-semibold mb-1 flex items-center gap-1">
                                <Wrench className="w-3 h-3" />
                                Accessori:
                              </p>
                              <p className="text-sm text-blue-100">{getAccessoryList(p.formato)}</p>
                            </div>

                            {/* Note */}
                            <div className="space-y-2">
                              <label className="text-xs text-zinc-400 font-medium">Note:</label>
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  value={p.note ?? ""}
                                  placeholder="Aggiungi nota..."
                                  onChange={(e) =>
                                    setPrenotazioni((prev) =>
                                      prev.map((row) =>
                                        row.id === p.id ? { ...row, note: e.target.value } : row
                                      )
                                    )
                                  }
                                  className="flex-1 bg-zinc-900 border border-zinc-700 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                />
                                <button
                                  onClick={() => handleSalvaNota(p.id, p.note)}
                                  className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                                >
                                  <Save className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Azione */}
                            <button
                              disabled={!hasId}
                              onClick={() => hasId && handleAggiornaStato(p.id, "in_corso")}
                              className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold transition-colors ${
                                hasId
                                  ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                                  : "bg-zinc-700 cursor-not-allowed text-zinc-500"
                              }`}
                            >
                              <Play className="w-5 h-5" />
                              In Lavorazione
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* IN LAVORAZIONE */}
          <div className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-800/50 rounded-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 px-6 py-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Clock className="w-6 h-6" />
                In Lavorazione
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
                  {prenotazioniInLavorazione.length}
                </span>
              </h2>
            </div>

            <div className="p-6">
              {prenotazioniInLavorazione.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
                  <p className="text-zinc-400">Nessuna lavorazione in corso</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {prenotazioniInLavorazione.map((p) => (
                    <div
                      key={p.id}
                      className="bg-zinc-800 border border-yellow-700/50 rounded-xl p-5 hover:border-yellow-600 hover:shadow-lg hover:shadow-yellow-900/20 transition-all"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-bold text-white mb-2">
                            {(p.nome_prodotto || "-").replace(/\(NUOVO\)|\(VECCHIO\)/gi, "").trim()}
                          </h3>
                          {getPriorityBadge(p.priorita)}
                        </div>
                        
                        <button
                          onClick={() => toggleExpand(p.id)}
                          className="text-zinc-400 hover:text-white transition-colors"
                        >
                          {p.expanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
                        </button>
                      </div>

                      {/* Quantità Modificabile */}
                      <div className="bg-zinc-900 rounded-lg p-4 mb-4">
                        <p className="text-xs text-zinc-400 uppercase tracking-wide mb-2">Quantità</p>
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            defaultValue={p.prodotti}
                            min="1"
                            onChange={(e) => {
                              setPrenotazioni((prev) =>
                                prev.map((row) =>
                                  row.id === p.id ? { ...row, nuovaQuantita: e.target.value } : row
                                )
                              );
                            }}
                            className="flex-1 bg-zinc-800 border border-zinc-700 text-emerald-400 text-4xl font-bold px-4 py-3 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all text-center"
                          />
                          <button
                            onClick={() => handleModificaQuantita(p.id, p.nuovaQuantita || p.prodotti)}
                            className="flex items-center gap-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white transition-colors"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        </div>
                      </div>

                      {/* Dettagli Espansi */}
                      {p.expanded && (
                        <div className="space-y-4 pt-4 border-t border-zinc-700">
                          {/* Grid Info */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-zinc-900 rounded-lg p-3">
                              <p className="text-xs text-zinc-400 mb-1">Formato</p>
                              <p className="text-white font-semibold">{p.formato}</p>
                            </div>
                            <div className="bg-zinc-900 rounded-lg p-3">
                              <p className="text-xs text-zinc-400 mb-1">Litri</p>
                              <p className="text-emerald-400 font-semibold">{p.litriImpegnati?.toFixed(1)}</p>
                            </div>
                            <div className="bg-zinc-900 rounded-lg p-3">
                              <p className="text-xs text-zinc-400 mb-1">Lotto</p>
                              <p className="text-white font-semibold">{p.lotto || "-"}</p>
                            </div>
                            <div className="bg-zinc-900 rounded-lg p-3">
                              <p className="text-xs text-zinc-400 mb-1">Data</p>
                              <p className="text-white text-xs">{formatDate(p.dataRichiesta)}</p>
                            </div>
                          </div>

                          {/* Accessori */}
                          <div className="p-3 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                            <p className="text-xs text-blue-400 font-semibold mb-1 flex items-center gap-1">
                              <Wrench className="w-3 h-3" />
                              Accessori:
                            </p>
                            <p className="text-sm text-blue-100">{getAccessoryList(p.formato)}</p>
                          </div>

                          {/* Note Precedenti */}
                          {p.note && (
                            <div className="p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                              <p className="text-xs text-yellow-400 font-semibold mb-1 flex items-center gap-1">
                                <FileText className="w-3 h-3" />
                                Note precedenti:
                              </p>
                              <p className="text-sm text-yellow-100">{p.note}</p>
                            </div>
                          )}

                          {/* Nuova Nota */}
                          <div className="space-y-2">
                            <label className="text-xs text-zinc-400 font-medium">Aggiungi Nota:</label>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                defaultValue=""
                                placeholder="Aggiungi nota..."
                                onChange={(e) =>
                                  setPrenotazioni((prev) =>
                                    prev.map((row) =>
                                      row.id === p.id ? { ...row, nuovaNota: e.target.value } : row
                                    )
                                  )
                                }
                                className="flex-1 bg-zinc-900 border border-zinc-700 text-white px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                              />
                              <button
                                onClick={() => handleSalvaNota(p.id, p.nuovaNota)}
                                className="flex items-center gap-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white transition-colors"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Azioni */}
                          <div className="grid grid-cols-2 gap-3">
                            <button
                              onClick={() => handleConfermaProduzione(p)}
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 rounded-lg text-white font-semibold transition-colors"
                            >
                              <CheckCircle className="w-5 h-5" />
                              Conferma
                            </button>
                            <button
                              onClick={() => handleAggiornaStato(p.id, "annullato")}
                              className="flex items-center justify-center gap-2 px-4 py-3 bg-red-600 hover:bg-red-700 rounded-lg text-white font-semibold transition-colors"
                            >
                              <XCircle className="w-5 h-5" />
                              Annulla
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestioneProduzioneMagazzino;