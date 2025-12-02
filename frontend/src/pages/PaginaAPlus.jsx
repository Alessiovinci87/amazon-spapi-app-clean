import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

const PaginaAplus = () => {
  const { asin, paese } = useParams();
  const [immagini, setImmagini] = useState([]);

  useEffect(() => {
    const mappaPaesi = {
      Italia: "IT",
      Francia: "FR",
      Germania: "DE",
      Spagna: "ES",
      Belgio: "BE",
      Olanda: "NL",
      Svezia: "SE",
      Polonia: "PL",
      UK: "UK",
      Irlanda: "IE",
    };

    const codice = mappaPaesi[paese] || paese;
    const cartella = `${codice} - Antifungo`;
    const basePath = `/images/Aplus/${cartella}`;

    // Presumiamo sempre 4 immagini A+
    const files = [1, 2, 3, 4].map((num) => `${basePath}/${num}.jpg`);
    setImmagini(files);
  }, [asin, paese]);

  return (
    <div className="min-h-screen bg-zinc-900 text-white p-6 sm:p-8">
      <h2 className="text-2xl sm:text-3xl font-bold text-center mb-10">
        Contenuto A+ – {paese}
      </h2>

      <div className="flex flex-wrap justify-center max-w-screen-xl mx-auto gap-4 px-4">
        {immagini.map((src, idx) => (
          <div
            key={idx}
            className="w-full sm:w-[48%] md:w-[23%] bg-white rounded-xl shadow-md p-4 flex flex-col items-center"
          >
            <img
              src={src}
              alt={`Contenuto A+ ${idx + 1}`}
              className="w-full h-auto object-contain rounded-md max-h-[500px]"
              onError={(e) => {
                e.target.style.display = "none";
                console.warn("Immagine A+ non trovata:", src);
              }}
              loading="lazy"
            />
            <p className="text-black text-sm mt-2 text-center">
              Contenuto {idx + 1}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PaginaAplus;
