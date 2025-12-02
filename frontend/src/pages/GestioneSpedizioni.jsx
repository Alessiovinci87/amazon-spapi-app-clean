import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  ClipboardList
} from "lucide-react";

const GestioneSpedizioni = () => {
  const navigate = useNavigate();
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
      const saved = localStorage.getItem("inventario_prodotti");
      if (saved) {
        setInventario(JSON.parse(saved));
      } else {
        fetch("/data/inventario.json")
          .then((res) => res.json())
          .then((data) => setInventario(data));
      }
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

  const prodottiFiltrati = inventario.filter(
    (p) =>
      p.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      p.asin.toLowerCase().includes(filtro.toLowerCase()) ||
      (p.sku || "").toLowerCase().includes(filtro.toLowerCase())
  );

  // Cancella una spedizione
  const eliminaSpedizione = async (id) => {
    try {
      await fetch(`/api/v2/spedizioni/${id}`, { method: "DELETE" });
      setSpedizioni((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error("Errore eliminazione spedizione:", err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="w-full space-y-6">
        
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Truck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Gestione Spedizioni</h1>
                <p className="text-zinc-400 mt-1">Crea e gestisci le tue spedizioni</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/spedizioni/storico")}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              >
                <FileText className="w-4 h-4" />
                Storico
              </button>
              <button
                onClick={() => navigate("/magazzino")}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              >
                <ArrowLeft className="w-4 h-4" />
                Magazzino
              </button>
            </div>
          </div>
        </div>

        {/* ========== ALERT ERRORE ========== */}
        {errore && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-200 text-sm">{errore}</p>
          </div>
        )}

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
                Paese di Destinazione
              </label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={spedizioneInfo.paese}
                onChange={(e) => handleInfoChange("paese", e.target.value)}
              >
                {PAESI.map((paese) => (
                  <option key={paese} value={paese}>
                    {paese}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Data Spedizione
              </label>
              <input
                type="date"
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
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                Seleziona Prodotto
              </label>
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                style={{ whiteSpace: "pre-line" }}
                value={nuovaRiga.asin}
                onChange={(e) => handleRigaChange("asin", e.target.value)}
              >
                <option value="">-- Seleziona prodotto --</option>
                {prodottiFiltrati.map((p) => (
                  <option key={p.asin} value={p.asin}>
                    {p.nome} (Giacenza: {p.pronto})
                    {impegni[p.asin]
                      ?.map((i) => `\nImpegnati ${i.totale} per ${i.paese}-${i.progressivo}`)
                      .join("")}
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
                className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 px-6 py-3 rounded-lg font-medium transition-all hover:scale-[1.02]"
              >
                <Plus className="w-5 h-5" />
                Aggiungi Prodotto
              </button>
            </div>
          </div>

          {/* Lista righe temporanee */}
          {righe.length > 0 && (
            <div className="mt-6 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h3 className="font-semibold text-white">Prodotti Aggiunti ({righe.length})</h3>
              </div>
              <div className="space-y-2">
                {righe.map((r, i) => (
                  <div key={i} className="bg-zinc-800 border border-zinc-700 rounded-lg p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-white">{r.prodotto_nome}</p>
                      <p className="text-sm text-zinc-400">ASIN: {r.asin}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-emerald-400">{r.quantita}</p>
                      <p className="text-xs text-zinc-400">pezzi</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ========== PULSANTE SALVA ========== */}
        <button
          onClick={salvaSpedizione}
          disabled={righe.length === 0}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl px-6 py-4 font-semibold text-lg transition-all hover:scale-[1.01] disabled:hover:scale-100"
        >
          <Save className="w-6 h-6" />
          Salva come Bozza
          {righe.length > 0 && (
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm">
              {righe.length} {righe.length === 1 ? "prodotto" : "prodotti"}
            </span>
          )}
        </button>

        {/* ========== LISTA SPEDIZIONI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
              <Truck className="w-5 h-5 text-blue-400" />
              Spedizioni Inserite
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
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <ExportCSVButton spedizioni={spedizioni} cleanText={cleanText} />
        </div>
      </div>
    </div>
  );
};

export default GestioneSpedizioni;