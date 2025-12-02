import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import RettificaLottoModal from "../components/sfuso/RettificaLottoModal";
import RettificaSfusoModal from "../components/sfuso/RettificaSfusoModal";
import { creaNuovaCard } from "../utils/creaNuovaCard";
import {
  ArrowLeft,
  Droplet,
  Plus,
  Search,
  FileText,
  Edit3,
  Truck,
  Package,
  Trash2,
  AlertCircle,
  TrendingUp,
  ChevronDown,
  ChevronUp
} from "lucide-react";

const Sfuso = () => {
  const navigate = useNavigate();
  const [sfusi, setSfusi] = useState([]);
  const [filtro, setFiltro] = useState("tutti");
  const [ricerca, setRicerca] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState(null);
  const [showSfusoModal, setShowSfusoModal] = useState(false);
  const [sfusoModalData, setSfusoModalData] = useState(null);

  // Stati non utilizzati - possono essere rimossi o riabilitati quando necessario
  // const [prodotti, setProdotti] = useState([]);
  // const [searchTerm, setSearchTerm] = useState("");
  // const [selectedProdotto, setSelectedProdotto] = useState(null);

  // Nuovo stato per gestire le card espanse
  const [expandedCards, setExpandedCards] = useState({});

  const [showAddModal, setShowAddModal] = useState(false);
  const [newSfuso, setNewSfuso] = useState({
    nome: "",
    formato: "",
    asin_collegati: "",
    litri: 5,
  });

  // Flag: imposta a true se gli endpoint degli ordini sono disponibili
  const ENABLE_ORDINI_FETCH = false;
  
  // Flag: imposta a true se l'endpoint dell'inventario è disponibile
  const ENABLE_INVENTARIO_FETCH = false;

  // Funzione per toggleare l'espansione di una card
  const toggleCardExpansion = (cardId) => {
    setExpandedCards(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const handleAggiungiSfuso = async () => {
    if (!newSfuso.nome || !newSfuso.formato) {
      alert("Nome e formato sono obbligatori");
      return;
    }

    const payload = {
      nome_prodotto: newSfuso.nome,
      formato: newSfuso.formato,
      asin_collegati: newSfuso.asin_collegati
        ? newSfuso.asin_collegati.split(",").map((a) => a.trim())
        : [],
      litri_disponibili: Number(newSfuso.litri) || 5,
      fornitore: "N/D",
    };

    const nuovoSfuso = await creaNuovaCard("sfuso", payload);
    if (!nuovoSfuso) return;

    setSfusi((prev) => [...prev, nuovoSfuso]);
    setShowAddModal(false);
    setNewSfuso({ nome: "", formato: "", asin_collegati: "", litri: 5 });
  };

  const handleEliminaSfuso = async (id, nome) => {
    if (!window.confirm(`Sei sicuro di voler eliminare "${nome}"?`)) return;

    try {
      const res = await fetch(`/api/v2/sfuso/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Errore eliminazione sfuso");

      setSfusi((prev) => prev.filter((s) => s.id !== id));
      alert(`🗑️ Sfuso "${nome}" eliminato con successo.`);
    } catch (err) {
      console.error("❌ Errore DELETE sfuso:", err);
      alert("Errore durante l'eliminazione dello sfuso.");
    }
  };

  const fetchProdotti = async () => {
    // Se il fetch dell'inventario è disabilitato, ritorna subito
    if (!ENABLE_INVENTARIO_FETCH) {
      return;
    }

    try {
      const res = await fetch("/api/v2/inventario");
      if (!res.ok) {
        console.warn(`⚠️ Errore ${res.status} nel caricamento inventario`);
        return;
      }
      const data = await res.json();
      // setProdotti(data); // Commentato perché prodotti non è più in uso
      console.log("📦 Inventario caricato:", data);
    } catch (err) {
      console.warn("⚠️ Impossibile caricare l'inventario:", err.message);
    }
  };

  const fetchOrdiniPerSfuso = async ({ id_sfuso, asin }) => {
    // Se il fetch degli ordini è disabilitato, ritorna subito null
    if (!ENABLE_ORDINI_FETCH) {
      return null;
    }

    try {
      let res;
      if (id_sfuso) {
        res = await fetch(`/api/v2/fornitori/ordini/sfuso/${id_sfuso}`);
      } else if (asin) {
        res = await fetch(`/api/v2/fornitori/ordini/asin/${asin}`);
      } else {
        return null;
      }

      // Se l'endpoint non esiste (404) o altri errori, ritorna null silenziosamente
      if (!res.ok) {
        if (res.status === 404) {
          // Endpoint non trovato - comportamento normale, non serve loggare
          return null;
        }
        console.warn(`⚠️ Errore ${res.status} nel recupero ordini per sfuso/ASIN`);
        return null;
      }

      const data = await res.json();

      if (data && data.length > 0) {
        const ordine = data[0];
        return {
          quantita: ordine.quantita_litri || 0,
          dataPrevista: ordine.data_consegna_prevista
            ? new Date(ordine.data_consegna_prevista).toLocaleDateString("it-IT")
            : "-",
          fornitore: ordine.fornitore || "-",
        };
      }
      return null;
    } catch (err) {
      // Errore di rete o parsing - log solo per debug
      console.warn("⚠️ Impossibile recuperare ordini:", err.message);
      return null;
    }
  };

  useEffect(() => {
    const fetchSfusi = async () => {
      try {
        const res = await fetch("/api/v2/sfuso");
        if (!res.ok) {
          throw new Error(`Errore ${res.status} nel caricamento dei dati sfuso`);
        }
        const data = await res.json();

        const mapped = await Promise.all(
          data.map(async (s) => {
            const asin = (() => {
              try {
                const arr = JSON.parse(s.asin_collegati || "[]");
                return arr.length ? arr[0] : null;
              } catch {
                return null;
              }
            })();

            // Recupera gli ordini (ritorna null se ENABLE_ORDINI_FETCH è false)
            const spedizione = await fetchOrdiniPerSfuso({
              id_sfuso: s.id,
              asin: asin,
            });

            return {
              id: s.id,
              nome: s.nome_prodotto || s.nome || `Prodotto ${s.id}`,
              formato: s.formato || "N/D",
              quantita: Number(s.litri_disponibili || 0),
              quantita_old: Number(s.litri_disponibili_old || 0),
              lotto: s.lotto || "-",
              lotto_old: s.lotto_old || "-",
              fornitore: s.fornitore || (spedizione ? spedizione.fornitore : "-"),
              asin_collegati: (() => {
                try {
                  return JSON.parse(s.asin_collegati || "[]");
                } catch {
                  return [];
                }
              })(),
              asin_collegato: s.asin_collegato || null,
              immagine: s.immagine || "/images/no_image2.png",
              spedizione,
              quantitaInArrivo: spedizione ? spedizione.quantita : 0,
            };
          })
        );

        setSfusi(mapped);
      } catch (err) {
        console.error("❌ Errore critico nel caricamento sfuso:", err);
        alert("Errore nel caricamento dei dati. Riprova più tardi.");
      }
    };

    fetchSfusi();
    fetchProdotti();
  }, []);

  const sfusiFiltrati = sfusi.filter((item) => {
    const nomeLower = item.nome?.toLowerCase() || "";
    const formatoLower = (item.formato || "").toLowerCase().replace(/\s/g, "");
    const filtroLower = (filtro || "").toLowerCase().replace(/\s/g, "");

    const matchFormato =
      filtroLower === "tutti" ||
      formatoLower === filtroLower ||
      formatoLower.includes(filtroLower) ||
      (filtroLower === "oli" && nomeLower.includes("olio cuticole")) ||
      (filtroLower === "100ml" && (formatoLower.includes("100") || formatoLower.includes("100ml")));

    const ricercaLower = ricerca.toLowerCase();
    const matchRicerca =
      nomeLower.includes(ricercaLower) ||
      (Array.isArray(item.asin_collegati)
        ? item.asin_collegati.join(",").toLowerCase().includes(ricercaLower)
        : false);

    return matchFormato && matchRicerca;
  });

  const calcolaProdottiDaSfuso = (litri, nome, formato) => {
    const litriNum = Number(litri);
    if (!litriNum || litriNum <= 0) return 0;

    const f = (formato || "").toLowerCase().replace(/\s/g, "");
    let mlPerPezzo = 0;

    if (f.includes("12ml")) mlPerPezzo = 12;
    else if (f.includes("100ml")) mlPerPezzo = 100;
    else return 0;

    const totMl = litriNum * 1000;
    return Math.floor(totMl / mlPerPezzo);
  };

  const apriRettificaSfuso = (id, nome, tipo = "new") => {
    setSfusoModalData({ id, nome, tipo });
    setShowSfusoModal(true);
  };

  const handleConfermaRettificaSfuso = async ({ quantita, nota, operatore }) => {
    if (!sfusoModalData) return;
    const { id, tipo } = sfusoModalData;

    const endpoint =
      tipo === "old"
        ? `/api/v2/sfuso/${id}/rettifica-old`
        : `/api/v2/sfuso/${id}/rettifica`;

    const payload =
      tipo === "old"
        ? { quantita_old: quantita, note: nota, operatore }
        : { quantita, note: nota, operatore };

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Errore nel salvataggio rettifica sfuso.");
      const dataRes = await res.json();

      alert("✅ Rettifica sfuso completata!");
      setSfusi((prev) =>
        prev.map((s) => {
          if (s.id !== id) return s;

          if (tipo === "old") {
            return {
              ...s,
              quantita_old:
                dataRes.updated?.litri_disponibili_old ??
                dataRes.updated?.litri_disponibili ??
                quantita,
            };
          } else {
            return {
              ...s,
              quantita:
                dataRes.updated?.litri_disponibili ??
                dataRes.updated?.litri_disponibili_old ??
                quantita,
            };
          }
        })
      );
    } catch (err) {
      console.error("❌ Errore rettifica sfuso:", err);
      alert("Errore nella rettifica sfuso.");
    } finally {
      setShowSfusoModal(false);
      setSfusoModalData(null);
    }
  };

  const apriRettificaLotto = (id, nome, tipo = "new") => {
    setModalData({ id, nome, tipo });
    setShowModal(true);
  };

  const handleConfermaRettifica = async ({ lotto, data, operatore }) => {
    if (!modalData) return;

    const { id, tipo } = modalData;
    const endpoint =
      tipo === "old"
        ? `/api/v2/sfuso/${id}/rettifica-lotto-old`
        : `/api/v2/sfuso/${id}/rettifica-lotto`;

    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nuovoLotto: lotto,
          dataInserimento: data,
          operatore,
        }),
      });

      if (!res.ok) throw new Error("Errore nel salvataggio lotto.");
      const dataRes = await res.json();

      alert("✅ Lotto aggiornato con successo!");
      setSfusi((prev) =>
        prev.map((s) =>
          s.id === id
            ? tipo === "old"
              ? { ...s, lotto_old: dataRes.updated.lotto_old || lotto }
              : { ...s, lotto: dataRes.updated.lotto || lotto }
            : s
        )
      );
    } catch (err) {
      console.error("❌ Errore rettifica lotto:", err);
      alert("Errore nella rettifica del lotto.");
    } finally {
      setShowModal(false);
      setModalData(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="w-full space-y-6">
        
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center shadow-lg">
                <Droplet className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Inventario Sfuso</h1>
                <p className="text-zinc-400 mt-1">Gestione materiale liquido e lotti</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" />
                Nuovo Sfuso
              </button>
              <button
                onClick={() => navigate("/storico-sfuso-inventario")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              >
                <FileText className="w-4 h-4" />
                Storico
              </button>
              <button
                onClick={() => navigate("/magazzino")}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              >
                <ArrowLeft className="w-4 h-4" />
                Magazzino
              </button>
            </div>
          </div>
        </div>

        {/* ========== FILTRI E RICERCA ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-cyan-400" />
            Filtri e Ricerca
          </h2>
          
          <div className="flex flex-wrap gap-3 mb-4">
            {["10ml", "12ml", "100ml", "oli", "tutti"].map((f) => (
              <button
                key={f}
                onClick={() => setFiltro(f)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                  filtro === f
                    ? "bg-cyan-600 text-white shadow-lg scale-105"
                    : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
                }`}
              >
                {f === "tutti" ? "Tutti" : f === "oli" ? "Oli Cuticole" : f}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-400" />
            <input
              type="text"
              placeholder="Cerca per nome, ASIN..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 transition-all"
            />
          </div>
        </div>

        {/* ========== PRODOTTO SELEZIONATO ========== */}
        {/* Sezione commentata - riabilitare se necessario
        {selectedProdotto && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-4 flex items-center gap-4">
            <img
              src={selectedProdotto.immagine || "/placeholder.jpg"}
              alt={selectedProdotto.nome}
              className="w-16 h-16 rounded-lg object-cover border-2 border-zinc-700"
            />
            <div className="flex-1">
              <p className="font-semibold text-white">{selectedProdotto.nome}</p>
              <p className="text-sm text-zinc-400">ASIN: {selectedProdotto.asin}</p>
            </div>
          </div>
        )}
        */}

        {/* ========== CARD SFUSO CON ESPANSIONE ========== */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {sfusiFiltrati.map((s) => {
            const isExpanded = expandedCards[s.id];
            
            return (
              <div
                key={s.id}
                className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden hover:border-cyan-500/50 transition-all"
              >
                {/* Header sempre visibile - Nome, Immagine, e pulsante espandi */}
                <div 
                  className="p-6 cursor-pointer hover:bg-zinc-800/50 transition-colors"
                  onClick={() => toggleCardExpansion(s.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Immagine */}
                    <div className="flex-shrink-0">
                      <img
                        src={s.immagine || "/images/no_image2.png"}
                        alt={s.nome}
                        className="w-20 h-20 rounded-xl object-cover border-2 border-zinc-700"
                        loading="lazy"
                        onError={(e) => {
                          if (!e.target.dataset.error) {
                            e.target.src = "/images/no_image.jpg";
                            e.target.dataset.error = "true";
                          }
                        }}
                      />
                    </div>
                    
                    {/* Nome e info base */}
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white mb-2">{s.nome}</h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full text-cyan-400">
                          {s.formato || "N/D"}
                        </span>
                        <span className="text-zinc-400">
                          Totale: {((s.quantita_old || 0) + (s.quantita || 0)).toFixed(1)} L
                        </span>
                      </div>
                    </div>
                    
                    {/* Pulsante espandi/comprimi */}
                    <button
                      className="flex-shrink-0 p-2 rounded-lg bg-cyan-600 hover:bg-cyan-700 transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCardExpansion(s.id);
                      }}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-white" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-white" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Contenuto espandibile */}
                {isExpanded && (
                  <div className="px-6 pb-6 space-y-4 border-t border-zinc-800 pt-4">
                    {/* ASIN Collegati */}
                    {(Array.isArray(s.asin_collegati) && s.asin_collegati.length > 0) || s.asin_collegato ? (
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(s.asin_collegati) && s.asin_collegati.length > 0 ? (
                          s.asin_collegati.map((asin, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-medium"
                            >
                              {asin}
                            </span>
                          ))
                        ) : s.asin_collegato ? (
                          <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-xs font-medium">
                            {s.asin_collegato}
                          </span>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Sezione OLD/NEW */}
                    <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* SFUSO OLD */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-amber-500/30">
                            <Droplet className="w-4 h-4 text-amber-400" />
                            <h4 className="font-semibold text-amber-400">SFUSO OLD</h4>
                          </div>

                          <div>
                            <label className="text-xs text-zinc-400 block mb-1">Quantità (L)</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={(s.quantita_old || 0).toFixed(1)}
                                readOnly
                                className="w-full px-3 py-2 pr-8 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-right cursor-not-allowed"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">L</span>
                            </div>
                          </div>

                          <button
                            onClick={() => apriRettificaSfuso(s.id, s.nome + " (OLD)", "old")}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                            Rettifica Quantità
                          </button>

                          <div>
                            <label className="text-xs text-zinc-400 block mb-1">Lotto</label>
                            <input
                              type="text"
                              value={s.lotto_old || "-"}
                              readOnly
                              className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white cursor-not-allowed"
                            />
                          </div>

                          <button
                            onClick={() => apriRettificaLotto(s.id, s.nome + " (OLD)", "old")}
                            className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium transition-all"
                          >
                            Rettifica Lotto
                          </button>

                          <div>
                            <label className="text-xs text-zinc-400 block mb-1">Prodotti producibili</label>
                            <div className="px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white font-semibold text-center">
                              {calcolaProdottiDaSfuso(s.quantita_old || 0, s.nome, s.formato)}
                            </div>
                          </div>
                        </div>

                        {/* SFUSO NEW */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 pb-2 border-b border-green-500/30">
                            <Droplet className="w-4 h-4 text-green-400" />
                            <h4 className="font-semibold text-green-400">SFUSO NEW</h4>
                          </div>

                          <div>
                            <label className="text-xs text-zinc-400 block mb-1">Quantità (L)</label>
                            <div className="relative">
                              <input
                                type="text"
                                value={(s.quantita || 0).toFixed(1)}
                                readOnly
                                className="w-full px-3 py-2 pr-8 bg-zinc-700 border border-zinc-600 rounded-lg text-white text-right cursor-not-allowed"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400">L</span>
                            </div>
                          </div>

                          <button
                            onClick={() => apriRettificaSfuso(s.id, s.nome + " (NEW)", "new")}
                            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 hover:bg-orange-700 rounded-lg text-sm font-medium transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                            Rettifica Quantità
                          </button>

                          <div>
                            <label className="text-xs text-zinc-400 block mb-1">Lotto</label>
                            <input
                              type="text"
                              value={s.lotto || "-"}
                              readOnly
                              className="w-full px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white cursor-not-allowed"
                            />
                          </div>

                          <button
                            onClick={() => apriRettificaLotto(s.id, s.nome + " (NEW)", "new")}
                            className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-700 rounded-lg text-sm font-medium transition-all"
                          >
                            Rettifica Lotto
                          </button>

                          <div>
                            <label className="text-xs text-zinc-400 block mb-1">Prodotti producibili</label>
                            <div className="px-3 py-2 bg-zinc-700 border border-zinc-600 rounded-lg text-white font-semibold text-center">
                              {calcolaProdottiDaSfuso(s.quantita || 0, s.nome, s.formato)}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Totali */}
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-zinc-700 rounded-lg p-3 text-center">
                          <p className="text-xs text-zinc-400 mb-1">Totale Litri</p>
                          <p className="text-xl font-bold text-cyan-400">
                            {((s.quantita_old || 0) + (s.quantita || 0)).toFixed(1)} L
                          </p>
                        </div>
                        <div className="bg-zinc-700 rounded-lg p-3 text-center">
                          <p className="text-xs text-zinc-400 mb-1">Totale Prodotti</p>
                          <p className="text-xl font-bold text-green-400">
                            {calcolaProdottiDaSfuso(s.quantita_old || 0, s.nome, s.formato) +
                              calcolaProdottiDaSfuso(s.quantita || 0, s.nome, s.formato)} pz
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Info Aggiuntive */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">Quantità in arrivo</label>
                        <div className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
                          {s.quantitaInArrivo || 0} L
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-zinc-400 block mb-1">Fornitore</label>
                        <div className="px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white">
                          {s.fornitore || "-"}
                        </div>
                      </div>
                    </div>

                    {/* Spedizione */}
                    <div className={`rounded-lg p-4 ${s.spedizione ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-zinc-800 border border-zinc-700'}`}>
                      <div className="flex items-start gap-3">
                        <Truck className={`w-5 h-5 flex-shrink-0 ${s.spedizione ? 'text-yellow-400' : 'text-zinc-600'}`} />
                        <div className="flex-1">
                          {s.spedizione ? (
                            <>
                              <p className="font-semibold text-yellow-400 mb-1">
                                Spedizione in arrivo da {s.fornitore}
                              </p>
                              <p className="text-sm text-zinc-300">Data prevista: {s.spedizione.dataPrevista}</p>
                              <p className="text-sm text-zinc-300">Quantità: {s.spedizione.quantita} L</p>
                            </>
                          ) : (
                            <p className="text-zinc-400">Nessun ordine in arrivo</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Elimina */}
                    <button
                      onClick={() => handleEliminaSfuso(s.id, s.nome)}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                      Elimina Sfuso
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ========== EMPTY STATE ========== */}
        {sfusiFiltrati.length === 0 && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Droplet className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Nessun prodotto trovato
            </h3>
            <p className="text-zinc-400 text-sm">
              Prova a modificare i filtri o aggiungi un nuovo prodotto sfuso
            </p>
          </div>
        )}
      </div>

      {/* ========== MODAL AGGIUNGI SFUSO ========== */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex justify-center items-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl">
            <div className="border-b border-zinc-800 p-6">
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                <Plus className="w-6 h-6 text-emerald-400" />
                Nuovo Sfuso
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Nome Prodotto *
                </label>
                <input
                  type="text"
                  value={newSfuso.nome}
                  onChange={(e) => setNewSfuso({ ...newSfuso, nome: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="Es. Base Coat UV"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Formato *
                </label>
                <select
                  value={newSfuso.formato}
                  onChange={(e) => setNewSfuso({ ...newSfuso, formato: e.target.value })}
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                >
                  <option value="">Seleziona formato...</option>
                  <option value="12ml">12ml</option>
                  <option value="100ml">100ml</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  ASIN Collegati
                </label>
                <input
                  type="text"
                  value={newSfuso.asin_collegati}
                  onChange={(e) =>
                    setNewSfuso({ ...newSfuso, asin_collegati: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  placeholder="B0ABC123, B0DEF456"
                />
                <p className="text-xs text-zinc-500 mt-1">Separati da virgola</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">
                  Litri Iniziali
                </label>
                <input
                  type="number"
                  value={newSfuso.litri}
                  onChange={(e) =>
                    setNewSfuso({ ...newSfuso, litri: e.target.value })
                  }
                  className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                  min="0"
                  step="0.1"
                />
              </div>
            </div>

            <div className="border-t border-zinc-800 p-6 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-lg text-white font-medium transition-all"
              >
                Annulla
              </button>
              <button
                onClick={handleAggiungiSfuso}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white font-medium transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== MODALS RETTIFICA ========== */}
      {showModal && modalData && (
        <RettificaLottoModal
          nome={modalData.nome}
          onConferma={handleConfermaRettifica}
          onAnnulla={() => {
            setShowModal(false);
            setModalData(null);
          }}
        />
      )}

      {showSfusoModal && sfusoModalData && (
        <RettificaSfusoModal
          nome={sfusoModalData.nome}
          tipo={sfusoModalData.tipo}
          onConferma={handleConfermaRettificaSfuso}
          onAnnulla={() => {
            setShowSfusoModal(false);
            setSfusoModalData(null);
          }}
        />
      )}
    </div>
  );
};

export default Sfuso;
