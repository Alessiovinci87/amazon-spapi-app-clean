import React, { useEffect, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { toast } from "sonner";
import { Plus, Trash2, Save } from "lucide-react";

const inputCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-500 transition-colors";
const selectCls = inputCls;
const datePickerCls = "w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-slate-500";

const InserimentoOrdine = () => {
  const [form, setForm] = useState({
    fornitore: "",
    dataOrdine: new Date(),
    pagamento: "",
    consegnaPrevista: null,
    consegnaEffettiva: null,
    stato: "In attesa",
    note: "",
  });

  const [fornitori, setFornitori] = useState([]);
  const [prodottiFornitore, setProdottiFornitore] = useState([]);
  const [mostraForm, setMostraForm] = useState(true);

  const [prodottoSelezionato, setProdottoSelezionato] = useState(null);
  const [quantita, setQuantita] = useState("");
  const [prezzo, setPrezzo] = useState("");
  const [ordineProdotti, setOrdineProdotti] = useState([]);

  useEffect(() => {
    fetch("/api/v2/fornitori")
      .then((res) => res.json())
      .then(setFornitori)
      .catch((err) => console.error("Errore caricamento fornitori:", err));
  }, []);

  const caricaProdottiFornitore = async (idFornitore) => {
    if (!idFornitore) return;
    try {
      const res = await fetch(`/api/v2/fornitori/${idFornitore}/prodotti`);
      if (!res.ok) throw new Error("Errore nel caricamento prodotti fornitore");
      const data = await res.json();
      setProdottiFornitore(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Errore fetch prodotti fornitore:", err);
      setProdottiFornitore([]);
    }
  };

  const aggiungiProdotto = () => {
    if (prodottoSelezionato == null || !quantita) {
      toast.warning("Seleziona un prodotto e inserisci la quantita");
      return;
    }

    const prodotto = prodottiFornitore.find(
      (p) => String(p.id_sfuso) === String(prodottoSelezionato)
    );

    if (!prodotto) {
      toast.error("Prodotto non trovato. Controlla l'associazione fornitore-prodotto.");
      return;
    }

    const nuovo = {
      id_sfuso: Number(prodotto.id_sfuso),
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

  const rimuoviProdotto = (index) => {
    setOrdineProdotti(ordineProdotti.filter((_, i) => i !== index));
  };

  const salvaOrdine = async () => {
    if (!form.fornitore || ordineProdotti.length === 0) {
      toast.warning("Seleziona un fornitore e aggiungi almeno un prodotto.");
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
      const res = await fetch(`/api/v2/fornitori/${form.fornitore}/ordini`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Errore salvataggio ordine");

      toast.success("Ordine fornitore salvato con successo!");
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
      console.error("Errore salvataggio ordine:", err);
      toast.error("Errore durante il salvataggio dell'ordine.");
    }
  };

  return (
    <div className="mb-6 text-slate-100">
      {mostraForm && (
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-6 space-y-8">

          <section>
            <h3 className="text-lg font-semibold mb-3">Dati Ordine</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

              <div>
                <label className="block text-xs text-slate-400 mb-1">Fornitore</label>
                <select
                  value={form.fornitore}
                  onChange={(e) => {
                    const idFornitore = Number(e.target.value);
                    setForm({ ...form, fornitore: idFornitore });
                    caricaProdottiFornitore(idFornitore);
                  }}
                  className={selectCls}
                >
                  <option value="">Seleziona un fornitore</option>
                  {fornitori.map((f) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Data Ordine</label>
                <DatePicker
                  selected={form.dataOrdine}
                  onChange={(date) => setForm({ ...form, dataOrdine: date })}
                  dateFormat="dd/MM/yyyy"
                  className={datePickerCls}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Stato</label>
                <select
                  value={form.stato}
                  onChange={(e) => setForm({ ...form, stato: e.target.value })}
                  className={selectCls}
                >
                  <option>In attesa</option>
                  <option>Consegnato</option>
                  <option>Annullato</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Pagamento</label>
                <select
                  value={form.pagamento}
                  onChange={(e) => setForm({ ...form, pagamento: e.target.value })}
                  className={selectCls}
                >
                  <option value="">Seleziona modalita</option>
                  <option value="Carta">Carta</option>
                  <option value="Bonifico">Bonifico</option>
                  <option value="Contrassegno">Contrassegno</option>
                  <option value="PayPal">PayPal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Consegna Prevista</label>
                <DatePicker
                  selected={form.consegnaPrevista}
                  onChange={(date) => setForm({ ...form, consegnaPrevista: date })}
                  dateFormat="dd/MM/yyyy"
                  className={datePickerCls}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1">Consegna Effettiva</label>
                <DatePicker
                  selected={form.consegnaEffettiva}
                  onChange={(date) => setForm({ ...form, consegnaEffettiva: date })}
                  dateFormat="dd/MM/yyyy"
                  className={datePickerCls}
                />
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Prodotti Ordine</h3>
            <div className="border border-slate-700 rounded-lg p-4 bg-slate-800/40">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                <select
                  onChange={(e) => setProdottoSelezionato(e.target.value || null)}
                  className={selectCls}
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
                  placeholder="Quantita (litri)"
                  value={quantita}
                  onChange={(e) => setQuantita(e.target.value)}
                  className={inputCls}
                />

                <input
                  type="number"
                  placeholder="Prezzo unitario"
                  value={prezzo}
                  onChange={(e) => setPrezzo(e.target.value)}
                  className={inputCls}
                />
              </div>

              <div className="text-right">
                <button
                  onClick={aggiungiProdotto}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 hover:text-emerald-200 text-sm font-medium transition-colors"
                >
                  <Plus size={16} />
                  Aggiungi prodotto
                </button>
              </div>

              {ordineProdotti.length > 0 && (
                <table className="w-full text-sm mt-4 border border-slate-700 rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-slate-800 text-center text-xs text-slate-400 uppercase tracking-wider">
                      <th className="p-2 text-left">Prodotto</th>
                      <th className="p-2">Litri</th>
                      <th className="p-2">Prezzo</th>
                      <th className="p-2">Totale</th>
                      <th className="p-2">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordineProdotti.map((p, i) => (
                      <tr key={i} className="border-t border-slate-700 text-center">
                        <td className="p-2 text-left text-slate-200">{p.nome_prodotto}</td>
                        <td className="p-2 tabular-nums">{p.quantita_litri}</td>
                        <td className="p-2 tabular-nums">{p.prezzo_unitario.toFixed(2)}</td>
                        <td className="p-2 tabular-nums">{p.costo_totale.toFixed(2)}</td>
                        <td className="p-2">
                          <button
                            onClick={() => rimuoviProdotto(i)}
                            className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </section>

          <section>
            <h3 className="text-lg font-semibold mb-3">Note</h3>
            <textarea
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              rows={3}
              className={inputCls}
            />
            <div className="mt-4 text-right">
              <button
                onClick={salvaOrdine}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-sm font-medium transition-colors"
              >
                <Save size={16} />
                Salva Ordine
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default InserimentoOrdine;
