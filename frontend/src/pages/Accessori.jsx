// src/pages/Accessori.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccessorioCard from "../components/inventario/AccessorioCard";
import {
  ArrowLeft,
  FileText,
  Wrench,
  Droplet,
  Package,
  Box,
  LogOut,
} from "lucide-react";

function SectionCard({ accent = "orange", icon: Icon, eyebrow, title, badge, children }) {
  const accentMap = {
    orange: "bg-orange-400/60",
    emerald: "bg-emerald-400/60",
    blue: "bg-blue-400/60",
  };
  const iconBg = {
    orange: "bg-orange-500/10 border-orange-500/40 text-orange-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    blue: "bg-blue-500/10 border-blue-500/40 text-blue-400",
  };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${accentMap[accent]}`} />
      <div className="px-6 py-5 sm:px-8 sm:py-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3 min-w-0">
            {Icon && (
              <div className={`w-9 h-9 rounded-md border flex items-center justify-center flex-shrink-0 ${iconBg[accent]}`}>
                <Icon className="w-[18px] h-[18px]" />
              </div>
            )}
            <div className="min-w-0">
              {eyebrow && (
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">{eyebrow}</div>
              )}
              <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight truncate">{title}</h2>
            </div>
          </div>
          {badge}
        </div>
        {children}
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value, accent = "orange" }) {
  const map = {
    orange: "bg-orange-500/10 border-orange-500/40 text-orange-400",
    emerald: "bg-emerald-500/10 border-emerald-500/40 text-emerald-400",
    blue: "bg-blue-500/10 border-blue-500/40 text-blue-400",
  };
  return (
    <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg px-6 py-5">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-9 h-9 rounded-md border flex items-center justify-center ${map[accent]}`}>
          <Icon className="w-[18px] h-[18px]" />
        </div>
      </div>
      <div className="text-3xl font-semibold text-white tabular-nums tracking-tight">{value}</div>
      <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">{label}</div>
    </div>
  );
}

const FILTERS = [
  { key: "tutti", label: "Tutti", icon: Box },
  { key: "12ml", label: "12ml", icon: Droplet },
  { key: "100ml", label: "100ml", icon: Package },
];

const Accessori = () => {
  const [accessori, setAccessori] = useState([]);
  const [filtro, setFiltro] = useState("tutti");
  const navigate = useNavigate();

  const fetchAccessori = async () => {
    try {
      const res = await fetch("/api/v2/accessori");
      if (!res.ok) throw new Error("Errore nel caricamento accessori");
      const data = await res.json();

      const accessoriConImmagine = data.map((a) => {
        let imgPath = null;
        const n = a.nome.toLowerCase();
        if (n.includes("boccetta 12")) imgPath = "/images/accessori/boccetta12ml.png";
        else if (n.includes("boccetta 100")) imgPath = "/images/accessori/boccetta100ml.png";
        else if (n.includes("pennell")) imgPath = "/images/accessori/pennellino12ml.png";
        else if (n.includes("scatol")) imgPath = "/images/accessori/scatoletta12ml.png";
        else if (n.includes("tappo 12") || n.includes("tappino 12")) imgPath = "/images/accessori/tappino12ml.png";
        else if (n.includes("tappo 100") || n.includes("tappino 100")) imgPath = "/images/accessori/tappino100ml.png";
        return { ...a, immagine: imgPath };
      });

      setAccessori(accessoriConImmagine);
    } catch (err) {
      console.error("Errore fetch accessori:", err);
    }
  };

  useEffect(() => {
    fetchAccessori();
  }, []);

  const accessori12 = accessori.filter((a) => a.nome.toLowerCase().includes("12"));
  const accessori100 = accessori.filter((a) => a.nome.toLowerCase().includes("100"));

  const renderGrid = (lista) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
      {lista.map((a) => (
        <AccessorioCard
          key={a.asin_accessorio}
          asin_accessorio={a.asin_accessorio}
          nome={a.nome}
          quantita={a.quantita}
          immagine={a.immagine}
          fetchAccessori={fetchAccessori}
          layout="small"
        />
      ))}
    </div>
  );

  const emptyState = (msg) => (
    <div className="text-center py-12">
      <Wrench className="w-8 h-8 text-slate-700 mx-auto mb-3" />
      <p className="text-sm text-slate-500">{msg}</p>
    </div>
  );

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
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
              onClick={() => navigate("/magazzino")}
              type="button"
              title="Indietro"
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-orange-500/10 border border-orange-500/40 flex items-center justify-center flex-shrink-0">
              <Wrench className="w-[18px] h-[18px] text-orange-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Gestione Accessori</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Nexus · Magazzino</span>
            </div>
          </div>

          <div className="flex items-center gap-3 sm:gap-5 flex-shrink-0">
            <button
              onClick={() => navigate("/accessori/storico")}
              type="button"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 hover:border-violet-400/60 text-violet-300 hover:text-violet-200 text-xs font-medium transition-all"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Storico</span>
            </button>
            <button
              onClick={() => navigate("/magazzino")}
              type="button"
              className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              Magazzino
            </button>
          </div>
        </div>
      </header>

      {/* === Hero compatto === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
                Accessori · Magazzino
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
                Boccette, tappini e pennellini <span className="text-slate-500">— per formato.</span>
              </h1>
              <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
                Gestione stock accessori per prodotti 12ml e 100ml.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* === Filtri formato === */}
      <div className="relative border-b border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16">
          <div className="flex gap-1 overflow-x-auto -mb-px scrollbar-none py-2">
            {FILTERS.map((f) => {
              const active = filtro === f.key;
              const FIcon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => setFiltro(f.key)}
                  type="button"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-[12px] font-medium whitespace-nowrap border transition-all ${
                    active
                      ? "bg-orange-500/15 border-orange-500/50 text-orange-200"
                      : "bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <FIcon className="w-3.5 h-3.5" />
                  {f.label}
                  {active && (
                    <span className="ml-1 px-1.5 py-0.5 bg-orange-500/20 rounded text-[10px] font-mono tabular-nums">
                      {f.key === "tutti" ? accessori.length : f.key === "12ml" ? accessori12.length : accessori100.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* === Contenuto principale === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8 space-y-6">
        {/* Stats */}
        {accessori.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatTile icon={Droplet} label="Accessori 12ml" value={accessori12.length} accent="emerald" />
            <StatTile icon={Package} label="Accessori 100ml" value={accessori100.length} accent="blue" />
            <StatTile icon={Box} label="Totale accessori" value={accessori.length} accent="orange" />
          </div>
        )}

        {/* Sezioni accessori */}
        {(filtro === "tutti" || filtro === "12ml") && (
          <SectionCard
            accent="emerald"
            icon={Droplet}
            eyebrow="Formato piccolo"
            title="Accessori 12ml"
            badge={
              <span className="px-2.5 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-medium tabular-nums">
                {accessori12.length} accessori
              </span>
            }
          >
            {accessori12.length > 0 ? renderGrid(accessori12) : emptyState("Nessun accessorio 12ml trovato")}
          </SectionCard>
        )}

        {(filtro === "tutti" || filtro === "100ml") && (
          <SectionCard
            accent="blue"
            icon={Package}
            eyebrow="Formato grande"
            title="Accessori 100ml"
            badge={
              <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-medium tabular-nums">
                {accessori100.length} accessori
              </span>
            }
          >
            {accessori100.length > 0 ? renderGrid(accessori100) : emptyState("Nessun accessorio 100ml trovato")}
          </SectionCard>
        )}

        {/* Empty state globale */}
        {accessori.length === 0 && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-12 text-center">
            <div className="w-14 h-14 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-6 h-6 text-slate-600" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Nessun accessorio disponibile</h3>
            <p className="text-sm text-slate-500">Gli accessori appariranno qui una volta caricati dal database</p>
          </div>
        )}
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>Nexus · Gestione Accessori</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Accessori;
