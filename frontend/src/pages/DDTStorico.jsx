import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import PageTopBar from "../components/PageTopBar";
import {
  Archive,
  FileText,
  ExternalLink,
  Pencil,
  AlertTriangle,
} from "lucide-react";

const BRAND_LOGOS = {
  lookink: { nome: "Lookink", logo: "/images/LOOKINK-Logo.png" },
  cside: { nome: "C-Side", logo: "/images/C-Side-logo.png" },
  pics: { nome: "Pics Nails", logo: "/images/logo.png" },
};

const DDTStorico = () => {
  const [storico, setStorico] = useState([]);
  const [filtroBrand, setFiltroBrand] = useState("");
  const navigate = useNavigate();
  const { t } = useTranslation();

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

      <PageTopBar
        icon={Archive}
        iconAccent="blue"
        eyebrow={t("ddtStorico.topbar_eyebrow")}
        title={t("ddtStorico.topbar_title")}
        backTo="/uffici/ddt"
      />

      {/* === Hero === */}
      <section className="relative">
        <div className="px-6 sm:px-10 lg:px-16 pt-10 sm:pt-12 pb-6">
          <div className="text-[11px] uppercase tracking-[0.14em] text-slate-500 mb-2">{t("ddtStorico.hero_eyebrow")}</div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-semibold text-white tracking-tight leading-[1.1]">
            {t("ddtStorico.hero_title_main")} <span className="text-slate-500">{t("ddtStorico.hero_title_suffix")}</span>
          </h1>
          <p className="mt-3 text-sm sm:text-[15px] text-slate-400 leading-relaxed max-w-2xl">
            {t("ddtStorico.hero_desc")}
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
                  <div className="text-[10px] uppercase tracking-[0.14em] text-slate-500 mb-0.5">{t("ddtStorico.card_eyebrow")}</div>
                  <h2 className="text-base sm:text-lg font-semibold text-white tracking-tight">{t("ddtStorico.card_title")}</h2>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={filtroBrand}
                  onChange={(e) => setFiltroBrand(e.target.value)}
                  className="bg-slate-800/60 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500/60 focus:border-blue-500/60"
                >
                  <option value="">{t("ddtStorico.filter_all", "Tutti i brand")}</option>
                  {Object.entries(BRAND_LOGOS).map(([k, v]) => (
                    <option key={k} value={k}>{v.nome}</option>
                  ))}
                </select>
                <span className="px-2.5 py-1 rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400 text-[11px] font-medium tabular-nums">
                  {storico.filter((d) => !filtroBrand || d.brand === filtroBrand).length}
                </span>
              </div>
            </div>

            {storico.length === 0 ? (
              <div className="text-center py-12">
                <Archive className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">{t("ddtStorico.empty_text")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700/60">
                      <th className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-4">{t("ddtStorico.th_id")}</th>
                      <th className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-4">{t("ddtStorico.th_brand", "Brand")}</th>
                      <th className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-4">{t("ddtStorico.th_numero")}</th>
                      <th className="text-left text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-4">{t("ddtStorico.th_data")}</th>
                      <th className="text-right text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-4">{t("ddtStorico.th_unita")}</th>
                      <th className="text-right text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-4">{t("ddtStorico.th_colli")}</th>
                      <th className="text-center text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3 pr-3">{t("ddtStorico.th_pdf")}</th>
                      <th className="text-center text-[10px] uppercase tracking-[0.14em] text-slate-500 font-medium pb-3">{t("ddtStorico.th_modifica", "Modifica")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {storico.filter((d) => !filtroBrand || d.brand === filtroBrand).map((ddt) => {
                      const b = BRAND_LOGOS[ddt.brand];
                      const trackingMancante = !ddt.tracking || String(ddt.tracking).trim() === "";
                      return (
                      <tr
                        key={ddt.id}
                        className={
                          trackingMancante
                            ? "border-b border-rose-500/30 bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
                            : "border-b border-slate-800/60 hover:bg-slate-800/30 transition-colors"
                        }
                      >
                        <td className="py-3 pr-4 text-slate-500 font-mono text-xs tabular-nums">{ddt.id}</td>
                        <td className="py-3 pr-4">
                          {b ? (
                            <div className="flex items-center gap-2">
                              <img src={b.logo} alt={b.nome} className="h-10 w-auto object-contain" />
                              <span className="text-xs text-slate-400">{b.nome}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-600">—</span>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-medium">{ddt.numeroDDT}</span>
                            {trackingMancante && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-semibold uppercase tracking-wider">
                                <AlertTriangle className="w-3 h-3" />
                                Tracking mancante
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-slate-400">{ddt.data}</td>
                        <td className="py-3 pr-4 text-right text-white font-semibold tabular-nums">{ddt.totUnita}</td>
                        <td className="py-3 pr-4 text-right text-white font-semibold tabular-nums">{ddt.totColli}</td>
                        <td className="py-3 pr-3 text-center">
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                const r = await fetch(`/api/v2/ddt/storico/${ddt.id}/pdf`);
                                if (!r.ok) throw new Error("pdf");
                                const blob = await r.blob();
                                window.open(window.URL.createObjectURL(blob), "_blank");
                              } catch {
                                alert(t("ddtStorico.err_pdf", "Errore generazione PDF"));
                              }
                            }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 hover:border-blue-400/60 text-blue-400 hover:text-blue-300 text-[11px] font-medium transition-all"
                          >
                            <ExternalLink className="w-3 h-3" />
                            {t("ddtStorico.link_pdf")}
                          </button>
                        </td>
                        <td className="py-3 text-center">
                          <button
                            type="button"
                            onClick={() => navigate(`/uffici/ddt/nuovo?edit=${ddt.id}`)}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 hover:border-amber-400/60 text-amber-400 hover:text-amber-300 text-[11px] font-medium transition-all"
                          >
                            <Pencil className="w-3 h-3" />
                            {t("ddtStorico.btn_modifica", "Modifica")}
                          </button>
                        </td>
                      </tr>
                    );})}
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
          <span>{t("ddtStorico.footer_section")}</span>
          <span className="font-mono">v2.0</span>
        </div>
      </footer>
    </div>
  );
};

export default DDTStorico;
