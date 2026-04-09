import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, ExternalLink, Loader } from "lucide-react";

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

  const images = imagesByMarket[activeCode] ?? null;

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="bg-zinc-900 border-b border-zinc-800 px-6 py-4 flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-lg font-bold">Immagini Listing</h1>
          <p className="text-xs text-zinc-500 font-mono">{asin}</p>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto px-6 py-3 bg-zinc-900/50 border-b border-zinc-800">
        {EU_MARKETPLACES.map(mp => (
          <button key={mp.code}
            onClick={() => { setActiveCode(mp.code); fetchImages(mp.code); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all
              ${activeCode === mp.code ? "bg-blue-600 text-white" : "bg-zinc-800 text-zinc-400 hover:text-white"}`}>
            <Flag code={mp.code} /> {mp.label}
            {imagesByMarket[mp.code]?.length > 0 && (
              <span className="text-xs bg-white/20 px-1.5 rounded-full">{imagesByMarket[mp.code].length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="p-6">
        {loading[activeCode] ? (
          <div className="flex items-center justify-center h-48 text-zinc-500">
            <Loader className="w-6 h-6 animate-spin mr-2" /> Caricamento…
          </div>
        ) : images === null ? (
          <div className="text-center text-zinc-600 py-12">Seleziona un marketplace</div>
        ) : images.length === 0 ? (
          <div className="text-center text-zinc-600 py-12">
            Nessuna immagine trovata per <Flag code={activeCode} /> {activeCode}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {images.map((img, i) => (
              <div key={i} className="bg-white rounded-xl overflow-hidden shadow cursor-pointer group"
                onClick={() => setLightbox(img.link)}>
                <img src={img.link} alt={img.variant}
                  className="w-full aspect-square object-contain p-2 group-hover:scale-105 transition-transform duration-200" />
                <div className="bg-zinc-100 px-2 py-1.5 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-zinc-600">{img.variant}</span>
                  <span className="text-xs text-zinc-400">{img.width}×{img.height}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lightbox && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}>
          <div className="relative max-w-3xl w-full" onClick={e => e.stopPropagation()}>
            <img src={lightbox} alt="" className="w-full h-auto max-h-[85vh] object-contain rounded-xl bg-white p-2" />
            <div className="flex gap-2 mt-3 justify-center">
              <a href={lightbox} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 rounded-lg text-sm">
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
