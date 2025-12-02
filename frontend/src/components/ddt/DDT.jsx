import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const centriLogistici = {
  Italia: [
    { codice: "BLQ1", indirizzo: "45020 Castelguglielmo, Provincia di Rovigo" },
    { codice: "MXP5", indirizzo: "20023 Vercelli, Lombardia" },
    { codice: "TRN3", indirizzo: "10040 Torrazza Piemonte, Torino" },
  ],
  Francia: [
    { codice: "ORY4", indirizzo: "91090 Lisses, Francia" },
    { codice: "ORY1", indirizzo: "91310 Montlhéry, Francia" },
  ],
  Germania: [
    { codice: "FRA1", indirizzo: "Frankfurt am Main, Germania" },
    { codice: "BER3", indirizzo: "Brieselang, Germania" },
  ],
};

const corrieriPredefiniti = ["GLS", "BRT", "DHL", "SDA", "TNT", "AMAZON"];

// stessa logica backend
function getPezziPerBox(nomeProdotto = "") {
  const nome = nomeProdotto.toLowerCase();
  if (nome.includes("kit 12 ml")) return 150;
  if (nome.includes("kit 100 ml")) return 75;
  if (nome.includes("cuticole")) return 20;
  if (nome.includes("12 ml")) return 300;
  if (nome.includes("100 ml")) return 150;
  return null;
}

const DDT = () => {
  const navigate = useNavigate();

  const [spedizioni, setSpedizioni] = useState([]);
  const [selectedSpedizione, setSelectedSpedizione] = useState(null);
  const [righe, setRighe] = useState([]);

  const [numeroDDT, setNumeroDDT] = useState("");
  const [numeroAmazon, setNumeroAmazon] = useState("");
  const [data, setData] = useState("");
  const [paese, setPaese] = useState("");
  const [centro, setCentro] = useState("");
  const [trasportatore, setTrasportatore] = useState("");
  const [trasportatoreCustom, setTrasportatoreCustom] = useState("");
  const [tracking, setTracking] = useState("");

  // { rigaId: [codiciPacchi] }
  const [numeriPacchi, setNumeriPacchi] = useState({});

  useEffect(() => {
    fetch("/api/v2/spedizioni")
      .then((res) => res.json())
      .then((data) => setSpedizioni(data));
  }, []);

  // quando scelgo una spedizione, carico le sue righe
  useEffect(() => {
    if (selectedSpedizione) {
      fetch(`/api/v2/spedizioni/${selectedSpedizione.id}/righe`)
        .then((res) => {
          if (!res.ok) {
            console.error("Errore fetch righe:", res.status, res.statusText);
            return [];
          }
          return res.json();
        })
        .then((data) => {
          console.log("📦 Righe ricevute:", data);
          setRighe(data || []);
          setNumeriPacchi({});
        })
        .catch((err) => {
          console.error("❌ Errore fetch righe:", err);
        });
    }
  }, [selectedSpedizione]);
  ;

  const aggiornaNumeroPacco = (rigaId, index, nuovoValore) => {
    setNumeriPacchi((prev) => {
      const nuovi = { ...prev };
      if (!nuovi[rigaId]) nuovi[rigaId] = [];
      nuovi[rigaId][index] = nuovoValore;
      return nuovi;
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();

    const body = {
      numeroDDT,
      numeroAmazon,
      data,
      centroLogistico: centro,
      trasportatore: trasportatore === "ALTRO" ? trasportatoreCustom : trasportatore,
      tracking,
      numeriPacchi,
    };

    const res = await fetch(`/api/v2/ddt/pdf/${selectedSpedizione.id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    window.open(url, "_blank");
  };

  return (
    <div className="p-6 bg-gray-900 min-h-screen text-white">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 px-4 py-2 bg-gray-700 text-white rounded"
      >
        ⬅ Torna indietro
      </button>

      <h1 className="text-2xl font-bold mb-6">📦 Genera DDT</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Selezione spedizione */}
        <div>
          <label className="block font-semibold">Seleziona spedizione</label>
          <select
            className="border p-2 w-full bg-gray-800 text-white"
            value={selectedSpedizione?.id || ""}
            onChange={(e) =>
              setSelectedSpedizione(
                spedizioni.find((s) => s.id === Number(e.target.value))
              )
            }
          >
            <option value="">-- Seleziona --</option>
            {spedizioni.map((s) => (
              <option key={s.id} value={s.id}>
                {s.progressivo} — {s.paese} ({s.data})
              </option>
            ))}
          </select>
        </div>

        {/* Numero DDT */}
        {/* Numero DDT */}
        <div>
          <label className="block font-semibold">Numero DDT *</label>
          <input
            type="text"
            required
            className="border p-2 w-full bg-gray-800 text-white"
            value={numeroDDT}
            onChange={(e) => setNumeroDDT(e.target.value)}
          />
        </div>

        {/* Numero Riferimento Amazon */}
        <div>
          <label className="block font-semibold">N° Riferimento Amazon</label>
          <input
            type="text"
            className="border p-2 w-full bg-gray-800 text-white"
            value={numeroAmazon}
            onChange={(e) => setNumeroAmazon(e.target.value)}
          />
        </div>


        {/* Data */}
        <div>
          <label className="block font-semibold">Data</label>
          <input
            type="date"
            className="border p-2 w-full bg-gray-800 text-white"
            value={data}
            onChange={(e) => setData(e.target.value)}
          />
        </div>

        {/* Paese + centro */}
        <div>
          <label className="block font-semibold">Paese</label>
          <select
            className="border p-2 w-full bg-gray-800 text-white"
            value={paese}
            onChange={(e) => {
              setPaese(e.target.value);
              setCentro("");
            }}
          >
            <option value="">-- Seleziona --</option>
            {Object.keys(centriLogistici).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block font-semibold">Centro logistico</label>
          <select
            className="border p-2 w-full bg-gray-800 text-white"
            value={centro}
            onChange={(e) => setCentro(e.target.value)}
            disabled={!paese}
          >
            <option value="">-- Seleziona --</option>
            {paese &&
              centriLogistici[paese].map((c) => (
                <option key={c.codice} value={`${c.codice} - ${c.indirizzo}`}>
                  {c.codice} - {c.indirizzo}
                </option>
              ))}
          </select>
        </div>

        {/* Trasportatore */}
        <div>
          <label className="block font-semibold">Trasportatore</label>
          <select
            className="border p-2 w-full bg-gray-800 text-white"
            value={trasportatore}
            onChange={(e) => setTrasportatore(e.target.value)}
          >
            <option value="">-- Seleziona --</option>
            {corrieriPredefiniti.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            <option value="ALTRO">Altro...</option>
          </select>
          {trasportatore === "ALTRO" && (
            <input
              type="text"
              placeholder="Inserisci trasportatore"
              className="border p-2 w-full bg-gray-800 text-white mt-2"
              value={trasportatoreCustom}
              onChange={(e) => setTrasportatoreCustom(e.target.value)}
            />
          )}
        </div>

        {/* Tracking */}
        <div>
          <label className="block font-semibold">Tracking</label>
          <input
            type="text"
            className="border p-2 w-full bg-gray-800 text-white"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
          />
        </div>

        {/* Esploso pacchi */}
        {righe.map((r) => {
          const pezziPerBox = getPezziPerBox(r.prodotto_nome) || r.quantita;
          const numCartoni = Math.ceil(r.quantita / pezziPerBox);

          return (
            <div key={r.id} className="mb-4">
              <p className="font-semibold">
                {r.prodotto_nome} — {r.quantita} pezzi
              </p>
              {Array.from({ length: numCartoni }, (_, i) => (
                <div key={i} className="flex gap-2 mt-1">
                  <input
                    type="text"
                    placeholder={`N° Cartone ${i + 1}`}
                    className="border p-2 flex-1 bg-gray-700 text-white"
                    value={numeriPacchi[r.id]?.[i]?.cartone || ""}
                    onChange={(e) =>
                      aggiornaNumeroPacco(r.id, i, {
                        ...numeriPacchi[r.id]?.[i],
                        cartone: e.target.value,
                      })
                    }
                  />
                  <input
                    type="text"
                    placeholder={`N° Pacco ${i + 1}`}
                    className="border p-2 flex-1 bg-gray-700 text-white"
                    value={numeriPacchi[r.id]?.[i]?.pacco || ""}
                    onChange={(e) =>
                      aggiornaNumeroPacco(r.id, i, {
                        ...numeriPacchi[r.id]?.[i],
                        pacco: e.target.value,
                      })
                    }
                  />
                </div>
              ))}
            </div>
          );
        })}


        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded"
          disabled={!selectedSpedizione}
        >
          Genera PDF
        </button>
      </form>
    </div>
  );
};

export default DDT;
