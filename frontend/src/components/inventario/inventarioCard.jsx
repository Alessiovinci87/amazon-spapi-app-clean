import AccessorioCard from "./AccessorioCard";
import ProdottoCard from "./ProdottoCard";

const InventarioCard = ({
  prodotto,
  accessoriImpegnati = {},
  handleChange,
  confermaUtilizzo,
  confermaModificaAccessorio,
  mostraStoricoAsin,
  setMostraStoricoAsin,
  isAccessory = false,
  onAggiornamentoCompletato, // 🔥 Refetch lista
  onDelete, // 🗑️ nuova prop per eliminazione
}) => {
  const {
    asin = null,
    nome = "",
    quantita,
    quantitaPerProdotto,
    asin_accessorio = null,
  } = prodotto;

  const valoreQuantita = quantitaPerProdotto ?? quantita ?? 0;

  // 🧩 Funzione elimina prodotto
  const handleDelete = async () => {
    if (!asin) return alert("ASIN mancante");
    if (!window.confirm(`Vuoi davvero eliminare ${nome}?`)) return;

    try {
      // FIX: Endpoint corretto /magazzino/ invece di /inventario/
      const res = await fetch(`http://localhost:3005/api/v2/magazzino/${asin}`, { method: "DELETE" });
      const data = await res.json();

      if (res.ok) {
        console.log("✅ Prodotto eliminato:", data);
        if (typeof onDelete === "function") onDelete(asin);
        if (typeof onAggiornamentoCompletato === "function")
          onAggiornamentoCompletato();
      } else {
        alert(`❌ Errore eliminazione: ${data.message || data.error || "Errore sconosciuto"}`);
      }
    } catch (err) {
      console.error("❌ Errore eliminazione:", err);
      alert("Errore durante la cancellazione del prodotto");
    }
  };

  if (isAccessory) {
    return (
      <AccessorioCard
        nome={nome}
        asin_accessorio={asin_accessorio || asin}
        quantita={valoreQuantita}
        setMostraStoricoAsin={setMostraStoricoAsin}
        mostraStoricoAsin={mostraStoricoAsin}
        onAggiornamentoCompletato={onAggiornamentoCompletato}
      />
    );
  }

  return (
    <ProdottoCard
      prodotto={prodotto}
      accessoriImpegnati={accessoriImpegnati}
      handleChange={handleChange}
      confermaUtilizzo={confermaUtilizzo}
      mostraStoricoAsin={mostraStoricoAsin}
      setMostraStoricoAsin={setMostraStoricoAsin}
      onDelete={handleDelete} // 🗑️ Passiamo la funzione di eliminazione
    />
  );
};

export default InventarioCard;