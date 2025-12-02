import React, { useState, useEffect } from "react";
import ProductHeader from "./ProductHeader";
import CountryDetails from "../CountryDetails";
import "../../pages/Magazzino.css";
import { abbreviate } from "../../utils/abbreviate";

const bandiere = {
  ITALIA: "https://flagcdn.com/w40/it.png",
  FRANCIA: "https://flagcdn.com/w40/fr.png",
  UK: "https://flagcdn.com/w40/gb.png",
  SPAGNA: "https://flagcdn.com/w40/es.png",
  GERMANIA: "https://flagcdn.com/w40/de.png",
  BELGIO: "https://flagcdn.com/w40/be.png",
  OLANDA: "https://flagcdn.com/w40/nl.png",
  SVEZIA: "https://flagcdn.com/w40/se.png",
  POLONIA: "https://flagcdn.com/w40/pl.png",
  IRLANDA: "https://flagcdn.com/w40/ie.png",
};

const ProductCard = ({ asin, sku, image, prezzo, buyBox, stock, perPaese = {} }) => {
  const [mostraDettagli, setMostraDettagli] = useState(false);
  const [copiatoAsin, setCopiatoAsin] = useState(false);
  const [copiatoSku, setCopiatoSku] = useState(false);
  const [immagini, setImmagini] = useState([]); // 📷 tutte le immagini Amazon

  // 🔄 Fetch immagini da backend
  useEffect(() => {
    async function fetchImmagini() {
      try {
        const res = await fetch(`http://localhost:3005/api/v2/inventario/${asin}/images`);
        if (!res.ok) throw new Error("Errore fetch immagini");
        const data = await res.json();
        setImmagini(data.images || []);
      } catch (err) {
        console.error("❌ Errore caricamento immagini:", err);
      }
    }
    if (asin) fetchImmagini();
  }, [asin]);

  const datiPaesi = Object.entries(perPaese).map(([paese, dati]) => ({
    bandiera: bandiere[paese],
    prezzo: dati.prezzo,
    buyBox: dati.buyBox,
    stock: dati.stock,
    commissioni: dati.commissioni || null,
  }));

  const scaricaCSV = () => {
    const intestazioni = ["ASIN", "SKU", "Paese", "Prezzo", "Stock", "BuyBox"];
    const righe = Object.entries(perPaese).map(([paese, dati]) => [
      asin,
      sku || "",
      paese,
      dati.prezzo || "",
      dati.stock || "",
      dati.buyBox ? "Sì" : "No",
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [intestazioni, ...righe].map((e) => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${asin}_dettaglio.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="product-card">
      <div className="product-header">
        <img src={image} alt={asin} className="product-image" />
        <div className="product-details">
          <div className="product-info">
            <span className="label">ASIN</span>
            <span
              className="value asin-clickable"
              title={copiatoAsin ? "Copiato!" : "Copia ASIN"}
              onClick={() => {
                navigator.clipboard.writeText(asin);
                setCopiatoAsin(true);
                setTimeout(() => setCopiatoAsin(false), 1500);
              }}
            >
              {asin}
            </span>

            <span className="label sku-sotto-label">SKU</span>
            <span
              className="value asin-clickable sku-sotto"
              title={copiatoSku ? "Copiato!" : "Copia SKU"}
              onClick={() => {
                navigator.clipboard.writeText(sku);
                setCopiatoSku(true);
                setTimeout(() => setCopiatoSku(false), 1500);
              }}
            >
              {sku}
            </span>
          </div>

          <div className="product-info">
            <span className="label">Prezzo</span>
            <span className="value">{prezzo ? `$${prezzo}` : "N/A"}</span>
          </div>
          <div className="product-info">
            <span className="label">Buy Box</span>
            <span className={`value ${buyBox ? "yes" : "no"}`}>
              {buyBox ? "Sì" : "No"}
            </span>
          </div>
          <div className="product-info">
            <span className="label">Stock</span>
            <span className="value">{stock}</span>
          </div>
        </div>
      </div>

      {/* 🔗 Link + CSV */}
      <div className="product-link-right">
        <a
          href={`https://www.amazon.it/dp/${asin}`}
          target="_blank"
          rel="noopener noreferrer"
          className="amazon-button"
        >
          Vai su Amazon
        </a>
      </div>
      <div className="product-download">
        <button className="btn-csv" onClick={scaricaCSV}>
          📥 Scarica CSV
        </button>
      </div>

      {/* 📷 Griglia immagini aggiuntive */}
      {immagini.length > 0 && (
        <div className="immagini-grid">
          <h4 className="mt-3 mb-2 font-semibold">Immagini prodotto</h4>
          <div className="grid grid-cols-3 gap-2">
            {immagini.map((img) => (
              <img
                key={img.id}
                src={img.url}
                alt={img.variant}
                className="w-full h-24 object-contain border rounded"
              />
            ))}
          </div>
        </div>
      )}

      {/* 🔄 Toggle dettagli per paese */}
      <button
        className="toggle-button"
        onClick={() => setMostraDettagli(!mostraDettagli)}
      >
        {mostraDettagli ? "Nascondi Dettagli" : "Mostra Dettagli"}
      </button>

      {mostraDettagli && (
        <div className="dettagli-paesi">
          {datiPaesi.map((paese, index) => (
            <CountryDetails key={index} {...paese} />
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductCard;
