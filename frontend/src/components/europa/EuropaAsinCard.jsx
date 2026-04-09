import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, RefreshCw, ChevronDown, ChevronUp, Trophy, XCircle, Image, Star, FileText } from "lucide-react";
import { toast } from "sonner";

const FLAG = {
  APJ6JRA9NG5V4:  "🇮🇹",
  A13V1IB3VIYZZH: "🇫🇷",
  A1PA6795UKMFR9: "🇩🇪",
  A1RKKUPIHCS9HS: "🇪🇸",
  A1F83G8C2ARO7P: "🇬🇧",
  A1805IZSGTT6HS: "🇳🇱",
  AMEN7PMS3EDWL:  "🇧🇪",
  A2NODRKZP88ZB9: "🇸🇪",
  A1C3SOZRARQ6R3: "🇵🇱",
};

const PAESE = {
  APJ6JRA9NG5V4:  "Italia",
  A13V1IB3VIYZZH: "Francia",
  A1PA6795UKMFR9: "Germania",
  A1RKKUPIHCS9HS: "Spagna",
  A1F83G8C2ARO7P: "UK",
  A1805IZSGTT6HS: "Paesi Bassi",
  AMEN7PMS3EDWL:  "Belgio",
  A2NODRKZP88ZB9: "Svezia",
  A1C3SOZRARQ6R3: "Polonia",
};

const MP_TO_COUNTRY = {
  APJ6JRA9NG5V4: "IT", A13V1IB3VIYZZH: "FR", A1PA6795UKMFR9: "DE",
  A1RKKUPIHCS9HS: "ES", A1F83G8C2ARO7P: "GB", A1805IZSGTT6HS: "NL",
  AMEN7PMS3EDWL: "BE", A2NODRKZP88ZB9: "SE", A1C3SOZRARQ6R3: "PL",
};

export default function EuropaAsinCard({ asin }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState(true);

  async function carica() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v2/europa/dashboard/${asin}`);
      const json = await res.json();
      setData(json);
    } catch {
      toast.error(`Errore caricamento dati per ${asin}`);
    } finally {
      setLoading(false);
    }
  }

  async function sync() {
    setSyncing(true);
    try {
      const res = await fetch(`/api/v2/europa/sync/${asin}`, { method: "POST" });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      toast.success(`Sync completato — ${json.alertsFired?.length ?? 0} alert scattati`);
      await carica();
    } catch (err) {
      toast.error(`Sync fallito: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => { carica(); }, [asin]);

  const immagine = data?.marketplaces?.[0]?.immagine;
  const titolo = data?.marketplaces?.[0]?.titolo ?? asin;
  const primaCountry = MP_TO_COUNTRY[data?.marketplaces?.[0]?.marketplaceId] ?? "IT";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      {/* Header card */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
        {immagine && (
          <img src={immagine} alt={titolo} className="w-14 h-14 object-contain rounded-lg bg-white p-1 flex-shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-500 font-mono">{asin}</p>
          <p className="text-sm font-semibold text-white truncate">{titolo}</p>
          {data?.rules?.length > 0 && (
            <p className="text-xs text-blue-400">{data.rules.filter(r => r.abilitato).length} regole alert attive</p>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => navigate(`/uffici/listing/immagini/${asin}/${primaCountry}`)} title="Immagini" className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
            <Image className="w-4 h-4 text-zinc-400" />
          </button>
          <button onClick={() => navigate(`/uffici/listing/aplus/${asin}/${primaCountry}`)} title="A+ Content" className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
            <Star className="w-4 h-4 text-zinc-400" />
          </button>
          <button onClick={() => navigate(`/uffici/listing/${asin}`)} title="Listing dettaglio" className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
            <FileText className="w-4 h-4 text-zinc-400" />
          </button>
          <button onClick={() => navigate(`/europe/alert-config/${asin}`)} title="Configura alert" className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
            <Settings className="w-4 h-4 text-zinc-400" />
          </button>
          <button onClick={sync} disabled={syncing} title="Sincronizza ora" className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
            <RefreshCw className={`w-4 h-4 text-zinc-400 ${syncing ? "animate-spin" : ""}`} />
          </button>
          <button onClick={() => setExpanded(e => !e)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
            {expanded ? <ChevronUp className="w-4 h-4 text-zinc-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
          </button>
        </div>
      </div>

      {/* Tabella marketplace */}
      {expanded && (
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-zinc-500 text-sm animate-pulse">Caricamento dati SP-API…</div>
          ) : !data?.marketplaces?.length ? (
            <div className="p-6 text-center text-zinc-500 text-sm">Nessun dato disponibile</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-zinc-500 text-xs border-b border-zinc-800">
                  <th className="text-left px-4 py-3">Marketplace</th>
                  <th className="text-left px-4 py-3">Titolo</th>
                  <th className="text-right px-4 py-3">Prezzo</th>
                  <th className="text-center px-4 py-3">Buy Box</th>
                  <th className="text-center px-4 py-3">Stato</th>
                  <th className="text-right px-4 py-3">Stock FBA</th>
                  <th className="text-right px-4 py-3">Totale</th>
                </tr>
              </thead>
              <tbody>
                {data.marketplaces.map(mp => {
                  const listing = mp.listing?.summaries?.[0] ?? {};
                  const buybox = listing.buyBoxWon;
                  const prezzo = listing.price;
                  const stock = mp.stock; // da fba_stock DB

                  return (
                    <tr key={mp.marketplaceId} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-base mr-2">{FLAG[mp.marketplaceId] ?? "🌍"}</span>
                        <span className="text-zinc-300">{PAESE[mp.marketplaceId] ?? mp.paese}</span>
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <span className="text-white text-xs truncate block">{mp.titolo ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap text-zinc-200">
                        {prezzo ? `${prezzo.amount.toFixed(2)} ${prezzo.currencyCode}` : "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {buybox === true ? (
                          <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-medium">
                            <Trophy className="w-3.5 h-3.5" /> Sì
                          </span>
                        ) : buybox === false ? (
                          <span className="inline-flex items-center gap-1 text-red-400 text-xs font-medium">
                            <XCircle className="w-3.5 h-3.5" /> No
                          </span>
                        ) : <span className="text-zinc-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          mp.stato === "BUYABLE" ? "bg-emerald-500/10 text-emerald-400" :
                          mp.stato === "UNKNOWN" ? "bg-zinc-700 text-zinc-400" :
                          "bg-yellow-500/10 text-yellow-400"
                        }`}>
                          {mp.stato ?? "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {stock !== null ? (
                          <span className={`font-semibold ${stock.quantity > 0 ? "text-white" : "text-red-400"}`}>
                            {stock.quantity}
                          </span>
                        ) : <span className="text-zinc-600 text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-zinc-500 text-xs">
                        {stock?.stock_totale != null && stock.stock_totale !== stock.quantity
                          ? stock.stock_totale
                          : ""}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Alert recenti */}
      {expanded && data?.recentEvents?.length > 0 && (
        <div className="border-t border-zinc-800 p-4">
          <p className="text-xs text-zinc-500 mb-2">Alert recenti</p>
          <div className="space-y-1.5">
            {data.recentEvents.slice(0, 3).map(ev => (
              <div key={ev.id} className={`text-xs px-3 py-2 rounded-lg ${ev.letto ? "bg-zinc-800/40 text-zinc-500" : "bg-yellow-500/10 border border-yellow-500/20 text-yellow-300"}`}>
                {ev.messaggio}
                <span className="text-zinc-600 ml-2">{new Date(ev.created_at).toLocaleString("it-IT")}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
