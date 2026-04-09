import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import {
  ArrowLeft,
  Settings2,
  Moon,
  Sun,
  Check,
  Info,
  Monitor,
} from "lucide-react";

const Settings = () => {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const access = localStorage.getItem("auth") || "amazon";
  const backPath = access === "magazzino" ? "/magazzino" : "/dashboard";

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Grid */}
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
              onClick={() => navigate(backPath)}
              type="button"
              title="Indietro"
              className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-indigo-500/10 border border-indigo-500/40 flex items-center justify-center flex-shrink-0">
              <Settings2 className="w-[18px] h-[18px] text-indigo-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">
                Impostazioni
              </span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">
                Nexus · Configurazione
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">
            Configurazione
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Impostazioni{" "}
            <span className="text-slate-500">— personalizza Nexus.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Gestisci il tema dell'interfaccia e visualizza le informazioni
            sull'applicazione.
          </p>
        </div>
      </section>

      {/* === Content === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 pb-12 space-y-8">
        {/* ────────── TEMA ────────── */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-400/60" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-md border bg-indigo-500/10 border-indigo-500/30 flex items-center justify-center flex-shrink-0">
                <Monitor className="w-4 h-4 text-indigo-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">
                  Aspetto
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Tema interfaccia
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Dark Theme Card */}
              <button
                onClick={() => setTheme("dark")}
                type="button"
                className={`relative rounded-lg border-2 p-4 transition-all text-left ${
                  theme === "dark"
                    ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                    : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
                }`}
              >
                {theme === "dark" && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                {/* Mini preview */}
                <div className="w-full h-24 rounded-md bg-slate-950 border border-slate-700 mb-3 overflow-hidden relative">
                  <div
                    className="absolute inset-0 opacity-[0.06] pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
                      backgroundSize: "12px 12px",
                    }}
                  />
                  <div className="absolute top-2 left-2 right-2 h-2 rounded-sm bg-slate-800" />
                  <div className="absolute top-6 left-2 w-16 h-8 rounded-sm bg-slate-800/80 border border-slate-700" />
                  <div className="absolute top-6 left-20 w-16 h-8 rounded-sm bg-slate-800/80 border border-slate-700" />
                </div>
                <div className="flex items-center gap-2">
                  <Moon className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-semibold text-white">Dark</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tema scuro con griglia bianca. Ideale per ambienti con poca
                  luce.
                </p>
              </button>

              {/* Light Theme Card */}
              <button
                onClick={() => setTheme("light")}
                type="button"
                className={`relative rounded-lg border-2 p-4 transition-all text-left ${
                  theme === "light"
                    ? "border-indigo-500 bg-indigo-500/10 ring-1 ring-indigo-500/30"
                    : "border-slate-700 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
                }`}
              >
                {theme === "light" && (
                  <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
                {/* Mini preview */}
                <div className="w-full h-24 rounded-md bg-white border border-indigo-200 mb-3 overflow-hidden relative">
                  <div
                    className="absolute inset-0 opacity-[0.08] pointer-events-none"
                    style={{
                      backgroundImage:
                        "linear-gradient(to right, #6366f1 1px, transparent 1px), linear-gradient(to bottom, #6366f1 1px, transparent 1px)",
                      backgroundSize: "12px 12px",
                    }}
                  />
                  <div className="absolute top-2 left-2 right-2 h-2 rounded-sm bg-indigo-100" />
                  <div className="absolute top-6 left-2 w-16 h-8 rounded-sm bg-slate-800/80 border border-slate-700" />
                  <div className="absolute top-6 left-20 w-16 h-8 rounded-sm bg-slate-800/80 border border-slate-700" />
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-semibold text-white">Light</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Sfondo bianco con griglia indigo. Card invariate su sfondo
                  chiaro.
                </p>
              </button>
            </div>
          </div>
        </div>

        {/* ────────── INFO APP ────────── */}
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-500/40" />
          <div className="px-5 sm:px-6 py-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-md border bg-slate-500/10 border-slate-500/30 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-slate-400" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 leading-none mb-1">
                  Sistema
                </div>
                <h2 className="text-sm sm:text-base font-semibold text-white tracking-tight">
                  Informazioni applicazione
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Applicazione", value: "Nexus" },
                { label: "Versione", value: "v2.0" },
                { label: "Framework", value: "React + Vite" },
                { label: "Backend", value: "Node.js + Express" },
                { label: "Database", value: "SQL Server" },
                { label: "Integrazione", value: "Amazon SP-API" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between bg-slate-800/40 rounded-md px-4 py-3"
                >
                  <span className="text-[11px] uppercase tracking-wider text-slate-500 font-medium">
                    {item.label}
                  </span>
                  <span className="text-xs font-mono text-slate-300">
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/40">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>&copy; {new Date().getFullYear()} Nexus &middot; Impostazioni</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default Settings;
