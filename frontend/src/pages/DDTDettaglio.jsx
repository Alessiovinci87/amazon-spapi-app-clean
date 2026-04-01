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
  Copy,
  ChevronUp,
  ChevronDown,
  Box,
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

// ========== UTILITY CLASSIFICAZIONE (frontend) ==========
const CAPACITA_BOX = {
  "12ML_SINGOLO": 300,
  "12ML_KIT": 150,
  "100ML": 150,
  "DEFAULT": 150,
};

function detectMultipack(nome) {
  const patterns = [
    /\d+\s*pz/i, /\d+\s*pezzi/i, /\d+\s*x\s/i,
    /\bkit\b/i, /\bset\b/i, /\bcoppia\b/i, /\bduo\b/i, /\btwin\b/i, /\bpack\b/i,
  ];
  for (const p of patterns) if (p.test(nome)) return true;

  const composite = [/base\s*(e|&|\+)\s*top/i, /top\s*(e|&|\+)\s*base/i];
  for (const p of composite) if (p.test(nome)) return true;

  return false;
}

function classificaProdotto(nome) {
  const n = (nome || "").toLowerCase();
  if (/100\s*ml/i.test(n)) return { tipo: "100ML", capacita: CAPACITA_BOX["100ML"] };
  if (/12\s*ml/i.test(n) || /10\s*ml/i.test(n)) {
    return detectMultipack(n)
      ? { tipo: "12ML_KIT", capacita: CAPACITA_BOX["12ML_KIT"] }
      : { tipo: "12ML_SINGOLO", capacita: CAPACITA_BOX["12ML_SINGOLO"] };
  }
  return { tipo: "DEFAULT", capacita: CAPACITA_BOX.DEFAULT };
}

function espandiProdottoInRighe(prodotto) {
  const { capacita } = classificaProdotto(prodotto.prodotto_nome || prodotto.prodottoNome);
  const qty = prodotto.quantita || 0;
  const numBox = Math.ceil(qty / capacita);

  if (numBox <= 1) {
    return [{
      id: `riga-${Date.now()}-${Math.random()}`,
      asin: prodotto.asin || "",
      sku: prodotto.sku || "",
      prodottoNome: prodotto.prodotto_nome || prodotto.prodottoNome || "",
      quantita: qty,
      cartone: "",
      pacco: "",
      isManuallyEdited: false,
    }];
  }

  const righe = [];
  let rimanente = qty;
  for (let i = 0; i < numBox; i++) {
    const qtyBox = Math.min(rimanente, capacita);
    righe.push({
      id: `riga-${Date.now()}-${i}-${Math.random()}`,
      asin: prodotto.asin || "",
      sku: prodotto.sku || "",
      prodottoNome: prodotto.prodotto_nome || prodotto.prodottoNome || "",
      quantita: qtyBox,
      cartone: "",
      pacco: "",
      boxNumero: i + 1,
      boxTotali: numBox,
      isManuallyEdited: false,
    });
    rimanente -= qtyBox;
  }
  return righe;
}

// ========== COMPONENTE ==========
const DDTDettaglio = () => {
  const { idSpedizione, ddtNumero } = useParams();
  const navigate = useNavigate();

  const [spedizione, setSpedizione] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Campi documento
  const [numeroDDT, setNumeroDDT] = useState("");
  const [numeroAmazon, setNumeroAmazon] = useState("");
  const [dataDdt, setDataDdt] = useState("");
  const [paese, setPaese] = useState("");
  const [centro, setCentro] = useState("");
  const [trasportatore, setTrasportatore] = useState("");
  const [trasportatoreCustom, setTrasportatoreCustom] = useState("");
  const [tracking, setTracking] = useState("");

  // Righe prodotti
  const [righe, setRighe] = useState([]);

  // Fetch dati
  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Carica spedizione
        const resSped = await fetch("/api/v2/ddt/prebolle");
        const prebolle = await resSped.json();
        const found = prebolle.find((s) => s.id === parseInt(idSpedizione));

        if (!found) {
          setError("Spedizione non trovata");
          setLoading(false);
          return;
        }
        setSpedizione(found);

        // 2. Determina fonte prodotti
        let prodottiDaUsare = [];

        if (ddtNumero) {
          // DDT specifico: carica da assegnazioni
          try {
            const resAss = await fetch(
              `/api/v2/ddt/assegnazioni/${idSpedizione}/${ddtNumero}`
            );
            const dataAss = await resAss.json();

            if (dataAss.ok && dataAss.righe?.length > 0) {
              prodottiDaUsare = dataAss.righe;
            }
          } catch (e) {
            console.warn("Assegnazioni non trovate, uso prodotti spedizione");
          }
        }

        // Fallback: usa righe spedizione dirette
        if (prodottiDaUsare.length === 0) {
          prodottiDaUsare = found.righe || [];
        }

        // 3. Espandi prodotti in righe DDT (logica box)
        let righeFinali = [];
        for (const p of prodottiDaUsare) {
          const righeEspanse = espandiProdottoInRighe(p);
          righeFinali = righeFinali.concat(righeEspanse);
        }

        setRighe(righeFinali);
      } catch (err) {
        console.error("Errore caricamento:", err);
        setError("Errore durante il caricamento");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [idSpedizione, ddtNumero]);

  // ========== FUNZIONI GESTIONE RIGHE (PARTE 5 - INVARIATA) ==========

  const aggiornaRiga = (index, campo, valore) => {
    const nuoveRighe = [...righe];
    nuoveRighe[index][campo] = valore;
    nuoveRighe[index].isManuallyEdited = true;
    setRighe(nuoveRighe);
  };

  const aggiungiRiga = () => {
    setRighe([
      ...righe,
      {
        id: `riga-new-${Date.now()}`,
        asin: "",
        sku: "",
        prodottoNome: "",
        quantita: 0,
        cartone: "",
        pacco: "",
        isManuallyEdited: true,
      },
    ]);
  };

  const rimuoviRiga = (index) => {
    if (righe.length > 1) {
      setRighe(righe.filter((_, i) => i !== index));
    }
  };

  const duplicaRiga = (index) => {
    const rigaDaDuplicare = righe[index];
    const nuovaRiga = {
      ...rigaDaDuplicare,
      id: `riga-dup-${Date.now()}`,
      cartone: "",
      pacco: "",
      isManuallyEdited: true,
    };
    const nuoveRighe = [...righe];
    nuoveRighe.splice(index + 1, 0, nuovaRiga);
    setRighe(nuoveRighe);
  };

  const spostaRigaSu = (index) => {
    if (index === 0) return;
    const nuoveRighe = [...righe];
    [nuoveRighe[index - 1], nuoveRighe[index]] = [nuoveRighe[index], nuoveRighe[index - 1]];
    setRighe(nuoveRighe);
  };

  const spostaRigaGiu = (index) => {
    if (index === righe.length - 1) return;
    const nuoveRighe = [...righe];
    [nuoveRighe[index], nuoveRighe[index + 1]] = [nuoveRighe[index + 1], nuoveRighe[index]];
    setRighe(nuoveRighe);
  };

  // ========== GENERA PDF ==========
  const handleSubmit = async (e) => {
    e.preventDefault();

    const body = {
      brand: "pics",
      numeroDDT,
      numeroAmazon,
      data: dataDdt,
      paese,
      centro,
      trasportatore: trasportatore === "ALTRO" ? trasportatoreCustom : trasportatore,
      tracking,
      righe,
      spedizioneId: idSpedizione,
      spedizioneProgressivo: spedizione?.progressivo,
      ddtNumero: ddtNumero || 1,
    };

    try {
      const res = await fetch("/api/v2/ddt/pics-nails/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        window.open(url, "_blank");
      } else {
        toast.error("Errore nella generazione del PDF");
      }
    } catch (err) {
      console.error("Errore generazione PDF:", err);
      toast.error("Errore durante la generazione del PDF");
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
            <AlertCircle className="w-8 h-8 text-red-400" />
            <div>
              <h2 className="text-xl font-bold text-red-400 mb-2">Errore</h2>
              <p className="text-red-200">{error}</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/uffici/ddt/prebolle")}
            className="mt-6 flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Torna alla lista
          </button>
        </div>
      </div>
    );
  }

  const backUrl = ddtNumero
    ? `/uffici/ddt/scomponi/${idSpedizione}`
    : "/uffici/ddt/prebolle";

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="w-full space-y-6">

        {/* HEADER */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center shadow-lg">
                <FileText className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">
                  DDT Pics Nails {ddtNumero && <span className="text-purple-400">#{ddtNumero}</span>}
                </h1>
                <p className="text-zinc-400 mt-1">
                  Spedizione: <span className="text-purple-400 font-semibold">{spedizione?.progressivo}</span>
                </p>
              </div>
            </div>

            <button
              onClick={() => navigate(backUrl)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              Indietro
            </button>
          </div>
        </div>

        {/* INFO SPEDIZIONE */}
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

        {/* INTESTAZIONE FISSA */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
            <Building2 className="w-5 h-5 text-purple-400" />
            Intestazione Documento
          </h2>
          <div className="flex items-center gap-4 p-4 bg-zinc-800 border border-zinc-700 rounded-lg">
            <img src="/images/logo.png" alt="Pics Nails" className="h-16 w-auto bg-white p-2 rounded" />
            <div className="flex-1">
              <p className="font-semibold text-white text-lg">Pics Nails</p>
              <p className="text-sm text-zinc-400 mt-1">
                Pics Srl – Via dei Fabbri, snc – Alghero, 07041, SS, Italia P.I. IT02603050903 – info@picsnails.com
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* INFORMAZIONI DDT */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <FileText className="w-5 h-5 text-blue-400" />
              Informazioni Documento
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <Hash className="w-4 h-4" />Numero DDT *
                </label>
                <input
                  type="text"
                  placeholder="es. DDT-2025-001"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500"
                  value={numeroDDT}
                  onChange={(e) => setNumeroDDT(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <Hash className="w-4 h-4" />N° Riferimento Amazon
                </label>
                <input
                  type="text"
                  placeholder="Riferimento Amazon (opzionale)"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500"
                  value={numeroAmazon}
                  onChange={(e) => setNumeroAmazon(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <Calendar className="w-4 h-4" />Data *
                </label>
                <input
                  type="date"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
                  value={dataDdt}
                  onChange={(e) => setDataDdt(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="w-4 h-4" />Paese Destinazione *
                </label>
                <select
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500"
                  value={paese}
                  onChange={(e) => setPaese(e.target.value)}
                  required
                >
                  <option value="">-- Seleziona Paese --</option>
                  {paesiOrdinati.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4" />Centro Logistico *
              </label>
              <textarea
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-blue-500"
                value={centro}
                onChange={(e) => setCentro(e.target.value)}
                placeholder="Inserisci l'indirizzo completo del centro logistico..."
                rows={3}
                required
              />
            </div>
          </div>

          {/* TRASPORTO */}
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
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-purple-500"
                  value={trasportatore}
                  onChange={(e) => {
                    setTrasportatore(e.target.value);
                    if (e.target.value !== "ALTRO") setTrasportatoreCustom("");
                  }}
                  required
                >
                  <option value="">-- Seleziona Trasportatore --</option>
                  {corrieriPredefiniti.map((c) => (
                    <option key={c} value={c}>{c}</option>
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
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500"
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
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-purple-500"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* PRODOTTI */}
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
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium"
              >
                <Plus className="w-4 h-4" />
                Aggiungi Prodotto
              </button>
            </div>

            <div className="space-y-3">
              {righe.map((r, i) => (
                <div
                  key={r.id}
                  className={`relative bg-zinc-800 border rounded-lg p-4 ${
                    r.isManuallyEdited
                      ? "border-yellow-500/50 bg-yellow-900/10"
                      : "border-zinc-700"
                  }`}
                >
                  {/* Badge modificato */}
                  {r.isManuallyEdited && (
                    <span className="absolute -top-2 left-4 px-2 py-0.5 bg-yellow-600 text-yellow-100 text-xs rounded font-medium">
                      Modificato
                    </span>
                  )}

                  {/* Badge box */}
                  {r.boxTotali && r.boxTotali > 1 && (
                    <span className="absolute -top-2 left-24 px-2 py-0.5 bg-blue-600 text-blue-100 text-xs rounded font-medium flex items-center gap-1">
                      <Box className="w-3 h-3" />
                      Box {r.boxNumero}/{r.boxTotali}
                    </span>
                  )}

                  {/* Azioni riga */}
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => spostaRigaSu(i)}
                      disabled={i === 0}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                        i === 0 ? "bg-zinc-700 text-zinc-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                      title="Sposta su"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => spostaRigaGiu(i)}
                      disabled={i === righe.length - 1}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-all ${
                        i === righe.length - 1 ? "bg-zinc-700 text-zinc-500 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"
                      }`}
                      title="Sposta giù"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => duplicaRiga(i)}
                      className="w-8 h-8 flex items-center justify-center bg-purple-600 hover:bg-purple-500 rounded-lg text-white"
                      title="Duplica riga"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    {righe.length > 1 && (
                      <button
                        type="button"
                        onClick={() => rimuoviRiga(i)}
                        className="w-8 h-8 flex items-center justify-center bg-red-600 hover:bg-red-500 rounded-lg text-white"
                        title="Elimina riga"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Numero riga */}
                  <div className="absolute top-3 left-3 w-6 h-6 bg-zinc-700 rounded-full flex items-center justify-center text-xs font-bold text-zinc-300">
                    {i + 1}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 pt-6 pr-36">
                    <input
                      type="text"
                      placeholder="ASIN"
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500"
                      value={r.asin}
                      onChange={(e) => aggiornaRiga(i, "asin", e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="SKU"
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500"
                      value={r.sku}
                      onChange={(e) => aggiornaRiga(i, "sku", e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Nome prodotto"
                      className="lg:col-span-2 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500"
                      value={r.prodottoNome}
                      onChange={(e) => aggiornaRiga(i, "prodottoNome", e.target.value)}
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="Quantità"
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500"
                      value={r.quantita}
                      onChange={(e) => aggiornaRiga(i, "quantita", Number(e.target.value))}
                    />
                    <input
                      type="number"
                      min="0"
                      placeholder="N° Cartone"
                      className="bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500"
                      value={r.cartone}
                      onChange={(e) => aggiornaRiga(i, "cartone", e.target.value)}
                    />
                  </div>

                  <div className="mt-3 pr-36">
                    <input
                      type="text"
                      placeholder="N° Pacco (lettere e numeri)"
                      className="w-full bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-2 text-white placeholder-zinc-500 text-sm focus:ring-2 focus:ring-emerald-500"
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

          {/* SUBMIT */}
          <button
            type="submit"
            className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-xl px-6 py-4 font-semibold text-lg shadow-lg hover:shadow-purple-500/25"
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