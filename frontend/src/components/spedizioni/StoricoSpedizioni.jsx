import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const StoricoSpedizioni = () => {
  const [storico, setStorico] = useState([]);
  const [filtroState, setFiltroState] = useState("");
  const navigate = useNavigate();

  /* ============================================================
     📄 Scarica CSV
  ============================================================ */
  const scaricaCSV = (s) => {
    const header = "ASIN;Prodotto;Quantità\n";
    const rows = (s.righe || [])
      .map((r) => `${r.asin};"${r.prodotto_nome}";${r.quantita}`)
      .join("\n");

    const csv = `Progressivo: ${s.progressivo}
Paese: ${s.paese}
Data Operazione: ${s.data_operazione}
Evento: ${s.tipo_evento}
Stato Spedizione: ${s.stato}
Operatore: ${s.operatore}
Note: ${s.note}

${header}${rows}`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `storico_${s.progressivo}.csv`;
    a.click();
  };

  /* ============================================================
     🔽 Caricamento iniziale
  ============================================================ */
  useEffect(() => {
    fetch("/api/v2/spedizioni/storico")
      .then((res) => res.json())
      .then((data) =>
        setStorico(
          data.map((s) => ({
            ...s,
            righe: JSON.parse(s.righe_json || "[]"),
            open: false,
          }))
        )
      );
  }, []);

  /* ============================================================
     🔽 Toggle apertura card
  ============================================================ */
  const toggle = (spedizioneId) => {
    setStorico((prev) =>
      prev.map((s) =>
        s.spedizione_id === spedizioneId ? { ...s, open: !s.open } : s
      )
    );
  };

  /* ============================================================
     🔽 Filtro paese
  ============================================================ */
  const handleFiltro = (paese) => {
    setFiltroState(paese);

    fetch(`/api/v2/spedizioni/storico${paese ? `?paese=${paese}` : ""}`)
      .then((res) => res.json())
      .then((data) =>
        setStorico(
          data.map((s) => ({
            ...s,
            righe: s.righe || JSON.parse(s.righe_json || "[]"),
            open: false,
          }))
        )
      );
  };

  /* ============================================================
     🔽 Badge vari
  ============================================================ */
  const getStatoBadge = (stato) => {
    const s = (stato || "").toLowerCase();
    if (s.includes("completata") || s.includes("spedita"))
      return (
        <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
          ✅ {stato}
        </span>
      );
    if (s.includes("preparazione") || s.includes("in corso"))
      return (
        <span className="px-3 py-1 bg-yellow-600 text-white rounded-full text-xs font-semibold">
          ⚙️ {stato}
        </span>
      );
    if (s.includes("annullata") || s.includes("cancellata"))
      return (
        <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-semibold">
          ❌ {stato}
        </span>
      );
    return (
      <span className="px-3 py-1 bg-zinc-700 text-white rounded-full text-xs font-semibold">
        {stato}
      </span>
    );
  };

  const getEventoBadge = (evento) => {
    const e = (evento || "").toLowerCase();
    if (e.includes("creata"))
      return (
        <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-semibold">
          🆕 {evento}
        </span>
      );
    if (e.includes("confermata"))
      return (
        <span className="px-3 py-1 bg-green-600 text-white rounded-full text-xs font-semibold">
          ✅ {evento}
        </span>
      );
    if (e.includes("eliminata"))
      return (
        <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-semibold">
          🚫 {evento}
        </span>
      );
    return (
      <span className="px-3 py-1 bg-zinc-700 text-white rounded-full text-xs font-semibold">
        {evento}
      </span>
    );
  };

  const getPaeseBadge = (paese) => {
    const flags = {
      IT: "🇮🇹",
      FR: "🇫🇷",
      ES: "🇪🇸",
      DE: "🇩🇪",
      BE: "🇧🇪",
      NL: "🇳🇱",
      SE: "🇸🇪",
      PL: "🇵🇱",
      IE: "🇮🇪",
    };

    return (
      <span className="text-3xl text-white text-bold bg-" title={paese}>
        {flags[paese] || "🌍"}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1)
        .toString()
        .padStart(2, "0")}/${d.getFullYear()} ${d
          .getHours()
          .toString()
          .padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    } catch {
      return dateString;
    }
  };

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">📜 Storico Spedizioni</h1>
              <p className="text-zinc-400">Cronologia completa delle operazioni di spedizione</p>
            </div>
            <button
              onClick={() => navigate("/spedizioni")}
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-medium transition-colors"
            >
              ⬅️ Torna a Spedizioni
            </button>
          </div>
        </div>

        {/* ========== FILTRO PAESE ========== */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            🌍 Filtra per Paese
          </h2>

          <select
            value={filtroState}
            onChange={(e) => handleFiltro(e.target.value)}
            className="w-full bg-zinc-800 border border-zinc-700 text-white px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all cursor-pointer"
          >
            <option value="">🌍 Tutti i Paesi</option>
            <option value="IT">🇮🇹 Italia</option>
            <option value="FR">🇫🇷 Francia</option>
            <option value="ES">🇪🇸 Spagna</option>
            <option value="DE">🇩🇪 Germania</option>
            <option value="BE">🇧🇪 Belgio</option>
            <option value="NL">🇳🇱 Olanda</option>
            <option value="SE">🇸🇪 Svezia</option>
            <option value="PL">🇵🇱 Polonia</option>
            <option value="IE">🇮🇪 Irlanda</option>
          </select>

          {filtroState && (
            <p className="mt-2 text-sm text-zinc-400">
              Filtrando per: <strong className="text-blue-400">{filtroState}</strong>
              <button
                onClick={() => handleFiltro("")}
                className="ml-2 text-red-400 hover:text-red-300 underline"
              >
                Rimuovi filtro
              </button>
            </p>
          )}
        </div>

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">{storico.length}</p>
            <p className="text-sm text-zinc-400 mt-1">Totali</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-500">
              {
                storico.filter(s =>
                  s.stato?.toLowerCase().includes("confermata") ||
                  s.stato?.toLowerCase().includes("spedita")
                ).length
              }
            </p>
            <p className="text-sm text-zinc-400 mt-1">Completate</p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-500">
              {
                storico.filter(s =>
                  s.stato?.toLowerCase().includes("preparazione") ||
                  s.stato?.toLowerCase().includes("bozza")
                ).length
              }
            </p>
            <p className="text-sm text-zinc-400 mt-1">In corso</p>
          </div>
        </div>


        {/* LISTA STORICO */}
        <div className="space-y-6">
          {storico.map((s) => (
            <div
              key={`${s.id}-${s.tipo_evento}`}
              className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
            >
              {/* HEADER CARD */}
              <div
                onClick={() => toggle(s.spedizione_id)}
                className="bg-zinc-800 p-5 cursor-pointer hover:bg-zinc-750 transition-colors"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                  {/* Info Principale */}
                  <div className="flex items-center gap-4">
                    {getPaeseBadge(s.paese)}
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Spedizione #{s.progressivo}
                      </h3>
                      <p className="text-sm text-zinc-400">
                        📅 {formatDate(s.data_operazione)}
                      </p>
                    </div>
                  </div>

                  {/* Badge + Azioni */}
                  <div className="flex items-center flex-wrap gap-3">
                    {getEventoBadge(s.tipo_evento)}
                    {getStatoBadge(s.stato)}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        scaricaCSV(s);
                      }}
                      className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white text-sm"
                    >
                      📄 CSV
                    </button>

                    <span className="text-blue-400 text-sm font-medium">
                      {s.open ? "▲ Nascondi" : "▼ Dettagli"}
                    </span>
                  </div>

                </div>
              </div>

              {/* DETTAGLI */}
              {s.open && (
                <div className="p-6 space-y-4">

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-zinc-800 rounded-lg p-4">
                      <p className="text-xs text-zinc-400 mb-1">Operatore</p>
                      <p className="text-white">{s.operatore || "-"}</p>
                    </div>

                    <div className="bg-zinc-800 rounded-lg p-4">
                      <p className="text-xs text-zinc-400 mb-1">Note</p>
                      <p className="text-white">{s.note || "-"}</p>
                    </div>
                  </div>

                  {/* RIGHE */}
                  <div className="bg-emerald-900/10 border border-emerald-700/30 rounded-lg p-4">
                    <h4 className="font-semibold text-emerald-400 mb-3">
                      📦 Prodotti ({s.righe.length})
                    </h4>

                    {s.righe.length === 0 ? (
                      <p className="text-zinc-400 text-sm">Nessun prodotto</p>
                    ) : (
                      s.righe.map((r, i) => (
                        <div
                          key={i}
                          className="flex justify-between items-center bg-zinc-800 rounded-lg p-3 mb-2"
                        >
                          <div>
                            <p className="text-white font-medium">
                              {r.prodotto_nome}
                            </p>
                            <p className="text-xs text-zinc-400">
                              ASIN: {r.asin}
                            </p>
                          </div>

                          <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-sm font-bold">
                            {r.quantita} pz
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};

export default StoricoSpedizioni;
