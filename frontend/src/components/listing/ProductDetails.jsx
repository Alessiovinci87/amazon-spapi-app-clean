import React from "react";
import { useNavigate, useParams } from "react-router-dom";

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
    <div className="bg-white mt-10 p-6 rounded-lg shadow-md max-w-3xl mx-auto">
      <h3 className="text-xl font-bold mb-6 text-center">Modifica Prodotto</h3>

      {/* Titolo */}
      <div className="mb-6">
        <label htmlFor="titolo" className="block text-sm font-medium text-gray-700">
          Titolo
        </label>
        <input
          id="titolo"
          type="text"
          value={prodotto.titolo || ""}
          onChange={(e) => onChange({ ...prodotto, titolo: e.target.value })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Inserisci titolo prodotto"
          autoComplete="off"
        />
      </div>

      {/* Bullet Point */}
      <div className="mb-6">
        <label htmlFor="bullet" className="block text-sm font-medium text-gray-700">
          Bullet Point
        </label>
        <textarea
          id="bullet"
          rows={4}
          value={prodotto.bullet || ""}
          onChange={(e) => onChange({ ...prodotto, bullet: e.target.value })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Inserisci bullet points separati da a capo"
        />
      </div>

      {/* Descrizione */}
      <div className="mb-6">
        <label htmlFor="descrizione" className="block text-sm font-medium text-gray-700">
          Descrizione
        </label>
        <textarea
          id="descrizione"
          rows={6}
          value={prodotto.descrizione || ""}
          onChange={(e) => onChange({ ...prodotto, descrizione: e.target.value })}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 resize-y focus:outline-none focus:ring-2 focus:ring-indigo-500"
          placeholder="Inserisci descrizione prodotto"
        />
      </div>

      {/* Pulsanti */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
        <button
          type="button"
          onClick={() => navigate(`/immagini/${prodotto.asin}/${paese}`)}
          className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded transition"
        >
          📸 Immagini
        </button>

        <button
          type="button"
          onClick={() => navigate(`/aplus/${prodotto.asin}/${paese}`)}
          className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded transition"
        >
          ➕ Contenuto A+
        </button>
      </div>

      {/* Torna alla lista */}
      <div className="text-center mt-10">
        <button
          type="button"
          onClick={() => {
            onChange(null);
            navigate("/listing");
          }}
          className="text-sm text-gray-600 hover:underline focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          ⬅ Torna alla lista
        </button>
      </div>
    </div>
  );
};

export default ProductDetails;
