import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";

const StoricoProdotto = () => {
  const { asin } = useParams();
  const navigate = useNavigate();

  const [storico, setStorico] = useState([]);
  const [prodotto, setProdotto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState({});

  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  useEffect(() => {
    if (!asin) return;

    setLoading(true);

    axios
      .get(`/api/v2/sfuso/storico_produzioni/${asin}`)
      .then((res) => {
        const data = res.data || [];
        setStorico(data);

        if (data.length > 0) {
          const first = data[0];
          setProdotto({
            asin: first.asin_prodotto,
            nome: first.nome_prodotto || "Prodotto",
            img: `/images/${first.asin_prodotto}.jpg`,
          });
        }

        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ Errore API storico produzioni:", err);
        setError(err.message || "Errore nel caricamento dello storico");
        setLoading(false);
      });
  }, [asin]);

  if (!asin)
    return (
      <div className="text-white p-6 text-center italic">
        Seleziona un prodotto per vedere lo storico.
      </div>
    );

  if (loading)
    return (
      <div className="text-white p-6 text-center font-semibold animate-pulse">
        Caricamento storico...
      </div>
    );

  if (error)
    return (
      <div className="text-red-400 p-6 text-center font-semibold">
        Errore: {error}
      </div>
    );

  return (
    <div className="text-white p-6 w-full">
      {/* Torna indietro */}
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded"
      >
        ⬅️ Torna indietro
      </button>

      {/* Titolo */}
      <h1 className="text-3xl font-bold mb-6 text-center">📜 Storico Produzioni</h1>

      {/* Prodotto */}
      {prodotto && (
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-xl font-semibold">{prodotto.nome}</h2>
            <p className="text-gray-400">ASIN: {prodotto.asin}</p>
          </div>
          <img
            src={prodotto.img}
            alt={prodotto.nome}
            className="w-24 h-24 object-contain rounded shadow"
          />
        </div>
      )}

      {/* Lista storico */}
      {storico.length === 0 ? (
        <p className="text-center text-gray-400">
          Nessun evento registrato per questo prodotto.
        </p>
      ) : (
        <div className="space-y-4">
          {storico.map((item) => {
            const dataFormattata = item.data_evento
              ? new Date(item.data_evento).toLocaleString("it-IT")
              : "Data non disponibile";

            let coloreEvento = "text-blue-400";
            if (item.evento === "CREATA") coloreEvento = "text-yellow-400";
            if (item.evento === "IN LAVORAZIONE") coloreEvento = "text-blue-400";
            if (item.evento === "COMPLETATA") coloreEvento = "text-green-400";
            if (item.evento === "ANNULLATA") coloreEvento = "text-red-400";

            return (
              <div
                key={item.id}
                className="w-full border border-zinc-700 rounded-lg p-4 bg-zinc-800 shadow cursor-pointer"
                onClick={() => toggleExpand(item.id)}
              >
                {/* Riga principale */}
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-3">
                  <span>
                    <strong>Evento:</strong>{" "}
                    <span className={coloreEvento}>{item.evento}</span>
                  </span>

                  <span>
                    <strong>Quantità:</strong> {item.quantita}
                  </span>

                  <span>
                    <strong>Data:</strong> {dataFormattata}
                  </span>

                  <span className="text-yellow-400 ml-2">
                    {expanded[item.id] ? "▲" : "▼"}
                  </span>
                </div>

                {/* Espansione */}
                {expanded[item.id] && (
                  <div className="mt-2 text-sm text-zinc-200 border-t border-zinc-600 pt-2">
                    <p>
                      <strong>ID Produzione:</strong>{" "}
                      {item.id_produzione || "-"}
                    </p>
                    <p>
                      <strong>ID Sfuso:</strong> {item.id_sfuso}
                    </p>
                    <p>
                      <strong>Formato:</strong> {item.formato || "-"}
                    </p>
                    <p>
                      <strong>Litri usati:</strong> {item.litri_usati}
                    </p>

                    {item.note && (
                      <div className="mt-2">
                        <p className="font-semibold">Note:</p>
                        <p className="text-gray-300">{item.note}</p>
                      </div>
                    )}

                    <p className="mt-2">
                      <strong>Operatore:</strong> {item.operatore}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StoricoProdotto;
