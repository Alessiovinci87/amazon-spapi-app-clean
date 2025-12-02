import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ProductDetails from "../components/listing/ProductDetails";

const DettaglioProdotto = () => {
  const { asin } = useParams();
  const navigate = useNavigate();
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
          setProdotto({ errore: "ASIN non trovato." });
        }
      } catch (err) {
        console.error("❌ Errore nel caricamento del prodotto:", err);
        setProdotto({ errore: "Errore nel caricamento dei dati." });
      }
    };

    fetchProdotto();

    const paeseSalvato = localStorage.getItem("paese");
    if (paeseSalvato) {
      setPaese(paeseSalvato);
    }
  }, [asin]);

  if (!prodotto) {
    return <p className="text-white text-center mt-8">Caricamento...</p>;
  }

  if (prodotto.errore) {
    return <p className="text-red-400 text-center mt-8">{prodotto.errore}</p>;
  }

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-4 sm:p-6 md:p-8">
      <div className="max-w-6xl mx-auto">
        <ProductDetails prodotto={prodotto} onChange={setProdotto} />

        {paese && (
          <div className="mt-8 flex justify-center gap-4">
            <button
              onClick={() => navigate(`/listing/${asin}/immagini`)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
            >
              Immagini Prodotto
            </button>
            <button
              onClick={() => navigate(`/listing/${asin}/aplus`)}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition"
            >
              A+ Content
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DettaglioProdotto;
