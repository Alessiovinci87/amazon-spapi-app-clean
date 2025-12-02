// utils/gestioneAccessori.js

export const confermaModificaAccessorio = async ({ asin, nome, quantitaPerProdotto }) => {
  try {
    const response = await fetch(`http://localhost:3005/api/accessori/${asin}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantitaPerProdotto }),
    });

    const result = await response.json();

    if (!result.success) {
      console.error("❌ Errore backend:", result.message);
      return { success: false, message: result.message };
    }

    // Storico (facoltativo ma utile)
    await fetch("http://localhost:3005/api/storico/salva", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        asin,
        nome_prodotto: nome,
        tipo_modifica: "quantita",
        quantita: quantitaPerProdotto,
        tipo_movimento: "modifica",
        modificato_da: "Alessio",
        data_modifica: new Date().toISOString(),
      }),
    });

    return { success: true };
  } catch (error) {
    console.error("❌ Errore fetch:", error);
    return { success: false, message: error.message };
  }
};
