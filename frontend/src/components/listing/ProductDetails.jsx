import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Image, Plus, ArrowLeft } from "lucide-react";

const ProductDetails = ({ prodotto, onChange }) => {
  const navigate = useNavigate();
  const { asin } = useParams();

  let paese = localStorage.getItem("paese");

  const mappaPaesi = {
    Italia: "IT",
    Francia: "FR",
    Germania: "DE",
    Spagna: "ES",
    Belgio: "BE",
    Olanda: "NL",
    Svezia: "SE",
    Polonia: "PL",
    RegnoUnito: "UK",
  };

  paese = mappaPaesi[paese] || paese;

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-6 max-w-3xl mx-auto">
      <h3 className="text-xl font-semibold mb-6 text-center text-slate-100">Modifica Prodotto</h3>

      <div className="mb-5">
        <label htmlFor="titolo" className="block text-xs font-medium text-slate-400 mb-1.5">
          Titolo
        </label>
        <input
          id="titolo"
          type="text"
          value={prodotto.titolo || ""}
          onChange={(e) => onChange({ ...prodotto, titolo: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500"
          placeholder="Inserisci titolo prodotto"
          autoComplete="off"
        />
      </div>

      <div className="mb-5">
        <label htmlFor="bullet" className="block text-xs font-medium text-slate-400 mb-1.5">
          Bullet Point
        </label>
        <textarea
          id="bullet"
          rows={4}
          value={prodotto.bullet || ""}
          onChange={(e) => onChange({ ...prodotto, bullet: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:border-slate-500"
          placeholder="Inserisci bullet points separati da a capo"
        />
      </div>

      <div className="mb-5">
        <label htmlFor="descrizione" className="block text-xs font-medium text-slate-400 mb-1.5">
          Descrizione
        </label>
        <textarea
          id="descrizione"
          rows={6}
          value={prodotto.descrizione || ""}
          onChange={(e) => onChange({ ...prodotto, descrizione: e.target.value })}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 resize-y focus:outline-none focus:border-slate-500"
          placeholder="Inserisci descrizione prodotto"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
        <button
          type="button"
          onClick={() => navigate(`/immagini/${prodotto.asin}/${paese}`)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 hover:border-cyan-400/60 text-cyan-300 hover:text-cyan-200 text-sm font-medium transition-colors"
        >
          <Image size={16} />
          Immagini
        </button>

        <button
          type="button"
          onClick={() => navigate(`/aplus/${prodotto.asin}/${paese}`)}
          className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-sm font-medium transition-colors"
        >
          <Plus size={16} />
          Contenuto A+
        </button>
      </div>

      <div className="text-center mt-8">
        <button
          type="button"
          onClick={() => {
            onChange(null);
            navigate("/listing");
          }}
          className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          <ArrowLeft size={14} />
          Torna alla lista
        </button>
      </div>
    </div>
  );
};

export default ProductDetails;
