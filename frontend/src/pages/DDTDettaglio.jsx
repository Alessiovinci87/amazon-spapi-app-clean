// frontend/pages/DDTDettaglio.jsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";

const DDTDettaglio = () => {
  const { idSpedizione } = useParams();
  const navigate = useNavigate();

  const [spedizione, setSpedizione] = useState(null);
  const [loading, setLoading] = useState(true);

  // Campi manuali
  const [numeroSpedizione, setNumeroSpedizione] = useState("");
  const [dataDdt, setDataDdt] = useState("");
  const [numeroCartone, setNumeroCartone] = useState("");
  const [numeroPacco, setNumeroPacco] = useState("");
  const [trasportatore, setTrasportatore] = useState("GLS");

  // Codici pacco riga per riga
  const [righeCodici, setRigheCodici] = useState([]);

  useEffect(() => {
    fetch("/api/v2/ddt/prebolle")
      .then((res) => res.json())
      .then((data) => {
        const found = data.find((s) => s.id === parseInt(idSpedizione));
        setSpedizione(found || null);
        setRigheCodici(
          found ? found.righe.map(() => ({ codicePacco: "" })) : []
        );
        setLoading(false);
      })
      .catch((err) => {
        console.error("Errore caricamento dettaglio:", err);
        setLoading(false);
      });
  }, [idSpedizione]);

  const aggiornaCodicePacco = (index, value) => {
    const nuove = [...righeCodici];
    nuove[index].codicePacco = value;
    setRigheCodici(nuove);
  };

  const confermaDDT = async () => {
    try {
      const res = await fetch(`/api/v2/ddt/conferma/${idSpedizione}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          numeroSpedizione,
          dataDdt,
          numeroCartone,
          numeroPacco,
          trasportatore,
          righeExtra: righeCodici,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        alert(`✅ DDT confermato con successo (id: ${data.ddtId})`);
        navigate("/ddt");
      } else {
        alert(`❌ Errore: ${data.error}`);
      }
    } catch (err) {
      console.error("Errore conferma DDT:", err);
      alert("Errore durante la conferma del DDT");
    }
  };

  if (loading) return <p className="p-4 text-white">⏳ Caricamento...</p>;
  if (!spedizione)
    return <p className="p-4 text-red-400">❌ Spedizione non trovata</p>;

  return (
    <div className="p-6 text-white">
      <h1 className="text-2xl font-bold mb-4 text-center">
        📋 DDT Dettaglio - {spedizione.progressivo}
      </h1>

      {/* Dati spedizione */}
      <div className="mb-4 bg-gray-800 p-4 rounded shadow">
        <p>Paese: {spedizione.paese}</p>
        <p>Data spedizione: {spedizione.data}</p>
        <p>Operatore: {spedizione.operatore || "-"}</p>
        {spedizione.note && <p>Note: {spedizione.note}</p>}
      </div>

      {/* Lista prodotti */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold mb-2">Prodotti</h2>
        <ul className="space-y-2">
          {spedizione.righe.map((riga, i) => (
            <li
              key={i}
              className="bg-gray-700 p-3 rounded flex justify-between items-center"
            >
              <span>
                {riga.prodotto_nome} ({riga.quantita} pezzi)
              </span>
              <input
                type="text"
                placeholder="Codice pacco FBA..."
                value={righeCodici[i]?.codicePacco || ""}
                onChange={(e) => aggiornaCodicePacco(i, e.target.value)}
                className="ml-4 p-1 rounded text-black"
              />
            </li>
          ))}
        </ul>
      </div>

      {/* Form dati manuali */}
      <div className="mb-6 bg-gray-800 p-4 rounded shadow space-y-3">
        <h2 className="text-lg font-semibold">Dati manuali</h2>

        <input
          type="text"
          placeholder="Numero Spedizione (FBAxxxx)"
          value={numeroSpedizione}
          onChange={(e) => setNumeroSpedizione(e.target.value)}
          className="w-full p-2 rounded text-white"
        />

        <input
          type="date"
          value={dataDdt}
          onChange={(e) => setDataDdt(e.target.value)}
          className="w-full p-2 rounded text-white"
        />

        <input
          type="number"
          placeholder="Numero cartone"
          value={numeroCartone}
          onChange={(e) => setNumeroCartone(e.target.value)}
          className="w-full p-2 rounded text-white"
        />

        <input
          type="number"
          placeholder="Numero pacco"
          value={numeroPacco}
          onChange={(e) => setNumeroPacco(e.target.value)}
          className="w-full p-2 rounded text-white"
        />

        <select
          value={trasportatore}
          onChange={(e) => setTrasportatore(e.target.value)}
          className="w-full p-2 rounded text-white"
        >
          <option value="GLS">GLS</option>
          <option value="DHL">DHL</option>
          <option value="UPS">UPS</option>
          <option value="UPS">TNT</option>
        </select>
      </div>

      {/* Bottoni */}
      <div className="flex justify-between">
        <button
          onClick={() => navigate(-1)}
          className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500"
        >
          ⬅️ Indietro
        </button>
        <button
          onClick={confermaDDT}
          className="px-4 py-2 bg-green-600 rounded hover:bg-green-700"
        >
          ✅ Conferma DDT
        </button>
        <a
  href={`/api/v2/ddt/pdf/${idSpedizione}`}
  target="_blank"
  rel="noopener noreferrer"
  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
>
  📄 Scarica PDF
</a>
      </div>
    </div>
  );
};

export default DDTDettaglio;
