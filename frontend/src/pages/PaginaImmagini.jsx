import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ExternalLink,
  Loader,
  Image as ImageIcon,
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

export default function PaginaImmagini() {
  const { asin, paese } = useParams();
  const navigate = useNavigate();

  const defaultCode = EU_MARKETPLACES.find(
    m => m.code === paese || m.label.toLowerCase() === paese?.toLowerCase()
  )?.code ?? "IT";

  const [activeCode, setActiveCode] = useState(defaultCode);
  const [imagesByMarket, setImagesByMarket] = useState({});
  const [loading, setLoading] = useState({});
  const [lightbox, setLightbox] = useState(null);

  async function fetchImages(code) {
    if (imagesByMarket[code] !== undefined) return;
    const mp = EU_MARKETPLACES.find(m => m.code === code);
    if (!mp) return;
    setLoading(p => ({ ...p, [code]: true }));
    try {
      const res = await fetch(`/api/v2/catalog-amazon/listing-images/${asin}?marketplaceId=${mp.id}`);
      const data = await res.json();
      setImagesByMarket(p => ({ ...p, [code]: Array.isArray(data) ? data : [] }));
    } catch {
      setImagesByMarket(p => ({ ...p, [code]: [] }));
    } finally {
      setLoading(p => ({ ...p, [code]: false }));
    }
  }

  useEffect(() => { fetchImages(activeCode); }, [activeCode]);

  // Chiudi lightbox con ESC
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === "Escape") setLightbox(null); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox]);

  const images = imagesByMarket[activeCode] ?? null;

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
              onClick={() => navigate(`/uffici/listing/${asin}`)}
              type="button"
              title="Indietro"
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-cyan-500/10 border border-cyan-500/40 flex items-center justify-center flex-shrink-0">
              <ImageIcon className="w-[18px] h-[18px] text-cyan-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Immagini Listing</span>
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
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30">
              <Flag code={activeCode} className="h-3 w-auto" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-cyan-400 font-medium">{activeCode}</span>
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
            Immagini del listing <span className="text-slate-500">— per marketplace.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Galleria delle immagini caricate sul listing Amazon per ogni paese.
          </p>
        </div>
      </section>

      {/* === Tab paesi === */}
      <div className="relative border-b border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="flex gap-1 overflow-x-auto -mb-px scrollbar-none py-2">
            {EU_MARKETPLACES.map(mp => {
              const active = activeCode === mp.code;
              const list = imagesByMarket[mp.code];
              const count = Array.isArray(list) ? list.length : null;
              return (
                <button
                  key={mp.code}
                  onClick={() => { setActiveCode(mp.code); fetchImages(mp.code); }}
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap border transition-all ${
                    active
                      ? "bg-cyan-500/15 border-cyan-500/50 text-cyan-200"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <Flag code={mp.code} className="h-3 w-auto" />
                  {mp.label}
                  {count > 0 && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      active ? "bg-cyan-500/20 text-cyan-200" : "bg-slate-800 text-slate-500"
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
            <Loader className="w-6 h-6 text-cyan-400 animate-spin" />
            <p className="text-slate-500 text-sm">Caricamento immagini…</p>
          </div>
        ) : images === null ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-slate-900/60 border border-slate-800 rounded-lg">
            <ImageIcon className="w-10 h-10 text-slate-700" />
            <p className="text-sm text-slate-500">Seleziona un marketplace</p>
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 bg-slate-900/60 border border-slate-800 rounded-lg">
            <ImageIcon className="w-10 h-10 text-slate-700" />
            <p className="text-sm text-slate-500 flex items-center gap-2">
              Nessuna immagine trovata per <Flag code={activeCode} /> {activeCode}
            </p>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Galleria</div>
              <div className="text-[11px] font-mono text-slate-600">{images.length} immagini</div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {images.map((img, i) => (
                <div
                  key={i}
                  onClick={() => setLightbox(img)}
                  className="group bg-slate-900/60 border border-slate-800 hover:border-cyan-500/40 hover:bg-slate-900 rounded-lg overflow-hidden cursor-pointer transition-all"
                >
                  <div className="aspect-square bg-white p-2 flex items-center justify-center">
                    <img
                      src={img.link}
                      alt={img.variant}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                      loading="lazy"
                    />
                  </div>
                  <div className="px-3 py-2 flex items-center justify-between border-t border-slate-800">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-cyan-400">{img.variant}</span>
                    <span className="text-[10px] font-mono text-slate-500 tabular-nums">{img.width}×{img.height}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Listing</span>
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
            className="relative max-w-4xl w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Header lightbox */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Immagine</div>
                  <div className="text-sm font-semibold text-white font-mono">{lightbox.variant}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-slate-500 tabular-nums hidden sm:inline">
                  {lightbox.width}×{lightbox.height}
                </span>
                <button
                  onClick={() => setLightbox(null)}
                  type="button"
                  className="w-8 h-8 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Immagine */}
            <div className="bg-white p-4 flex items-center justify-center max-h-[70vh] overflow-auto">
              <img
                src={lightbox.link}
                alt={lightbox.variant}
                className="max-w-full max-h-[65vh] object-contain"
              />
            </div>

            {/* Footer azioni */}
            <div className="flex gap-2 justify-end px-5 py-3 border-t border-slate-800">
              <a
                href={lightbox.link}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-400/60 text-cyan-300 hover:text-cyan-200 text-xs font-medium transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Apri originale
              </a>
              <a
                href={lightbox.link}
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
