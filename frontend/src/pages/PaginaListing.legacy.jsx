import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader, FileText, List, AlignLeft, Copy, CheckCheck } from "lucide-react";

const EU_MARKETPLACES = [
  { code: "IT", label: "Italia",   id: "APJ6JRA9NG5V4"  },
  { code: "DE", label: "Germania", id: "A1PA6795UKMFR9"  },
  { code: "FR", label: "Francia",  id: "A13V1IB3VIYZZH"  },
  { code: "ES", label: "Spagna",   id: "A1RKKUPIHCS9HS"  },
  { code: "GB", label: "UK",       id: "A1F83G8C2ARO7P"  },
  { code: "NL", label: "Olanda",   id: "A1805IZSGTT6HS"  },
  { code: "BE", label: "Belgio",   id: "AMEN7PMS3EDWL"   },
  { code: "PL", label: "Polonia",  id: "A1C3SOZRARQ6R3"  },
];

const Flag = ({ code }) => (
  <img src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`} alt={code} className="h-4 w-auto inline-block align-middle" />
);

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-all" title="Copia">
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

export default function PaginaListing() {
  const { asin, paese } = useParams();
  const navigate = useNavigate();

  const defaultCode = EU_MARKETPLACES.find(
    m => m.code === paese || m.label.toLowerCase() === paese?.toLowerCase()
  )?.code ?? "IT";

  const [activeCode, setActiveCode] = useState(defaultCode);
  const [dataByMarket, setDataByMarket] = useState({});
  const [loading, setLoading] = useState({});

  async function fetchText(code) {
    if (dataByMarket[code] !== undefined) return;
    const mp = EU_MARKETPLACES.find(m => m.code === code);
    if (!mp) return;
    setLoading(p => ({ ...p, [code]: true }));
    try {
      const res = await fetch(`/api/v2/catalog-amazon/listing-text/${asin}?marketplaceId=${mp.id}`);
      const data = await res.json();
      setDataByMarket(p => ({ ...p, [code]: data.error ? null : data }));
    } catch {
      setDataByMarket(p => ({ ...p, [code]: null }));
    } finally {
      setLoading(p => ({ ...p, [code]: false }));
    }
  }

  useEffect(() => { fetchText(activeCode); }, [activeCode]);

  const current = dataByMarket[activeCode];
  const isLoading = loading[activeCode];

  // Verifica se un paese ha dati caricati
  function hasData(code) {
    const d = dataByMarket[code];
    return d && (d.titolo || d.bullets?.length || d.descrizione);
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-all">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Testo Listing</h1>
            <p
              className="text-xs text-zinc-500 font-mono cursor-pointer hover:text-white transition-colors"
              onClick={() => navigator.clipboard.writeText(asin)}
              title="Clicca per copiare"
            >{asin}</p>
          </div>
        </div>
      </div>

      {/* Tab paesi */}
      <div className="flex gap-1 overflow-x-auto px-6 py-3 bg-zinc-900/50 border-b border-zinc-800">
        {EU_MARKETPLACES.map(mp => (
          <button
            key={mp.code}
            onClick={() => { setActiveCode(mp.code); fetchText(mp.code); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all
              ${activeCode === mp.code
                ? "bg-blue-600 text-white"
                : hasData(mp.code)
                  ? "bg-zinc-800 text-white"
                  : "bg-zinc-800 text-zinc-500 hover:text-white"}`}
          >
            <Flag code={mp.code} /> {mp.label}
            {hasData(mp.code) && (
              <span className="w-1.5 h-1.5 bg-green-400 rounded-full ml-0.5" />
            )}
          </button>
        ))}
      </div>

      {/* Contenuto */}
      <div className="p-6 max-w-4xl mx-auto space-y-5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-zinc-400 text-sm">Recupero testo da Amazon…</p>
          </div>
        ) : current === null ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <FileText className="w-12 h-12 text-zinc-700" />
            <p className="text-zinc-400">Nessun listing trovato per questo marketplace</p>
          </div>
        ) : current === undefined ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
            <Loader className="w-6 h-6 animate-spin" />
          </div>
        ) : (
          <>
            {/* Titolo */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-semibold text-blue-400 uppercase tracking-wide">Titolo</span>
                </div>
                {current.titolo && <CopyButton text={current.titolo} />}
              </div>
              {current.titolo ? (
                <p className="text-white text-base leading-relaxed">{current.titolo}</p>
              ) : (
                <p className="text-zinc-600 italic text-sm">Titolo non disponibile</p>
              )}
            </div>

            {/* Bullet points */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <List className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-semibold text-emerald-400 uppercase tracking-wide">
                    Bullet Points {current.bullets?.length > 0 && `(${current.bullets.length})`}
                  </span>
                </div>
                {current.bullets?.length > 0 && (
                  <CopyButton text={current.bullets.map((b, i) => `${i+1}. ${b}`).join("\n")} />
                )}
              </div>
              {current.bullets?.length > 0 ? (
                <ul className="space-y-2">
                  {current.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs flex items-center justify-center font-bold mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-zinc-200 text-sm leading-relaxed">{b}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-zinc-600 italic text-sm">Bullet points non disponibili</p>
              )}
            </div>

            {/* Descrizione */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-semibold text-purple-400 uppercase tracking-wide">Descrizione</span>
                </div>
                {current.descrizione && <CopyButton text={current.descrizione} />}
              </div>
              {current.descrizione ? (
                <p className="text-zinc-200 text-sm leading-relaxed whitespace-pre-wrap">{current.descrizione}</p>
              ) : (
                <p className="text-zinc-600 italic text-sm">Descrizione non disponibile</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
