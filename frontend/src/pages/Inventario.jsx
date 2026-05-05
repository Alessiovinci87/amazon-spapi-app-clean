import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useNavigate, useLocation } from "react-router-dom";
import FiltroSezioni from "../components/inventario/FiltroSezioni";
import SearchBarInventario from "../components/inventario/SearchBarInventario";
import PulsantiConfermaModifiche from "../components/inventario/PulsantiConfermaModifiche";
import StoricoProdotto from "../components/inventario/StoricoProdotto";
import Inventario12ml from "../components/inventario/Inventario12ml";
import Inventario100ml from "../components/inventario/Inventario100ml";
import InventarioKit from "../components/inventario/InventarioKit";
import Inventario5litri from "../components/inventario/Inventario5litri";
import InventarioAccessori from "../components/inventario/InventarioAccessori";
import { useInventario } from "../hooks/useInventario";
import { normalizzaAccessori } from "../utils/normalizzaAccessori";
import {
  calcolaAccessoriImpegnati,
  registraStorico,
  esportaStoricoCSV,
} from "../utils/gestioneInventario";
import { classificaProdotto } from "../utils/classificaProdotto";
import NuovoProdottoModal from "../components/inventario/NuovoProdottoModal";
import { Package, ArrowLeft, Plus, FileText, AlertCircle, Search, LayoutGrid, History, FolderTree, LogOut, Download } from "lucide-react";
import { downloadCSV } from "../utils/exportCSV";

const STORAGE_KEY = "inventario_prodotti";
const STORAGE_KEY_ACCESSORI = "inventario_accessori";
const STORAGE_KEY_STORICO = "inventario_storico";
const API_BASE =
  import.meta.env?.VITE_API_BASE || "/api/v2";
const CATEGORIE_12ML = [
  "PREPARATORI UNGHIE",
  "OLI CUTICOLE",
  "TRATTAMENTI UNGHIE",
  "SEMIPERMANENTE ONE STEP",
  "TOP / BASE COAT UV",
];

const normalizeUrl = (path) => {
  if (!path) return API_BASE;
  if (/^https?:\/\//i.test(path)) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

const fetchJSON = async (path, options = {}) => {
  const response = await fetch(normalizeUrl(path), options);
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `HTTP ${response.status}`);
  }
  return response.json();
};

const isNumericField = (value) =>
  typeof value === "number" && !Number.isNaN(value);

const deduceMacro = (prodotto, macro) => {
  if (macro) return macro;

  const nome = (prodotto?.nome || "").toLowerCase();
  const formato = (prodotto?.formato || "").toLowerCase();

  const isKit = nome.includes("kit") || formato.includes("kit");
  const has12 = /12\s?ml/.test(nome) || formato.includes("12");
  const has100 = /100\s?ml/.test(nome) || formato.includes("100");
  const has5lt =
    /5\s?(l|lt|litri)/.test(nome) ||
    formato.includes("5l") ||
    formato.includes("5 litri") ||
    formato.includes("5000");

  if (isKit && has12) return "kit+12ml";
  if (isKit) return "kit";
  if (has5lt) return "5litri";
  if (has100) return "100ml";
  if (has12) return "12ml";
  return "altro";
};

const deduceCategoria = (prodotto, categoria, macro) => {
  if (categoria) return categoria;
  if (macro && !["12ml", "kit+12ml"].includes(macro)) return null;

  const nome = (prodotto?.nome || "").toLowerCase();
  if (/primer|prep|cleanser|sgrassatore/.test(nome)) return "PREPARATORI UNGHIE";
  if (/olio|cuticol/.test(nome)) return "OLI CUTICOLE";
  if (/antifungo|trattamento|rinforzante|strengthen|repair/.test(nome))
    return "TRATTAMENTI UNGHIE";
  if (/one\s?step|semipermanente/.test(nome)) return "SEMIPERMANENTE ONE STEP";
  if (/top\s?coat|base\s?coat|uv\s?(top|base)/.test(nome))
    return "TOP / BASE COAT UV";
  return null;
};

const matchSearch = (value, term) =>
  term ? (value || "").toLowerCase().includes(term) : true;

const is12mlProdotto = (prodotto) =>
  prodotto.__macro === "12ml" ||
  prodotto.__macro === "kit+12ml" ||
  /12\s?ml/.test((prodotto.nome || "").toLowerCase());

const is100mlProdotto = (prodotto) =>
  prodotto.__macro === "100ml" ||
  /100\s?ml/.test((prodotto.nome || "").toLowerCase());

const isKitProdotto = (prodotto) =>
  prodotto.__macro === "kit" ||
  prodotto.__macro === "kit+12ml" ||
  (prodotto.pezziPerKit && Number(prodotto.pezziPerKit) > 0) ||
  (prodotto.nome || "").toLowerCase().includes("kit");

const is5litriProdotto = (prodotto) =>
  prodotto.__macro === "5litri" ||
  /(5\s?(l|lt|litri)|5000\s?ml|5\.000\s?ml)/.test(
    (prodotto.nome || "").toLowerCase()
  );

const Inventario = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMagazzino = localStorage.getItem("auth") === "magazzino";
  const {
    prodotti,
    setProdotti,
    prodottiOriginali,
    setProdottiOriginali,
    accessori,
    setAccessori,
  } = useInventario();

  window.prodottiDebug = prodotti;

  const [search, setSearch] = useState(() => new URLSearchParams(location.search).get("search") || "");
  const [storico, setStorico] = useState([]);
  const [modificheInCorso, setModificheInCorso] = useState(false);
  const [mostraStoricoAsin, setMostraStoricoAsin] = useState(null);
  // Permette deep-link alla sezione tramite ?sezione=accessori (o 12ml, 100ml, kit, 5litri).
  // Usato dalla sidebar per il link "Accessori" e dal redirect di /accessori.
  const initialSezione = (() => {
    const q = new URLSearchParams(location.search).get("sezione");
    return q || "12ml";
  })();
  const [sezioneAttiva, setSezioneAttiva] = useState(initialSezione);
  const [categoriaAttiva, setCategoriaAttiva] = useState(null);
  const [showNuovoProdotto, setShowNuovoProdotto] = useState(false);
  const [showNuovoModulo, setShowNuovoModulo] = useState(false);
  const refreshFiltriRef = useRef(null);
  const [nuovoModuloLabel, setNuovoModuloLabel] = useState("");
  const [nuovoModuloIcona, setNuovoModuloIcona] = useState("📦");
  const [nuovoModuloStile, setNuovoModuloStile] = useState("numerico");
  const [creandoModulo, setCreandoModulo] = useState(false);

  // Sincronizza filtri nell'URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (sezioneAttiva && sezioneAttiva !== "12ml") params.set("sezione", sezioneAttiva);
    if (search) params.set("search", search);
    const qs = params.toString();
    const newUrl = qs ? `?${qs}` : location.pathname;
    window.history.replaceState(null, "", newUrl);
  }, [sezioneAttiva, search]);

  const fetchAccessori = useCallback(async () => {
    try {
      const data = await fetchJSON("/accessori");
      const normalizzati = normalizzaAccessori(data);
      setAccessori(normalizzati);
      localStorage.setItem(
        STORAGE_KEY_ACCESSORI,
        JSON.stringify(normalizzati)
      );
    } catch (err) {
      console.error("❌ Errore caricamento accessori:", err);
      const cache = localStorage.getItem(STORAGE_KEY_ACCESSORI);
      if (cache) {
        try {
          setAccessori(JSON.parse(cache));
        } catch {
          // ignore parse errors
        }
      }
    }
  }, [setAccessori]);

  const fetchProdottiBackend = useCallback(async () => {
    try {
      const data = await fetchJSON("/magazzino");
      const lista = Array.isArray(data) ? data : data?.data ?? [];
      if (lista.length === 0) return;

      setProdotti(lista);
      setProdottiOriginali(lista.map((p) => ({ ...p })));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
      console.log("🔄 Prodotti aggiornati dal backend:", lista.length);
    } catch (err) {
      console.error("❌ Errore fetch prodotti:", err);
    }
  }, [setProdotti, setProdottiOriginali]);

  useEffect(() => {
    const cacheStorico = localStorage.getItem(STORAGE_KEY_STORICO);
    if (cacheStorico) {
      try {
        setStorico(JSON.parse(cacheStorico));
      } catch {
        setStorico([]);
      }
    }


    console.log("🔄 Carico prodotti dal backend (sempre)");
    fetchProdottiBackend();


    if (accessori.length === 0) {
      const cacheAccessori = localStorage.getItem(STORAGE_KEY_ACCESSORI);
      if (cacheAccessori) {
        try {
          setAccessori(JSON.parse(cacheAccessori));
        } catch {
          // ignore parse errors
        }
      } else {
        fetchAccessori();
      }
    }
  }, [
    accessori.length,
    fetchAccessori,
    fetchProdottiBackend,
    prodotti?.length,
    setAccessori,
    setProdotti,
    setProdottiOriginali,
  ]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_STORICO, JSON.stringify(storico));
  }, [storico]);

  useEffect(() => {
    if (sezioneAttiva !== "12ml" && categoriaAttiva) {
      setCategoriaAttiva(null);
    }
  }, [sezioneAttiva, categoriaAttiva]);

  useEffect(() => {
    if (accessori.length === 0) {
      fetchAccessori();
    }
  }, [accessori.length, fetchAccessori]);

  useEffect(() => {
    const handler = () => {
      console.log("📦 Evento produzione completata → reload inventario");
      fetchProdottiBackend();
      fetchAccessori();
    };

    window.addEventListener("produzione_completata", handler);
    window.addEventListener("reload_inventario", handler);

    return () => {
      window.removeEventListener("produzione_completata", handler);
      window.removeEventListener("reload_inventario", handler);
    };
  }, [fetchProdottiBackend, fetchAccessori]);


  const confermaUtilizzo = useCallback(
    async (asin, incremento) => {
      try {
        await fetchJSON(`/magazzino/${asin}/produce`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qty: Number(incremento) || 0 }),
        });

        setProdotti((prev) => {
          const updated = prev.map((p) =>
            p.asin === asin
              ? { ...p, pronto: Number(p.pronto || 0) + Number(incremento) }
              : p
          );
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });

        await fetchAccessori();
      } catch (err) {
        console.error("❌ Errore confermaUtilizzo:", err);
      }
    },
    [fetchAccessori, setProdotti]
  );

  const confermaModifiche = useCallback(() => {
    const originalByAsin = new Map(
      (prodottiOriginali || []).map((item) => [item.asin, item])
    );

    prodotti.forEach((prodotto) => {
      const originale = originalByAsin.get(prodotto.asin) || {};
      Object.keys(prodotto).forEach((campo) => {
        if (campo === "utilizzo") return;
        const precedente = originale[campo];
        const attuale = prodotto[campo];
        if (String(precedente ?? "") !== String(attuale ?? "")) {
          registraStorico(
            prodotto.asin,
            campo,
            precedente ?? "",
            attuale ?? "",
            setStorico
          );
        }
      });
    });

    const snapshot = prodotti.map((item) => ({ ...item }));
    setProdottiOriginali(snapshot);
    setModificheInCorso(false);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [prodotti, prodottiOriginali, setProdottiOriginali]);

  const annullaModifiche = useCallback(() => {
    if (!prodottiOriginali || prodottiOriginali.length === 0) return;
    const snapshot = prodottiOriginali.map((item) => ({ ...item }));
    setProdotti(snapshot);
    setModificheInCorso(false);
  }, [prodottiOriginali, setProdotti]);

  // === FILTRI ===
  const handleChange = useCallback(
    (asin, campo, valore, isAccessory = false) => {
      setModificheInCorso(true);

      if (isAccessory) {
        setAccessori((prev) => {
          const updated = prev.map((acc) => {
            const identifier = acc.asin_accessorio || acc.asin;
            if (identifier !== asin) return acc;

            const currentValue = acc[campo];
            let nuovoValore = valore;

            if (isNumericField(currentValue)) {
              if (valore === "" || valore === null) {
                nuovoValore = "";
              } else {
                const parsed = Number(valore);
                nuovoValore = Number.isFinite(parsed)
                  ? parsed
                  : Number(currentValue) || 0;
              }
            }

            return { ...acc, [campo]: nuovoValore };
          });

          localStorage.setItem(
            STORAGE_KEY_ACCESSORI,
            JSON.stringify(updated)
          );
          return updated;
        });
        return;
      }

      setProdotti((prev) => {
        const updated = prev.map((p) => {
          if (p.asin !== asin) return p;

          const currentValue = p[campo];
          if (isNumericField(currentValue)) {
            if (valore === "" || valore === null) {
              return { ...p, [campo]: "" };
            }
            const parsed = Number(valore);
            return Number.isFinite(parsed)
              ? { ...p, [campo]: parsed }
              : p;
          }
          return { ...p, [campo]: valore };
        });

        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
    },
    [setAccessori, setProdotti]
  );

  const prodottiClassificati = useMemo(
    () =>
      prodotti.map((prodotto) => {
        const classificazione = classificaProdotto(prodotto) || {};
        const macro = deduceMacro(prodotto, classificazione.macro);
        const categoria = deduceCategoria(
          prodotto,
          classificazione.sotto,
          macro
        );
        return { ...prodotto, __macro: macro, __categoria: categoria };
      }),
    [prodotti]
  );

  const searchTerm = search.trim().toLowerCase();

  const prodottiFiltrati = useMemo(
    () =>
      prodottiClassificati.filter(
        (p) =>
          matchSearch(p.nome, searchTerm) ||
          matchSearch(p.asin, searchTerm) ||
          matchSearch(p.sku, searchTerm)
      ),
    [prodottiClassificati, searchTerm]
  );

  const elementiPerSezione = useMemo(() => {
    switch (sezioneAttiva) {
      case "12ml":
        return prodottiFiltrati.filter(
          (p) =>
            // ✅ fallback: mostra anche i prodotti "altro" per evitare esclusioni spurie
            (is12mlProdotto(p) || p.__macro === "altro" || !p.__macro) &&
            (!categoriaAttiva ||
              (p.__categoria || "").toLowerCase() ===
              categoriaAttiva.toLowerCase())
        );

      case "100ml":
        return prodottiFiltrati.filter(is100mlProdotto);
      case "kit":
        return prodottiFiltrati.filter(isKitProdotto);
      case "5litri":
        return prodottiFiltrati.filter(is5litriProdotto);
      default:
        return prodottiFiltrati;
    }
  }, [categoriaAttiva, prodottiFiltrati, sezioneAttiva]);

  const accessoriFiltrati = useMemo(() => {
    if (!searchTerm) return accessori;
    return accessori.filter(
      (a) =>
        matchSearch(a.nome, searchTerm) ||
        matchSearch(a.asin_accessorio, searchTerm) ||
        matchSearch(a.asin, searchTerm)
    );
  }, [accessori, searchTerm]);

  const elementiCount =
    sezioneAttiva === "accessori"
      ? accessoriFiltrati.length
      : elementiPerSezione.length;

  const esportaInventarioCSV = () => {
    const oggi = new Date().toISOString().slice(0, 10);
    if (sezioneAttiva === "accessori") {
      downloadCSV(
        accessoriFiltrati,
        ["nome", "asin_accessorio", "quantita", "soglia_minima"],
        { nome: "Nome", asin_accessorio: "ASIN", quantita: "Stock", soglia_minima: "Soglia minima" },
        `accessori_${oggi}.csv`
      );
    } else {
      downloadCSV(
        elementiPerSezione.map(p => ({
          nome: p.nome, asin: p.asin, sku: p.sku,
          pronto: p.pronto ?? 0, formato: p.formato || sezioneAttiva,
          soglia_minima: p.soglia_minima ?? "",
        })),
        ["nome", "asin", "sku", "pronto", "formato", "soglia_minima"],
        { nome: "Nome", asin: "ASIN", sku: "SKU", pronto: "Stock", formato: "Formato", soglia_minima: "Soglia" },
        `inventario_${sezioneAttiva}_${oggi}.csv`
      );
    }
    toast.success(`CSV ${sezioneAttiva} esportato`);
  };

  // === Icone per sezioni ===
  const getSezioneIcon = () => {
    switch (sezioneAttiva) {
      case "12ml": return "💧";
      case "100ml": return "🧴";
      case "kit": return "📦";
      case "5litri": return "🛢️";
      case "accessori": return "🔧";
      default: return "📦";
    }
  };

  const getSezioneLabel = () => {
    switch (sezioneAttiva) {
      case "12ml": return "Prodotti 12ml";
      case "100ml": return "Prodotti 100ml";
      case "kit": return "Kit Completi";
      case "5litri": return "Taniche 5 Litri";
      case "accessori": return "Accessori";
      default: return "Inventario";
    }
  };

  // === UI ===
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
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(isMagazzino ? "/magazzino" : "/dashboard")}
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center"
              title={isMagazzino ? "Torna a Magazzino" : "Torna a Dashboard"}
              type="button"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-emerald-500/10 border border-emerald-500/40 flex items-center justify-center">
              <Package className="w-[18px] h-[18px] text-emerald-400" />
            </div>
            <div className="flex flex-col leading-none">
              <span className="text-[15px] font-semibold tracking-tight text-white">Inventario</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Merce e accessori</span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => setShowNuovoProdotto(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-[12px] font-medium transition-all"
              type="button"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuovo prodotto</span>
              <span className="sm:hidden">Nuovo</span>
            </button>
            <button
              onClick={() => navigate(isMagazzino ? "/magazzino/storici/movimenti" : "/storico")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-[12px] font-medium transition-all"
              type="button"
            >
              <History className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storico globale</span>
              <span className="sm:hidden">Storico</span>
            </button>
            <button
              onClick={esportaInventarioCSV}
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-[12px] font-medium transition-all"
              type="button"
              title="Esporta CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Esporta CSV</span>
            </button>
          </div>
        </div>
      </header>

      {/* === Hero compatto === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
            Magazzino
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Inventario <span className="text-slate-500">— merce e accessori.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Gestione centralizzata di prodotti, accessori e moduli personalizzati.
          </p>
        </div>
      </section>

      <div className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-6">

        {/* ========== ALERT MODIFICHE ========== */}
        {modificheInCorso && (
          <div className="relative bg-amber-500/5 border border-amber-500/30 rounded-lg p-4 flex items-center gap-3 overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 ml-1" />
            <p className="text-amber-200 text-xs font-medium">
              Hai modifiche non salvate. Ricorda di confermare le modifiche prima di uscire.
            </p>
          </div>
        )}

        {/* ========== FILTRI SEZIONI ========== */}
        <SectionCard accent="indigo" eyebrow="Sezioni" title="Seleziona sezione" icon={FolderTree}>
          <FiltroSezioni
            sezioneAttiva={sezioneAttiva}
            setSezioneAttiva={(key) => {
              if (key === "onestep") { navigate("/uffici/one-step"); return; }
              if (key === "topcoat") { navigate("/uffici/top-coat"); return; }
              if (key.startsWith("modulo:")) {
                const slug = key.split(":")[1];
                navigate(`/uffici/modulo/${slug}`);
                return;
              }
              setSezioneAttiva(key);
            }}
            onNuovoModulo={(refresh) => {
              refreshFiltriRef.current = refresh;
              setNuovoModuloLabel("");
              setNuovoModuloIcona("📦");
              setNuovoModuloStile("numerico");
              setShowNuovoModulo(true);
            }}
          />
        </SectionCard>

        {/* ========== SEARCH BAR ========== */}
        <SectionCard accent="cyan" eyebrow="Ricerca" title="Cerca prodotti" icon={Search}>
          <SearchBarInventario search={search} setSearch={setSearch} />
        </SectionCard>

        {/* ========== CONTATORE E TITOLO SEZIONE ========== */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-emerald-400 to-blue-400" />
          <div className="px-5 sm:px-6 py-5 flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div className="text-3xl sm:text-4xl">{getSezioneIcon()}</div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-1">
                  Sezione attiva
                </div>
                <h2 className="text-lg sm:text-xl font-semibold text-white tracking-tight">
                  {getSezioneLabel()}
                </h2>
                <p className="text-xs text-slate-400 mt-1 tabular-nums">
                  <span className="text-emerald-400 font-medium">{elementiCount}</span>{" "}
                  {sezioneAttiva === "accessori" ? "accessori disponibili" : "prodotti disponibili"}
                </p>
              </div>
            </div>

            {categoriaAttiva && (
              <div className="px-3 py-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-yellow-300 text-xs font-medium">{categoriaAttiva}</p>
              </div>
            )}
          </div>
        </div>

        {/* ========== CATEGORIE 12ML ========== */}
        {sezioneAttiva === "12ml" && (
          <SectionCard accent="yellow" eyebrow="Categorie 12ml" title={categoriaAttiva ?? "Seleziona una categoria"} icon={LayoutGrid}>
            {!categoriaAttiva ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {CATEGORIE_12ML.map((categoria) => (
                  <button
                    key={categoria}
                    onClick={() => setCategoriaAttiva(categoria)}
                    className="px-4 py-3 bg-yellow-500/5 hover:bg-yellow-500/10 border border-yellow-500/30 hover:border-yellow-400/60 rounded-md text-yellow-200 hover:text-yellow-100 text-sm font-medium transition-all text-left"
                    type="button"
                  >
                    {categoria}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                <button
                  onClick={() => setCategoriaAttiva(null)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-slate-800/60 hover:bg-slate-800 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
                  type="button"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Tutte le categorie
                </button>
                <button
                  onClick={() => setCategoriaAttiva(null)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-xs font-medium transition-all"
                  type="button"
                >
                  <Package className="w-3.5 h-3.5" />
                  Tutti i 12ml
                </button>
              </div>
            )}
          </SectionCard>
        )}

        {/* ========== CONTENUTO SEZIONI ========== */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg p-5 sm:p-6 overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
          {(() => {
            switch (sezioneAttiva) {
              case "12ml":
                return (
                  <Inventario12ml
                    elementi={elementiPerSezione ?? []}
                    calcolaAccessoriImpegnati={calcolaAccessoriImpegnati}
                    handleChange={handleChange}
                    confermaUtilizzo={confermaUtilizzo}
                    mostraStoricoAsin={mostraStoricoAsin}
                    setMostraStoricoAsin={setMostraStoricoAsin}
                    categoriaAttiva={categoriaAttiva}
                  />
                );
              case "100ml":
                return (
                  <Inventario100ml
                    elementi={elementiPerSezione}
                    calcolaAccessoriImpegnati={calcolaAccessoriImpegnati}
                    handleChange={handleChange}
                    confermaUtilizzo={confermaUtilizzo}
                    mostraStoricoAsin={mostraStoricoAsin}
                    setMostraStoricoAsin={setMostraStoricoAsin}
                  />
                );
              case "kit":
                return (
                  <InventarioKit
                    elementi={elementiPerSezione}
                    calcolaAccessoriImpegnati={calcolaAccessoriImpegnati}
                    handleChange={handleChange}
                    confermaUtilizzo={confermaUtilizzo}
                    mostraStoricoAsin={mostraStoricoAsin}
                    setMostraStoricoAsin={setMostraStoricoAsin}
                  />
                );
              case "5litri":
                return (
                  <Inventario5litri
                    elementi={elementiPerSezione}
                    calcolaAccessoriImpegnati={calcolaAccessoriImpegnati}
                    handleChange={handleChange}
                    confermaUtilizzo={confermaUtilizzo}
                    mostraStoricoAsin={mostraStoricoAsin}
                    setMostraStoricoAsin={setMostraStoricoAsin}
                  />
                );
              case "accessori":
                return (
                  <InventarioAccessori
                    accessori={accessoriFiltrati}
                    setMostraStoricoAsin={setMostraStoricoAsin}
                    fetchAccessori={fetchAccessori}
                  />
                );
              default:
                return null;
            }
          })()}
        </div>

        {/* ========== STORICO MODIFICHE ========== */}
        <SectionCard accent="violet" eyebrow="Storico" title="Modifiche recenti" icon={History}>
          {storico.length === 0 ? (
            <div className="text-center py-10 text-slate-600">
              <History className="w-8 h-8 mx-auto mb-3 text-slate-700" />
              <p className="text-sm text-slate-500">Nessuna modifica registrata</p>
              <p className="text-xs mt-1 text-slate-600">Le modifiche appariranno qui una volta effettuate</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto -mx-5 sm:-mx-6 px-5 sm:px-6">
              <div className="divide-y divide-slate-800">
                {storico.map((item, idx) => (
                  <div
                    key={`${item.asin}-${idx}`}
                    className="py-2.5 hover:bg-slate-800/30 -mx-2 px-2 rounded transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white">
                          <span className="font-mono text-emerald-400">{item.asin}</span>
                          <span className="text-slate-600 mx-1.5">·</span>
                          <span className="text-slate-400">campo</span>{" "}
                          <span className="text-blue-400">{item.campo}</span>
                        </p>
                        <p className="text-[11px] text-slate-500 mt-1">
                          <span className="text-rose-400">{item.da || "(vuoto)"}</span>
                          <span className="text-slate-600 mx-1.5">→</span>
                          <span className="text-emerald-400">{item.a || "(vuoto)"}</span>
                        </p>
                      </div>
                      <span className="text-[10px] font-mono text-slate-600 whitespace-nowrap">
                        {new Date(item.data).toLocaleString("it-IT")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SectionCard>

        {/* ========== PULSANTI CONFERMA/ANNULLA ========== */}
        {sezioneAttiva !== "accessori" && (
          <PulsantiConfermaModifiche
            modificheInCorso={modificheInCorso}
            storico={storico}
            onConferma={confermaModifiche}
            onAnnulla={annullaModifiche}
            onEsporta={() => esportaStoricoCSV(storico)}
          />
        )}

        {/* ========== MODALS ========== */}
        {mostraStoricoAsin && (
          <StoricoProdotto
            asin={mostraStoricoAsin}
            storico={storico.filter((s) => s.asin === mostraStoricoAsin)}
            onClose={() => setMostraStoricoAsin(null)}
          />
        )}

        {showNuovoProdotto && (
          <NuovoProdottoModal
            onClose={() => setShowNuovoProdotto(false)}
            onSuccess={async () => {
              try {
                const data = await fetchJSON("/magazzino");
                const lista = Array.isArray(data) ? data : data?.data ?? [];
                setProdotti(lista);
                setProdottiOriginali(lista.map((item) => ({ ...item })));
                localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
              } catch (err) {
                console.error("❌ Errore reload prodotti:", err);
              }
            }}
          />
        )}

        {/* MODALE NUOVO MODULO CUSTOM */}
        {showNuovoModulo && (
          <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md p-6">
              <h3 className="text-lg font-bold text-white mb-4">Nuovo modulo personalizzato</h3>
              <p className="text-xs text-zinc-400 mb-4">
                Crea una nuova "scheda" identica a One Step / Top Coat per gestire un nuovo gruppo di prodotti.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-400 block mb-1">Nome del modulo *</label>
                  <input
                    autoFocus
                    value={nuovoModuloLabel}
                    onChange={(e) => setNuovoModuloLabel(e.target.value)}
                    placeholder="es. Base Coat, Glitter, Effetti speciali…"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-2">
                    Icona — selezionata: <span className="text-2xl">{nuovoModuloIcona}</span>
                  </label>
                  {/* Selezione rapida — emoji beauty / cosmetica */}
                  <div className="grid grid-cols-8 gap-1 bg-zinc-800/40 p-2 rounded-lg mb-3">
                    {["💅","✨","💎","💖","🌟","🪄","🧴","💄","👑","🎀","🌸","🦋","🌺","💋","🎨","🌈"].map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => setNuovoModuloIcona(emoji)}
                        className={`text-2xl p-1.5 rounded hover:bg-zinc-700 transition-colors ${
                          nuovoModuloIcona === emoji ? "bg-purple-900/40 ring-2 ring-purple-500" : ""
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {/* Inserimento manuale */}
                  <div className="bg-zinc-800/40 border border-dashed border-zinc-700 rounded-lg p-3">
                    <label className="text-xs text-zinc-400 block mb-1.5">Oppure incolla qui un'emoji personalizzata:</label>
                    <input
                      type="text"
                      value={nuovoModuloIcona}
                      onChange={(e) => setNuovoModuloIcona(e.target.value)}
                      placeholder="Incolla qui…"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-2xl text-center text-white focus:outline-none focus:border-purple-500"
                    />
                    <div className="mt-2 text-[11px] text-zinc-500 leading-relaxed">
                      <div className="font-semibold text-zinc-400 mb-1">Come digitare un'emoji:</div>
                      • <span className="text-zinc-300">Windows</span>: premi <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono text-[10px]">Win</kbd> + <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono text-[10px]">.</kbd> (punto)<br />
                      • <span className="text-zinc-300">Mac</span>: premi <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono text-[10px]">Ctrl</kbd> + <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono text-[10px]">Cmd</kbd> + <kbd className="px-1 py-0.5 bg-zinc-800 rounded text-zinc-300 font-mono text-[10px]">Spazio</kbd><br />
                      • Si aprirà il selettore emoji del sistema, scegli quella che vuoi e verrà inserita nel campo qui sopra
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-2">Tipo di codifica prodotti</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNuovoModuloStile("numerico")}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        nuovoModuloStile === "numerico"
                          ? "border-pink-500 bg-pink-900/20"
                          : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <div className="text-sm font-semibold text-white">Numerico</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">come One Step (001, 002, …)</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNuovoModuloStile("testuale")}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        nuovoModuloStile === "testuale"
                          ? "border-pink-500 bg-pink-900/20"
                          : "border-zinc-700 bg-zinc-800 hover:border-zinc-600"
                      }`}
                    >
                      <div className="text-sm font-semibold text-white">Testuale</div>
                      <div className="text-[11px] text-zinc-500 mt-0.5">come Top Coat (Trasparente, Lucido…)</div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-5">
                <button
                  onClick={() => setShowNuovoModulo(false)}
                  disabled={creandoModulo}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 text-zinc-300 text-sm"
                >
                  Annulla
                </button>
                <button
                  onClick={async () => {
                    if (!nuovoModuloLabel.trim()) { toast.error("Inserisci il nome del modulo"); return; }
                    setCreandoModulo(true);
                    try {
                      const slug = nuovoModuloLabel
                        .trim()
                        .toLowerCase()
                        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, "");
                      const res = await fetch("/api/v2/moduli", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          slug,
                          label: nuovoModuloLabel.trim(),
                          icona: nuovoModuloIcona || "📦",
                          stile_codice: nuovoModuloStile,
                        }),
                      });
                      const json = await res.json();
                      if (!res.ok) throw new Error(json.error);
                      toast.success(`Modulo "${nuovoModuloLabel}" creato`);
                      setShowNuovoModulo(false);
                      if (refreshFiltriRef.current) await refreshFiltriRef.current();
                      // Naviga subito al nuovo modulo
                      navigate(`/uffici/modulo/${json.slug}`);
                    } catch (e) {
                      toast.error("Errore creazione modulo: " + e.message);
                    } finally {
                      setCreandoModulo(false);
                    }
                  }}
                  disabled={creandoModulo || !nuovoModuloLabel.trim()}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium"
                >
                  {creandoModulo ? "Creazione…" : "Crea modulo"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>© {new Date().getFullYear()} Nexus · Inventario</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

// === SectionCard ===
// Card sezione con eyebrow/titolo/icona e accent color sul bordo sinistro.
const SECTION_ACCENTS = {
  indigo:  { bar: "bg-indigo-400",  icon: "text-indigo-400",  bgIcon: "bg-indigo-500/10 border-indigo-500/30" },
  cyan:    { bar: "bg-cyan-400",    icon: "text-cyan-400",    bgIcon: "bg-cyan-500/10 border-cyan-500/30" },
  emerald: { bar: "bg-emerald-400", icon: "text-emerald-400", bgIcon: "bg-emerald-500/10 border-emerald-500/30" },
  yellow:  { bar: "bg-yellow-400",  icon: "text-yellow-400",  bgIcon: "bg-yellow-500/10 border-yellow-500/30" },
  violet:  { bar: "bg-violet-400",  icon: "text-violet-400",  bgIcon: "bg-violet-500/10 border-violet-500/30" },
  rose:    { bar: "bg-rose-400",    icon: "text-rose-400",    bgIcon: "bg-rose-500/10 border-rose-500/30" },
};

function SectionCard({ accent = "indigo", eyebrow, title, icon: Icon, children }) {
  const a = SECTION_ACCENTS[accent] ?? SECTION_ACCENTS.indigo;
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${a.bar}/60`} />
      <div className="px-5 sm:px-6 py-5">
        {(eyebrow || title) && (
          <div className="flex items-center gap-3 mb-4">
            {Icon && (
              <div className={`w-8 h-8 rounded-md border ${a.bgIcon} flex items-center justify-center flex-shrink-0`}>
                <Icon className={`w-4 h-4 ${a.icon}`} />
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">
                  {eyebrow}
                </div>
              )}
              {title && (
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight leading-tight truncate">
                  {title}
                </h2>
              )}
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}

export default Inventario;