import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./Magazzino.css";

const flags = {
  Italy: "it",
  France: "fr",
  Spain: "es",
  Germany: "de",
  UK: "gb",
  Netherlands: "nl",
  Belgium: "be",
  Poland: "pl",
  Sweden: "se",
};

const marketplaces = Object.keys(flags);

const InventarioMagazzino = () => {
  const navigate = useNavigate();
  const [prodotti, setProdotti] = useState([]);
  const [stockFBA, setStockFBA] = useState([]);
  const [dettagli, setDettagli] = useState({});
  const [filtro, setFiltro] = useState("");
  const [soloOutOfStock, setSoloOutOfStock] = useState(false);
  const [expandedAsin, setExpandedAsin] = useState(null);
  const [selezionati, setSelezionati] = useState(marketplaces); // tutti selezionati all'avvio
  const [caricamento, setCaricamento] = useState(false);

  // 🔹 1. Carica catalogo
  useEffect(() => {
    const fetchCatalogo = async () => {
      try {
        const response = await fetch(
          "/api/v2/reports-amazon/catalogo/amzn1.spdoc.1.4.eu.508a42ce-5a6a-4e38-83e7-edc44aa896f5.TAV53YUXUWMKC.47700"
        );
        const data = await response.json();
        setProdotti(data);
      } catch (error) {
        console.error("❌ Errore caricamento catalogo:", error);
      }
    };
    fetchCatalogo();
  }, []);

  // 🔹 2. Carica stock FBA reale
  const caricaStockFBA = async () => {
    setCaricamento(true);
    try {
      const res = await fetch("/api/v2/reports-amazon/fba-stock");
      const data = await res.json();
      setStockFBA(data);
    } catch (err) {
      console.error("❌ Errore caricamento stock FBA:", err);
    } finally {
      setCaricamento(false);
    }
  };

  useEffect(() => {
    caricaStockFBA();
  }, []);

  // 🔹 3. Carica tutte le immagini in blocco da Amazon
useEffect(() => {
  const fetchAllImages = async () => {
    try {
      const res = await fetch("/api/v2/reports-amazon/catalog-images/all");
      const data = await res.json();
      if (data?.immagini) {
        setProdotti((prev) =>
          prev.map((p) => {
            const found = data.immagini.find((i) => i.asin === p.asin);
            return found ? { ...p, immagine_main: found.image } : p;
          })
        );
      }
    } catch (err) {
      console.error("❌ Errore fetch immagini globali:", err);
    }
  };
  fetchAllImages();
}, []);


  // 🔹 3. Aggiorna stock FBA (POST)
  const aggiornaStockFBA = async () => {
    setCaricamento(true);
    try {
      const res = await fetch("/api/v2/reports-amazon/fba-stock/update", {
        method: "POST",
      });
      const result = await res.json();
      console.log("🔄 Aggiornamento:", result);
      await caricaStockFBA();
    } catch (err) {
      console.error("❌ Errore aggiornamento FBA:", err);
    } finally {
      setCaricamento(false);
    }
  };

  // 🔹 4. Merge catalogo + stock FBA per ASIN
  const prodottiConStock = prodotti.map((p) => {
    const fbaRecord = stockFBA.find((f) => f.asin === p.asin);
    return {
      ...p,
      stockFBA: fbaRecord ? fbaRecord.stock_totale : 0,
      stockCountry: fbaRecord ? fbaRecord.country : null,
    };
  });

  // 🔹 5. Carica dettagli marketplace
  const caricaDettagli = async (asin) => {
    if (dettagli[asin]) {
      setExpandedAsin(expandedAsin === asin ? null : asin);
      return;
    }
    try {
      const res = await fetch(`/api/v2/reports-amazon/catalog/${asin}`);
      const data = await res.json();
      setDettagli((prev) => ({ ...prev, [asin]: data.marketplaces }));
      setExpandedAsin(asin);
    } catch (err) {
      console.error("❌ Errore caricamento dettagli:", err);
    }
  };

  // 🔹 6. Gestione filtro testo / stock / paesi
  const prodottiFiltrati = prodottiConStock.filter((p) => {
    const testo = filtro.toLowerCase();
    const match =
      p.asin?.toLowerCase().includes(testo) ||
      p.sku?.toLowerCase().includes(testo) ||
      p.nome?.toLowerCase().includes(testo);

    return (
      match &&
      (!soloOutOfStock || p.stockFBA === 0) &&
      (p.stockCountry ? selezionati.includes(p.stockCountry) : true)
    );
  });

  // 🔹 Calcolo commissioni placeholder
  const calcolaCommissioni = (price) => {
    if (!price || !price.amount) return "-";
    const commissione = (price.amount * 0.15).toFixed(2);
    return `${commissione} ${price.currencyCode}`;
  };

  // 🔹 Gestione filtro paesi
  const togglePaese = (paese) => {
    setSelezionati((prev) =>
      prev.includes(paese)
        ? prev.filter((p) => p !== paese)
        : [...prev, paese]
    );
  };

  const fetchImmagine = async (asin) => {
    try {
      const res = await fetch(`/api/v2/reports-amazon/catalog-image/${asin}`);
      const data = await res.json();
      if (data?.image) {
        setProdotti((prev) =>
          prev.map((p) =>
            p.asin === asin ? { ...p, immagine_main: data.image } : p
          )
        );
      }
    } catch (err) {
      console.error("Errore fetch immagine:", err);
    }
  };


  return (
    <div className="magazzino-container bg-zinc-900 text-white min-h-screen p-6">
      <button
        onClick={() => navigate(-1)}
        className="mb-6 px-4 py-2 bg-zinc-700 rounded hover:bg-zinc-600"
      >
        ⬅️ Torna indietro
      </button>

      <div className="flex flex-wrap justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-blue-400">
          📦 Inventario Amazon (Catalogo + FBA)
        </h1>

        <button
          onClick={aggiornaStockFBA}
          disabled={caricamento}
          className={`px-4 py-2 rounded text-white ${caricamento
            ? "bg-gray-500 cursor-not-allowed"
            : "bg-green-600 hover:bg-green-700"
            }`}
        >
          {caricamento ? "⏳ Aggiornamento..." : "🔄 Aggiorna Stock FBA"}
        </button>
      </div>

      {/* 🌍 Filtri */}
      <div className="filtro-container flex flex-wrap items-center gap-4 mb-6">
        <input
          type="text"
          placeholder="Filtra per ASIN, SKU o Nome..."
          value={filtro}
          onChange={(e) => setFiltro(e.target.value)}
          className="px-3 py-2 rounded bg-zinc-800 border border-zinc-700 text-white w-72"
        />
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={soloOutOfStock}
            onChange={() => setSoloOutOfStock(!soloOutOfStock)}
          />
          Solo out of stock
        </label>
      </div>

      {/* 🌍 Filtro paesi */}
      <div className="flex flex-wrap gap-3 mb-8">
        {marketplaces.map((paese) => (
          <label
            key={paese}
            className={`flex items-center gap-2 px-3 py-1 rounded cursor-pointer ${selezionati.includes(paese)
              ? "bg-blue-600 text-white"
              : "bg-zinc-700 text-zinc-300"
              }`}
            onClick={() => togglePaese(paese)}
          >
            <img
              src={`https://flagcdn.com/24x18/${flags[paese]}.png`}
              alt={paese}
              className="w-5 h-3"
            />
            {paese}
          </label>
        ))}
      </div>

      {/* 🔹 Lista prodotti */}
      <div className="space-y-5">
        {prodottiFiltrati.map((p) => (
          <div
            key={p.asin}
            className="bg-zinc-800 rounded-xl p-4 shadow-md hover:shadow-lg transition-shadow duration-300"
          >
            <div className="flex items-center gap-4">
              <img
                key={p.immagine_main || p.asin} // 🔑 forza il rerender quando cambia l'immagine
                src={p.immagine_main || "/images/no_image2.png"}
                alt={p.nome}
                onError={(e) => {
                  e.target.onerror = null; // evita loop infiniti
                  e.target.src = "/images/no_image.jpg";
                  fetchImmagine(p.asin);
                }}
                className="w-20 h-20 rounded object-contain bg-zinc-700 transition-all duration-300"
              />
              <div className="flex-1">
                <h2 className="font-bold text-sm text-blue-300">{p.nome}</h2>
                <p className="text-xs text-zinc-400">ASIN: {p.asin}</p>
                <p className="text-xs text-zinc-400">SKU: {p.sku}</p>
                <p className="text-xs text-zinc-400">
                  Stock catalogo:{" "}
                  <span className="font-semibold text-white">
                    {p.stock ?? p.pronto ?? 0}
                  </span>
                </p>
                <p className="text-xs text-green-400">
                  Stock FBA reale:{" "}
                  <span className="font-semibold text-white">
                    {p.stockFBA ?? 0}
                  </span>
                  {p.stockCountry && ` (${p.stockCountry})`}
                </p>
              </div>
              <button
                onClick={() => caricaDettagli(p.asin)}
                className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
              >
                {expandedAsin === p.asin ? "Nascondi" : "🌍 Dettagli"}
              </button>
            </div>

            {/* 🔹 Tabella dettagli marketplace */}
            {expandedAsin === p.asin && dettagli[p.asin] && (
              <div className="mt-4 border-t border-zinc-700 pt-3 overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-zinc-700 text-zinc-200">
                      <th className="p-2">Marketplace</th>
                      <th className="p-2">Prezzo</th>
                      <th className="p-2">Stock Amazon</th>
                      <th className="p-2">FBA reale</th>
                      <th className="p-2">Buy Box</th>
                      <th className="p-2">Commissioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dettagli[p.asin]
                      .filter((d) => selezionati.includes(d.paese))
                      .map((d) => {
                        const flag = flags[d.paese] || "xx";
                        const price = d.listing?.summaries?.[0]?.price;
                        const quantity =
                          d.listing?.summaries?.[0]?.quantity ?? "n/d";
                        const hasBuyBox = d.listing?.summaries?.[0]?.buyBoxWon;
                        const fbaQty = p.stockFBA || "-";

                        return (
                          <tr
                            key={d.marketplaceId}
                            className="border-b border-zinc-700 hover:bg-zinc-800"
                          >
                            <td className="p-2 flex items-center gap-2">
                              <img
                                src={`https://flagcdn.com/24x18/${flag}.png`}
                                alt={d.paese}
                                className="w-6 h-4"
                              />
                              {d.paese}
                            </td>
                            <td className="p-2">
                              {price?.amount || "-"}{" "}
                              {price?.currencyCode || ""}
                            </td>
                            <td className="p-2">{quantity}</td>
                            <td className="p-2 text-blue-400 font-semibold">
                              {fbaQty}
                            </td>
                            <td className="p-2">{hasBuyBox ? "✅" : "❌"}</td>
                            <td className="p-2 text-green-400">
                              {calcolaCommissioni(price)}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default InventarioMagazzino;
