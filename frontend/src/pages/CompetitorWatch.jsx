import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  ArrowLeft,
  Eye,
  Plus,
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  ChevronUp,
  ToggleLeft,
  ToggleRight,
  Play,
  Globe,
  History,
  Zap,
  Clock,
  Image as ImageIcon,
  ExternalLink,
  Scale,
  AlertTriangle,
} from "lucide-react";

const fmtInt = (v) => v?.toLocaleString("it-IT") ?? "0";
const fmtNum = (v, dec = 2) => v == null ? "—" : Number(v).toLocaleString("it-IT", { minimumFractionDigits: dec, maximumFractionDigits: dec });
const flagCode = (c) => ({ UK: "gb", GB: "gb" }[c] || c?.toLowerCase());

const MARKETPLACES = ["IT", "FR", "ES", "DE", "UK"];

// Categorie pre-installate (le SP-API accettano solo l'ID numerico, non il nome)
const CATEGORIE_BUILTIN = [
  { id: "3762161", nome: "Decorazioni per unghie", marketplace: "IT" },
];

// Helpers localStorage per categorie custom dell'utente
const CAT_STORAGE_KEY = "competitor_categorie_custom_v1";
const loadCategorieCustom = () => {
  try { return JSON.parse(localStorage.getItem(CAT_STORAGE_KEY) || "[]"); }
  catch { return []; }
};
const saveCategorieCustom = (arr) => {
  try { localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(arr)); } catch {}
};

const CompetitorWatch = () => {
  const navigate = useNavigate();
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKw, setNewKw] = useState("");
  const [newMkt, setNewMkt] = useState("IT");
  const [newCat, setNewCat] = useState("");
  const [adding, setAdding] = useState(false);
  const [snapshotting, setSnapshotting] = useState(false);
  const [expanded, setExpanded] = useState(new Set());
  const [asinsByKw, setAsinsByKw] = useState({});
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [wordsByKw, setWordsByKw] = useState({});
  // Confronto prezzi
  const [comparison, setComparison] = useState([]);
  const [showComparison, setShowComparison] = useState(false);
  const [loadingComparison, setLoadingComparison] = useState(false);
  const [newMapAsin, setNewMapAsin] = useState("");
  const [newMapKeyword, setNewMapKeyword] = useState("");
  const [newMapMkt, setNewMapMkt] = useState("IT");

  const loadComparison = useCallback(async () => {
    setLoadingComparison(true);
    try {
      const res = await fetch("/api/v2/competitor/comparison", { cache: "no-store" });
      const json = await res.json();
      if (json.ok) setComparison(json.items);
    } catch {} finally { setLoadingComparison(false); }
  }, []);

  useEffect(() => { if (showComparison) loadComparison(); }, [showComparison, loadComparison]);

  const addMapping = async () => {
    const a = newMapAsin.trim().toUpperCase();
    if (!/^[A-Z0-9]{10}$/.test(a)) { toast.error("ASIN non valido"); return; }
    if (!newMapKeyword) { toast.error("Seleziona una keyword"); return; }
    try {
      const res = await fetch("/api/v2/competitor/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ my_asin: a, keyword_source: newMapKeyword, marketplace: newMapMkt }),
      });
      const json = await res.json();
      if (json.ok) { toast.success("Mapping creato"); setNewMapAsin(""); setNewMapKeyword(""); loadComparison(); }
      else toast.error(json.message || json.error);
    } catch { toast.error("Errore"); }
  };

  const removeMapping = async (id) => {
    try { await fetch(`/api/v2/competitor/mappings/${id}`, { method: "DELETE" }); loadComparison(); }
    catch {}
  };
  const [catCustom, setCatCustom] = useState(() => loadCategorieCustom());
  const [showCatManager, setShowCatManager] = useState(false);
  const [newCatId, setNewCatId] = useState("");
  const [newCatNome, setNewCatNome] = useState("");
  const [newCatMkt, setNewCatMkt] = useState("IT");
  const [discovered, setDiscovered] = useState([]);
  const [discovering, setDiscovering] = useState(false);
  // Filtri top-20
  const [filtroPrime, setFiltroPrime] = useState(false);
  const [filtroFba, setFiltroFba] = useState(false);
  const [filtroPrezzoMin, setFiltroPrezzoMin] = useState("");
  const [filtroPrezzoMax, setFiltroPrezzoMax] = useState("");
  const filtraAsins = (asins) => {
    return (asins || []).filter(a => {
      if (filtroPrime && a.is_prime !== 1) return false;
      if (filtroFba && a.is_fba !== 1) return false;
      const min = parseFloat(filtroPrezzoMin), max = parseFloat(filtroPrezzoMax);
      if (!isNaN(min) && (a.prezzo == null || a.prezzo < min)) return false;
      if (!isNaN(max) && (a.prezzo == null || a.prezzo > max)) return false;
      return true;
    });
  };
  const filtriAttivi = filtroPrime || filtroFba || filtroPrezzoMin || filtroPrezzoMax;

  const categorieDisponibili = [...CATEGORIE_BUILTIN, ...catCustom];

  const aggiungiCategoria = () => {
    const id = newCatId.trim();
    const nome = newCatNome.trim();
    if (!/^\d+$/.test(id)) { toast.error("ID deve essere numerico"); return; }
    if (!nome) { toast.error("Nome categoria richiesto"); return; }
    if (categorieDisponibili.some(c => c.id === id && c.marketplace === newCatMkt)) {
      toast.error("Categoria già presente per questo marketplace"); return;
    }
    const next = [...catCustom, { id, nome, marketplace: newCatMkt }];
    setCatCustom(next); saveCategorieCustom(next);
    setNewCatId(""); setNewCatNome("");
    toast.success(`Aggiunta: ${nome} (${id}) ${newCatMkt}`);
  };

  const rimuoviCategoria = (id, mkt) => {
    const next = catCustom.filter(c => !(c.id === id && c.marketplace === mkt));
    setCatCustom(next); saveCategorieCustom(next);
  };

  const discoverCategorie = async () => {
    setDiscovering(true);
    setDiscovered([]);
    const t = toast.loading("Scansione classifications degli ASIN tracciati... può richiedere qualche minuto");
    try {
      const res = await fetch("/api/v2/competitor/categorie-discovery");
      const json = await res.json();
      if (json.ok) {
        setDiscovered(json.categorie || []);
        toast.success(`Trovati ${json.categorie?.length || 0} browse node univoci`, { id: t });
      } else toast.error(json.error || "Errore", { id: t });
    } catch { toast.error("Errore discovery", { id: t }); }
    finally { setDiscovering(false); }
  };

  const aggiungiDaDiscovery = (c) => {
    if (categorieDisponibili.some(x => x.id === c.id && x.marketplace === c.marketplace)) {
      toast.error("Già presente"); return;
    }
    const next = [...catCustom, { id: c.id, nome: c.nome, marketplace: c.marketplace }];
    setCatCustom(next); saveCategorieCustom(next);
    toast.success(`+ ${c.nome}`);
  };

  const fetchKeywords = useCallback(async () => {
    try {
      const res = await fetch("/api/v2/competitor/keywords");
      const json = await res.json();
      if (json.ok) setKeywords(json.keywords);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchKeywords(); }, [fetchKeywords]);

  const addKeyword = async () => {
    if (!newKw.trim()) { toast.error("Inserisci una keyword (la categoria è solo un filtro)"); return; }
    setAdding(true);
    try {
      const res = await fetch("/api/v2/competitor/keywords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyword: newKw.trim(), marketplace: newMkt, category_id: newCat.trim() || undefined }),
      });
      const json = await res.json();
      if (json.ok) { toast.success("Monitoraggio aggiunto"); setNewKw(""); setNewCat(""); fetchKeywords(); }
      else toast.error(json.message || json.error);
    } catch { toast.error("Errore aggiunta"); }
    finally { setAdding(false); }
  };

  const deleteKeyword = async (id) => {
    try {
      await fetch(`/api/v2/competitor/keywords/${id}`, { method: "DELETE" });
      fetchKeywords();
    } catch { toast.error("Errore eliminazione"); }
  };

  const toggleKeyword = async (id) => {
    try {
      await fetch(`/api/v2/competitor/keywords/${id}/toggle`, { method: "PATCH" });
      fetchKeywords();
    } catch {}
  };

  const runSnapshot = async () => {
    setSnapshotting(true);
    try {
      const res = await fetch("/api/v2/competitor/snapshot", { method: "POST" });
      const json = await res.json();
      if (json.ok) {
        toast.success(`Conteggi aggiornati: ${json.snapshots || 0} keyword, ${json.asins || 0} competitor`);
        fetchKeywords();
      } else {
        toast.error(json.error || "Errore snapshot");
      }
    } catch { toast.error("Errore snapshot"); }
    finally { setSnapshotting(false); }
  };

  const toggleExpand = async (kw) => {
    const key = `${kw.keyword}-${kw.marketplace}`;
    const next = new Set(expanded);
    if (next.has(key)) {
      next.delete(key);
      setExpanded(next);
      return;
    }
    next.add(key);
    setExpanded(next);

    // Carica ASIN + word cloud (refresh ogni volta che espandi)
    try {
      const [resA, resW] = await Promise.all([
        fetch(`/api/v2/competitor/asins?keyword=${encodeURIComponent(kw.keyword)}&marketplace=${kw.marketplace}`, { cache: "no-store" }),
        fetch(`/api/v2/competitor/wordcloud?keyword=${encodeURIComponent(kw.keyword)}&marketplace=${kw.marketplace}`, { cache: "no-store" }),
      ]);
      const jsonA = await resA.json(), jsonW = await resW.json();
      if (jsonA.ok) setAsinsByKw(prev => ({ ...prev, [key]: jsonA.asins }));
      if (jsonW.ok) setWordsByKw(prev => ({ ...prev, [key]: jsonW.words }));
    } catch {}
  };

  const liveSearch = async () => {
    if (!newKw.trim()) { toast.error("Inserisci una keyword (la categoria è solo un filtro)"); return; }
    setSearching(true);
    try {
      const params = new URLSearchParams({ marketplace: newMkt });
      if (newKw.trim()) params.set("keyword", newKw.trim());
      if (newCat.trim()) params.set("category_id", newCat.trim());
      const res = await fetch(`/api/v2/competitor/search?${params.toString()}`);
      const json = await res.json();
      if (json.ok) setSearchResult(json);
      else toast.error(json.error);
    } catch { toast.error("Errore ricerca"); }
    finally { setSearching(false); }
  };

  const browseCategoria = async () => {
    if (!newCat.trim()) { toast.error("Inserisci un browse node ID"); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/v2/competitor/categoria-explore?category_id=${encodeURIComponent(newCat.trim())}&marketplace=${newMkt}`);
      const json = await res.json();
      if (json.ok) setSearchResult({ ...json, _isBrowse: true });
      else toast.error(json.error);
    } catch { toast.error("Errore esplorazione"); }
    finally { setSearching(false); }
  };

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* Top bar */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/dashboard")} type="button" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-indigo-500/10 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
              <Eye className="w-[18px] h-[18px] text-indigo-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Competitor Watch</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Monitoraggio categorie e competitor</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowComparison(v => !v)} type="button" className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${showComparison ? "bg-emerald-500/20 border border-emerald-500/50 text-emerald-200" : "bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"}`}>
              <Scale className="w-3.5 h-3.5" />
              Confronto prezzi
            </button>
            <button onClick={() => navigate("/uffici/competitor/storico")} type="button" className="flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:text-violet-200 transition-colors">
              <History className="w-3.5 h-3.5" />
              Storico ASIN
            </button>
            <button onClick={runSnapshot} disabled={snapshotting} type="button" className={`flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${snapshotting ? "bg-slate-800 border border-slate-700 text-slate-500" : "bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 hover:text-indigo-200"}`}>
              {snapshotting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              {snapshotting ? "In corso..." : "Aggiorna conteggi"}
            </button>
          </div>
        </div>
      </header>

      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-indigo-400 animate-spin" /></div>
        ) : (
          <>
            {/* Aggiungi keyword */}
            <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400/60" />
              <div className="px-6 py-5 sm:px-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 bg-indigo-500/10 border-indigo-500/40 text-indigo-400">
                    <Plus className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Configura</span>
                    <h3 className="text-sm font-semibold text-white -mt-0.5">Aggiungi keyword da monitorare</h3>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    type="text"
                    value={newKw}
                    onChange={e => { setNewKw(e.target.value); setSearchResult(null); }}
                    onKeyDown={e => e.key === "Enter" && addKeyword()}
                    placeholder="Es: smalto semipermanente unghie"
                    className="flex-1 min-w-[250px] bg-slate-800/60 border border-slate-700 rounded-md px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500/60 outline-none"
                  />
                  <select value={newMkt} onChange={e => setNewMkt(e.target.value)} className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2.5 text-sm text-white outline-none">
                    {MARKETPLACES.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                  <div className="flex items-center gap-1">
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={newCat}
                      onChange={e => setNewCat(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Browse node ID (es. 3762161)"
                      title="Solo numeri. Trovi il numero su Amazon nell'URL della categoria, dopo node="
                      className="w-[200px] bg-slate-800/60 border border-slate-700 rounded-md px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:ring-1 focus:ring-indigo-500/60 outline-none"
                    />
                    <select
                      value=""
                      onChange={e => { if (e.target.value) setNewCat(e.target.value); }}
                      title="Categorie pre-impostate"
                      className="bg-slate-800/60 border border-slate-700 rounded-md px-2 py-2.5 text-xs text-violet-300 outline-none cursor-pointer"
                    >
                      <option value="">📁</option>
                      {categorieDisponibili.filter(c => c.marketplace === newMkt).map(c => (
                        <option key={`${c.id}-${c.marketplace}`} value={c.id}>{c.nome} ({c.id})</option>
                      ))}
                    </select>
                    <button onClick={() => setShowCatManager(v => !v)} type="button" title="Gestisci categorie" className="px-2 py-2.5 rounded-md text-xs bg-slate-800/60 border border-slate-700 text-slate-400 hover:text-violet-300 transition-colors">
                      ⚙
                    </button>
                  </div>
                  <button onClick={liveSearch} disabled={searching || (!newKw.trim() && !newCat.trim())} type="button" className="flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-medium bg-slate-500/10 hover:bg-slate-500/20 border border-slate-500/40 text-slate-300 transition-colors disabled:opacity-50">
                    {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    Anteprima
                  </button>
                  <button onClick={browseCategoria} disabled={searching || !newCat.trim()} type="button" title="Sfoglia top prodotti della categoria (workaround SP-API: usa una keyword neutra)" className="flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-medium bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 text-violet-300 transition-colors disabled:opacity-50">
                    {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    Sfoglia categoria
                  </button>
                  <button onClick={addKeyword} disabled={adding || (!newKw.trim() && !newCat.trim())} type="button" className="flex items-center gap-1.5 px-3 py-2.5 rounded-md text-xs font-medium bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 transition-colors disabled:opacity-50">
                    {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                    Aggiungi
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                  <span className="text-violet-400">💡</span> La <strong>keyword è obbligatoria</strong>. La categoria è un filtro opzionale (solo browse node numerico). Premi <code className="text-violet-300 bg-slate-800/60 px-1 rounded">⚙</code> per aggiungere le tue categorie.
                </p>

                {/* Pannello gestione categorie quick-pick */}
                {showCatManager && (
                  <div className="mt-3 p-4 bg-slate-800/30 border border-slate-700/50 rounded-md">
                    <p className="text-[10px] uppercase tracking-wider text-violet-400 mb-3">Gestisci categorie quick-pick</p>
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={newCatId}
                        onChange={e => setNewCatId(e.target.value.replace(/[^0-9]/g, ""))}
                        placeholder="ID (es. 3762161)"
                        className="w-[140px] bg-slate-900/60 border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-violet-500/60"
                      />
                      <input
                        type="text"
                        value={newCatNome}
                        onChange={e => setNewCatNome(e.target.value)}
                        placeholder="Nome categoria (es. Smalti semipermanenti)"
                        className="flex-1 min-w-[200px] bg-slate-900/60 border border-slate-700 rounded px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none"
                      />
                      <select value={newCatMkt} onChange={e => setNewCatMkt(e.target.value)} className="bg-slate-900/60 border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none">
                        {MARKETPLACES.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                      <button onClick={aggiungiCategoria} type="button" className="px-3 py-1.5 rounded text-[11px] font-medium bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 text-violet-300">+ Salva</button>
                    </div>
                    {(CATEGORIE_BUILTIN.length + catCustom.length) > 0 && (
                      <div className="space-y-1">
                        {CATEGORIE_BUILTIN.map(c => (
                          <div key={`b-${c.id}-${c.marketplace}`} className="flex items-center gap-3 text-[11px] py-1 px-2 rounded bg-slate-900/30">
                            <img src={`https://flagcdn.com/24x18/${flagCode(c.marketplace)}.png`} alt={c.marketplace} className="w-4 h-2.5 rounded-sm" />
                            <span className="font-mono text-violet-300 w-20">{c.id}</span>
                            <span className="text-slate-300 flex-1">{c.nome}</span>
                            <span className="text-[9px] text-slate-600 uppercase">built-in</span>
                          </div>
                        ))}
                        {catCustom.map(c => (
                          <div key={`c-${c.id}-${c.marketplace}`} className="flex items-center gap-3 text-[11px] py-1 px-2 rounded bg-slate-900/30">
                            <img src={`https://flagcdn.com/24x18/${flagCode(c.marketplace)}.png`} alt={c.marketplace} className="w-4 h-2.5 rounded-sm" />
                            <span className="font-mono text-violet-300 w-20">{c.id}</span>
                            <span className="text-slate-300 flex-1">{c.nome}</span>
                            <button onClick={() => rimuoviCategoria(c.id, c.marketplace)} type="button" className="text-slate-600 hover:text-rose-400 transition-colors" title="Rimuovi">
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] text-slate-600 mt-2">Le categorie aggiunte sono salvate nel browser di questo PC.</p>

                    {/* Auto-discovery */}
                    <div className="mt-4 pt-4 border-t border-slate-700/40">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-violet-400">Scopri categorie automatiche</p>
                          <p className="text-[10px] text-slate-600 mt-0.5">Estrae i browse node Amazon dagli ASIN già tracciati nello storico</p>
                        </div>
                        <button onClick={discoverCategorie} disabled={discovering} type="button" className="px-3 py-1.5 rounded text-[11px] font-medium bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 text-violet-300 disabled:opacity-50 inline-flex items-center gap-1.5">
                          {discovering ? <Loader2 className="w-3 h-3 animate-spin" /> : "🔍"}
                          {discovering ? "Scansione..." : "Scopri"}
                        </button>
                      </div>
                      {discovered.length > 0 && (
                        <div className="mt-3 max-h-[300px] overflow-y-auto space-y-1 pr-1">
                          {discovered.map(c => {
                            const giaPresente = categorieDisponibili.some(x => x.id === c.id && x.marketplace === c.marketplace);
                            return (
                              <div key={`d-${c.id}-${c.marketplace}`} className="flex items-center gap-3 text-[11px] py-1 px-2 rounded bg-slate-900/30 hover:bg-slate-900/60 transition-colors">
                                <img src={`https://flagcdn.com/24x18/${flagCode(c.marketplace)}.png`} alt={c.marketplace} className="w-4 h-2.5 rounded-sm flex-shrink-0" />
                                <span className="font-mono text-violet-300 w-20 flex-shrink-0">{c.id}</span>
                                <span className="text-slate-300 flex-1 truncate" title={c.nome}>{c.nome}</span>
                                <span className="text-[9px] text-slate-600">{c.count} ASIN</span>
                                {giaPresente ? (
                                  <span className="text-[9px] text-emerald-400 px-2">✓</span>
                                ) : (
                                  <button onClick={() => aggiungiDaDiscovery(c)} type="button" className="text-[10px] px-2 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-300 hover:bg-violet-500/20">+</button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Risultato anteprima */}
                {searchResult && (
                  <div className="mt-4 p-4 bg-slate-800/30 border border-slate-700/50 rounded-md">
                    <div className="flex items-center gap-2 mb-2">
                      <Globe className={`w-4 h-4 ${searchResult._isBrowse ? "text-violet-400" : "text-indigo-400"}`} />
                      <span className="text-sm font-semibold text-white">{fmtInt(searchResult.count)} prodotti trovati</span>
                      {searchResult._isBrowse ? (
                        <span className="text-[10px] text-slate-500">in categoria <span className="text-violet-300">{newCat}</span> su {newMkt}</span>
                      ) : (
                        <span className="text-[10px] text-slate-500">per "{newKw}" su {newMkt}</span>
                      )}
                    </div>
                    {searchResult._isBrowse && (
                      <div className="text-[10px] text-amber-400/80 mb-2 italic space-y-0.5">
                        <p>⚠ SP-API richiede sempre una keyword. Multi-query con keyword neutre: {(searchResult.keywords_usate || []).map(k => `"${k.kw}" (${k.items})`).join(", ")}</p>
                        {searchResult.note && <p className="text-slate-500">{searchResult.note}</p>}
                      </div>
                    )}
                    {searchResult._isBrowse && (
                      <div className="mb-3 p-3 rounded-md bg-emerald-500/5 border border-emerald-500/30 text-[11px] text-emerald-300 leading-relaxed">
                        <p className="font-semibold text-emerald-200 mb-1">💡 Cosa significa il badge <span className="font-mono px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-300">2×</span>, <span className="font-mono px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-300">3×</span>, ecc. accanto al titolo?</p>
                        <p>
                          Indica in <strong>quante delle {(searchResult.keywords_usate || []).length} query</strong> con keyword neutre quel prodotto è stato trovato.
                          Più alto è il numero, più il prodotto è un vero <strong>best-seller della categoria</strong>: appare con keyword diverse, quindi non è un risultato accidentale.
                          Un <span className="font-mono">4×</span> o <span className="font-mono">5×</span> è quasi sicuramente un top reale; un risultato <strong>senza badge</strong> è apparso solo in 1 query — può essere meno rappresentativo.
                          La lista è già ordinata per affidabilità decrescente.
                        </p>
                      </div>
                    )}
                    {searchResult.items?.length > 0 && (
                      <div className="space-y-1.5 mt-3">
                        <p className="text-[10px] uppercase tracking-wider text-slate-500">Top risultati:</p>
                        {searchResult.items.map(item => (
                          <div key={item.asin} className="flex items-center gap-3 text-xs py-1 border-b border-slate-700/20 last:border-0">
                            <span className="w-6 text-center text-[10px] font-semibold text-amber-400 tabular-nums flex-shrink-0">#{item.posizione}</span>
                            <span className="font-mono text-emerald-400 text-[10px] cursor-pointer hover:text-emerald-300" onClick={() => { navigator.clipboard.writeText(item.asin); toast.success(`ASIN ${item.asin} copiato`); }}>{item.asin}</span>
                            <span className="text-slate-300 truncate flex-1">{item.titolo}</span>
                            {item.brand && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex-shrink-0">{item.brand}</span>}
                            {item.hits > 1 && (
                              <span
                                className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-400 flex-shrink-0 cursor-help"
                                title={`Trovato in ${item.hits} delle ${(searchResult.keywords_usate || []).length} query con keyword neutre. Più alto è il numero, più è probabile che sia un vero top della categoria (apparire con keyword diverse = best-seller robusto). Un risultato senza badge è apparso solo in 1 query.`}
                              >{item.hits}×</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Sezione Confronto Prezzi (toggle) */}
            {showComparison && (
              <div className="relative bg-slate-900/60 border border-emerald-500/30 rounded-lg overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
                <div className="px-6 py-5 sm:px-8">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-md border bg-emerald-500/10 border-emerald-500/40 text-emerald-400 flex items-center justify-center flex-shrink-0">
                      <Scale className="w-[18px] h-[18px]" />
                    </div>
                    <div>
                      <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Posizionamento prezzi</span>
                      <h3 className="text-sm font-semibold text-white -mt-0.5">I tuoi ASIN vs i competitor della keyword ({comparison.length})</h3>
                    </div>
                  </div>

                  {/* Form aggiungi mapping */}
                  <div className="flex flex-wrap items-center gap-2 mb-4 p-3 rounded-md bg-slate-800/30 border border-slate-700/40">
                    <input type="text" value={newMapAsin} onChange={e => setNewMapAsin(e.target.value.toUpperCase())} placeholder="Tuo ASIN (es. B0XXXXXXXX)" maxLength={10} className="w-44 bg-slate-900/40 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40" />
                    <select value={newMapMkt} onChange={e => setNewMapMkt(e.target.value)} className="bg-slate-900/40 border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none">
                      {MARKETPLACES.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <select value={newMapKeyword} onChange={e => setNewMapKeyword(e.target.value)} className="flex-1 min-w-[180px] bg-slate-900/40 border border-slate-700 rounded px-2 py-1.5 text-xs text-white outline-none">
                      <option value="">— scegli keyword monitorata —</option>
                      {keywords.filter(k => k.marketplace === newMapMkt).map(k => (
                        <option key={k.id} value={k.keyword}>{k.keyword}</option>
                      ))}
                    </select>
                    <button onClick={addMapping} type="button" className="px-3 py-1.5 rounded text-xs font-medium bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">+ Mappa</button>
                  </div>

                  {loadingComparison ? (
                    <div className="flex items-center justify-center py-6"><Loader2 className="w-5 h-5 text-emerald-400 animate-spin" /></div>
                  ) : comparison.length === 0 ? (
                    <p className="text-sm text-slate-500 py-4">Nessun mapping. Mappa un tuo ASIN a una keyword monitorata per vedere il confronto.</p>
                  ) : (
                    <div className="space-y-3">
                      {comparison.map(item => {
                        const m = item.mapping;
                        const my = item.my;
                        const stats = item.stats;
                        const gapAvg = item.gap_vs_avg;
                        const gapMin = item.gap_vs_min;
                        const sopraMedia = gapAvg != null && gapAvg > 5;
                        const sottoMedia = gapAvg != null && gapAvg < -5;
                        return (
                          <div key={m.id} className="rounded-lg border border-slate-700/50 bg-slate-800/20 p-4">
                            <div className="flex items-center gap-3 mb-3">
                              <img src={`https://flagcdn.com/24x18/${flagCode(m.marketplace)}.png`} alt={m.marketplace} className="w-5 h-3 rounded-sm flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-emerald-400 text-[11px]">{m.my_asin}</span>
                                  <span className="text-[10px] text-slate-500">vs keyword</span>
                                  <span className="text-xs text-white font-medium">"{m.keyword_source}"</span>
                                </div>
                                {my?.titolo && <div className="text-[11px] text-slate-300 truncate mt-0.5">{my.titolo}</div>}
                              </div>
                              <button onClick={() => removeMapping(m.id)} type="button" title="Rimuovi mapping" className="w-7 h-7 rounded border border-slate-700 flex items-center justify-center text-slate-500 hover:text-rose-400 transition-colors flex-shrink-0">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>

                            {!my ? (
                              <p className="text-[11px] text-amber-400/80 italic">Tuo ASIN non trovato in listings_snapshot. Sincronizza prezzi nella pagina Listing.</p>
                            ) : stats.with_price === 0 ? (
                              <p className="text-[11px] text-amber-400/80 italic">Nessun competitor di questa keyword ha ancora prezzo. Lancia "Aggiorna tutti" nello Storico.</p>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-3">
                                  <div>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500">Tuo prezzo</p>
                                    <p className="text-base font-bold text-white tabular-nums">€ {fmtNum(my.prezzo)}</p>
                                    {my.buybox_won === 1 && <span className="text-[9px] text-emerald-400">✓ BuyBox</span>}
                                  </div>
                                  <div>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500">Min competitor</p>
                                    <p className="text-base font-bold text-white tabular-nums">€ {fmtNum(stats.price_min)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500">Media competitor</p>
                                    <p className="text-base font-bold text-white tabular-nums">€ {fmtNum(stats.price_avg)}</p>
                                  </div>
                                  <div>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500">Gap vs media</p>
                                    <p className={`text-base font-bold tabular-nums ${sopraMedia ? "text-rose-400" : sottoMedia ? "text-emerald-400" : "text-slate-300"}`}>
                                      {gapAvg != null ? `${gapAvg > 0 ? "+" : ""}${gapAvg}%` : "—"}
                                    </p>
                                    {sopraMedia && <p className="text-[9px] text-rose-400">⚠ caro</p>}
                                    {sottoMedia && <p className="text-[9px] text-emerald-400">competitivo</p>}
                                  </div>
                                  <div>
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500">Gap vs min</p>
                                    <p className={`text-base font-bold tabular-nums ${gapMin > 20 ? "text-rose-400" : gapMin > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                                      {gapMin != null ? `${gapMin > 0 ? "+" : ""}${gapMin}%` : "—"}
                                    </p>
                                  </div>
                                </div>

                                <div className="flex flex-wrap gap-3 mb-3 text-[10px] text-slate-400">
                                  <span>Competitor analizzati: <strong className="text-slate-200">{stats.competitors_count}</strong> ({stats.with_price} con prezzo)</span>
                                  {stats.prime_pct != null && <span>· Prime: <strong className="text-sky-300">{stats.prime_pct}%</strong></span>}
                                  {stats.fba_pct != null && <span>· FBA: <strong className="text-amber-300">{stats.fba_pct}%</strong></span>}
                                  {stats.rating_avg != null && <span>· Rating medio: <strong className="text-yellow-300">{stats.rating_avg}★</strong></span>}
                                  {stats.review_avg != null && <span>· Review medie: <strong className="text-sky-300">{fmtInt(stats.review_avg)}</strong> (max {fmtInt(stats.review_max)})</span>}
                                </div>

                                {stats.top10?.length > 0 && (
                                  <div className="bg-slate-900/40 rounded p-2">
                                    <p className="text-[9px] uppercase tracking-wider text-slate-500 mb-2">Top {stats.top10.length} competitor</p>
                                    <div className="space-y-1">
                                      {stats.top10.map(t => {
                                        const miaSottoPrezzo = my?.prezzo != null && t.prezzo != null && t.prezzo < my.prezzo;
                                        return (
                                          <div key={t.asin} className={`flex items-center gap-2 text-[10px] py-1 px-1.5 rounded ${miaSottoPrezzo ? "bg-rose-500/5" : ""}`}>
                                            <span className="text-amber-400 font-bold w-5 text-center">#{t.posizione}</span>
                                            {t.image_url ? (
                                              <img src={t.image_url} alt="" className="w-8 h-8 rounded object-cover border border-slate-700/50 flex-shrink-0" onError={e => e.currentTarget.style.display = "none"} />
                                            ) : (
                                              <div className="w-8 h-8 rounded border border-slate-700/50 bg-slate-800/40 flex-shrink-0" />
                                            )}
                                            <a href={`https://www.amazon.${m.marketplace === "UK" ? "co.uk" : m.marketplace.toLowerCase()}/dp/${t.asin}`} target="_blank" rel="noreferrer" className="font-mono text-emerald-400 w-24 hover:text-emerald-300 flex-shrink-0">{t.asin}</a>
                                            <span className="text-white truncate flex-1">{t.titolo}</span>
                                            {t.is_prime === 1 && <span title="Prime" className="inline-flex items-center gap-0.5 text-sky-300"><Zap className="w-2.5 h-2.5" /></span>}
                                            {t.is_fba === 1 && <span title="FBA" className="text-[8px] text-amber-400">FBA</span>}
                                            <span className={`font-mono w-16 text-right ${miaSottoPrezzo ? "text-rose-400 font-semibold" : "text-white"}`}>{t.prezzo != null ? `€ ${fmtNum(t.prezzo)}` : "—"}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Lista keyword monitorate */}
            <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
              <div className="px-6 py-5 sm:px-8">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 bg-cyan-500/10 border-cyan-500/40 text-cyan-400">
                    <Eye className="w-[18px] h-[18px]" />
                  </div>
                  <div>
                    <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500">Monitoraggio</span>
                    <h3 className="text-sm font-semibold text-white -mt-0.5">Keyword monitorate ({keywords.length})</h3>
                  </div>
                </div>

                {keywords.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 mb-4 p-2.5 rounded-md bg-slate-800/30 border border-slate-700/40">
                    <span className="text-[10px] uppercase tracking-wider text-slate-500 mr-1">Filtra top-20:</span>
                    <button onClick={() => setFiltroPrime(v => !v)} type="button" className={`text-[10px] px-2 py-1 rounded border transition-colors inline-flex items-center gap-1 ${filtroPrime ? "bg-sky-500/15 border-sky-500/40 text-sky-300" : "bg-slate-900/40 border-slate-700 text-slate-400 hover:text-slate-200"}`}>
                      <Zap className="w-2.5 h-2.5" />Solo Prime
                    </button>
                    <button onClick={() => setFiltroFba(v => !v)} type="button" className={`text-[10px] px-2 py-1 rounded border transition-colors ${filtroFba ? "bg-amber-500/15 border-amber-500/40 text-amber-300" : "bg-slate-900/40 border-slate-700 text-slate-400 hover:text-slate-200"}`}>
                      Solo FBA
                    </button>
                    <input type="number" inputMode="decimal" value={filtroPrezzoMin} onChange={e => setFiltroPrezzoMin(e.target.value)} placeholder="€ min" className="w-20 bg-slate-900/40 border border-slate-700 rounded px-2 py-1 text-[10px] text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40" />
                    <span className="text-slate-600 text-[10px]">-</span>
                    <input type="number" inputMode="decimal" value={filtroPrezzoMax} onChange={e => setFiltroPrezzoMax(e.target.value)} placeholder="€ max" className="w-20 bg-slate-900/40 border border-slate-700 rounded px-2 py-1 text-[10px] text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-emerald-500/40" />
                    {filtriAttivi && (
                      <button onClick={() => { setFiltroPrime(false); setFiltroFba(false); setFiltroPrezzoMin(""); setFiltroPrezzoMax(""); }} type="button" className="text-[10px] px-2 py-1 rounded border border-slate-700 text-slate-500 hover:text-rose-400 transition-colors">
                        Reset
                      </button>
                    )}
                  </div>
                )}

                {keywords.length === 0 ? (
                  <p className="text-sm text-slate-500 py-4">Nessuna keyword configurata. Aggiungine una sopra per iniziare.</p>
                ) : (
                  <div className="space-y-3">
                    {keywords.map(kw => {
                      const key = `${kw.keyword}-${kw.marketplace}`;
                      const isOpen = expanded.has(key);
                      const asinsAll = asinsByKw[key] || [];
                      const asins = filtraAsins(asinsAll);
                      const trendColor = kw.trend_7gg > 0 ? "text-rose-400" : kw.trend_7gg < 0 ? "text-emerald-400" : "text-slate-500";
                      const TrendIcon = kw.trend_7gg > 0 ? TrendingUp : kw.trend_7gg < 0 ? TrendingDown : Minus;

                      return (
                        <div key={kw.id} className={`rounded-lg border transition-all ${kw.attivo ? "border-slate-700/50 bg-slate-800/20" : "border-slate-800 bg-slate-800/10 opacity-50"}`}>
                          {/* Header */}
                          <div className="flex items-center gap-4 px-4 py-3">
                            <button onClick={() => toggleExpand(kw)} type="button" className="flex-1 flex items-center gap-3 text-left min-w-0">
                              <img src={`https://flagcdn.com/24x18/${flagCode(kw.marketplace)}.png`} alt={kw.marketplace} className="w-5 h-3 rounded-sm flex-shrink-0" />
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-medium text-white">{kw.keyword}</span>
                              {kw.category_id && <span className="text-[9px] px-1.5 py-0.5 rounded bg-violet-500/10 border border-violet-500/30 text-violet-400 ml-2">cat: {kw.category_id}</span>}
                                <div className="flex items-center gap-3 mt-0.5">
                                  {kw.ultimo_count != null && (
                                    <span className="text-xs text-white font-semibold tabular-nums">{fmtInt(kw.ultimo_count)} prodotti</span>
                                  )}
                                  {kw.trend_7gg != null && (
                                    <span className={`flex items-center gap-0.5 text-[10px] font-medium ${trendColor}`}>
                                      <TrendIcon className="w-3 h-3" />
                                      {kw.trend_7gg > 0 ? "+" : ""}{fmtInt(kw.trend_7gg)} (7gg)
                                    </span>
                                  )}
                                  {!kw.ultimo_count && <span className="text-[10px] text-slate-600">Mai scansionato</span>}
                                </div>
                              </div>
                              {isOpen ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                            </button>

                            <button onClick={() => toggleKeyword(kw.id)} type="button" title={kw.attivo ? "Disattiva" : "Attiva"} className="w-8 h-8 rounded-md border border-slate-700 flex items-center justify-center text-slate-500 hover:text-white transition-colors">
                              {kw.attivo ? <ToggleRight className="w-4 h-4 text-emerald-400" /> : <ToggleLeft className="w-4 h-4" />}
                            </button>
                            <button onClick={() => deleteKeyword(kw.id)} type="button" title="Elimina" className="w-8 h-8 rounded-md border border-slate-700 flex items-center justify-center text-slate-500 hover:text-rose-400 transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Expanded: top competitor */}
                          {isOpen && (
                            <div className="border-t border-slate-700/30 px-4 py-3">
                              {!asinsByKw[key] ? (
                                <div className="flex items-center gap-2 py-2"><Loader2 className="w-4 h-4 text-indigo-400 animate-spin" /><span className="text-[11px] text-slate-500">Caricamento competitor...</span></div>
                              ) : asinsAll.length === 0 ? (
                                <p className="text-[11px] text-slate-500">Nessun competitor salvato. Lancia "Aggiorna conteggi" per popolare.</p>
                              ) : asins.length === 0 ? (
                                <p className="text-[11px] text-amber-400/80">Nessuno dei {asinsAll.length} competitor passa i filtri attivi.</p>
                              ) : (
                                <div className="space-y-3">
                                  {/* Word cloud insight SEO */}
                                  {wordsByKw[key]?.length > 0 && (() => {
                                    const words = wordsByKw[key];
                                    const maxC = Math.max(...words.map(w => w.count));
                                    return (
                                      <div className="rounded-md bg-emerald-500/5 border border-emerald-500/20 p-2.5">
                                        <p className="text-[10px] uppercase tracking-wider text-emerald-400 mb-1.5">💡 Parole più usate nei titoli top — usale nei tuoi listing</p>
                                        <div className="flex flex-wrap gap-1.5">
                                          {words.map(w => {
                                            const intensity = w.count / maxC;
                                            const fontSize = 10 + intensity * 6;
                                            const opacity = 0.5 + intensity * 0.5;
                                            return (
                                              <span key={w.word} title={`Usata ${w.count} volte`} style={{ fontSize: `${fontSize}px`, opacity }} className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 cursor-help">
                                                {w.word}<span className="text-[8px] text-emerald-400/60 ml-1">{w.count}</span>
                                              </span>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                  <div className="space-y-1.5">
                                  <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Top {asins.length} competitor{filtriAttivi ? ` (filtrati su ${asinsAll.length} totali)` : ""}</p>
                                  {asins.map(a => (
                                    <div key={a.asin} className="flex items-center gap-3 text-xs py-2 border-b border-slate-800/20 last:border-0">
                                      <span className="w-7 text-center text-[11px] font-bold text-amber-400 tabular-nums flex-shrink-0">#{a.posizione || "—"}</span>
                                      {a.image_url ? (
                                        <img src={a.image_url} alt="" className="w-10 h-10 rounded object-cover border border-slate-700/50 flex-shrink-0" onError={e => e.currentTarget.style.display = "none"} />
                                      ) : (
                                        <div className="w-10 h-10 rounded border border-slate-700/50 bg-slate-800/40 flex items-center justify-center flex-shrink-0">
                                          <ImageIcon className="w-3.5 h-3.5 text-slate-600" />
                                        </div>
                                      )}
                                      <span className="font-mono text-emerald-400 text-[10px] w-24 flex-shrink-0 cursor-pointer hover:text-emerald-300" onClick={() => { navigator.clipboard.writeText(a.asin); toast.success(`ASIN ${a.asin} copiato`); }}>{a.asin}</span>
                                      <span className="text-white truncate flex-1">{a.titolo}</span>
                                      {a.is_prime === 1 && <span title="Prime" className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/15 border border-sky-500/40 text-sky-300 font-bold inline-flex items-center gap-0.5 flex-shrink-0"><Zap className="w-2.5 h-2.5" />Prime</span>}
                                      {a.is_fba === 1 && <span title="Fulfilled by Amazon" className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 flex-shrink-0">FBA</span>}
                                      {a.is_fba === 0 && <span title="Fulfilled by Merchant" className="text-[9px] px-1.5 py-0.5 rounded bg-slate-500/10 border border-slate-500/30 text-slate-400 flex-shrink-0">FBM</span>}
                                      {a.handling_max_hours != null && <span title={`Evasione: ${a.handling_max_hours}h`} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-700/40 border border-slate-600/40 text-slate-300 inline-flex items-center gap-0.5 flex-shrink-0"><Clock className="w-2.5 h-2.5" />{a.handling_max_hours}h</span>}
                                      {a.brand && <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex-shrink-0">{a.brand}</span>}
                                      <a href={`https://www.amazon.${kw.marketplace === "UK" ? "co.uk" : kw.marketplace.toLowerCase()}/dp/${a.asin}`} target="_blank" rel="noreferrer" title="Apri su Amazon" className="w-7 h-7 rounded border border-slate-700 flex items-center justify-center text-slate-500 hover:text-white hover:border-slate-600 transition-colors flex-shrink-0">
                                        <ExternalLink className="w-3 h-3" />
                                      </a>
                                    </div>
                                  ))}
                                </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="relative border-t border-slate-800 px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
        <span>&copy; {new Date().getFullYear()} Nexus — Competitor Watch</span>
        <span className="font-mono">v2.0</span>
      </footer>
    </div>
  );
};

export default CompetitorWatch;
