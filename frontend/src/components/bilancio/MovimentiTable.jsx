import React, { useEffect, useState } from "react";
import { API_BASE, fetchJSON } from "../../utils/api";

export default function MovimentiTable() {
  const [righe, setRighe] = useState([]);
  const [loading, setLoading] = useState(true);

  async function carica() {
    setLoading(true);

    const res = await fetchJSON(`${API_BASE}/bilancio/movimenti`);
    if (res.ok) {
      setRighe(res.data);
    }

    setLoading(false);
  }

  useEffect(() => {
    carica();
  }, []);

  if (loading) return <p className="text-zinc-500">Caricamento…</p>;

  return (
    <div className="overflow-x-auto mt-4 border border-zinc-800 rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-zinc-900 text-zinc-300 border-b border-zinc-800">
          <tr>
            <th className="p-3 text-left">Data</th>
            <th className="p-3 text-left">Tipo</th>
            <th className="p-3 text-left">ID Rif.</th>
            <th className="p-3 text-left">Quantità</th>
            <th className="p-3 text-left">Costo Totale</th>
            <th className="p-3 text-left">Note</th>
          </tr>
        </thead>

        <tbody>
          {righe.map((r, i) => (
            <tr key={i} className="border-b border-zinc-800">
              <td className="p-3">{r.data}</td>
              <td className="p-3 capitalize">{r.tipo}</td>
              <td className="p-3">{r.id_riferimento}</td>
              <td className="p-3">{r.quantita}</td>
              <td className="p-3 text-emerald-400 font-semibold">€ {r.costo_totale}</td>
              <td className="p-3">{r.note || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
