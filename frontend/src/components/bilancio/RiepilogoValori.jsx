import React, { useEffect, useState } from "react";
import { API_BASE, fetchJSON } from "../../utils/api";

export default function RiepilogoValori() {
  const [dati, setDati] = useState(null);
  const [loading, setLoading] = useState(true);

  async function caricaValori() {
    try {
      const res = await fetchJSON(`${API_BASE}/bilancio/catalogo`);
      if (res.ok && Array.isArray(res.data)) {
        const elenco = res.data;

        const valoreProdotti = elenco
          .filter(e => e.tipo === "prodotto")
          .reduce((sum, e) => sum + (e.valore_totale || 0), 0);

        const valoreAccessori = elenco
          .filter(e => e.tipo === "accessorio")
          .reduce((sum, e) => sum + (e.valore_totale || 0), 0);

        const valoreSfuso = elenco
          .filter(e => e.tipo === "sfuso")
          .reduce((sum, e) => sum + (e.valore_totale || 0), 0);

        setDati({
          valoreProdotti,
          valoreAccessori,
          valoreSfuso,
          totale: valoreProdotti + valoreAccessori + valoreSfuso
        });
      }
    } catch (err) {
      console.error("Errore caricamento riepilogo:", err);
    }
    setLoading(false);
  }

  useEffect(() => {
    caricaValori();
  }, []);

  if (loading || !dati) {
    return <p className="text-zinc-500">Caricamento…</p>;
  }

  return (
    <div className="space-y-3">
      <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
        <p className="font-semibold">Valore Prodotti Finiti</p>
        <p className="text-emerald-400 text-xl font-bold">
          € {dati.valoreProdotti.toFixed(2)}
        </p>
      </div>

      <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
        <p className="font-semibold">Valore Sfuso</p>
        <p className="text-blue-400 text-xl font-bold">
          € {dati.valoreSfuso.toFixed(2)}
        </p>
      </div>

      <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
        <p className="font-semibold">Valore Accessori</p>
        <p className="text-yellow-400 text-xl font-bold">
          € {dati.valoreAccessori.toFixed(2)}
        </p>
      </div>

      <div className="p-4 bg-zinc-900 rounded-lg border border-zinc-600 mt-4">
        <p className="font-semibold text-lg">Totale Magazzino</p>
        <p className="text-pink-400 text-2xl font-bold">
          € {dati.totale.toFixed(2)}
        </p>
      </div>
    </div>
  );
}
