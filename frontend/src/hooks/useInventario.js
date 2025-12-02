import { useEffect, useState } from "react";
import { fetchJSON } from "../utils/api";

export const useInventario = () => {
  const [prodotti, setProdotti] = useState([]);
  const [prodottiOriginali, setProdottiOriginali] = useState([]);
  const [accessori, setAccessori] = useState([]);

  // === FETCH PRODOTTI ===
  useEffect(() => {
    fetchJSON("/api/v2/magazzino")
      .then((data) => {
        console.log("🔍 [DEBUG] Risposta grezza da /magazzino:", data);

        // Supporta sia array diretto che oggetto { ok, data }
        let prodottiArray = [];
        if (Array.isArray(data)) {
          prodottiArray = data;
        } else if (data && typeof data === "object") {
          prodottiArray = Array.isArray(data.data) ? data.data : [];
        }

        console.log("✅ [DEBUG] Prodotti estratti:", prodottiArray.length);

        const arr = prodottiArray.map((p) => ({
          ...p,
          utilizzo: 0,
        }));

        setProdotti(arr);
        setProdottiOriginali(arr);
        localStorage.setItem("inventario_prodotti", JSON.stringify(arr));
        console.log("✅ [Magazzino Hook] Prodotti caricati:", arr.length);
      })
      .catch((err) => {
        console.error("❌ Errore fetch /magazzino:", err);
        const cache = localStorage.getItem("inventario_prodotti");
        if (cache) {
          const parsed = JSON.parse(cache);
          setProdotti(parsed);
          setProdottiOriginali(parsed.map((p) => ({ ...p })));
          console.log("✅ [Cache] Prodotti caricati da cache:", parsed.length);
        }
      });
  }, []);

  // === FETCH ACCESSORI ===
  useEffect(() => {
    fetchJSON("/accessori")
      .then((data) => {
        console.log("🧩 Accessori grezzi:", data);

        const accessoriArray = Array.isArray(data) ? data : data.data || [];
        const normalizzati = accessoriArray.map((a, i) => {
          const quantitaPerProdotto =
            a.quantitaPerProdotto ?? a.quantitaperprodotto ?? 0;

          return {
            asin: a.asin || a.asin_accessorio || `ACCESSORIO_${i}`,
            nome: a.nome || `Accessorio senza nome ${i}`,
            quantitaPerProdotto: Number(quantitaPerProdotto) || 0,
            quantita: Number(a.quantita) || 0,
            formati: Array.isArray(a.formati) ? a.formati : [],
          };
        });

        setAccessori(normalizzati);
        localStorage.setItem(
          "inventario_accessori",
          JSON.stringify(normalizzati)
        );
        console.log("✅ Accessori caricati:", normalizzati.length);
      })
      .catch((err) => console.error("❌ Errore fetch /accessori:", err));
  }, []);

  return {
    prodotti,
    setProdotti,
    prodottiOriginali,
    setProdottiOriginali,
    accessori,
    setAccessori,
  };
};
