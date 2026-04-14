import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Image, Sparkles } from "lucide-react";
import ProductDetails from "../components/listing/ProductDetails";

const DettaglioProdotto = () => {
  const { asin } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [prodotto, setProdotto] = useState(null);
  const [paese, setPaese] = useState("");

  useEffect(() => {
    const fetchProdotto = async () => {
      try {
        const res = await fetch("/mock/prodotti.json");
        const tutti = await res.json();
        const selezionato = tutti.find((p) => p.asin === asin);

        if (selezionato) {
          setProdotto(selezionato);
        } else {
          setProdotto({ errore: t("dettaglioProdotto.error_not_found") });
        }
      } catch (err) {
        console.error("Errore nel caricamento del prodotto:", err);
        setProdotto({ errore: t("dettaglioProdotto.error_load") });
      }
    };

    fetchProdotto();

    const paeseSalvato = localStorage.getItem("paese");
    if (paeseSalvato) {
      setPaese(paeseSalvato);
    }
  }, [asin]);

  if (!prodotto) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-slate-400 text-sm">{t("dettaglioProdotto.loading")}</p>
      </div>
    );
  }

  if (prodotto.errore) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <p className="text-red-400 text-sm">{prodotto.errore}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 antialiased">
      <div className="border-b border-slate-800 bg-slate-900/40 backdrop-blur-sm px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="text-lg font-semibold tracking-tight">
          {t("dettaglioProdotto.title")} <span className="text-slate-500 font-mono">— {asin}</span>
        </h1>
      </div>

      <div className="px-6 sm:px-10 lg:px-16 py-8">
        <ProductDetails prodotto={prodotto} onChange={setProdotto} />

        {paese && (
          <div className="mt-8 flex justify-center gap-3">
            <button
              onClick={() => navigate(`/listing/${asin}/immagini`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-sm font-medium transition-colors"
            >
              <Image size={16} />
              {t("dettaglioProdotto.btn_immagini")}
            </button>
            <button
              onClick={() => navigate(`/listing/${asin}/aplus`)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/40 hover:border-violet-400/60 text-violet-300 hover:text-violet-200 text-sm font-medium transition-colors"
            >
              <Sparkles size={16} />
              {t("dettaglioProdotto.btn_aplus")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DettaglioProdotto;
