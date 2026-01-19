import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import SpedizioneCard from "../components/spedizioni/SpedizioneCard";
import ExportCSVButton from "../components/ui/ExportCSVButton";
import { PAESI, cleanText } from "../utils/gestioneSpedizioni";
import {
  ArrowLeft,
  Truck,
  Plus,
  Save,
  FileText,
  Calendar,
  User,
  MapPin,
  Package,
  AlertCircle,
  CheckCircle,
  ClipboardList,
  X,
  Search,
  ShoppingCart,
  BarChart3
} from "lucide-react";

const GestioneSpedizioni = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isUffici = location.pathname.startsWith('/uffici');
  const [inventario, setInventario] = useState([]);
  const [spedizioni, setSpedizioni] = useState([]);

  // Info generali spedizione
  const [spedizioneInfo, setSpedizioneInfo] = useState({
    paese: "IT",
    data: "",
    operatore: "",
    note: "",
  });

  // Righe prodotti temporanee
  const [righe, setRighe] = useState([]);
  const [nuovaRiga, setNuovaRiga] = useState({
    asin: "",
    quantita: "",
  });

  const [filtro, setFiltro] = useState("");
  const [errore, setErrore] = useState("");

  const [impegni, setImpegni] = useState({});

  useEffect(() => {
    const fetchImpegni = async () => {
      const res = await fetch("/api/v2/impegni");
      const data = await res.json();
      setImpegni(data);
    };
    fetchImpegni();
  }, []);

  // Carica inventario e spedizioni esistenti
  useEffect(() => {
    const aggiornaInventario = () => {
      fetch("/api/v2/magazzino")
        .then((res) => res.json())
        .then((data) => setInventario(data.data || []));

    };

    const aggiornaSpedizioni = () => {
      fetch("/api/v2/spedizioni")
        .then((res) => res.json())
        .then((data) => setSpedizioni(data))
        .catch((err) => console.error("Errore fetch spedizioni:", err));
    };

    aggiornaInventario();
    aggiornaSpedizioni();
  }, []);

  // Gestione input spedizione
  const handleInfoChange = (campo, valore) => {
    setSpedizioneInfo((prev) => ({ ...prev, [campo]: valore }));
  };

  // Gestione input nuova riga prodotto
  const handleRigaChange = (campo, valore) => {
    setNuovaRiga((prev) => ({ ...prev, [campo]: valore }));
  };

  // Aggiungi riga al carrello
  const aggiungiRiga = () => {
    const prodotto = inventario.find((p) => p.asin === nuovaRiga.asin);
    if (!prodotto) {
      setErrore("Seleziona un prodotto valido.");
      return;
    }

    const quantita = parseInt(nuovaRiga.quantita, 10);
    if (isNaN(quantita) || quantita <= 0) {
      setErrore("Inserisci una quantità valida.");
      return;
    }

    if (quantita > prodotto.pronto) {
      setErrore(
        `Quantità richiesta (${quantita}) superiore alla giacenza (${prodotto.pronto}).`
      );
      return;
    }

    setRighe((prev) => [
      ...prev,
      {
        asin: prodotto.asin,
        prodotto_nome: prodotto.nome,
        quantita,
      },
    ]);
    setNuovaRiga({ asin: "", quantita: "" });
    setErrore("");
  };

  // Rimuovi riga dal carrello
  const rimuoviRiga = (index) => {
    setRighe((prev) => prev.filter((_, i) => i !== index));
  };

  // Salva spedizione con tutte le righe
  const salvaSpedizione = async () => {
    if (!spedizioneInfo.data || righe.length === 0) {
      setErrore("Inserisci data e almeno un prodotto.");
      return;
    }

    try {
      // 🔎 Cerco se esiste già una bozza per questo paese
      const bozza = spedizioni.find(
        (s) => s.stato === "BOZZA" && s.paese === spedizioneInfo.paese
      );

      if (bozza) {
        // ➕ Aggiungo solo nuove righe
        const res = await fetch(`/api/v2/spedizioni/${bozza.id}/righe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ righe }),
        });
        const aggiornata = await res.json();
        setSpedizioni((prev) =>
          prev.map((s) => (s.id === bozza.id ? aggiornata : s))
        );
      } else {
        // 🆕 Creo nuova spedizione
        const res = await fetch("/api/v2/spedizioni", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...spedizioneInfo, righe }),
        });
        const nuova = await res.json();
        setSpedizioni((prev) => [nuova, ...prev]);
      }

      // Ricarica inventario
      fetch("/api/v2/magazzino")
        .then((res) => res.json())
        .then((data) => setInventario(data.data || []));

      // Reset righe temporanee
      setRighe([]);
      setErrore("");
    } catch (err) {
      console.error("Errore salvataggio spedizione:", err);
      setErrore("Errore durante il salvataggio.");
    }
  };

  const handleExportCSV = (spedizione) => {
    // Data formattata come gg-mm-aaaa
    const oggi = new Date();
    const dataStr = `${String(oggi.getDate()).padStart(2, "0")}-${String(
      oggi.getMonth() + 1
    ).padStart(2, "0")}-${oggi.getFullYear()}`;

    // Riga con intestazione spedizione
    const meta = `Paese: ${spedizione.paese};Data: ${spedizione.data || dataStr};Progressivo: ${spedizione.progressivo}\n\n`;

    // Header CSV prodotti
    const header = "ASIN;Prodotto;Quantità\n";

    // Righe prodotti
    const rows = spedizione.righe
      .map((r) => `${r.asin};"${r.prodotto_nome}";${r.quantita}`)
      .join("\n");

    const csvContent = meta + header + rows;

    // Download
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

  const aggiornaSpedizione = async (id, dati) => {
    try {
      const res = await fetch(`/api/v2/spedizioni/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dati),
      });
      const aggiornata = await res.json();

      // aggiorna stato frontend con i dati aggiornati
      setSpedizioni((prev) =>
        prev.map((s) => (s.id === id ? aggiornata : s))
      );
    } catch (err) {
      console.error("Errore aggiornamento spedizione:", err);
    }
  };

  // Conferma una spedizione
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

  // Cancella tutte le spedizioni
  const eliminaTutte = async () => {
    try {
      await fetch(`/api/v2/spedizioni`, { method: "DELETE" });
      setSpedizioni([]);
    } catch (err) {
      console.error("Errore eliminazione spedizioni:", err);
    }
  };

  const filtroLower = (filtro || "").toLowerCase();

  const prodottiFiltrati = inventario.filter((p) => {
    const nome = (p.nome || "").toLowerCase();
    const asin = (p.asin || "").toLowerCase();
    const sku = (p.sku || "").toLowerCase();

    return (
      nome.includes(filtroLower) ||
      asin.includes(filtroLower) ||
      sku.includes(filtroLower)
    );
  });

  // Cancella una spedizione
  const eliminaSpedizione = async (id) => {
    try {
      await fetch(`/api/v2/spedizioni/${id}`, { method: "DELETE" });
      setSpedizioni((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Errore eliminazione spedizione:", err);
    }
  };

  // Funzione per ottenere bandiera emoji
  const getPaeseBadge = (paese) => {
    const flags = {
      "IT": "🇮🇹",
      "FR": "🇫🇷",
      "ES": "🇪🇸",
      "DE": "🇩🇪",
      "BE": "🇧🇪",
      "NL": "🇳🇱",
      "SE": "🇸🇪",
      "PL": "🇵🇱",
      "IE": "🇮🇪"
    };
    return flags[paese] || "🌍";
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <Truck className="w-8 h-8 text-blue-400" />
                Gestione Spedizioni
              </h1>
              <p className="text-zinc-400">Crea e gestisci le tue spedizioni in modo efficiente</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/spedizioni/storico")}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-colors"
              >
                <FileText className="w-4 h-4" />
                Storico
              </button>
              <button
                onClick={() => navigate(isUffici ? "/dashboard" : "/magazzino")}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                {isUffici ? "Dashboard" : "Magazzino"}
              </button>
            </div>
          </div>
        </div>

        {/* ========== ALERT ERRORE ========== */}
        {errore && (
          <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-4 flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-red-200 font-medium">{errore}</p>
            </div>
            <button
              onClick={() => setErrore("")}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* ========== STATISTICHE CON GRADIENT ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/20 border border-blue-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-blue-600 rounded-full">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{spedizioni.length}</p>
            <p className="text-sm text-blue-200 font-medium">Totali</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-900/40 to-yellow-800/20 border border-yellow-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-yellow-600 rounded-full">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {spedizioni.filter(s => s.stato === "BOZZA").length}
            </p>
            <p className="text-sm text-yellow-200 font-medium">Bozze</p>
          </div>

          <div className="bg-gradient-to-br from-green-900/40 to-green-800/20 border border-green-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-green-600 rounded-full">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">
              {spedizioni.filter(s => s.stato === "CONFERMATA" || s.stato === "SPEDITA").length}
            </p>
            <p className="text-sm text-green-200 font-medium">Confermate</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-900/40 to-emerald-800/20 border border-emerald-700/30 rounded-xl p-5 text-center hover:scale-105 transition-transform">
            <div className="flex justify-center mb-2">
              <div className="p-3 bg-emerald-600 rounded-full">
                <Package className="w-6 h-6 text-white" />
              </div>
            </div>
            <p className="text-4xl font-bold text-white mb-1">{inventario.length}</p>
            <p className="text-sm text-emerald-200 font-medium">Prodotti</p>
          </div>
        </div>

        {/* ========== INFORMAZIONI SPEDIZIONE ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
            <ClipboardList className="w-5 h-5 text-blue-400" />
            Informazioni Spedizione
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Paese Destinazione
              </label>
              <div className="relative">
                <select
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-12 pr-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                  value={spedizioneInfo.paese}
                  onChange={(e) => handleInfoChange("paese", e.target.value)}
                >
                  {PAESI.map((paese) => (
                    <option key={paese} value={paese}>
                      {paese}
                    </option>
                  ))}
                </select>
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl pointer-events-none">
                  {getPaeseBadge(spedizioneInfo.paese)}
                </span>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Spedizione
                <span className="text-red-400 text-sm">*</span>
              </label>
              <input
                type="date"
                required
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={spedizioneInfo.data}
                onChange={(e) => handleInfoChange("data", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <User className="w-4 h-4" />
                Operatore
              </label>
              <input
                type="text"
                placeholder="Nome operatore"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={spedizioneInfo.operatore}
                onChange={(e) => handleInfoChange("operatore", e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Note
              </label>
              <input
                type="text"
                placeholder="Note aggiuntive"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={spedizioneInfo.note}
                onChange={(e) => handleInfoChange("note", e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* ========== AGGIUNGI PRODOTTO ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
            <Package className="w-5 h-5 text-emerald-400" />
            Aggiungi Prodotti alla Spedizione
          </h2>

          {/* Barra di ricerca prodotti */}
          <div className="mb-4">
            <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
              <Search className="w-4 h-4" />
              Cerca Prodotto
            </label>
            <div className="relative">
              <input
                type="text"
                placeholder="Cerca per nome, ASIN o SKU..."
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-10 pr-10 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
              <Search className="w-5 h-5 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              {filtro && (
                <button
                  onClick={() => setFiltro("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                Seleziona Prodotto
              </label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                value={nuovaRiga.asin}
                onChange={(e) => handleRigaChange("asin", e.target.value)}
              >
                <option value="">-- Seleziona prodotto --</option>
                {prodottiFiltrati.map((p) => (
                  <option
                    key={p.asin || p.id || p.nome}
                    value={p.asin || ""}
                  >
                    {p.nome} (Giacenza: {p.pronto})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                Quantità
              </label>
              <input
                type="number"
                placeholder="0"
                min="1"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                value={nuovaRiga.quantita}
                onChange={(e) => handleRigaChange("quantita", e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={aggiungiRiga}
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <Plus className="w-5 h-5" />
                Aggiungi
              </button>
            </div>
          </div>

          {/* Lista righe temporanee */}
          {righe.length > 0 && (
            <div className="mt-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-white">Carrello Spedizione</h3>
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">
                    {righe.length} {righe.length === 1 ? "prodotto" : "prodotti"}
                  </span>
                </div>
                <button
                  onClick={() => setRighe([])}
                  className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Svuota carrello
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {righe.map((r, i) => (
                  <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 hover:border-emerald-700/50 transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">{r.prodotto_nome}</p>
                        <p className="text-sm text-zinc-400 mt-1">ASIN: {r.asin}</p>
                      </div>
                      <button
                        onClick={() => rimuoviRiga(i)}
                        className="flex-shrink-0 p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                        title="Rimuovi prodotto"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between pt-3 border-t border-zinc-700">
                      <span className="text-xs text-zinc-400 uppercase font-medium">Quantità</span>
                      <span className="text-2xl font-bold text-emerald-400">{r.quantita}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totale prodotti */}
              <div className="mt-4 bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 border border-emerald-700/30 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-emerald-400" />
                    <span className="text-zinc-300 font-medium">Totale Prodotti:</span>
                  </div>
                  <span className="text-3xl font-bold text-emerald-400">
                    {righe.reduce((sum, r) => sum + r.quantita, 0)} pz
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ========== PULSANTE SALVA ========== */}
        <button
          onClick={salvaSpedizione}
          disabled={righe.length === 0 || !spedizioneInfo.data}
          className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-zinc-700 disabled:to-zinc-700 disabled:cursor-not-allowed rounded-xl px-6 py-4 font-semibold text-lg transition-all shadow-lg hover:shadow-blue-900/50 disabled:opacity-50 disabled:shadow-none"
        >
          <Save className="w-6 h-6" />
          {righe.length === 0
            ? "Aggiungi prodotti per salvare"
            : !spedizioneInfo.data
              ? "Inserisci data per salvare"
              : `Salva Spedizione (${righe.length} ${righe.length === 1 ? "prodotto" : "prodotti"})`
          }
        </button>

        {/* ========== LISTA SPEDIZIONI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <Truck className="w-5 h-5 text-blue-400" />
              Spedizioni Create
              <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-normal">
                {spedizioni.length}
              </span>
            </h2>
          </div>

          <SpedizioneCard
            spedizioni={spedizioni}
            onDelete={eliminaSpedizione}
            onDeleteAll={eliminaTutte}
            onConferma={confermaSpedizione}
            onExport={handleExportCSV}
            onUpdate={aggiornaSpedizione}
          />
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

export default GestioneSpedizioni;