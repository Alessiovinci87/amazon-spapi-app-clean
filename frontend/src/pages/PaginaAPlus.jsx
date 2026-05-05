import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Loader,
  Star,
  AlertCircle,
  X,
  Download,
  LogOut,
} from "lucide-react";

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

const Flag = ({ code, className = "h-4 w-auto inline-block align-middle" }) => (
  <img src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`} alt={code} className={className} />
);

const AMAZON_DOMAIN = {
  IT: "amazon.it", DE: "amazon.de", FR: "amazon.fr", ES: "amazon.es",
  GB: "amazon.co.uk", NL: "amazon.nl", BE: "amazon.com.be", SE: "amazon.se", PL: "amazon.pl",
};

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

  // Chiudi lightbox con ESC
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === "Escape") setLightbox(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const current = dataByMarket[activeCode] ?? null;

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid sottile */}
      <div
        className="absolute inset-0 opacity-[0.035] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => navigate("/uffici/listing")}
              type="button"
              title="Indietro"
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-amber-500/10 border border-amber-500/40 flex items-center justify-center flex-shrink-0">
              <Star className="w-[18px] h-[18px] text-amber-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Contenuto A+</span>
              <span
                className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1 font-mono cursor-pointer hover:text-slate-300 transition-colors"
                onClick={() => navigator.clipboard.writeText(asin)}
                title="Clicca per copiare"
              >
                {asin}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30">
              <Flag code={activeCode} className="h-3 w-auto" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-amber-400 font-medium">{activeCode}</span>
            </div>
            <button
              onClick={() => navigate(`/uffici/listing/${asin}`)}
              type="button"
              title="Esci"
              className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Esci
            </button>
          </div>
        </div>
      </header>

      {/* === Hero compatto === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
            Listing Amazon
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Contenuto A+ <span className="text-slate-500">— per marketplace.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Moduli A+ caricati sul listing Amazon per ogni paese.
          </p>
        </div>
      </section>

      {/* === Tab paesi === */}
      <div className="relative border-b border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="flex gap-1 overflow-x-auto -mb-px scrollbar-none py-2">
            {EU_MARKETPLACES.map(mp => {
              const active = activeCode === mp.code;
              const list = dataByMarket[mp.code]?.images;
              const count = Array.isArray(list) ? list.length : null;
              return (
                <button
                  key={mp.code}
                  onClick={() => { setActiveCode(mp.code); fetchAplus(mp.code); }}
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap border transition-all ${
                    active
                      ? "bg-amber-500/15 border-amber-500/50 text-amber-200"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <Flag code={mp.code} className="h-3 w-auto" />
                  {mp.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      active ? "bg-amber-500/20 text-amber-200" : "bg-slate-800 text-slate-500"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* === Contenuto === */}
      <div className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8">
        {loading[activeCode] ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <Loader className="w-6 h-6 text-amber-400 animate-spin" />
            <p className="text-slate-500 text-sm">Caricamento contenuto A+…</p>
          </div>
        ) : current === null ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-slate-900/60 border border-slate-800 rounded-lg">
            <Star className="w-10 h-10 text-slate-700" />
            <p className="text-sm text-slate-500">Seleziona un marketplace</p>
          </div>
        ) : current.premiumAplus ? (
          <div className="max-w-2xl mx-auto">
            <div className="relative bg-slate-900/60 border border-amber-500/30 rounded-lg overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400/60" />
              <div className="px-6 py-8 text-center">
                <div className="w-12 h-12 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-amber-400 mb-2">Premium A+</div>
                <h2 className="text-lg font-semibold text-white mb-3">Contenuto non disponibile via API</h2>
                <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-md mx-auto">
                  Questo prodotto usa <strong className="text-amber-300">Premium A+</strong> — Amazon SP-API non supporta
                  la lettura di questo tipo di contenuto (limitazione nota di Amazon).
                </p>
                <a
                  href={`https://www.${AMAZON_DOMAIN[activeCode]}/dp/${asin}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Visualizza su {AMAZON_DOMAIN[activeCode]}
                </a>
                <p className="text-[11px] text-slate-600 mt-6">
                  Gestisci i contenuti A+ da{" "}
                  <a
                    href="https://sellercentral.amazon.it/enhanced-content/overview"
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 underline"
                  >
                    Seller Central → A+ Content Manager
                  </a>
                </p>
              </div>
            </div>
          </div>
        ) : (current.error && !current.images?.length) || current.images?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-slate-900/60 border border-slate-800 rounded-lg">
            <Star className="w-10 h-10 text-slate-700" />
            <p className="text-sm text-slate-500 flex items-center gap-2">
              Nessun contenuto A+ per <Flag code={activeCode} /> {activeCode}
            </p>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Moduli A+</div>
              <div className="text-[11px] font-mono text-slate-600">{current.images.length} moduli</div>
            </div>
            <div className="space-y-3">
              {current.images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setLightbox(img)}
                  className="group bg-slate-900/60 border border-slate-800 hover:border-amber-500/40 hover:bg-slate-900 rounded-lg overflow-hidden cursor-pointer transition-all"
                >
                  <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-slate-600">{String(i + 1).padStart(2, "0")}</span>
                      <span className="text-[10px] uppercase tracking-[0.12em] text-amber-400">Modulo</span>
                    </div>
                    <span className="text-[10px] text-slate-600">Click per ingrandire</span>
                  </div>
                  <div className="bg-white">
                    <img
                      src={img.url}
                      alt={img.altText || `A+ modulo ${i + 1}`}
                      className="w-full h-auto object-contain group-hover:opacity-95 transition-opacity"
                      loading="lazy"
                    />
                  </div>
                  {img.altText && (
                    <div className="px-4 py-2 border-t border-slate-800">
                      <p className="text-[11px] text-slate-500 leading-relaxed">{img.altText}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · A+ Content</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>

      {/* === Lightbox === */}
      {lightbox && (
        <div
          className="fixed inset-0 bg-black/90 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-w-5xl w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden max-h-[90vh] flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header lightbox */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 flex-shrink-0">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                  <Star className="w-3.5 h-3.5 text-amber-400" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Modulo A+</div>
                  <div className="text-sm font-semibold text-white truncate">{lightbox.altText || "Contenuto A+"}</div>
                </div>
              </div>
              <button
                onClick={() => setLightbox(null)}
                type="button"
                className="w-8 h-8 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Immagine */}
            <div className="bg-white p-4 flex-1 overflow-auto flex items-start justify-center">
              <img
                src={lightbox.url}
                alt={lightbox.altText || ""}
                className="max-w-full h-auto object-contain"
              />
            </div>

            {/* Footer azioni */}
            <div className="flex gap-2 justify-end px-5 py-3 border-t border-slate-800 flex-shrink-0">
              <a
                href={lightbox.url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Apri originale
              </a>
              <a
                href={lightbox.url}
                download
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                Scarica
              </a>
              <button
                onClick={() => setLightbox(null)}
                type="button"
                className="px-3 py-2 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-medium transition-colors"
              >
                Chiudi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
