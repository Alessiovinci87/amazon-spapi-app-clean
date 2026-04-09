import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Archive,
  FileText,
  ExternalLink,
  LogOut,
} from "lucide-react";

const DDTStorico = () => {
  const [storico, setStorico] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/v2/ddt/storico");
        if (!res.ok) throw new Error("Errore fetch storico DDT");
        const data = await res.json();
        setStorico(data);
      } catch (err) {
        console.error("Errore fetch storico DDT", err);
      }
    }
    fetchData();
  }, []);

  return (
    <div className="relative min-h-screen flex flex-col bg-slate-950 text-slate-100 antialiased">
      {/* Texture grid */}
      <div className="absolute inset-0 opacity-[0.035] pointer-events-none" style={{ backgroundImage: "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

      {/* === Top bar === */}
      <header className="relative border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => navigate("/uffici/ddt")} type="button" title="Indietro" className="w-9 h-9 rounded-md border border-slate-800 bg-slate-900 hover:bg-slate-800 hover:border-slate-700 text-slate-500 hover:text-slate-200 transition-colors flex items-center justify-center flex-shrink-0">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-md bg-blue-500/10 border border-blue-500/40 flex items-center justify-center flex-shrink-0">
              <Archive className="w-[18px] h-[18px] text-blue-400" />
            </div>
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-[15px] font-semibold tracking-tight text-white truncate">Storico DDT</span>
              <span className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mt-1">Nexus · Documenti di Trasporto</span>
            </div>
          </div>
          <button onClick={() => navigate("/uffici/ddt")} type="button" className="hidden sm:flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-500 hover:text-slate-300 transition-colors">
            <LogOut className="w-3.5 h-3.5" /> DDT
          </button>
        </div>
      </header>

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">Archivio</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            Storico DDT Generici <span className="text-slate-500">— tutti i documenti.</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            Consulta e scarica i PDF di tutti i documenti di trasporto generati.
          </p>
        </div>
      </section>

      {/* === Contenuto === */}
      <main className="relative flex-1 px-6 sm:px-10 lg:px-16 py-8">
        <div className="relative bg-slate-900/60 border border-slate-800 rounded-lg overflow-hidden">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-400/60" />
          <div className="px-6 py-5 sm:px-8 sm:py-6">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-md border bg-blue-500/10 border-blue-500/40 text-blue-400 flex items-center justify-center flex-shrink-0">
                  <FileText className="w-[18px] h-[18px]" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">Documenti generati</div>
                  <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">DDT Generici</h2>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-medium tabular-nums">
                {storico.length}
              </span>
            </div>

            {storico.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Nessun DDT generato</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60">
                      <th className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-4">ID</th>
                      <th className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-4">Numero DDT</th>
                      <th className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-4">Data</th>
                      <th className="text-right text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-4">Unità</th>
                      <th className="text-right text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-4">Colli</th>
                      <th className="text-center text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3">PDF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storico.map((ddt) => (
                      <tr key={ddt.id} className="border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 pr-4 text-slate-500 font-mono text-xs tabular-nums">{ddt.id}</td>
                        <td className="py-3 pr-4 text-white font-medium">{ddt.numeroDDT}</td>
                        <td className="py-3 pr-4 text-slate-400">{ddt.data}</td>
                        <td className="py-3 pr-4 text-right text-white font-semibold tabular-nums">{ddt.totUnita}</td>
                        <td className="py-3 pr-4 text-right text-white font-semibold tabular-nums">{ddt.totColli}</td>
                        <td className="py-3 text-center">
                          <a
                            href={`/api/v2/ddt/storico/${ddt.id}/pdf`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-400/60 text-blue-400 hover:text-blue-300 text-[11px] font-medium transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            PDF
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* === Footer === */}
      <footer className="relative border-t border-slate-800 bg-slate-900/30">
        <div className="px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between text-[11px] text-slate-600">
          <span>Nexus · Storico DDT</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DDTStorico;
