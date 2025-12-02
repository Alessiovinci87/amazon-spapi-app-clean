import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const PaginaImmagini = () => {
  const { asin, paese } = useParams();
  const [immagini, setImmagini] = useState([]);

  useEffect(() => {
    const nomeCartella = {
      Italia: "IT",
      Francia: "FR",
      Germania: "DE",
      Spagna: "ES",
      UK: "UK",
      Belgio: "BE",
      Olanda: "NL",
      Svezia: "SE",
      Polonia: "PL",
      Irlanda: "IE",
    };

    const codice = nomeCartella[paese] || paese;
    const cartellaOrig = `${codice} - Antifungo`;
    const basePath = `/images/listing/${cartellaOrig}`;

    const files = [
      `${asin}.MAIN.jpg`,
      `${asin}.PT01.jpg`,
      `${asin}.PT02.jpg`,
      `${asin}.PT03.jpg`,
      `${asin}.PT04.jpg`,
      `${asin}.PT05.jpg`,
    ];

    setImmagini(files.map((f) => `${basePath}/${f}`));
  }, [asin, paese]);

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6 sm:p-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
        Immagini Prodotto – ASIN: {asin} | Paese: {paese}
      </h2>

      <div className="flex flex-wrap justify-center max-w-screen-xl mx-auto gap-4 px-4">
        {immagini.map((src, idx) => (
          <div
            key={idx}
            className="w-full sm:w-[48%] md:w-[31%] bg-white rounded-xl shadow-md p-4 flex flex-col items-center"
          >
            <img
              src={src}
              alt={`Immagine ${idx + 1}`}
              className="w-full h-auto object-contain rounded-md max-h-[500px]"
              loading="lazy"
              onError={(e) => {
                e.target.style.display = "none";
                console.warn("Immagine non trovata:", src);
              }}
            />
            <p className="text-black text-sm mt-2 text-center">
              Immagine {idx + 1}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaginaImmagini;
