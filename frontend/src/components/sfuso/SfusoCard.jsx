// SfusoCard.jsx
import React, { useState, useEffect } from "react";
import RettificaModal from "./RettificaModal";

const SfusoCard = ({
  id,
  formato,
  onPrenota,
  sfusoDisponibile = 20,
  litriImpegnatiTot = 0,
  lotto = "Lotto-001",
  asin_collegato = null,   // 🟢 aggiunto
  selectedProdotto = null,
}) => {
  const [sfusoLitri, setSfusoLitri] = useState(sfusoDisponibile);
  const [sfusoLotto, setSfusoLotto] = useState(lotto);
  const [pezziRichiesti, setPezziRichiesti] = useState("");
  const [priorita, setPriorita] = useState("Media");

  const [showRettificaSfuso, setShowRettificaSfuso] = useState(false);
  const [showRettificaLotto, setShowRettificaLotto] = useState(false);

  // 🔹 Ordini fornitore collegati
  const [ordiniFornitore, setOrdiniFornitore] = useState([]);

  useEffect(() => {
    const fetchOrdini = async () => {
      try {
        let url = null;

        if (selectedProdotto?.asin) {
          // se il prodotto ha asin, usa la rotta per ASIN
          url = `http://localhost:3005/api/v2/fornitori/ordini/asin/${selectedProdotto.asin}`;
        } else if (id) {
          // altrimenti usa la rotta per ID sfuso
          url = `http://localhost:3005/api/v2/sfuso/${id}/ordini`;
        }

        if (!url) return;

        const res = await fetch(url);
        const data = await res.json();

        const ordini = Array.isArray(data) ? data : data.ordini || [];
        setOrdiniFornitore(ordini);
      } catch (err) {
        console.error("❌ Errore fetch ordini fornitore:", err);
      }
    };

    fetchOrdini();
  }, [selectedProdotto, id]);



  // 🔹 Sincronizza lo stato locale quando il parent aggiorna i valori
  useEffect(() => {
    setSfusoLitri(Number(sfusoDisponibile || 0));
  }, [sfusoDisponibile]);

  useEffect(() => {
    setSfusoLotto(lotto || "");
  }, [lotto]);

  // 🔹 Calcolo prodotti da litri di sfuso
  const calcolaProdottiDaSfuso = (litri, formato) => {
    if (!litri || litri <= 0) return 0;
    const f = (formato || "").toLowerCase();
    if (f.includes("12ml")) return Math.floor(litri * 83);
    if (f.includes("100ml")) return Math.floor(litri * 10);
    return 0;
  };

  // 🔹 Calcola litri necessari per i pezzi richiesti
  const calcolaLitriNecessari = (pezzi, formato) => {
    const q = Number(pezzi || 0);
    if (!q || q <= 0) return 0;
    const f = (formato || "").toLowerCase();
    if (f.includes("12ml")) return q / 83;
    if (f.includes("100ml")) return q / 10;
    return 0;
  };

  // 🔹 Calcola accessori impegnati
  const calcolaAccessori = (pezzi, formato) => {
    const q = Number(pezzi || 0);
    const f = (formato || "").toLowerCase();
    if (f.includes("12ml")) {
      return { boccette: q, tappini: q, pennellini: q };
    }
    if (f.includes("100ml")) {
      return { boccette: q, tappini: q, pennellini: 0 };
    }
    return { boccette: 0, tappini: 0, pennellini: 0 };
  };

  const prodottiDaSfuso = calcolaProdottiDaSfuso(sfusoLitri, formato);
  const litriImpegnati = calcolaLitriNecessari(pezziRichiesti, formato);
  const prodottiDaInviare = Number(pezziRichiesti || prodottiDaSfuso || 0);
  const accessori = calcolaAccessori(prodottiDaInviare, formato);

  // 🔹 Prenotazione
  const handlePrenotaClick = async () => {
    if (!selectedProdotto) {
      alert("⚠️ Seleziona prima un prodotto da produrre (in alto)!");
      return;
    }
    if (!sfusoLotto) {
      alert("⚠️ Inserisci/definisci il lotto dello sfuso");
      return;
    }
    if (!prodottiDaInviare || prodottiDaInviare <= 0) {
      alert("⚠️ Inserisci una quantità valida da produrre");
      return;
    }

    try {
      const body = {
        id_sfuso: id,
        lotto: sfusoLotto, // ✅ usa lo stato corrente del lotto
        prodotti: prodottiDaInviare,
        accessori,
        priorita,
        nota: null,
        operatore: "admin",
        asin_prodotto: selectedProdotto.asin, // ✅ collega con inventario
        nome_prodotto: selectedProdotto.nome, // ✅ info utile per UI/storico
      };

      const res = await fetch("/api/v2/sfuso/prenotazione", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // 🧩 Lettura sicura del body per evitare "Unexpected end of JSON input"
      const contentType = res.headers.get("content-type") || "";
      const raw = await res.text();

      let data = null;
      if (raw && contentType.includes("application/json")) {
        try {
          data = JSON.parse(raw);
        } catch (e) {
          console.error("⚠️ Errore parsing JSON:", e, "Raw:", raw);
        }
      }

      if (!res.ok) {
        console.error("❌ Errore salvataggio prenotazione:", res.status, raw);
        alert(`Errore ${res.status}: ${raw || "Salvataggio prenotazione fallito"}`);
        return;
      }

      // ✅ Se arrivi qui, la chiamata è andata bene
      if (typeof onPrenota === "function") onPrenota(data);

      // reset campi input
      setPezziRichiesti("");
      setPriorita("Media");
    } catch (err) {
      console.error("❌ Errore salvataggio prenotazione:", err);
      alert("Errore nel salvataggio prenotazione");
    }
  };

  // 🔹 Conferma rettifica (PATCH al backend)
  const handleConfermaRettifica = async ({ campo, nuovoValore, nota, operatore }) => {
    try {
      const res = await fetch(`http://localhost:3005/api/v2/sfuso/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campo,                 // ✅ quale campo rettifico: "sfuso" | "lotto"
          nuovoValore,           // ✅ nuovo valore per il campo
          nota: nota || null,
          operatore: operatore || "admin",
        }),
      });

      if (!res.ok) throw new Error("Errore salvataggio rettifica");
      const data = await res.json();

      if (campo === "sfuso") {
        setSfusoLitri(Number(data.litri_disponibili ?? data?.updated?.litri_disponibili ?? nuovoValore));
      }
      if (campo === "lotto") {
        setSfusoLotto(String(data.lotto ?? data?.updated?.lotto ?? nuovoValore));
      }

      alert("✅ Rettifica salvata con successo!");
    } catch (err) {
      console.error("❌ Errore PATCH rettifica:", err);
      alert("Errore durante la rettifica");
    }
  };


  // 🔹 Conferma arrivo ordine fornitore
  const handleConfermaArrivo = async (idOrdine) => {
    if (!window.confirm("Confermare l’arrivo di questo ordine?")) return;
    try {
      const res = await fetch(`http://localhost:3005/api/v2/ordini-fornitori/${idOrdine}/conferma`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore aggiornamento ordine");
      alert("✅ Ordine confermato! Magazzino aggiornato.");
      // Ricarica elenco
      setOrdiniFornitore((prev) =>
        prev.map((o) =>
          o.id === idOrdine ? { ...o, stato: "Consegnato" } : o
        )
      );
    } catch (err) {
      console.error("❌ Errore conferma ordine:", err);
      alert("Errore nella conferma ordine");
    }
  };


  return (
    <div className="bg-zinc-800 text-white p-4 rounded-xl shadow-md mb-6">
      <h3 className="text-lg font-semibold mb-4">
        Fornitura da creare ({formato})
      </h3>

      {/* 🔗 Info ASIN collegato (preso dal DB) */}
      <p className="text-sm text-zinc-400 mb-4">
        ASIN collegato:{" "}
        {asin_collegato ? (
          <span className="text-green-400 font-semibold">{asin_collegato}</span>
        ) : (
          <span className="text-red-400">Nessun ASIN collegato</span>
        )}
      </p>



      {/* Input principali */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-sm">
        {/* Litri di Sfuso */}
        <div>
          <label className="block mb-1 font-medium">
            Litri di Sfuso (disponibile)
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={`${sfusoLitri.toFixed(1)} L`}
              readOnly
              className="w-full p-2 rounded bg-zinc-600 text-white cursor-not-allowed"
            />
            <button
              onClick={() => setShowRettificaSfuso(true)}
              className="bg-orange-600 hover:bg-orange-700 px-2 py-1 rounded text-sm"
            >
              ✏️
            </button>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Disponibile: {(sfusoLitri - litriImpegnati).toFixed(1)} L — Impegnato: {litriImpegnati.toFixed(1)} L
          </p>
        </div>

        {/* Lotto */}
        <div>
          <label className="block mb-1 font-medium">Lotto</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={sfusoLotto}
              readOnly
              className="w-full p-2 rounded bg-zinc-600 text-white cursor-not-allowed"
            />
            <button
              onClick={() => setShowRettificaLotto(true)}
              className="bg-orange-600 hover:bg-orange-700 px-2 py-1 rounded text-sm"
            >
              ✏️
            </button>
          </div>
        </div>

        {/* Quantità da produrre */}
        <div>
          <label className="block mb-1 font-medium">Quantità da produrre</label>
          <input
            type="number"
            value={pezziRichiesti}
            onChange={(e) => setPezziRichiesti(e.target.value)}
            className="w-full p-2 rounded bg-zinc-600 text-white"
            min={0}
          />
        </div>

        {/* Priorità */}
        <div>
          <label className="block mb-1 font-medium">Priorità</label>
          <select
            value={priorita}
            onChange={(e) => setPriorita(e.target.value)}
            className="w-full p-2 rounded bg-zinc-600 text-white"
          >
            <option>Alta</option>
            <option>Media</option>
            <option>Bassa</option>
          </select>
        </div>
      </div>

      {/* Risultati calcoli */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-6 text-sm">
        <div>
          <label className="block mb-1 font-medium">Prodotti ottenibili</label>
          <input
            type="text"
            readOnly
            value={prodottiDaSfuso.toLocaleString()}
            className="w-full p-2 rounded bg-zinc-600 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Boccette impegnate</label>
          <input
            type="text"
            readOnly
            value={accessori.boccette.toLocaleString()}
            className="w-full p-2 rounded bg-zinc-600 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Tappini impegnati</label>
          <input
            type="text"
            readOnly
            value={accessori.tappini.toLocaleString()}
            className="w-full p-2 rounded bg-zinc-600 cursor-not-allowed"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Pennellini impegnati</label>
          <input
            type="text"
            readOnly
            value={accessori.pennellini.toLocaleString()}
            className="w-full p-2 rounded bg-zinc-600 cursor-not-allowed"
          />
        </div>
      </div>

      {/* Bottone Prenota */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handlePrenotaClick}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          ➕ Prenota
        </button>
      </div>


      {/* 🔹 Ordini Fornitore collegati */}
      {ordiniFornitore.length > 0 ? (
        <div className="mt-6 border-t border-zinc-700 pt-3">
          <h4 className="text-md font-semibold mb-2">📦 Ordini Fornitore</h4>
          <table className="w-full text-sm border border-zinc-700 rounded">
            <thead>
              <tr className="bg-zinc-700 text-left">
                <th className="p-2">Data</th>
                <th className="p-2">Fornitore</th>
                <th className="p-2 text-center">Quantità (L)</th>
                <th className="p-2 text-center">Stato</th>
                <th className="p-2 text-center">Azione</th>
              </tr>
            </thead>
            <tbody>
              {ordiniFornitore.map((o) => (
                <tr key={o.id} className="border-t border-zinc-700">
                  <td className="p-2">{new Date(o.data_ordine).toLocaleDateString()}</td>
                  <td className="p-2">{o.fornitore_nome || "-"}</td>
                  <td className="p-2 text-center">{o.quantita_litri} L</td>
                  <td className="p-2 text-center">{o.stato}</td>
                  <td className="p-2 text-center">
                    {o.stato === "In attesa" ? (
                      <button
                        onClick={() => handleConfermaArrivo(o.id)}
                        className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                      >
                        ✅ Conferma Arrivo
                      </button>
                    ) : (
                      <span className="text-green-400">✔️ Confermato</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-4 text-zinc-400 text-sm">📭 Nessun ordine in arrivo per questo sfuso</p>
      )}


      {/* Modali di rettifica */}
      {showRettificaSfuso && (
        <RettificaModal
          titolo="Sfuso"
          campo="sfuso"
          valoreAttuale={sfusoLitri}
          onClose={() => setShowRettificaSfuso(false)}
          onConferma={handleConfermaRettifica}
        />
      )}

      {showRettificaLotto && (
        <RettificaModal
          titolo="Lotto"
          campo="lotto"
          valoreAttuale={sfusoLotto}
          onClose={() => setShowRettificaLotto(false)}
          onConferma={handleConfermaRettifica}
        />
      )}
    </div>
  );
};

export default SfusoCard;
