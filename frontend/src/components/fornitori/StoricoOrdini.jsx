import React, { useState, useEffect } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "sonner";
import { RefreshCw, Package, X } from "lucide-react";

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors";
const datePickerCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500";

const StoricoOrdini = () => {
  const [ordini, setOrdini] = useState([]);
  const [fornitori, setFornitori] = useState([]);
  const [ricezionePending, setRicezionePending] = useState(null);

  const [filtroFornitore, setFiltroFornitore] = useState("");
  const [filtroDataInizio, setFiltroDataInizio] = useState(null);
  const [filtroDataFine, setFiltroDataFine] = useState(null);
  const [ricercaLibera, setRicercaLibera] = useState("");
  const [filtroPagamenti, setFiltroPagamenti] = useState([]);

  useEffect(() => {
    fetch("/api/v2/fornitori").then((res) => res.json()).then(setFornitori);
    fetch("/api/v2/fornitori/ordini-tutti").then((res) => res.json()).then(setOrdini);
  }, []);

  const togglePagamento = (pagamento) => {
    setFiltroPagamenti((prev) =>
      prev.includes(pagamento) ? prev.filter((p) => p !== pagamento) : [...prev, pagamento]
    );
  };

  const resetFiltri = () => {
    setFiltroFornitore("");
    setFiltroDataInizio(null);
    setFiltroDataFine(null);
    setRicercaLibera("");
    setFiltroPagamenti([]);
  };

  const reloadOrdini = () => {
    fetch("/api/v2/fornitori/ordini-tutti").then((res) => res.json()).then(setOrdini);
  };

  const apriRicezione = (ordine) => {
    setRicezionePending({
      id: ordine.id,
      quantita: ordine.quantita || 0,
      quantita_ricevuta: ordine.quantita || 0,
      numero_ddt: "",
      data_ricezione: new Date().toISOString().slice(0, 10),
      lotto: "",
      data_scadenza: "",
      fornitore: ordine.fornitore,
      nome_prodotto: ordine.nome_prodotto || ordine.prodotti,
    });
  };

  const confermaRicezione = async () => {
    if (!ricezionePending) return;
    if (!ricezionePending.numero_ddt.trim()) { toast.error("Inserisci il numero DDT"); return; }
    try {
      const res = await fetch(`/api/v2/fornitori/ordini/${ricezionePending.id}/ricevi`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantita_ricevuta: Number(ricezionePending.quantita_ricevuta),
          numero_ddt: ricezionePending.numero_ddt.trim(),
          data_ricezione: ricezionePending.data_ricezione,
          lotto: ricezionePending.lotto || undefined,
          data_scadenza: ricezionePending.data_scadenza || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Errore ricezione");
      toast.success(data.message || `Ricezione confermata: ${ricezionePending.quantita_ricevuta}L`);
      setRicezionePending(null);
      reloadOrdini();
    } catch (err) {
      toast.error(err.message);
      setRicezionePending(null);
    }
  };

  const filtroAttivo = filtroFornitore || filtroDataInizio || filtroDataFine || ricercaLibera.trim() !== "" || filtroPagamenti.length > 0;

  const ordiniFiltrati = filtroAttivo
    ? ordini.filter((o) => {
      if (filtroFornitore && o.fornitore !== filtroFornitore) return false;
      if (filtroDataInizio && new Date(o.dataOrdine) < filtroDataInizio) return false;
      if (filtroDataFine && new Date(o.dataOrdine) > filtroDataFine) return false;
      if (filtroPagamenti.length > 0 && !filtroPagamenti.some((pag) => pag.toLowerCase() === (o.pagamento || "").toLowerCase())) return false;
      if (ricercaLibera) {
        const ricerca = ricercaLibera.toLowerCase();
        if (!o.prodotti?.toLowerCase().includes(ricerca) && !o.sku?.toLowerCase().includes(ricerca) && !o.asin?.toLowerCase().includes(ricerca)) return false;
      }
      return true;
    })
    : [];

  const totaliPerPagamento = filtroPagamenti.length > 0
    ? filtroPagamenti.reduce((acc, tipo) => {
      acc[tipo] = ordiniFiltrati.filter((o) => o.pagamento?.toLowerCase() === tipo.toLowerCase()).reduce((sum, o) => sum + parseFloat(o.costoTotale || 0), 0);
      return acc;
    }, {})
    : {};

  const totaleQuantita = ordiniFiltrati.reduce((acc, o) => acc + parseInt(o.quantita || 0, 10), 0);
  const totaleSpeso = ordiniFiltrati.reduce((acc, o) => acc + parseFloat(o.costoTotale || 0), 0);

  const fmtDate = (d) => {
    const date = new Date(d);
    if (isNaN(date)) return d;
    return date.toLocaleDateString("it-IT");
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-5 text-slate-100">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-semibold">Storico Ordini</h2>
        <button
          onClick={resetFiltri}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-medium transition-colors"
        >
          <RefreshCw size={14} />
          Reset filtri
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 mb-5">
        <select value={filtroFornitore} onChange={(e) => setFiltroFornitore(e.target.value)} className={inputCls}>
          <option value="">Tutti i fornitori</option>
          {fornitori.map((f) => <option key={f.id} value={f.nome}>{f.nome}</option>)}
        </select>

        <input type="text" placeholder="Cerca per nome, SKU o ASIN" value={ricercaLibera} onChange={(e) => setRicercaLibera(e.target.value)} className={inputCls} />

        <DatePicker selected={filtroDataInizio} onChange={(date) => setFiltroDataInizio(date)} className={datePickerCls} placeholderText="Data inizio" dateFormat="dd/MM/yyyy" isClearable />
        <DatePicker selected={filtroDataFine} onChange={(date) => setFiltroDataFine(date)} className={datePickerCls} placeholderText="Data fine" dateFormat="dd/MM/yyyy" isClearable />

        <div></div>

        <div className="bg-slate-800/60 border border-slate-700 rounded-lg p-3 space-y-1">
          <label className="text-xs text-slate-400 font-medium">Filtra Pagamento:</label>
          {["Carta", "Bonifico", "Contrassegno", "PayPal"].map((tipo) => (
            <div key={tipo} className="flex items-center gap-2">
              <input type="checkbox" id={`pag-${tipo}`} checked={filtroPagamenti.includes(tipo)} onChange={() => togglePagamento(tipo)} className="accent-blue-500" />
              <label htmlFor={`pag-${tipo}`} className="text-sm text-slate-300">{tipo}</label>
            </div>
          ))}
        </div>
      </div>

      {filtroAttivo ? (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-slate-700 rounded-lg overflow-hidden">
              <thead>
                <tr className="bg-slate-800 text-xs text-slate-400 uppercase tracking-wider text-left">
                  <th className="p-2.5">Fornitore</th>
                  <th className="p-2.5">Data Ordine</th>
                  <th className="p-2.5">Prodotti</th>
                  <th className="p-2.5 text-center">Quantita</th>
                  <th className="p-2.5 text-center">Costo</th>
                  <th className="p-2.5 text-center">Pagamento</th>
                  <th className="p-2.5 text-center">Stato</th>
                  <th className="p-2.5 text-center">Azioni</th>
                </tr>
              </thead>
              <tbody>
                {ordiniFiltrati.length === 0 ? (
                  <tr><td colSpan="8" className="text-center p-6 text-slate-500">Nessun ordine trovato.</td></tr>
                ) : (
                  ordiniFiltrati.map((o) => (
                    <tr key={o.id} className="border-t border-slate-700/60 hover:bg-slate-800/30">
                      <td className="p-2.5 text-slate-200">{o.fornitore}</td>
                      <td className="p-2.5 text-slate-300 tabular-nums">{fmtDate(o.dataOrdine)}</td>
                      <td className="p-2.5 text-slate-300">{o.prodotti || o.nome_prodotto}</td>
                      <td className="p-2.5 text-center tabular-nums">{o.quantita}</td>
                      <td className="p-2.5 text-center tabular-nums">{o.costoTotale ? `${o.costoTotale}` : "—"}</td>
                      <td className="p-2.5 text-center text-slate-400">{o.pagamento || "—"}</td>
                      <td className="p-2.5 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          o.stato === "Consegnato" ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30" :
                          o.stato === "In attesa" ? "bg-amber-500/10 text-amber-300 border border-amber-500/30" :
                          "bg-slate-500/10 text-slate-300 border border-slate-500/30"
                        }`}>
                          {o.stato}
                        </span>
                      </td>
                      <td className="p-2.5 text-center">
                        {o.stato === "In attesa" && (
                          <button
                            onClick={() => apriRicezione(o)}
                            className="px-2.5 py-1 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-medium transition-colors"
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
          </div>

          {/* Modale Ricezione Merce */}
          {ricezionePending && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-slate-900 border border-slate-700 rounded-lg w-full max-w-md shadow-2xl">
                <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Package size={20} className="text-emerald-400" />
                    Conferma Ricezione
                  </h3>
                  <button onClick={() => setRicezionePending(null)} className="text-slate-500 hover:text-white"><X size={18} /></button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2">
                    <p className="text-xs text-slate-500">Ordine da <span className="text-white font-medium">{ricezionePending.fornitore}</span></p>
                    <p className="text-sm text-slate-300">{ricezionePending.nome_prodotto}</p>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Numero DDT *</label>
                    <input type="text" value={ricezionePending.numero_ddt} onChange={(e) => setRicezionePending({ ...ricezionePending, numero_ddt: e.target.value })} className={inputCls} placeholder="es. DDT-2026/0042" />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Data ricezione *</label>
                    <input type="date" value={ricezionePending.data_ricezione} onChange={(e) => setRicezionePending({ ...ricezionePending, data_ricezione: e.target.value })} className={inputCls} />
                  </div>

                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Quantita ricevuta (L) — {ricezionePending.quantita}L ordinati</label>
                    <input type="number" step="0.1" min="0.1" value={ricezionePending.quantita_ricevuta} onChange={(e) => setRicezionePending({ ...ricezionePending, quantita_ricevuta: e.target.value })} className={inputCls} />
                    {Number(ricezionePending.quantita_ricevuta) > 0 && Number(ricezionePending.quantita_ricevuta) < ricezionePending.quantita && (
                      <p className="text-xs text-amber-400 mt-1">Ricezione parziale: i {(ricezionePending.quantita - Number(ricezionePending.quantita_ricevuta)).toFixed(1)}L rimanenti resteranno in attesa</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Lotto</label>
                      <input type="text" value={ricezionePending.lotto} onChange={(e) => setRicezionePending({ ...ricezionePending, lotto: e.target.value })} className={inputCls} placeholder="opzionale" />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Scadenza lotto</label>
                      <input type="date" value={ricezionePending.data_scadenza} onChange={(e) => setRicezionePending({ ...ricezionePending, data_scadenza: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                </div>
                <div className="p-5 border-t border-slate-800 flex gap-3">
                  <button onClick={() => setRicezionePending(null)} className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium transition-colors">
                    Annulla
                  </button>
                  <button onClick={confermaRicezione} className="flex-1 py-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-sm font-medium transition-all">
                    Conferma
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="mt-4 text-right space-y-1">
            {filtroPagamenti.length > 0 && filtroPagamenti.map((tipo) => (
              <p key={tipo} className="text-sm text-emerald-400">Spesa {tipo}: {totaliPerPagamento[tipo]?.toFixed(2) || "0.00"}</p>
            ))}
            <p className="text-sm text-slate-400">Totale unita ordinate: <span className="text-white tabular-nums">{totaleQuantita}</span></p>
            <p className="text-sm text-emerald-400">Spesa totale: <span className="font-semibold tabular-nums">{totaleSpeso.toFixed(2)}</span></p>
          </div>
        </>
      ) : (
        <div className="text-center text-slate-500 p-8">
          Applica un filtro per visualizzare gli ordini.
        </div>
      )}
    </div>
  );
};

export default StoricoOrdini;
