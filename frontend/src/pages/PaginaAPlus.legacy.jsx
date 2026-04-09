import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader, Star, AlertCircle } from "lucide-react";

const EU_MARKETPLACES = [
  { code: "IT", label: "Italia",   id: "APJ6JRA9NG5V4"  },
  { code: "DE", label: "Germania", id: "A1PA6795UKMFR9"  },
  { code: "FR", label: "Francia",  id: "A13V1IB3VIYZZH" },
  { code: "ES", label: "Spagna",   id: "A1RKKUPIHCS9HS"  },
  { code: "GB", label: "UK",       id: "A1F83G8C2ARO7P"  },
  { code: "NL", label: "Olanda",   id: "A1805IZSGTT6HS"  },
  { code: "BE", label: "Belgio",   id: "AMEN7PMS3EDWL"   },
  { code: "SE", label: "Svezia",   id: "A2NODRKZP88ZB9"  },
  { code: "PL", label: "Polonia",  id: "A1C3SOZRARQ6R3"  },
];
const Flag = ({ code }) => (
  <img src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`} alt={code} className="h-4 w-auto inline-block align-middle" />
);
const AMAZON_DOMAIN = { IT:"amazon.it", DE:"amazon.de", FR:"amazon.fr", ES:"amazon.es", GB:"amazon.co.uk", NL:"amazon.nl", BE:"amazon.com.be", SE:"amazon.se", PL:"amazon.pl" };

export default function PaginaAplus() {
  const { asin, paese } = useParams();
  const navigate = useNavigate();

  const defaultCode = EU_MARKETPLACES.find(
    m => m.code === paese || m.label.toLowerCase() === paese?.toLowerCase()
  )?.code ?? "IT";

  const [activeCode, setActiveCode] = useState(defaultCode);
  const [dataByMarket, setDataByMarket] = useState({});
  const [loading, setLoading] = useState({});
  const [lightbox, setLightbox] = useState(null);

  async function fetchAplus(code) {
    if (dataByMarket[code] !== undefined) return;
    const mp = EU_MARKETPLACES.find(m => m.code === code);
    if (!mp) return;
    setLoading(p => ({ ...p, [code]: true }));
    try {
      const res = await fetch(`/api/v2/catalog-amazon/aplus/${asin}?marketplaceId=${mp.id}`);
      const data = await res.json();
      setDataByMarket(p => ({ ...p, [code]: data }));
    } catch {
      setDataByMarket(p => ({ ...p, [code]: { images: [], error: "Errore di rete" } }));
    } finally {
      setLoading(p => ({ ...p, [code]: false }));
    }
  }

  useEffect(() => { fetchAplus(activeCode); }, [activeCode]);

  const current = dataByMarket[activeCode] ?? null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          <div>
            <h1 className="text-lg font-bold">Contenuto A+</h1>
            <p className="text-xs text-zinc-500 font-mono">{asin}</p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto px-6 py-3 bg-zinc-900/50 border-b border-zinc-800">
        {EU_MARKETPLACES.map(mp => (
          <button key={mp.code}
            onClick={() => { setActiveCode(mp.code); fetchAplus(mp.code); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all
              ${activeCode === mp.code ? "bg-yellow-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
            <Flag code={mp.code} /> {mp.label}
            {dataByMarket[mp.code]?.images?.length > 0 && (
              <span className="text-xs bg-white/20 px-1.5 rounded-full">{dataByMarket[mp.code].images.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {loading[activeCode] ? (
          <div className="flex items-center justify-center h-48 text-zinc-500">
            <Loader className="w-6 h-6 animate-spin mr-2" /> Caricamento A+…
          </div>
        ) : current === null ? (
          <div className="text-center text-zinc-600 py-12">Seleziona un marketplace</div>
        ) : current.premiumAplus ? (
          <div className="max-w-lg mx-auto text-center py-12 space-y-4">
            <AlertCircle className="w-10 h-10 mx-auto text-yellow-500/60" />
            <p className="text-white font-medium">Contenuto A+ Premium</p>
            <p className="text-zinc-400 text-sm">
              Questo prodotto usa <strong>Premium A+</strong> — Amazon SP-API non supporta la lettura
              di questo tipo di contenuto (bug noto, limitazione Amazon).
            </p>
            <a
              href={`https://www.${AMAZON_DOMAIN[activeCode]}/dp/${asin}`}
              target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm transition-all">
              <ExternalLink className="w-4 h-4" />
              Visualizza A+ su <Flag code={activeCode} /> {AMAZON_DOMAIN[activeCode]}
            </a>
            <p className="text-xs text-zinc-600">
              Puoi anche gestire i contenuti A+ da{" "}
              <a href="https://sellercentral.amazon.it/enhanced-content/overview" target="_blank" rel="noreferrer"
                className="text-blue-400 hover:underline">Seller Central → A+ Content Manager</a>
            </p>
          </div>
        ) : current.error && !current.images?.length ? (
          <div className="text-center text-zinc-600 py-12">
            <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>Nessun contenuto A+ per <Flag code={activeCode} /> {activeCode}</p>
          </div>
        ) : current.images?.length === 0 ? (
          <div className="text-center text-zinc-600 py-12">
            <Star className="w-10 h-10 mx-auto mb-3 opacity-20" />
            <p>Nessun contenuto A+ trovato per <Flag code={activeCode} /> {activeCode}</p>
          </div>
        ) : (
          <div className="space-y-4 max-w-4xl mx-auto">
            {current.images.map((img, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow cursor-pointer group"
                onClick={() => setLightbox(img.url)}>
                <img src={img.url} alt={img.altText || `A+ modulo ${i + 1}`}
                  className="w-full h-auto object-contain group-hover:opacity-95 transition-opacity" />
                {img.altText && (
                  <div className="bg-zinc-100 px-3 py-1.5">
                    <p className="text-xs text-zinc-500">{img.altText}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-4xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox} alt="" className="w-full h-auto max-h-[85vh] object-contain rounded-xl bg-white" />
            <div className="flex gap-2 mt-3 justify-center">
              <a href={lightbox} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-yellow-600 rounded-lg text-sm">
                <ExternalLink className="w-3.5 h-3.5" /> Apri originale
              </a>
              <button onClick={() => setLightbox(null)}
                className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-sm">Chiudi</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
