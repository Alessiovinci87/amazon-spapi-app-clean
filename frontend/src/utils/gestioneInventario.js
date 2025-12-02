// Calcola gli accessori necessari a partire dal nome e litri sfusi
export const calcolaAccessoriImpegnati = (prodotto) => {
  const nomeLower = prodotto.nome.toLowerCase();

  let formatoMl = 0;
  if (nomeLower.includes("12 ml")) formatoMl = 12;
  else if (nomeLower.includes("100 ml")) formatoMl = 100;
  else return {};

  const litriDisponibili = Number(prodotto.sfusoLitri);
  if (!litriDisponibili || litriDisponibili <= 0) return {};

  let prodottiDaFare = Math.floor((litriDisponibili * 1000) / formatoMl);

  if (nomeLower.includes("kit 9 boccette")) {
    prodottiDaFare = Math.floor(prodottiDaFare / 9);
  }

  const boccette = nomeLower.includes("kit 9 boccette")
    ? prodottiDaFare * 9
    : prodottiDaFare;

  const tappini = boccette;
  const pennellini = formatoMl === 12 ? boccette : 0;

  return {
    prodottiDaFare,
    boccette,
    tappini,
    pennellini,
  };
};

// Registra la modifica nello storico locale
export const registraStorico = (asin, campo, da, a, setStorico) => {
  if (String(da) === String(a)) return;
  const timestamp = new Date().toISOString();
  setStorico((s) => [
    { asin, campo, da, a, data: timestamp },
    ...s.filter(
      (entry) => new Date(entry.data) > new Date(Date.now() - 15778476000)
    ),
  ]);
};

/**
 * Aggiorna le quantità degli accessori in base a una modifica di quantità prodotti "pronto"
 * @param {Array} accessori - array degli accessori (oggetti con campo quantita e nome)
 * @param {string} nomeProdotto - nome prodotto per determinare formato (12 ml o 100 ml)
 * @param {number} deltaQuantita - quantità cambiata (positiva=aggiunta, negativa=sottrazione)
 * @returns array accessori aggiornato
 */
export const aggiornaAccessoriDopoPronto = (accessori, nomeProdotto, deltaQuantita) => {
  const nomeLowerProdotto = nomeProdotto.toLowerCase();

  const nuoviAccessori = accessori.map((acc) => {
    const nomeLower = acc.nome?.toLowerCase() || "";
    let daModificare = false;

    // Determina se questo accessorio va modificato in base al nome prodotto
    if (nomeLowerProdotto.includes("12 ml")) {
      if (
        nomeLower.includes("boccetta 12 ml") ||
        nomeLower.includes("tappino 12 ml") ||
        nomeLower.includes("pennellino 12 ml")
      ) {
        daModificare = true;
      }
    } else if (nomeLowerProdotto.includes("100 ml")) {
      if (
        nomeLower.includes("boccetta 100 ml") ||
        nomeLower.includes("tappino 100 ml")
      ) {
        daModificare = true;
      }
    }

    if (daModificare) {
      const nuovaQuantita = Math.max((acc.quantita || 0) - deltaQuantita, 0);
      return { ...acc, quantita: nuovaQuantita };
    }

    return acc;
  });

  return nuoviAccessori;
};

// Esporta storico in formato CSV
export const esportaStoricoCSV = (storico) => {
  const righe = ["ASIN,Campo,Da,A,Data"];
  storico.forEach((s) => {
    righe.push(`${s.asin},${s.campo},${s.da},${s.a},${s.data}`);
  });
  const blob = new Blob([righe.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "storico_modifiche.csv";
  link.click();
};

/**
 * Scala automaticamente gli accessori collegati a un prodotto dopo la produzione
 * @param {object} prodotto - Oggetto prodotto (con asin, nome, accessoriAssociati)
 * @param {number} pezziProdotti - Numero di pezzi prodotti
 * @param {Array} accessori - Array accessori correnti
 * @param {function} setAccessori - Funzione setAccessori dello stato
 * @returns {void}
 */
export const scalaAccessoriDopoProduzione = async (prodotto, pezziProdotti, accessori, setAccessori) => {
  const aggiornati = [...accessori];

  prodotto.accessoriAssociati.forEach((assoc) => {
    const index = aggiornati.findIndex((a) => a.asin_accessorio === assoc.asin_accessorio);
    if (index !== -1) {
      aggiornati[index].quantita = Math.max(0, aggiornati[index].quantita - (assoc.quantitaPerProdotto * pezziProdotti));
    }
  });

  setAccessori(aggiornati);
  localStorage.setItem("inventario_accessori", JSON.stringify(aggiornati));

  // PATCH al backend per ogni accessorio aggiornato
  for (const assoc of prodotto.accessoriAssociati) {
    const accessorioCorrente = aggiornati.find((a) => a.asin_accessorio === assoc.asin_accessorio);
    if (accessorioCorrente) {
      await fetch(`/api/accessoriFix/${assoc.asin_accessorio}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantita: accessorioCorrente.quantita }),
      });
    }
  }
};
