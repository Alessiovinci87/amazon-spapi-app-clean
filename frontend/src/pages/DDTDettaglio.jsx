import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Plus,
  Trash2,
  Package,
  Truck,
  MapPin,
  Calendar,
  Building2,
  Hash,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

const corrieriPredefiniti = ["GLS", "BRT", "DHL", "SDA", "TNT", "AMAZON", "UPS"];

const paesiOrdinati = [
  "Italia",
  "Francia",
  "Spagna",
  "Germania",
  "Inghilterra",
  "Belgio",
  "Olanda",
  "Svezia",
  "Polonia",
  "Irlanda",
];

const DDTDettaglio = () => {
  const { idSpedizione } = useParams();
  const navigate = useNavigate();

  const [spedizione, setSpedizione] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Campi documento (da compilare manualmente)
  const [numeroDDT, setNumeroDDT] = useState("");
  const [numeroAmazon, setNumeroAmazon] = useState("");
  const [dataDdt, setDataDdt] = useState("");
  const [paese, setPaese] = useState("");
  const [centro, setCentro] = useState("");
  const [trasportatore, setTrasportatore] = useState("");
  const [trasportatoreCustom, setTrasportatoreCustom] = useState("");
  const [tracking, setTracking] = useState("");

  // Righe prodotti (precompilate dalla spedizione + campi da compilare)
  const [righe, setRighe] = useState([]);

  // Fetch spedizione
  useEffect(() => {
    const fetchSpedizione = async () => {
      try {
        const res = await fetch("/api/v2/ddt/prebolle");
        const data = await res.json();
        const found = data.find((s) => s.id === parseInt(idSpedizione));

        if (found) {
          setSpedizione(found);
          // Precompila le righe con i dati della spedizione
          const righePrecompilate = (found.righe || []).map((r) => ({
            asin: r.asin || "",
            sku: r.sku || "",
            prodottoNome: r.prodotto_nome || "",
            quantita: r.quantita || 0,
            cartone: "",  // Da compilare
            pacco: "",    // Da compilare
          }));
          setRighe(righePrecompilate);
        } else {
          setError("Spedizione non trovata");
        }
      } catch (err) {
        console.error("Errore caricamento spedizione:", err);
        setError("Errore durante il caricamento");
      } finally {
        setLoading(false);
      }
    };

    fetchSpedizione();
  }, [idSpedizione]);

  // Aggiorna riga prodotto
  const aggiornaRiga = (index, campo, valore) => {
    const nuoveRighe = [...righe];
    nuoveRighe[index][campo] = valore;
    setRighe(nuoveRighe);
  };

  // Aggiungi nuova riga
  const aggiungiRiga = () => {
    setRighe([
      ...righe,
      { asin: "", sku: "", prodottoNome: "", quantita: 0, cartone: "", pacco: "" },
    ]);
  };

  // Rimuovi riga
  const rimuoviRiga = (index) => {
    if (righe.length > 1) {
      setRighe(righe.filter((_, i) => i !== index));
    }
  };

  // Genera PDF
  const handleSubmit = async (e) => {
    e.preventDefault();

    const body = {
      brand: "pics", // Fisso per DDT Pics Nails
      numeroDDT,
      numeroAmazon,
      data: dataDdt,
      paese,
      centro,
      trasportatore: trasportatore === "ALTRO" ? trasportatoreCustom : trasportatore,
      tracking,
      righe,
      // Dati spedizione originale
      spedizioneId: idSpedizione,
      spedizioneProgressivo: spedizione?.progressivo,
    };

    try {
      const res = await fetch("http://localhost:3005/api/v2/ddt/pics-nails/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        alert("❌ Errore nella generazione del PDF");
      }
    } catch (err) {
      console.error("Errore generazione PDF:", err);
      alert("❌ Errore durante la generazione del PDF");
    }
  };

  // Loading
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-purple-400 animate-spin mx-auto mb-4" />
          <p className="text-zinc-400">Caricamento spedizione...</p>
        </div>
      </div>
    );
  }

  // Errore
  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <div className="bg-red-900/20 border border-red-700/30 rounded-xl p-6 flex items-center gap-4">
            <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-red-400 mb-2">Errore</h2>
              <p className="text-red-200">{error}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/uffici/ddt/prebolle")}
            className="mt-6 flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla lista
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="w-full space-y-6">

        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">DDT Pics Nails</h1>
                <p className="text-zinc-400 mt-1">
                  Spedizione: <span className="text-purple-400 font-semibold">{spedizione?.progressivo}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate("/uffici/ddt/prebolle")}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>
          </div>
        </div>

        {/* ========== INFO SPEDIZIONE ORIGINALE ========== */}
        <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border border-purple-500/30 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle className="w-5 h-5 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Dati Spedizione Originale</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-zinc-400">Progressivo</p>
              <p className="text-white font-medium">{spedizione?.progressivo}</p>
            </div>
            <div>
              <p className="text-zinc-400">Paese</p>
              <p className="text-white font-medium">{spedizione?.paese}</p>
            </div>
            <div>
              <p className="text-zinc-400">Data Spedizione</p>
              <p className="text-white font-medium">{spedizione?.data || "-"}</p>
            </div>
            <div>
              <p className="text-zinc-400">Operatore</p>
              <p className="text-white font-medium">{spedizione?.operatore || "-"}</p>
            </div>
          </div>
        </div>

        {/* ========== INTESTAZIONE FISSA ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
            <Building2 className="w-5 h-5 text-purple-400" />
            Intestazione Documento
          </h2>

          <div className="flex items-center gap-4 p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
            <img
              src="/images/logo.png"
              alt="Pics Nails"
              className="h-16 w-auto object-contain bg-white p-2 rounded"
            />
            <div className="flex-1">
              <p className="font-semibold text-white text-lg">Pics Nails</p>
              <p className="text-sm text-zinc-400 mt-1">
                Pics Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02603050903 – info@picsnails.com
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ========== INFORMAZIONI DDT ========== */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <FileText className="w-5 h-5 text-blue-400" />
              Informazioni Documento
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Numero DDT *
                </label>
                <input
                  type="text"
                  placeholder="es. DDT-2025-001"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={numeroDDT}
                  onChange={(e) => setNumeroDDT(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  N° Riferimento Amazon
                </label>
                <input
                  type="text"
                  placeholder="Riferimento Amazon (opzionale)"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={numeroAmazon}
                  onChange={(e) => setNumeroAmazon(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data *
                </label>
                <input
                  type="date"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white cursor-pointer focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={dataDdt}
                  onChange={(e) => setDataDdt(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Paese Destinazione *
                </label>
                <select
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={paese}
                  onChange={(e) => setPaese(e.target.value)}
                  required
                >
                  <option value="">-- Seleziona Paese --</option>
                  {paesiOrdinati.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Centro Logistico *
              </label>
              <textarea
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={centro}
                onChange={(e) => setCentro(e.target.value)}
                placeholder="Inserisci l'indirizzo completo del centro logistico..."
                rows={3}
                required
              />
            </div>
          </div>

          {/* ========== TRASPORTO ========== */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <Truck className="w-5 h-5 text-purple-400" />
              Informazioni Trasporto
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                  Corriere / Trasportatore *
                </label>
                <select
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  value={trasportatore}
                  onChange={(e) => {
                    setTrasportatore(e.target.value);
                    if (e.target.value !== "ALTRO") setTrasportatoreCustom("");
                  }}
                  required
                >
                  <option value="">-- Seleziona Trasportatore --</option>
                  {corrieriPredefiniti.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                  <option value="ALTRO">Altro...</option>
                </select>
              </div>

              {trasportatore === "ALTRO" && (
                <div>
                  <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                    Nome Trasportatore Personalizzato
                  </label>
                  <input
                    type="text"
                    placeholder="Inserisci nome trasportatore"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                    value={trasportatoreCustom}
                    onChange={(e) => setTrasportatoreCustom(e.target.value)}
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                  Numero Tracking
                </label>
                <input
                  type="text"
                  placeholder="Codice tracking (opzionale)"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* ========== PRODOTTI ========== */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2 text-white">
                <Package className="w-5 h-5 text-emerald-400" />
                Prodotti
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-normal">
                  {righe.length}
                </span>
              </h2>

              <button
                type="button"
                onClick={aggiungiRiga}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-all"
              >
                <Plus className="w-4 h-4" />
                Aggiungi Prodotto
              </button>
            </div>

            <div className="space-y-3">
              {righe.map((r, i) => (
                <div
                  key={i}
                  className="relative bg-zinc-800 border border-zinc-700 rounded-lg p-4"
                >
                  {righe.length > 1 && (
                    <button
                      type="button"
                      onClick={() => rimuoviRiga(i)}
                      className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-lg transition-all"
                      title="Rimuovi prodotto"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 pr-10">
                    <input
                      type="text"
                      placeholder="ASIN"
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      value={r.asin}
                      onChange={(e) => aggiornaRiga(i, "asin", e.target.value)}
                    />

                    <input
                      type="text"
                      placeholder="SKU"
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      value={r.sku}
                      onChange={(e) => aggiornaRiga(i, "sku", e.target.value)}
                    />

                    <input
                      type="text"
                      placeholder="Nome prodotto"
                      className="lg:col-span-2 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      value={r.prodottoNome}
                      onChange={(e) => aggiornaRiga(i, "prodottoNome", e.target.value)}
                    />

                    <input
                      type="number"
                      min="0"
                      placeholder="Quantità"
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      value={r.quantita}
                      onChange={(e) => aggiornaRiga(i, "quantita", Number(e.target.value))}
                    />

                    <input
                      type="number"
                      min="0"
                      placeholder="N° Cartone"
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      value={r.cartone}
                      onChange={(e) => aggiornaRiga(i, "cartone", e.target.value)}
                    />
                  </div>

                  <div className="mt-3">
                    <input
                      type="text"
                      placeholder="N° Pacco (lettere e numeri)"
                      className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                      value={r.pacco}
                      onChange={(e) => aggiornaRiga(i, "pacco", e.target.value)}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Totali */}
            <div className="mt-4 p-4 bg-gradient-to-r from-emerald-900/30 to-emerald-800/20 border border-emerald-700/30 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-zinc-300 font-medium">Totale Unità:</span>
                <span className="text-2xl font-bold text-emerald-400">
                  {righe.reduce((sum, r) => sum + (Number(r.quantita) || 0), 0)} pz
                </span>
              </div>
            </div>
          </div>

          {/* ========== SUBMIT BUTTON ========== */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl px-6 py-4 font-semibold text-lg transition-all shadow-lg hover:shadow-purple-500/25"
          >
            <Download className="w-6 h-6" />
            Genera PDF DDT Pics Nails
          </button>
        </form>
      </div>
    </div>
  );
};

export default DDTDettaglio;