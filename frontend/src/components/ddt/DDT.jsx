import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  FileText,
  Calendar,
  MapPin,
  Truck,
  Package,
  Hash,
  FileCheck,
  Download,
  CheckCircle,
  Box
} from "lucide-react";

const centriLogistici = {
  Italia: [
    { codice: "BLQ1", indirizzo: "45020 Castelguglielmo, Provincia di Rovigo" },
    { codice: "MXP5", indirizzo: "20023 Vercelli, Lombardia" },
    { codice: "TRN3", indirizzo: "10040 Torrazza Piemonte, Torino" },
  ],
  Francia: [
    { codice: "ORY4", indirizzo: "91090 Lisses, Francia" },
    { codice: "ORY1", indirizzo: "91310 Montlhéry, Francia" },
  ],
  Germania: [
    { codice: "FRA1", indirizzo: "Frankfurt am Main, Germania" },
    { codice: "BER3", indirizzo: "Brieselang, Germania" },
  ],
};

const corrieriPredefiniti = ["GLS", "BRT", "DHL", "SDA", "TNT", "AMAZON"];

// stessa logica backend
function getPezziPerBox(nomeProdotto = "") {
  const nome = nomeProdotto.toLowerCase();
  if (nome.includes("kit 12 ml")) return 150;
  if (nome.includes("kit 100 ml")) return 75;
  if (nome.includes("cuticole")) return 20;
  if (nome.includes("12 ml")) return 300;
  if (nome.includes("100 ml")) return 150;
  return null;
}

const DDT = () => {
  const navigate = useNavigate();

  const [spedizioni, setSpedizioni] = useState([]);
  const [selectedSpedizione, setSelectedSpedizione] = useState(null);
  const [righe, setRighe] = useState([]);

  const [numeroDDT, setNumeroDDT] = useState("");
  const [numeroAmazon, setNumeroAmazon] = useState("");
  const [data, setData] = useState("");
  const [centro, setCentro] = useState("");
  const [trasportatore, setTrasportatore] = useState("");
  const [trasportatoreCustom, setTrasportatoreCustom] = useState("");
  const [tracking, setTracking] = useState("");

  // { rigaId: [codiciPacchi] }
  const [numeriPacchi, setNumeriPacchi] = useState({});

  useEffect(() => {
    fetch("/api/v2/prebolle")
      .then(res => res.json())
      .then(data => {
        console.log("📦 Prebolle:", data);
        setSpedizioni(data);
      })
      .catch(err => console.error("❌ Errore prebolle:", err));
  }, []);

  // quando scelgo una spedizione, carico le sue righe
  useEffect(() => {
    if (selectedSpedizione) {
      setRighe(selectedSpedizione.righe || []);
      setNumeriPacchi({});
    }
  }, [selectedSpedizione]);

  const aggiornaNumeroPacco = (rigaId, index, nuovoValore) => {
    setNumeriPacchi((prev) => {
      const nuovi = { ...prev };
      if (!nuovi[rigaId]) nuovi[rigaId] = [];
      nuovi[rigaId][index] = nuovoValore;
      return nuovi;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const body = {
      numeroDDT,
      numeroAmazon,
      data,
      centroLogistico: centro,
      trasportatore: trasportatore === "ALTRO" ? trasportatoreCustom : trasportatore,
      tracking,
      numeriPacchi,
    };

    const res = await fetch(`/api/v2/ddt/pdf/${selectedSpedizione.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  // Funzione bandiera paese
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

  // Calcolo totale cartoni
  const getTotaleCartoni = () => {
    return righe.reduce((tot, r) => {
      const pezziPerBox = getPezziPerBox(r.prodotto_nome) || r.quantita;
      const numCartoni = Math.ceil(r.quantita / pezziPerBox);
      return tot + numCartoni;
    }, 0);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                <FileCheck className="w-8 h-8 text-blue-400" />
                Genera DDT
              </h1>
              <p className="text-zinc-400">Crea documenti di trasporto per le tue spedizioni</p>
            </div>
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Torna indietro
            </button>
          </div>
        </div>

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{spedizioni.length}</p>
            <p className="text-sm text-zinc-400 mt-1">Spedizioni</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-emerald-500">{righe.length}</p>
            <p className="text-sm text-zinc-400 mt-1">Prodotti</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-yellow-500">{getTotaleCartoni()}</p>
            <p className="text-sm text-zinc-400 mt-1">Cartoni</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-purple-500">
              {righe.reduce((sum, r) => sum + r.quantita, 0)}
            </p>
            <p className="text-sm text-zinc-400 mt-1">Pezzi Totali</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* ========== SELEZIONE SPEDIZIONE ========== */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <Package className="w-5 h-5 text-blue-400" />
              Seleziona Spedizione
            </h2>

            <div className="relative">
              <select
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                value={selectedSpedizione?.id || ""}
                onChange={(e) =>
                  setSelectedSpedizione(
                    spedizioni.find((s) => s.id === Number(e.target.value))
                  )
                }
                required
              >
                <option value="">-- Seleziona una spedizione --</option>
                {spedizioni.map((s) => (
                  <option key={s.id} value={s.id}>
                    {getPaeseBadge(s.paese)} {s.progressivo} — {s.paese} ({s.data})
                  </option>
                ))}
              </select>
            </div>

            {selectedSpedizione && (
              <div className="mt-4 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                  <p className="text-blue-300 font-semibold">Spedizione selezionata:</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-zinc-400">Progressivo</p>
                    <p className="text-white font-medium">{selectedSpedizione.progressivo}</p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Paese</p>
                    <p className="text-white font-medium">
                      {getPaeseBadge(selectedSpedizione.paese)} {selectedSpedizione.paese}
                    </p>
                  </div>
                  <div>
                    <p className="text-zinc-400">Data</p>
                    <p className="text-white font-medium">{selectedSpedizione.data}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ========== INFORMAZIONI DDT ========== */}
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
              <FileText className="w-5 h-5 text-emerald-400" />
              Informazioni DDT
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Numero DDT */}
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Numero DDT
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="Es: DDT-2024-001"
                  value={numeroDDT}
                  onChange={(e) => setNumeroDDT(e.target.value)}
                />
              </div>

              {/* Numero Amazon */}
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  N° Riferimento Amazon
                </label>
                <input
                  type="text"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="Es: FBA123456"
                  value={numeroAmazon}
                  onChange={(e) => setNumeroAmazon(e.target.value)}
                />
              </div>

              {/* Data */}
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Data
                </label>
                <input
                  type="date"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                />
              </div>

              {/* Centro Logistico */}
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Centro Logistico
                  <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="Es: MXP5 – 20023 Vercelli, Lombardia"
                  value={centro}
                  onChange={(e) => setCentro(e.target.value)}
                />
              </div>

              {/* Tracking */}
             <div className="md:col-span-2 space-y-4">

  {/* Trasportatore */}
  <div>
    <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
      <Truck className="w-4 h-4" />
      Corriere / Trasportatore
      <span className="text-red-400">*</span>
    </label>

    <select
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
      value={trasportatore}
      onChange={(e) => setTrasportatore(e.target.value)}
      required
    >
      <option value="">-- Seleziona Trasportatore --</option>

      {corrieriPredefiniti.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}

      <option value="UPS">UPS</option>
      <option value="ALTRO">Altro…</option>
    </select>

    {trasportatore === "ALTRO" && (
      <input
        type="text"
        className="w-full mt-2 bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
        placeholder="Inserisci trasportatore"
        value={trasportatoreCustom}
        onChange={(e) => setTrasportatoreCustom(e.target.value)}
      />
    )}
  </div>

  {/* Tracking */}
  <div>
    <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide flex items-center gap-2">
      <Truck className="w-4 h-4" />
      Codice Tracking
    </label>
    <input
      type="text"
      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
      placeholder="Es: 1Z999AA10123456784"
      value={tracking}
      onChange={(e) => setTracking(e.target.value)}
    />
  </div>

</div>

            </div>
          </div>

          {/* ========== DETTAGLIO CARTONI E PACCHI ========== */}
          {righe.length > 0 && (
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
                <Box className="w-5 h-5 text-yellow-400" />
                Dettaglio Cartoni e Pacchi
                <span className="text-sm font-normal text-zinc-400">
                  ({righe.length} {righe.length === 1 ? "prodotto" : "prodotti"})
                </span>
              </h2>

              <div className="space-y-4">
                {righe.map((r) => {
                  const pezziPerBox = getPezziPerBox(r.prodotto_nome) || r.quantita;
                  const numCartoni = Math.ceil(r.quantita / pezziPerBox);

                  return (
                    <div key={r.id} className="bg-zinc-800 border border-zinc-700 rounded-xl p-5">

                      {/* Header Prodotto */}
                      <div className="mb-4 pb-4 border-b border-zinc-700">
                        <h3 className="font-semibold text-lg text-yellow-300 mb-2">{r.prodotto_nome}</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div>
                            <p className="text-zinc-400 text-xs">Quantità</p>
                            <p className="text-white font-bold text-lg">{r.quantita}</p>
                          </div>
                          <div>
                            <p className="text-zinc-400 text-xs">ASIN</p>
                            <p className="text-white font-mono">{r.asin}</p>
                          </div>
                          <div>
                            <p className="text-zinc-400 text-xs">SKU</p>
                            <p className="text-white font-mono">{r.sku || "-"}</p>
                          </div>
                          <div>
                            <p className="text-zinc-400 text-xs">Cartoni</p>
                            <p className="text-emerald-400 font-bold text-lg">{numCartoni}</p>
                          </div>
                        </div>
                      </div>

                      {/* Input Cartoni */}
                      <div className="space-y-3">
                        <p className="text-sm text-zinc-400 font-medium mb-2">
                          📦 Inserisci i numeri dei cartoni e pacchi:
                        </p>
                        {Array.from({ length: numCartoni }, (_, i) => (
                          <div key={i} className="bg-zinc-900 rounded-lg p-3">
                            <p className="text-xs text-zinc-400 mb-2 font-medium">Cartone {i + 1}/{numCartoni}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input
                                type="text"
                                placeholder={`N° Cartone ${i + 1}`}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                                value={numeriPacchi[r.id]?.[i]?.cartone || ""}
                                onChange={(e) =>
                                  aggiornaNumeroPacco(r.id, i, {
                                    ...numeriPacchi[r.id]?.[i],
                                    cartone: e.target.value,
                                  })
                                }
                              />
                              <input
                                type="text"
                                placeholder={`N° Pacco ${i + 1}`}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-4 py-2 text-white placeholder-zinc-500 focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 transition-all"
                                value={numeriPacchi[r.id]?.[i]?.pacco || ""}
                                onChange={(e) =>
                                  aggiornaNumeroPacco(r.id, i, {
                                    ...numeriPacchi[r.id]?.[i],
                                    pacco: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ========== PULSANTE GENERA PDF ========== */}
          <button
            type="submit"
            disabled={!selectedSpedizione || !numeroDDT || !centro}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-xl px-6 py-4 font-semibold text-lg transition-colors disabled:opacity-50"
          >
            <Download className="w-6 h-6" />
            {!selectedSpedizione
              ? "Seleziona una spedizione"
              : !numeroDDT || !centro
                ? "Compila i campi obbligatori"
                : "Genera PDF DDT"
            }
          </button>

        </form>

      </div>
    </div>
  );
};

export default DDT;