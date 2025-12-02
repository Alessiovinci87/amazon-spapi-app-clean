import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const InserimentoOrdine = () => {
  const [form, setForm] = useState({
    fornitore: "",
    dataOrdine: new Date(), // 👈 imposta data odierna
    pagamento: "",
    consegnaPrevista: null,
    consegnaEffettiva: null,
    stato: "In attesa",
    note: "",
  });

  const [fornitori, setFornitori] = useState([]);
  const [prodottiFornitore, setProdottiFornitore] = useState([]);
  const [mostraForm, setMostraForm] = useState(true);

  // 🔹 Stati multiprodotto
  const [prodottoSelezionato, setProdottoSelezionato] = useState(null);
  const [quantita, setQuantita] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [ordineProdotti, setOrdineProdotti] = useState([]);

  // 🔹 Carica fornitori
  useEffect(() => {
    fetch("http://localhost:3005/api/v2/fornitori")
      .then((res) => res.json())
      .then(setFornitori)
      .catch((err) => console.error("❌ Errore caricamento fornitori:", err));
  }, []);

  // 🔹 Carica prodotti del fornitore selezionato
  const caricaProdottiFornitore = async (idFornitore) => {
    if (!idFornitore) return;
    try {
      const res = await fetch(
        `http://localhost:3005/api/v2/fornitori/${idFornitore}/prodotti`
      );
      if (!res.ok) throw new Error("Errore nel caricamento prodotti fornitore");
      const data = await res.json();
      setProdottiFornitore(Array.isArray(data) ? data : []);
      console.log("📦 Prodotti ricevuti dal backend:", data);
    } catch (err) {
      console.error("❌ Errore fetch prodotti fornitore:", err);
      setProdottiFornitore([]);
    }
  };

  // 🔹 Aggiungi prodotto alla lista
  const aggiungiProdotto = () => {
    if (prodottoSelezionato == null || !quantita) {
      alert("Seleziona un prodotto e inserisci la quantità");
      return;
    }

    const prodotto = prodottiFornitore.find(
      (p) => String(p.id_sfuso) === String(prodottoSelezionato)
    );

    console.log("🟡 selezione id_sfuso:", prodottoSelezionato);
    console.log("🧾 INSERT ORDINE → id_sfuso:", prodotto?.id_sfuso, "quantità:", quantita);

    if (!prodotto) {
      alert("Prodotto non trovato. Controlla l'associazione fornitore-prodotto.");
      return;
    }

    const nuovo = {
      id_sfuso: Number(prodotto.id_sfuso), // ✅ corretto
      asin: prodotto.asin || null,
      nome_prodotto: prodotto.nome || prodotto.nome_prodotto,
      formato: prodotto.formato || "",
      quantita_litri: parseFloat(quantita) || 0,
      prezzo_unitario: parseFloat(prezzo) || 0,
      costo_totale: (parseFloat(quantita) || 0) * (parseFloat(prezzo) || 0),
    };

    setOrdineProdotti([...ordineProdotti, nuovo]);
    setProdottoSelezionato("");
    setQuantita("");
    setPrezzo("");
  };


  // 🔹 Rimuovi prodotto dalla lista
  const rimuoviProdotto = (index) => {
    const updated = ordineProdotti.filter((_, i) => i !== index);
    setOrdineProdotti(updated);
  };

  // 🔹 Salva ordine completo
  const salvaOrdine = async () => {
    if (!form.fornitore || ordineProdotti.length === 0) {
      alert("Seleziona un fornitore e aggiungi almeno un prodotto.");
      return;
    }


    const formatDateForSql = (date) => {
      if (!(date instanceof Date) || isNaN(date)) return null;
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };


    const payload = {
      idFornitore: form.fornitore,
      pagamento: form.pagamento || "",
      data_ordine: formatDateForSql(form.dataOrdine) || formatDateForSql(new Date()),
      consegna_prevista: formatDateForSql(form.consegnaPrevista),
      consegna_effettiva: formatDateForSql(form.consegnaEffettiva),
      stato: form.stato || "In attesa",
      note: form.note || "",
      prodotti: ordineProdotti,
    };




    try {
      const res = await fetch(
        `http://localhost:3005/api/v2/fornitori/${form.fornitore}/ordini`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio ordine");

      alert("✅ Ordine fornitore salvato con successo!");
      setOrdineProdotti([]);
      setForm({
        fornitore: "",
        dataOrdine: null,
        pagamento: "",
        consegnaPrevista: null,
        consegnaEffettiva: null,
        stato: "In attesa",
        note: "",
      });
    } catch (err) {
      console.error("❌ Errore salvataggio ordine:", err);
      alert("Errore durante il salvataggio dell'ordine.");
    }
  };

  return (
    <div className="mb-6 text-white">
      {/* ======== FORM ORDINE ======== */}
      {mostraForm && (
        <div className="bg-zinc-900/60 p-6 rounded-lg space-y-8">

          {/* 📋 DATI ORDINE */}
          <section>
            <h3 className="text-xl font-semibold mb-3">📋 Dati Ordine</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              {/* Fornitore */}
              <div>
                <label className="block text-sm mb-1">Fornitore</label>
                <select
                  name="fornitore"
                  value={form.fornitore}
                  onChange={(e) => {
                    const idFornitore = Number(e.target.value);
                    setForm({ ...form, fornitore: idFornitore });
                    caricaProdottiFornitore(idFornitore);
                  }}
                  className="p-2 w-full rounded bg-zinc-800 border border-zinc-700"
                >
                  <option value="">Seleziona un fornitore</option>
                  {fornitori.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>

              {/* Data Ordine */}
              <div>
                <label className="block text-sm mb-1">Data Ordine</label>
                <DatePicker
                  selected={form.dataOrdine}
                  onChange={(date) => setForm({ ...form, dataOrdine: date })}
                  dateFormat="dd/MM/yyyy"  // 👈 formato europeo
                  className="p-2 w-full rounded bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>

              {/* Stato */}
              <div>
                <label className="block text-sm mb-1">Stato</label>
                <select
                  name="stato"
                  value={form.stato}
                  onChange={(e) => setForm({ ...form, stato: e.target.value })}
                  className="p-2 w-full rounded bg-zinc-800 border border-zinc-700"
                >
                  <option>In attesa</option>
                  <option>Consegnato</option>
                  <option>Annullato</option>
                </select>
              </div>

              {/* Pagamento */}
              <div>
                <label className="block text-sm mb-1">Pagamento</label>
                <select
                  name="pagamento"
                  value={form.pagamento}
                  onChange={(e) => setForm({ ...form, pagamento: e.target.value })}
                  className="p-2 w-full rounded bg-zinc-800 border border-zinc-700"
                >
                  <option value="">Seleziona modalità</option>
                  <option value="Carta">Carta</option>
                  <option value="Bonifico">Bonifico</option>
                  <option value="Contrassegno">Contrassegno</option>
                  <option value="PayPal">PayPal</option>
                </select>
              </div>

              {/* Consegna Prevista */}
              <div>
                <label className="block text-sm mb-1">Consegna Prevista</label>
                <DatePicker
                  selected={form.consegnaPrevista}
                  onChange={(date) => setForm({ ...form, consegnaPrevista: date })}
                  dateFormat="dd/MM/yyyy"
                  className="p-2 w-full rounded bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>

              {/* Consegna Effettiva */}
              <div>
                <label className="block text-sm mb-1">Consegna Effettiva</label>
                <DatePicker
                  selected={form.consegnaEffettiva}
                  onChange={(date) => setForm({ ...form, consegnaEffettiva: date })}
                  dateFormat="dd/MM/yyyy"
                  className="p-2 w-full rounded bg-zinc-800 border border-zinc-700 text-white"
                />
              </div>
            </div>
          </section>

          {/* 🧴 PRODOTTI ORDINE */}
          <section>
            <h3 className="text-xl font-semibold mb-3">🧴 Prodotti Ordine</h3>
            <div className="border border-zinc-700 rounded p-4 bg-zinc-900/50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <select
                  onChange={(e) => {
                    console.log("🟡 selezione id_sfuso:", e.target.value); // 👈 LOG FRONTEND
                    setProdottoSelezionato(e.target.value || null);
                  }} // ← mai Number()
                  className="p-2 rounded bg-zinc-800 border border-zinc-700"

                >

                  <option value="">Seleziona prodotto</option>
                  {prodottiFornitore.map((p) => (
                    <option
                      key={`sfuso-${p.id_sfuso ?? p.nome}`}
                      value={String(p.id_sfuso)}
                    >
                      {p.nome} ({p.formato})
                    </option>
                  ))}
                </select>




                <input
                  type="number"
                  placeholder="Quantità (litri)"
                  value={quantita}
                  onChange={(e) => setQuantita(e.target.value)}
                  className="p-2 rounded bg-zinc-800 border border-zinc-700"
                />

                <input
                  type="number"
                  placeholder="Prezzo unitario (€)"
                  value={prezzo}
                  onChange={(e) => setPrezzo(e.target.value)}
                  className="p-2 rounded bg-zinc-800 border border-zinc-700"
                />
              </div>

              <div className="text-right">
                <button
                  onClick={aggiungiProdotto}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                >
                  ➕ Aggiungi prodotto
                </button>
              </div>

              {ordineProdotti.length > 0 && (
                <table className="w-full text-sm mt-4 border border-zinc-700 rounded">
                  <thead>
                    <tr className="bg-zinc-800 text-center">
                      <th className="p-2 text-left">Prodotto</th>
                      <th className="p-2">Litri</th>
                      <th className="p-2">Prezzo</th>
                      <th className="p-2">Totale</th>
                      <th className="p-2">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordineProdotti.map((p, i) => (
                      <tr key={i} className="border-t border-zinc-700 text-center">
                        <td className="p-2 text-left">{p.nome_prodotto}</td>
                        <td className="p-2">{p.quantita_litri}</td>
                        <td className="p-2">€ {p.prezzo_unitario.toFixed(2)}</td>
                        <td className="p-2">€ {p.costo_totale.toFixed(2)}</td>
                        <td className="p-2">
                          <button
                            onClick={() => rimuoviProdotto(i)}
                            className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-sm"
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          {/* 🗒️ NOTE E SALVATAGGIO */}
          <section>
            <h3 className="text-xl font-semibold mb-3">🗒️ Note</h3>
            <textarea
              name="note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              className="p-2 w-full rounded bg-zinc-800 border border-zinc-700"
            />
            <div className="mt-4 text-right">
              <button
                onClick={salvaOrdine}
                className="bg-green-600 hover:bg-green-700 text-white py-2 px-5 rounded font-semibold"
              >
                💾 Salva Ordine
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );

};

export default InserimentoOrdine;
