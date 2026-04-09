import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Loader,
  FileText,
  List,
  AlignLeft,
  Copy,
  CheckCheck,
  LogOut,
} from "lucide-react";

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

const Flag = ({ code, className = "h-4 w-auto inline-block align-middle" }) => (
  <img src={`https://flagcdn.com/24x18/${code.toLowerCase()}.png`} alt={code} className={className} />
);

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(text ?? "");
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button
      onClick={copy}
      type="button"
      title="Copia"
      className="w-7 h-7 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
    >
      {copied ? <CheckCheck className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// === SectionCard ===
const SECTION_ACCENTS = {
  blue:    { bar: "bg-blue-400",    icon: "text-blue-400",    bgIcon: "bg-blue-500/10 border-blue-500/30" },
  emerald: { bar: "bg-emerald-400", icon: "text-emerald-400", bgIcon: "bg-emerald-500/10 border-emerald-500/30" },
  violet:  { bar: "bg-violet-400",  icon: "text-violet-400",  bgIcon: "bg-violet-500/10 border-violet-500/30" },
};

function SectionCard({ accent, eyebrow, title, count, icon: Icon, children, action }) {
  const a = SECTION_ACCENTS[accent] ?? SECTION_ACCENTS.blue;
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar}/60`} />
      <div className="px-5 sm:px-6 py-5">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-md border ${a.bgIcon} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-4 h-4 ${a.icon}`} />
            </div>
            <div className="min-w-0">
              <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">
                {eyebrow}
              </div>
              <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight leading-tight">
                {title}
                {count != null && (
                  <span className="ml-2 text-xs font-mono text-slate-500">{count}</span>
                )}
              </h2>
            </div>
          </div>
          {action}
        </div>
        {children}
      </div>
    </div>
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

  function hasData(code) {
    const d = dataByMarket[code];
    return d && (d.titolo || d.bullets?.length || d.descrizione);
  }

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
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <FileText className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Testo Listing</span>
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
            <div className="hidden sm:inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/30">
              <Flag code={activeCode} className="h-3 w-auto" />
              <span className="text-[11px] uppercase tracking-[0.12em] text-blue-400 font-medium">{activeCode}</span>
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
            Testo del listing <span className="text-slate-500">— per marketplace.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Titolo, bullet point e descrizione del listing Amazon per ogni paese.
            Seleziona un paese per caricare il contenuto.
          </p>
        </div>
      </section>

      {/* === Tab paesi === */}
      <div className="relative border-b border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="flex gap-1 overflow-x-auto -mb-px scrollbar-none py-2">
            {EU_MARKETPLACES.map(mp => {
              const active = activeCode === mp.code;
              const loaded = hasData(mp.code);
              return (
                <button
                  key={mp.code}
                  onClick={() => { setActiveCode(mp.code); fetchText(mp.code); }}
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap border transition-all ${
                    active
                      ? "bg-blue-500/15 border-blue-500/50 text-blue-200"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <Flag code={mp.code} className="h-3 w-auto" />
                  {mp.label}
                  {loaded && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* === Contenuto === */}
      <div className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8">
        <div className="max-w-4xl mx-auto space-y-5">
          {isLoading || current === undefined ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader className="w-6 h-6 text-blue-400 animate-spin" />
              <p className="text-slate-500 text-sm">Recupero testo da Amazon…</p>
            </div>
          ) : current === null ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 bg-slate-900/60 border border-slate-800 rounded-lg">
              <FileText className="w-10 h-10 text-slate-700" />
              <p className="text-sm text-slate-500">Nessun listing trovato per questo marketplace</p>
            </div>
          ) : (
            <>
              {/* Titolo */}
              <SectionCard
                accent="blue"
                eyebrow="Listing"
                title="Titolo prodotto"
                icon={FileText}
                action={current.titolo && <CopyButton text={current.titolo} />}
              >
                {current.titolo ? (
                  <p className="text-white text-[15px] leading-relaxed">{current.titolo}</p>
                ) : (
                  <p className="text-slate-600 text-sm italic">Titolo non disponibile</p>
                )}
              </SectionCard>

              {/* Bullet points */}
              <SectionCard
                accent="emerald"
                eyebrow="Listing"
                title="Bullet points"
                count={current.bullets?.length > 0 ? `· ${current.bullets.length}` : null}
                icon={List}
                action={
                  current.bullets?.length > 0 && (
                    <CopyButton text={current.bullets.map((b, i) => `${i + 1}. ${b}`).join("\n")} />
                  )
                }
              >
                {current.bullets?.length > 0 ? (
                  <ul className="space-y-2.5">
                    {current.bullets.map((b, i) => (
                      <li key={i} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-5 h-5 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-semibold flex items-center justify-center mt-0.5 tabular-nums">
                          {i + 1}
                        </span>
                        <span className="text-slate-200 text-sm leading-relaxed">{b}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-600 text-sm italic">Bullet points non disponibili</p>
                )}
              </SectionCard>

              {/* Descrizione */}
              <SectionCard
                accent="violet"
                eyebrow="Listing"
                title="Descrizione"
                icon={AlignLeft}
                action={current.descrizione && <CopyButton text={current.descrizione} />}
              >
                {current.descrizione ? (
                  <p className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">{current.descrizione}</p>
                ) : (
                  <p className="text-slate-600 text-sm italic">Descrizione non disponibile</p>
                )}
              </SectionCard>
            </>
          )}
        </div>
      </div>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Listing</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
}
