import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const StoricoOrdini = () => {
  const [ordini, setOrdini] = useState([]);
  const [fornitori, setFornitori] = useState([]);

  // Filtri
  const [filtroFornitore, setFiltroFornitore] = useState("");
  const [filtroDataInizio, setFiltroDataInizio] = useState(null);
  const [filtroDataFine, setFiltroDataFine] = useState(null);
  const [ricercaLibera, setRicercaLibera] = useState("");
  const [filtroPagamenti, setFiltroPagamenti] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3005/api/v2/fornitori")
      .then((res) => res.json())
      .then(setFornitori);

    fetch("http://localhost:3005/api/v2/fornitori/ordini-tutti")
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
              </tr>
            </thead>
            <tbody>
              {ordiniFiltrati.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-4 text-gray-400">
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
                        if (isNaN(d)) return o.dataOrdine; // fallback in caso non sia una vera data
                        const day = String(d.getDate()).padStart(2, "0");
                        const month = String(d.getMonth() + 1).padStart(2, "0");
                        const year = d.getFullYear();
                        return `${day}/${month}/${year}`;
                      })()}
                    </td>
                    <td className="p-2">{o.prodotti}</td>
                    <td className="p-2">{o.quantita}</td>
                    <td className="p-2">€ {o.costoTotale}</td>
                    <td className="p-2">{o.pagamento}</td>
                    <td className="p-2">{o.stato}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

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
