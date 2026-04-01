import React, { useState } from "react";

const ExportCSVButton = ({ spedizioni, cleanText, nextProgressivo, spedizioneInfo }) => {
  const [confermata, setConfermata] = useState(false);

  const confermaSpedizione = () => {
    if (!spedizioni || spedizioni.length === 0) {
      toast.info("Nessuna spedizione da confermare.");
      return;
    }

    const ok = window.confirm(
      `Confermi la creazione della spedizione N° ${nextProgressivo} del ${spedizioneInfo.data}?`
    );

    if (ok) {
      setConfermata(true);
      toast.success("Spedizione confermata. Ora puoi esportare il CSV.");
    }
  };

  const esportaCSV = () => {
    if (!confermata) {
      toast.warning("️ Devi prima confermare la spedizione.");
      return;
    }

    const righe = ["Prodotto,Quantità,Paese,Data,Operatore,Note"];

    spedizioni.forEach((s) => {
      const nome = `"${cleanText(s.prodotto_nome || s.nome).replace(/,/g, " ")}"`;
      righe.push(
        `${nome},${s.quantita},${s.paese},${s.data || spedizioneInfo.data},${s.operatore || ""},${s.note || ""}`
      );
    });

    const contenutoCSV = righe.join("\n");
    const blob = new Blob([contenutoCSV], { type: "text/csv;charset=utf-8" });

    // Formatto la data GG-MM-AAAA
    let dataFile = "senza_data";
    if (spedizioneInfo.data) {
      const [anno, mese, giorno] = spedizioneInfo.data.split("-");
      dataFile = `${giorno}-${mese}-${anno}`;
    }

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `spedizione_${nextProgressivo}_${dataFile}.csv`);
    document.body.appendChild(link);
    link.click();

    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  };

  return (
    <div className="flex gap-4 mt-4">
      <button
        onClick={confermaSpedizione}
        className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded"
      >
        ✅ Conferma Spedizione
      </button>

      <button
        onClick={esportaCSV}
        className={`px-4 py-2 rounded ${
          confermata
            ? "bg-green-600 hover:bg-green-700 text-white"
            : "bg-gray-600 text-gray-300 cursor-not-allowed"
        }`}
        disabled={!confermata}
      >
        📥 Esporta in CSV
      </button>
    </div>
  );
};

export default ExportCSVButton;
