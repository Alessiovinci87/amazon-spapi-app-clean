import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import SpedizioneCard from "../components/spedizioni/SpedizioneCard";
import ExportCSVButton from "../components/ui/ExportCSVButton";
import { cleanText } from "../utils/gestioneSpedizioni";

import {
  ArrowLeft,
  Truck,
  FileText,
  Package,
  CheckCircle,
  BarChart3,
  Clock,
  Search,
  X,
  Filter,
} from "lucide-react";

const GestioneSpedizioniMagazzino = () => {
  const navigate = useNavigate();
  const [spedizioni, setSpedizioni] = useState([]);
  const [filterSearchTerm, setFilterSearchTerm] = useState("");
  const [filterStato, setFilterStato] = useState("TUTTI");

  // ========== FETCH SPEDIZIONI ==========
  useEffect(() => {
    const fetchSpedizioni = async () => {
      try {
        const res = await fetch("/api/v2/spedizioni");
        const data = await res.json();
        setSpedizioni(data);
      } catch (err) {
        console.error("Errore fetch spedizioni:", err);
      }
    };
    fetchSpedizioni();
  }, []);

  // ========== FUNZIONI GESTIONE ==========
  const aggiornaSpedizione = async (id, dati) => {
    try {
      const res = await fetch(`/api/v2/spedizioni/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dati),
      });
      const aggiornata = await res.json();
      setSpedizioni((prev) =>
        prev.map((s) => (s.id === id ? aggiornata : s))
      );
    } catch (err) {
      console.error("Errore aggiornamento spedizione:", err);
    }
  };

  const confermaSpedizione = async (id) => {
    try {
      const res = await fetch(`/api/v2/spedizioni/${id}/conferma`, {
        method: "PATCH",
      });
      const aggiornata = await res.json();
      setSpedizioni((prev) =>
        prev.map((s) => (s.id === id ? aggiornata : s))
      );
    } catch (err) {
      console.error("Errore conferma spedizione:", err);
    }
  };

  const eliminaSpedizione = async (id) => {
    try {
      await fetch(`/api/v2/spedizioni/${id}`, { method: "DELETE" });
      setSpedizioni((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Errore eliminazione spedizione:", err);
    }
  };

  const handleExportCSV = (spedizione) => {
    const oggi = new Date();
    const dataStr = `${String(oggi.getDate()).padStart(2, "0")}-${String(
      oggi.getMonth() + 1
    ).padStart(2, "0")}-${oggi.getFullYear()}`;

    const meta = `Paese: ${spedizione.paese};Data: ${spedizione.data || dataStr};Progressivo: ${spedizione.progressivo}\n\n`;
    const header = "ASIN;Prodotto;Quantità\n";
    const rows = spedizione.righe
      .map((r) => `${r.asin};"${r.prodotto_nome}";${r.quantita}`)
      .join("\n");

    const csvContent = meta + header + rows;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `spedizione_${spedizione.progressivo}_${dataStr}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ========== FILTRI ==========
  const spedizioniFiltrate = spedizioni.filter((s) => {
    // Filtro per stato
    if (filterStato !== "TUTTI" && s.stato !== filterStato) return false;

    // Filtro per ricerca
    if (filterSearchTerm.trim()) {
      const term = filterSearchTerm.toLowerCase();
      const paese = (s.paese || "").toLowerCase();
      const progressivo = (s.progressivo || "").toString().toLowerCase();
      const operatore = (s.operatore || "").toLowerCase();
      const prodotti = (s.righe || [])
        .map((r) => r.prodotto_nome?.toLowerCase() || "")
        .join(" ");

      if (
        !paese.includes(term) &&
        !progressivo.includes(term) &&
        !operatore.includes(term) &&
        !prodotti.includes(term)
      ) {
        return false;
      }
    }
    return true;
  });

  // ========== STATISTICHE ==========
  const stats = {
    totali: spedizioni.length,
    bozze: spedizioni.filter((s) => s.stato === "BOZZA").length,
    confermate: spedizioni.filter((s) => s.stato === "CONFERMATA").length,
    spedite: spedizioni.filter((s) => s.stato === "SPEDITA").length,
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
                <Truck className="w-8 h-8 text-emerald-400" />
                Gestione Spedizioni Magazzino
              </h1>
              <p className="text-zinc-400">Visualizza e gestisci le spedizioni create dagli uffici</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/uffici/spedizioni/storico")}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
              >
                <FileText className="w-4 h-4" />
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

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-blue-600 rounded-full">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{stats.totali}</p>
            <p className="text-sm text-blue-200 font-medium">Totali</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-yellow-600 rounded-full">
                <Clock className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{stats.bozze}</p>
            <p className="text-sm text-yellow-200 font-medium">Da Preparare</p>
          </div>

          <div className="bg-gradient-to-br from-orange-900/40 to-orange-800/20 border border-orange-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-orange-600 rounded-full">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{stats.confermate}</p>
            <p className="text-sm text-orange-200 font-medium">Pronte</p>
          </div>

          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-green-600 rounded-full">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{stats.spedite}</p>
            <p className="text-sm text-green-200 font-medium">Spedite</p>
          </div>
        </div>

        {/* ========== FILTRI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2 text-white">
            <Filter className="w-5 h-5 text-emerald-400" />
            Filtra Spedizioni
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Ricerca */}
            <div className="relative">
              <input
                type="text"
                placeholder="Cerca per paese, progressivo, operatore o prodotto..."
                value={filterSearchTerm}
                onChange={(e) => setFilterSearchTerm(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 text-white px-12 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
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

            {/* Filtro stato */}
            <select
              value={filterStato}
              onChange={(e) => setFilterStato(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            >
              <option value="TUTTI">Tutti gli stati</option>
              <option value="BOZZA">🟡 Da Preparare (Bozza)</option>
              <option value="CONFERMATA">🟠 Pronte (Confermate)</option>
              <option value="SPEDITA">🟢 Spedite</option>
            </select>
          </div>

          {(filterSearchTerm || filterStato !== "TUTTI") && (
            <div className="mt-3 px-3 py-2 bg-emerald-900/20 border border-emerald-700/30 rounded-lg flex items-center justify-between">
              <p className="text-sm text-emerald-400">
                Trovate <strong>{spedizioniFiltrate.length}</strong> spedizioni
              </p>
              <button
                onClick={() => {
                  setFilterSearchTerm("");
                  setFilterStato("TUTTI");
                }}
                className="text-sm text-emerald-400 hover:text-emerald-300 font-medium"
              >
                Reset filtri
              </button>
            </div>
          )}
        </div>

        {/* ========== LISTA SPEDIZIONI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <Truck className="w-5 h-5 text-emerald-400" />
              Spedizioni da Gestire
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-normal">
                {spedizioniFiltrate.length}
              </span>
            </h2>
          </div>

          {spedizioniFiltrate.length === 0 ? (
            <div className="text-center py-12">
              <Truck className="w-16 h-16 text-zinc-700 mx-auto mb-4" />
              <p className="text-zinc-400 text-lg">Nessuna spedizione trovata</p>
              <p className="text-zinc-500 text-sm mt-2">
                Le spedizioni verranno create dagli uffici
              </p>
            </div>
          ) : (
            <SpedizioneCard
              spedizioni={spedizioniFiltrate}
              onDelete={eliminaSpedizione}
              onConferma={confermaSpedizione}
              onExport={handleExportCSV}
              onUpdate={aggiornaSpedizione}
            />
          )}
        </div>

        {/* ========== EXPORT CSV ========== */}
        {spedizioni.length > 0 && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <ExportCSVButton spedizioni={spedizioni} cleanText={cleanText} />
          </div>
        )}
      </div>
    </div>
  );
};

export default GestioneSpedizioniMagazzino;