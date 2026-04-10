import { useEffect, useState } from "react";
import { DollarSign, Package, Droplet, Wrench } from "lucide-react";

export default function RiepilogoValori() {
  const [dati, setDati] = useState(null);
  const [loading, setLoading] = useState(true);

  async function caricaValori() {
    try {
      const res = await fetch("/api/v2/bilancio/catalogo");
      const json = await res.json();
      if (json.ok && Array.isArray(json.data)) {
        const elenco = json.data;
        const valoreProdotti = elenco.filter(e => e.tipo === "prodotto").reduce((s, e) => s + (e.valore_totale || 0), 0);
        const valoreAccessori = elenco.filter(e => e.tipo === "accessorio").reduce((s, e) => s + (e.valore_totale || 0), 0);
        const valoreSfuso = elenco.filter(e => e.tipo === "sfuso").reduce((s, e) => s + (e.valore_totale || 0), 0);
        setDati({ valoreProdotti, valoreAccessori, valoreSfuso, totale: valoreProdotti + valoreAccessori + valoreSfuso });
      }
    } catch (err) { console.error("Errore caricamento riepilogo:", err); }
    setLoading(false);
  }

  useEffect(() => { caricaValori(); }, []);

  if (loading || !dati) return <p className="text-sm text-slate-500">Caricamento...</p>;

  const cards = [
    { label: "Prodotti Finiti", value: dati.valoreProdotti, icon: Package, color: "emerald" },
    { label: "Sfuso", value: dati.valoreSfuso, icon: Droplet, color: "blue" },
    { label: "Accessori", value: dati.valoreAccessori, icon: Wrench, color: "amber" },
    { label: "Totale Magazzino", value: dati.totale, icon: DollarSign, color: "rose" },
  ];

  const colorMap = {
    emerald: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    blue:    "text-blue-400 bg-blue-500/10 border-blue-500/30",
    amber:   "text-amber-400 bg-amber-500/10 border-amber-500/30",
    rose:    "text-rose-400 bg-rose-500/10 border-rose-500/30",
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map(c => {
        const Icon = c.icon;
        return (
          <div key={c.label} className="bg-slate-900/60 border border-slate-800 rounded-lg px-5 py-4">
            <div className={`w-8 h-8 rounded-md border flex items-center justify-center mb-3 ${colorMap[c.color]}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div className="text-xl font-semibold text-white tabular-nums">
              {"\u20AC"} {c.value.toFixed(2)}
            </div>
            <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{c.label}</div>
          </div>
        );
      })}
    </div>
  );
}
