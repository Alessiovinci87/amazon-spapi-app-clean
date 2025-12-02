import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
import { Package, ArrowLeft, Plus, FileText, AlertCircle } from "lucide-react";

const STORAGE_KEY = "inventario_prodotti";
const STORAGE_KEY_ACCESSORI = "inventario_accessori";
const STORAGE_KEY_STORICO = "inventario_storico";
const API_BASE =
  import.meta.env?.VITE_API_BASE || "http://localhost:3005/api/v2";
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
  const {
    prodotti,
    setProdotti,
    prodottiOriginali,
    setProdottiOriginali,
    accessori,
    setAccessori,
  } = useInventario();

  window.prodottiDebug = prodotti;

  const [search, setSearch] = useState("");
  const [storico, setStorico] = useState([]);
  const [modificheInCorso, setModificheInCorso] = useState(false);
  const [mostraStoricoAsin, setMostraStoricoAsin] = useState(null);
  const [sezioneAttiva, setSezioneAttiva] = useState("12ml");
  const [categoriaAttiva, setCategoriaAttiva] = useState(null);
  const [showNuovoProdotto, setShowNuovoProdotto] = useState(false);

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
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">

        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Inventario Merce</h1>
                <p className="text-zinc-400 text-sm mt-1">Gestione completa prodotti e accessori</p>
              </div>
            </div>

            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
                type="button"
              >
                <ArrowLeft className="w-4 h-4" />
                Magazzino
              </button>
              <button
                onClick={() => setShowNuovoProdotto(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
                type="button"
              >
                <Plus className="w-4 h-4" />
                Nuovo Prodotto
              </button>
              <button
                onClick={() => navigate("/storico")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
                type="button"
              >
                <FileText className="w-4 h-4" />
                Storico Globale
              </button>
            </div>
          </div>
        </div>

        {/* ========== ALERT MODIFICHE ========== */}
        {modificheInCorso && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-200 text-sm font-medium">
              Hai modifiche non salvate. Ricorda di confermare le modifiche prima di uscire.
            </p>
          </div>
        )}

        {/* ========== FILTRI SEZIONI ========== */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Seleziona Sezione</h2>
          <FiltroSezioni
            sezioneAttiva={sezioneAttiva}
            setSezioneAttiva={setSezioneAttiva}
          />
        </div>

        {/* ========== SEARCH BAR ========== */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Ricerca Prodotti</h2>
          <SearchBarInventario search={search} setSearch={setSearch} />
        </div>

        {/* ========== CONTATORE E TITOLO SEZIONE ========== */}
        <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-lg border border-emerald-500/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">{getSezioneIcon()}</span>
              <div>
                <h2 className="text-2xl font-bold text-white">{getSezioneLabel()}</h2>
                <p className="text-emerald-100 text-sm mt-1">
                  {sezioneAttiva === "accessori"
                    ? `${elementiCount} accessori disponibili`
                    : `${elementiCount} prodotti disponibili`
                  }
                </p>
              </div>
            </div>

            {categoriaAttiva && (
              <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
                <p className="text-white text-sm font-medium">{categoriaAttiva}</p>
              </div>
            )}
          </div>
        </div>

        {/* ========== CATEGORIE 12ML ========== */}
        {sezioneAttiva === "12ml" && (
          <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
            {!categoriaAttiva ? (
              <>
                <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                  📂 Seleziona Categoria
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {CATEGORIE_12ML.map((categoria) => (
                    <button
                      key={categoria}
                      onClick={() => setCategoriaAttiva(categoria)}
                      className="px-4 py-3 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-black font-semibold rounded-lg transition-all hover:scale-[1.02] shadow-lg"
                      type="button"
                    >
                      {categoria}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                  <button
                    onClick={() => setCategoriaAttiva(null)}
                    className="px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all"
                    type="button"
                  >
                    🔙 Tutte le categorie
                  </button>

                  <h3 className="text-2xl font-bold text-yellow-400 flex-1 text-center">
                    {categoriaAttiva}
                  </h3>

                  <button
                    onClick={() => setCategoriaAttiva(null)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-all"
                    type="button"
                  >
                    📦 Tutti i 12ml
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* ========== CONTENUTO SEZIONI ========== */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
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
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-emerald-400" />
            <h2 className="text-xl font-semibold text-white">Storico Modifiche Recenti</h2>
          </div>

          {storico.length === 0 ? (
            <div className="text-center py-12 text-zinc-500">
              <p className="text-lg">Nessuna modifica registrata</p>
              <p className="text-sm mt-2">Le modifiche appariranno qui una volta effettuate</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              <div className="space-y-2">
                {storico.map((item, idx) => (
                  <div
                    key={`${item.asin}-${idx}`}
                    className="bg-zinc-800 border border-zinc-700 rounded-lg p-3 hover:bg-zinc-750 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-white font-medium">
                          <span className="text-emerald-400">{item.asin}</span> · Campo: <span className="text-blue-400">{item.campo}</span>
                        </p>
                        <p className="text-xs text-zinc-400 mt-1">
                          Da: <span className="text-red-400">{item.da || "(vuoto)"}</span> → A: <span className="text-green-400">{item.a || "(vuoto)"}</span>
                        </p>
                      </div>
                      <span className="text-xs text-zinc-500 whitespace-nowrap">
                        {new Date(item.data).toLocaleString("it-IT")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

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
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              } catch (err) {
                console.error("❌ Errore reload prodotti:", err);
              }
            }}
          />
        )}
      </div>
    </div>
  );
};

export default Inventario;