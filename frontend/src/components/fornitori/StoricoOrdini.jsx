import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "sonner";

const StoricoOrdini = () => {
  const [ordini, setOrdini] = useState([]);
  const [fornitori, setFornitori] = useState([]);
  const [ricezionePending, setRicezionePending] = useState(null); // {id, quantita, lotto, data_scadenza}

  // Filtri
  const [filtroFornitore, setFiltroFornitore] = useState("");
  const [filtroDataInizio, setFiltroDataInizio] = useState(null);
  const [filtroDataFine, setFiltroDataFine] = useState(null);
  const [ricercaLibera, setRicercaLibera] = useState("");
  const [filtroPagamenti, setFiltroPagamenti] = useState([]);

  useEffect(() => {
    fetch("/api/v2/fornitori")
      .then((res) => res.json())
      .then(setFornitori);

    fetch("/api/v2/fornitori/ordini-tutti")
      .then((res) => res.json())
      .then(setOrdini);
  }, []);

  const togglePagamento = (pagamento) => {
    if (filtroPagamenti.includes(pagamento)) {
      setFiltroPagamenti(filtroPagamenti.filter((p) => p !== pagamento));
    } else {
      setFiltroPagamenti([...filtroPagamenti, pagamento]);
    }
  };

  const resetFiltri = () => {
    setFiltroFornitore("");
    setFiltroDataInizio(null);
    setFiltroDataFine(null);
    setRicercaLibera("");
    setFiltroPagamenti([]);
  };

  const reloadOrdini = () => {
    fetch("/api/v2/fornitori/ordini-tutti")
      .then((res) => res.json())
      .then(setOrdini);
  };

  const apriRicezione = (ordine) => {
    setRicezionePending({
      id: ordine.id,
      quantita: ordine.quantita || 0,
      quantita_ricevuta: ordine.quantita || 0,
      lotto: "",
      data_scadenza: "",
      fornitore: ordine.fornitore,
      nome_prodotto: ordine.nome_prodotto || ordine.prodotti,
    });
  };

  const confermaRicezione = async () => {
    if (!ricezionePending) return;
    try {
      const res = await fetch(`/api/v2/fornitori/ordini/${ricezionePending.id}/ricevi`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantita_ricevuta: Number(ricezionePending.quantita_ricevuta),
          lotto: ricezionePending.lotto || undefined,
          data_scadenza: ricezionePending.data_scadenza || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore ricezione");
      toast.success(`Ricezione confermata: ${ricezionePending.quantita_ricevuta}L di ${ricezionePending.nome_prodotto}`);
      setRicezionePending(null);
      reloadOrdini();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Calcola se almeno un filtro è attivo
  const filtroAttivo =
    filtroFornitore ||
    filtroDataInizio ||
    filtroDataFine ||
    ricercaLibera.trim() !== "" ||
    filtroPagamenti.length > 0;

  // Filtra gli ordini secondo i criteri
  const ordiniFiltrati = filtroAttivo
    ? ordini.filter((o) => {
      if (filtroFornitore && o.fornitore !== filtroFornitore) return false;
      if (filtroDataInizio && new Date(o.dataOrdine) < filtroDataInizio)
        return false;
      if (filtroDataFine && new Date(o.dataOrdine) > filtroDataFine)
        return false;
      if (
        filtroPagamenti.length > 0 &&
        !filtroPagamenti.some(
          (pag) => pag.toLowerCase() === (o.pagamento || "").toLowerCase()
        )
      )
        return false;

      if (ricercaLibera) {
        const ricerca = ricercaLibera.toLowerCase();
        const inProdotti = o.prodotti?.toLowerCase().includes(ricerca);
        const inSKU = o.sku?.toLowerCase().includes(ricerca);
        const inASIN = o.asin?.toLowerCase().includes(ricerca);
        if (!inProdotti && !inSKU && !inASIN) return false;
      }

      return true;
    })
    : [];

  // Calcola i totali per ogni tipo di pagamento selezionato
  const totaliPerPagamento =
    filtroPagamenti.length > 0
      ? filtroPagamenti.reduce((acc, tipo) => {
        const totaleTipo = ordiniFiltrati
          .filter(
            (o) => o.pagamento.toLowerCase() === tipo.toLowerCase()
          )
          .reduce((sum, o) => sum + parseFloat(o.costoTotale || 0), 0);
        acc[tipo] = totaleTipo;
        return acc;
      }, {})
      : {};

  // Totale unità ordinate e spesa complessiva
  const totaleQuantita = ordiniFiltrati.reduce(
    (acc, o) => acc + parseInt(o.quantita || 0, 10),
    0
  );
  const totaleSpeso = ordiniFiltrati.reduce(
    (acc, o) => acc + parseFloat(o.costoTotale || 0),
    0
  );

  return (
    <div className="p-4 bg-white/10 rounded-lg text-white max-w-screen-xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">📊 Storico Ordini Filtrati</h2>

      <div className="flex justify-end mb-4">
        <button
          onClick={resetFiltri}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          🔄 Reset filtri
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <select
          value={filtroFornitore}
          onChange={(e) => setFiltroFornitore(e.target.value)}
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white max-w-xs w-full h-10"
        >
          <option value="">Tutti i fornitori</option>
          {fornitori.map((f) => (
            <option key={f.id} value={f.nome}>
              {f.nome}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Cerca per nome, SKU o ASIN"
          value={ricercaLibera}
          onChange={(e) => setRicercaLibera(e.target.value)}
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white max-w-xs w-full h-10"
        />

        <DatePicker
          selected={filtroDataInizio}
          onChange={(date) => setFiltroDataInizio(date)}
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white max-w-xs w-full h-10"
          placeholderText="Data inizio"
          dateFormat="dd/MM/yyyy"   // 👈 qui
          isClearable
        />

        <DatePicker
          selected={filtroDataFine}
          onChange={(date) => setFiltroDataFine(date)}
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white max-w-xs w-full h-10"
          placeholderText="Data fine"
          dateFormat="dd/MM/yyyy"   // 👈 e qui
          isClearable
        />

        <div></div>

        <div className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white space-y-1 max-w-xs w-full h-auto">
          <label className="font-semibold">Filtra Pagamento:</label>
          {["Carta", "Bonifico", "Contrassegno", "PayPal"].map((tipo) => (
            <div key={tipo}>
              <input
                type="checkbox"
                id={`pag-${tipo}`}
                checked={filtroPagamenti.includes(tipo)}
                onChange={() => togglePagamento(tipo)}
              />
              <label htmlFor={`pag-${tipo}`} className="ml-2">
                {tipo}
              </label>
            </div>
          ))}
        </div>
      </div>

      {filtroAttivo ? (
        <>
          <table className="w-full text-white table-auto mb-4">
            <thead>
              <tr className="bg-zinc-800 text-left">
                <th className="p-2">Fornitore</th>
                <th className="p-2">Data Ordine</th>
                <th className="p-2">Prodotti</th>
                <th className="p-2">Quantità</th>
                <th className="p-2">Costo Totale (€)</th>
                <th className="p-2">Pagamento</th>
                <th className="p-2">Stato</th>
                <th className="p-2">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {ordiniFiltrati.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center p-4 text-gray-400">
                    Nessun ordine trovato.
                  </td>
                </tr>
              ) : (
                ordiniFiltrati.map((o) => (
                  <tr key={o.id} className="border-b border-zinc-700">
                    <td className="p-2">{o.fornitore}</td>
                    <td className="p-2">
                      {(() => {
                        const d = new Date(o.dataOrdine);
                        if (isNaN(d)) return o.dataOrdine;
                        const day = String(d.getDate()).padStart(2, "0");
                        const month = String(d.getMonth() + 1).padStart(2, "0");
                        const year = d.getFullYear();
                        return `${day}/${month}/${year}`;
                      })()}
                    </td>
                    <td className="p-2">{o.prodotti || o.nome_prodotto}</td>
                    <td className="p-2">{o.quantita}</td>
                    <td className="p-2">€ {o.costoTotale || "—"}</td>
                    <td className="p-2">{o.pagamento || "—"}</td>
                    <td className="p-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                        o.stato === "Consegnato" ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" :
                        o.stato === "In attesa" ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" :
                        "bg-slate-500/20 text-slate-300 border border-slate-500/30"
                      }`}>
                        {o.stato}
                      </span>
                    </td>
                    <td className="p-2">
                      {o.stato === "In attesa" && (
                        <button
                          onClick={() => apriRicezione(o)}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-medium"
                        >
                          Conferma Ricezione
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* === Modale Ricezione Merce === */}
          {ricezionePending && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 w-full max-w-md space-y-4">
                <h3 className="text-lg font-semibold text-white">Conferma Ricezione</h3>
                <p className="text-sm text-slate-400">
                  Ordine da <span className="text-white font-medium">{ricezionePending.fornitore}</span> — {ricezionePending.nome_prodotto}
                </p>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                    Quantità ricevuta (litri)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={ricezionePending.quantita_ricevuta}
                    onChange={(e) => setRicezionePending({ ...ricezionePending, quantita_ricevuta: e.target.value })}
                    className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Ordinati: {ricezionePending.quantita}L — modifica se ricezione parziale
                  </p>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                    Lotto (opzionale)
                  </label>
                  <input
                    type="text"
                    value={ricezionePending.lotto}
                    onChange={(e) => setRicezionePending({ ...ricezionePending, lotto: e.target.value })}
                    placeholder="es. LOT-2026-04"
                    className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-500 mb-1">
                    Data scadenza (opzionale)
                  </label>
                  <input
                    type="date"
                    value={ricezionePending.data_scadenza}
                    onChange={(e) => setRicezionePending({ ...ricezionePending, data_scadenza: e.target.value })}
                    className="w-full p-2 rounded bg-zinc-800 border border-zinc-700 text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={confermaRicezione}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded font-medium text-sm"
                  >
                    Conferma
                  </button>
                  <button
                    onClick={() => setRicezionePending(null)}
                    className="flex-1 bg-zinc-700 hover:bg-zinc-600 text-white py-2 rounded font-medium text-sm"
                  >
                    Annulla
                  </button>
                </div>
              </div>
            </div>
          )}

          {filtroPagamenti.length > 0 && (
            <div className="text-right text-green-400 font-semibold space-y-1">
              {filtroPagamenti.map((tipo) => (
                <div key={tipo}>
                  💰 Spesa totale {tipo}: €{" "}
                  {totaliPerPagamento[tipo]?.toFixed(2) || "0.00"}
                </div>
              ))}
              <div>🧮 Totale unità ordinate: {totaleQuantita}</div>
              <div>💰 Spesa totale: € {totaleSpeso.toFixed(2)}</div>
            </div>
          )}

          {filtroPagamenti.length === 0 && (
            <div className="text-right text-green-400 font-semibold space-y-1">
              🧮 Totale unità ordinate: {totaleQuantita} <br />
              💰 Spesa totale: € {totaleSpeso.toFixed(2)}
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-gray-400 p-8">
          Applica un filtro per visualizzare gli ordini.
        </div>
      )}
    </div>
  );
};

export default StoricoOrdini;
