import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { format } from "date-fns";

const Ordini = () => {
  const [ordini, setOrdini] = useState([]);
  const [form, setForm] = useState({
    fornitore: "",
    dataOrdine: null,
    prodotti: "",
    quantita: "",
    costoTotale: "",
    pagamento: "",
    consegnaPrevista: null,
    consegnaEffettiva: null,
    stato: "In attesa",
    note: "",
  });
  const [filtroData, setFiltroData] = useState({ dal: "", al: "" });
  const [fornitoriDisponibili, setFornitoriDisponibili] = useState([]);

  useEffect(() => {
    fetch("http://localhost:3001/api/ordini")
      .then((res) => res.json())
      .then((data) => setOrdini(data));

    fetch("http://localhost:3001/api/fornitori")
      .then((res) => res.json())
      .then((data) => setFornitoriDisponibili(data));
  }, []);

  const aggiornaForm = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const aggiungiOrdine = () => {
    fetch("http://localhost:3001/api/ordini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })
      .then(() => {
        setForm({
          fornitore: "",
          dataOrdine: null,
          prodotti: "",
          quantita: "",
          costoTotale: "",
          pagamento: "",
          consegnaPrevista: null,
          consegnaEffettiva: null,
          stato: "In attesa",
          note: "",
        });
        return fetch("http://localhost:3001/api/ordini");
      })
      .then((res) => res.json())
      .then((data) => setOrdini(data));
  };

  const ordiniFiltrati = ordini.filter((o) => {
    if (!filtroData.dal || !filtroData.al) return true;
    const data = new Date(o.dataOrdine);
    return data >= new Date(filtroData.dal) && data <= new Date(filtroData.al);
  });

  const totaleSpese = ordiniFiltrati.reduce(
    (tot, o) => tot + parseFloat(o.costoTotale || 0),
    0
  );

  return (
    <div className="p-4 sm:p-6 max-w-screen-xl mx-auto text-white">
      <h1 className="text-3xl font-bold mb-6">🧾 Gestione Ordini</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <select
          name="fornitore"
          value={form.fornitore}
          onChange={aggiornaForm}
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white w-full"
          aria-label="Seleziona fornitore"
        >
          <option value="">-- Seleziona Fornitore --</option>
          {fornitoriDisponibili.map((f) => (
            <option key={f.id} value={f.nome}>
              {f.nome}
            </option>
          ))}
        </select>

        <DatePicker
          selected={form.dataOrdine}
          onChange={(date) => setForm({ ...form, dataOrdine: date })}
          placeholderText="Data Ordine"
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white w-full"
          aria-label="Data ordine"
        />

        <input
          name="prodotti"
          value={form.prodotti}
          onChange={aggiornaForm}
          placeholder="Prodotti"
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white w-full"
          aria-label="Prodotti"
        />

        <input
          name="quantita"
          value={form.quantita}
          onChange={aggiornaForm}
          placeholder="Quantità"
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white w-full"
          aria-label="Quantità"
        />

        <input
          name="costoTotale"
          value={form.costoTotale}
          onChange={aggiornaForm}
          placeholder="Costo Totale"
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white w-full"
          aria-label="Costo totale"
        />

        <input
          name="pagamento"
          value={form.pagamento}
          onChange={aggiornaForm}
          placeholder="Metodo di Pagamento"
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white w-full"
          aria-label="Metodo di pagamento"
        />

        <DatePicker
          selected={form.consegnaPrevista}
          onChange={(date) => setForm({ ...form, consegnaPrevista: date })}
          placeholderText="Consegna Prevista"
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white w-full"
          aria-label="Data consegna prevista"
        />

        <DatePicker
          selected={form.consegnaEffettiva}
          onChange={(date) => setForm({ ...form, consegnaEffettiva: date })}
          placeholderText="Consegna Effettiva"
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white w-full"
          aria-label="Data consegna effettiva"
        />

        <select
          name="stato"
          value={form.stato}
          onChange={aggiornaForm}
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white w-full"
          aria-label="Stato ordine"
        >
          <option>In attesa</option>
          <option>In consegna</option>
          <option>Consegnato</option>
        </select>

        <input
          name="note"
          value={form.note}
          onChange={aggiornaForm}
          placeholder="Note"
          className="p-2 rounded bg-zinc-800 border border-zinc-700 text-white w-full"
          aria-label="Note"
        />
      </div>

      <button
        onClick={aggiungiOrdine}
        className="mb-6 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded w-full md:w-auto"
        type="button"
      >
        ➕ Aggiungi Ordine
      </button>

      <div className="mb-4 flex flex-col sm:flex-row items-center gap-2">
        <label className="text-sm">Filtra dal:</label>
        <input
          type="date"
          value={filtroData.dal}
          onChange={(e) => setFiltroData({ ...filtroData, dal: e.target.value })}
          className="p-1 rounded bg-zinc-800 border border-zinc-700 text-white"
          aria-label="Filtro data dal"
        />
        <label className="mx-2 text-sm">al:</label>
        <input
          type="date"
          value={filtroData.al}
          onChange={(e) => setFiltroData({ ...filtroData, al: e.target.value })}
          className="p-1 rounded bg-zinc-800 border border-zinc-700 text-white"
          aria-label="Filtro data al"
        />
      </div>

      <div className="overflow-auto rounded border border-zinc-700">
        <table className="min-w-full text-sm text-left text-white">
          <thead className="text-xs uppercase bg-zinc-700 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2">Fornitore</th>
              <th className="px-4 py-2">Data</th>
              <th className="px-4 py-2">Prodotti</th>
              <th className="px-4 py-2">Quantità</th>
              <th className="px-4 py-2">Totale</th>
              <th className="px-4 py-2">Pagamento</th>
              <th className="px-4 py-2">Stato</th>
            </tr>
          </thead>
          <tbody>
            {ordiniFiltrati.map((o) => (
              <tr key={o.id} className="border-t border-zinc-700">
                <td className="px-4 py-2">{o.fornitore}</td>
                <td className="px-4 py-2">{format(new Date(o.dataOrdine), "dd/MM/yyyy")}</td>
                <td className="px-4 py-2">{o.prodotti}</td>
                <td className="px-4 py-2">{o.quantita}</td>
                <td className="px-4 py-2">€ {parseFloat(o.costoTotale).toFixed(2)}</td>
                <td className="px-4 py-2">{o.pagamento}</td>
                <td className="px-4 py-2">{o.stato}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-right font-bold text-lg">
        Totale Spese: € {totaleSpese.toFixed(2)}
      </div>
    </div>
  );
};

export default Ordini;
