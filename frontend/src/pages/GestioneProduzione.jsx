
import React, { useState, useEffect } from "react";
import { toast } from 'sonner';
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import SfusoCard from "../components/sfuso/SfusoCard";
import ProduzioneCard from "../components/produzione/ProduzioneCard";
import { triggerReloadInventario } from "../utils/globalEvents";
import { fetchJSON, buildUrl } from "../utils/api";
import { normalizeState, getStateLabel } from "../utils/statoUtils";

const GestioneProduzione = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [prenotazioni, setPrenotazioni] = useState([]);
  const [sfusoData, setSfusoData] = useState([]);
  const [selectedProdotto, setSelectedProdotto] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [prodotti, setProdotti] = useState([]);
  const [filterSearchTerm, setFilterSearchTerm] = useState("");

  // ========== FETCH DATI ==========
  const fetchSfuso = async () => {
    try {
      const data = await fetchJSON("sfuso");
      setSfusoData(data);
    } catch (err) {
      console.error("❌ Errore fetch sfuso:", err);
    }
  };

  const fetchPrenotazioni = async () => {
    try {
      const data = await fetchJSON("sfuso/prenotazioni");
      setPrenotazioni(data);
    } catch (err) {
      console.error("❌ Errore fetch prenotazioni:", err);
    }
  };

  const fetchProdotti = async () => {
    try {
      const data = await fetchJSON("magazzino");
      setProdotti(data || []);
    } catch (err) {
      console.error("❌ Errore fetch prodotti:", err);
    }
  };


  // 🔄 Funzione centralizzata per ricaricare tutti i dati
  const ricaricaDati = async () => {
    await Promise.all([fetchPrenotazioni(), fetchSfuso()]);
  };

  useEffect(() => {
    fetchSfuso();
    fetchPrenotazioni();
    fetchProdotti();
  }, []);

  const normalizzaAzione = (val) => {
    if (!val) return "CREATA";
    const upper = val.toUpperCase();
    if (["CREATA", "AGGIORNATA", "COMPLETATA", "ANNULLATA"].includes(upper)) {
      return upper;
    }
    // fallback sicuro
    return "AGGIORNATA";
  };


  // ========== STORICO PRODUZIONI ==========
  const registraStoricoProduzione = async (p, evento) => {
    try {
      const payload = {
        id_produzione: p.id_produzione || null,

        id_prenotazione: p.id || null,
        id_sfuso: p.id_sfuso || null,
        asin_prodotto: p.asin_prodotto || null,
        nome_prodotto: p.nome_prodotto || null,
        formato: p.formato || null,

        quantita: Number(p.quantita ?? p.prodotti ?? 0),
        litri_usati: Number(p.litri_usati ?? p.litriImpegnati ?? 0),

        evento: evento.toUpperCase(),
        note: p.note || "",
        operatore: "admin"
      };


      const res = await fetch(buildUrl("storico-produzioni-sfuso"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const text = await res.text();
      if (!res.ok) {
        console.error("⚠️ Errore registrazione storico:", text);
        return;
      }

    } catch (err) {
      console.error("❌ Errore registraStoricoProduzione:", err);
    }
  };






  // ========== GESTIONE STATO PRENOTAZIONE ==========
  const handleAggiornaStato = async (id, nuovoStato) => {
    if (!id) {
      console.warn("⚠️ handleAggiornaStato: ID prenotazione mancante!");
      return;
    }

    const statoNormalizzato = normalizeState(nuovoStato);

    try {
      const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nuovoStato: statoNormalizzato,
          operatore: "admin"
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error("❌ Errore aggiornamento stato:", data);
        throw new Error("Errore aggiornamento stato");
      }


      // 📝 Registra nello storico se annullamento
      if (statoNormalizzato === "annullato") {
        const prenotazione = prenotazioni.find(p => p.id === id);
        if (prenotazione) {
          if (statoNormalizzato === "annullato") {
            const pren = prenotazioni.find(p => p.id === id);
            if (pren) {
              await fetch(buildUrl("storico-prenotazioni"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  id_prenotazione: id,
                  asin_prodotto: pren.asin_prodotto,
                  nome_prodotto: pren.nome_prodotto,
                  formato: pren.formato,
                  quantita: pren.prodotti || pren.quantita || 0,
                  evento: "AGGIORNATA",
                  operatore: "admin",
                  note: "Modifica quantità prenotazione"
                })
              });

            }
          }


        }
      }

      // 🔁 Ricarica dati
      await ricaricaDati();

    } catch (err) {
      console.error("❌ Errore aggiornamento stato:", err);
      toast.error(t("gestioneProduzione.toast_err_stato"));
    }
  };

  // ========== MODIFICA QUANTITÀ ==========
  const handleModificaQuantita = async (id, nuovaQuantita) => {
    try {
      const quantitaNumerica = Number(nuovaQuantita);
      if (isNaN(quantitaNumerica) || quantitaNumerica <= 0) {
        toast.warning(t("gestioneProduzione.toast_quantita_non_valida"));
        return;
      }

      // 1️⃣ Recupera prima la prenotazione per sapere la quantità iniziale
      const oldRes = await fetch(buildUrl(`sfuso/prenotazione/${id}`));
      const oldData = await oldRes.json();

      if (!oldData || !oldData.data) {
        toast.error(t("gestioneProduzione.toast_err_recupero_iniziale"));
        return;
      }

      const quantitaPrima = Number(oldData.data.prodotti);

      // 2️⃣ PATCH aggiorna la quantità
      const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prodotti: quantitaNumerica,
          operatore: "admin",
        }),
      });

      if (!res.ok) throw new Error("Errore modifica quantità");

      // 3️⃣ Recupera ora la prenotazione AGGIORNATA
      const resPren = await fetch(buildUrl(`sfuso/prenotazione/${id}`));
      const prenAgg = await resPren.json();

      if (!prenAgg || !prenAgg.data) {
        toast.error(t("gestioneProduzione.toast_err_recupero_aggiornata"));
        return;
      }

      const pren = prenAgg.data;

      // 4️⃣ Registra storico correttamente
      await registraStoricoProduzione(
        {
          ...pren,
          id_produzione: pren.id_produzione || null,
          quantita: quantitaNumerica,
          note: `da ${quantitaPrima} a ${quantitaNumerica}`,
        },
        "AGGIORNATA"
      );

      await ricaricaDati();
      toast.success(t("gestioneProduzione.toast_quantita_aggiornata"));

    } catch (err) {
      console.error("❌ Errore modifica quantità:", err);
      toast.error(t("gestioneProduzione.toast_err_modifica_quantita"));
    }
  };



  // ========== CONFERMA PRODUZIONE ==========
  const handleConfermaProduzione = async (prenotazione) => {
    try {

      // 🔍 1) Recupera dal backend la prenotazione AGGIORNATA
      const resPren = await fetch(buildUrl(`sfuso/prenotazione/${prenotazione.id}`));
      const prenAgg = await resPren.json();

      if (!prenAgg || !prenAgg.data) {
        toast.error(t("gestioneProduzione.toast_err_recupero_aggiornata"));
        return;
      }

      const pren = prenAgg.data; // ← versione aggiornata


      // 🔧 2) CREA PRODUZIONE DA PRENOTAZIONE
      const resCrea = await fetch(buildUrl("produzioni-sfuso/crea-da-prenotazione"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pren)
      });

      if (!resCrea.ok) {
        const text = await resCrea.text();
        toast.info(t("gestioneProduzione.toast_err_creazione_produzione") + "\n" + text);
        return;
      }

      const dataCrea = await resCrea.json();
      const idProduzione =
        dataCrea?.id_produzione || dataCrea?.data?.id_produzione;

      if (!idProduzione) {
        toast.error(t("gestioneProduzione.toast_err_id_produzione"));
        return;
      }


      // 🚀 3) COMPLETA PRODUZIONE
      const resCompleta = await fetch(
        buildUrl(`produzioni-sfuso/${idProduzione}/completa`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ operatore: "admin" }),
        }
      );

      if (!resCompleta.ok) {
        const errText = await resCompleta.text();
        toast.info(t("gestioneProduzione.toast_err_completamento_produzione") + "\n" + errText);
        return;
      }


      // 🔄 3B) RICARICA LA PRENOTAZIONE *AGGIORNATA* (per avere la quantità GIUSTA)
      const resPrenUpdated = await fetch(buildUrl(`sfuso/prenotazione/${prenotazione.id}`));
      const prenAggUpdated = await resPrenUpdated.json();
      const prenUpdated = prenAggUpdated.data;



      if (!prenAggUpdated || !prenAggUpdated.data) {
        toast.error(t("gestioneProduzione.toast_err_ricarica_prenotazione"));
        return;
      }




      // 📝 3C) REGISTRA STORICO → COMPLETATA  
      // ❗ QUI sta il punto chiave!
      await registraStoricoProduzione(
        {
          ...prenUpdated,
          id_produzione: idProduzione
        },
        "COMPLETATA"
      );


      // 🔧 4) AGGIORNA STATO PRENOTAZIONE
      await handleAggiornaStato(pren.id, "CONFERMATA");


      // 🔁 5) Trigger inventario
      triggerReloadInventario();

      // 🔄 6) Ricarica dati locali
      await ricaricaDati();

      // 🗑 7) Rimuovi riga dalla tabella
      setPrenotazioni(prev =>
        prev.filter(p => p.id !== prenotazione.id)
      );

      toast.success(t("gestioneProduzione.toast_produzione_completata"));

    } catch (err) {
      console.error("❌ Errore generale handleConfermaProduzione:", err);
      toast.error(t("gestioneProduzione.toast_err_conferma"));
    }
  };




  // ========== NUOVA PRENOTAZIONE ==========
  const handleNewPrenotazione = async (newRow) => {
    setPrenotazioni((prev) => [...prev, newRow]);
    try {
      await fetchSfuso();
    } catch (err) {
      console.error("❌ Errore aggiornamento dati sfuso:", err);
    }
  };

  const handlePrenota = async (prenotazione) => {
    try {
      const res = await fetch("/api/v2/sfuso/prenotazione", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prenotazione,
          stato: normalizeState("prenotazione"),
        }),
      });

      if (!res.ok) throw new Error("Errore creazione prenotazione");

      const data = await res.json();

      if (data?.prenotazione) {
        setPrenotazioni((prev) => {
          const esiste = prev.some(
            (row) => row.id && data.prenotazione.id && Number(row.id) === Number(data.prenotazione.id)
          );
          if (esiste) return prev;
          return [...prev, data.prenotazione];
        });
      }

      await ricaricaDati();
    } catch (err) {
      console.error("❌ Errore handlePrenota:", err);
      toast.error(t("gestioneProduzione.toast_err_creazione_prenotazione"));
    }
  };

  // ========== SALVATAGGIO NOTE ==========
  const handleSalvaNota = async (id, nota) => {
    try {
      const res = await fetch(`/api/v2/sfuso/prenotazione/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: nota, operatore: "admin" }),
      });
      if (!res.ok) throw new Error("Errore salvataggio nota");
      await fetchPrenotazioni();
      toast.success(t("gestioneProduzione.toast_nota_salvata"));
    } catch (err) {
      console.error("❌ Errore salvataggio nota:", err);
      toast.error(t("gestioneProduzione.toast_err_salvataggio_nota"));
    }
  };

  // ========== FILTRI ==========
  const getFilteredPrenotazioni = (stato) => {
    const statoNormalizzato = normalizeState(stato);

    return prenotazioni.filter((p) => {
      // Filtro per stato
      if (normalizeState(p.stato) !== statoNormalizzato) return false;

      // 🔍 Filtro per ricerca prodotto (funziona su nome_prodotto e asin_prodotto)
      if (filterSearchTerm.trim()) {
        const term = filterSearchTerm.toLowerCase();
        const nomeProdotto = (p.nome_prodotto || "").toLowerCase();
        const asinProdotto = (p.asin_prodotto || "").toLowerCase();

        if (!nomeProdotto.includes(term) && !asinProdotto.includes(term)) {
          return false;
        }
      }

      return true;
    });
  };

  const prenotazioniInLavorazione = getFilteredPrenotazioni("in_corso");
  const prenotazioniAttive = getFilteredPrenotazioni("pending");

  return (
    <div className="min-h-screen bg-zinc-950 p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">📦 {t("gestioneProduzione.header_title")}</h1>
              <p className="text-zinc-400">{t("gestioneProduzione.header_desc")}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/magazzino/storici/sfuso")}
                className="bg-emerald-600 hover:bg-emerald-700 px-4 py-2 rounded-lg text-white font-medium transition-colors"
              >
                📜 {t("gestioneProduzione.btn_storico_produzioni")}
              </button>
              <button
                onClick={() => navigate("/magazzino/storici/sfuso")}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white font-medium transition-colors"
              >
                📊 {t("gestioneProduzione.btn_storico_sfuso")}
              </button>
              <button
                onClick={() => navigate("/magazzino")}
                className="bg-zinc-700 hover:bg-zinc-600 px-4 py-2 rounded-lg text-white font-medium transition-colors"
              >
                ⬅️ {t("gestioneProduzione.btn_magazzino")}
              </button>
            </div>
          </div>
        </div>

        {/* ========== FILTRO RICERCA GLOBALE ========== */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            🔍 {t("gestioneProduzione.filtro_title")}
          </h2>
          <div className="relative">
            <input
              type="text"
              placeholder={t("gestioneProduzione.ph_cerca_prodotto_asin")}
              value={filterSearchTerm}
              onChange={(e) => setFilterSearchTerm(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 text-white px-4 py-3 rounded-lg pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
            />
            {filterSearchTerm && (
              <button
                onClick={() => setFilterSearchTerm("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                title={t("gestioneProduzione.title_cancella_filtro")}
              >
                ✖
              </button>
            )}
          </div>
          {filterSearchTerm && (
            <p className="mt-2 text-sm text-zinc-400">
              {t("gestioneProduzione.filtrando_per")} <strong className="text-emerald-400">{filterSearchTerm}</strong>
            </p>
          )}
        </div>
        {localStorage.getItem("role") === "ufficio" && (
          <>
            {/* ========== SELETTORE PRODOTTO ========== */}
            <div className="bg-zinc-900 rounded-lg border border-zinc-800 p-6">
              <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                🎯 {t("gestioneProduzione.sel_title")}
              </h2>
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder={t("gestioneProduzione.ph_cerca_nome_asin_sku")}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white px-4 py-3 rounded-lg pr-10 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white transition-colors"
                    title={t("gestioneProduzione.title_cancella")}
                  >
                    ✖
                  </button>
                )}
              </div>

              {/* Lista filtrata prodotti */}
              {searchTerm.trim() && (
                <div className="max-h-64 overflow-y-auto border border-zinc-700 rounded-lg bg-zinc-800">
                  {(() => {
                    const filtered = prodotti.filter((p) => {
                      const term = searchTerm.toLowerCase();
                      const nome = (p.nome || "").toLowerCase();
                      const asin = (p.asin || "").toLowerCase();
                      const sku = (p.sku || "").toLowerCase();

                      return nome.includes(term) || asin.includes(term) || sku.includes(term);
                    });

                    if (filtered.length === 0) {
                      return (
                        <div className="p-4 text-center text-zinc-400">
                          {t("gestioneProduzione.empty_no_prodotto", { term: searchTerm })}
                        </div>
                      );
                    }

                    return filtered.map((p) => (
                      <div
                        key={p.asin}
                        onClick={() => {
                          setSelectedProdotto(p);
                          setSearchTerm("");
                        }}
                        className={`p-3 cursor-pointer hover:bg-zinc-700 transition-colors border-b border-zinc-700 last:border-b-0 ${selectedProdotto?.asin === p.asin ? "bg-emerald-600/20 border-l-4 border-l-emerald-500" : ""
                          }`}
                      >
                        <p className="text-sm font-medium text-white">{p.nome}</p>
                        <p className="text-xs text-zinc-400">
                          ASIN: {p.asin} {p.sku ? `• SKU: ${p.sku}` : ""}
                        </p>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {selectedProdotto && (
                <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg flex items-center justify-between">
                  <div>
                    <p className="text-emerald-400 text-sm">
                      ✅ {t("gestioneProduzione.sel_prodotto_selezionato")} <strong>{selectedProdotto.nome}</strong>
                    </p>
                    <p className="text-emerald-300/70 text-xs mt-1">
                      ASIN: {selectedProdotto.asin} {selectedProdotto.sku ? `• SKU: ${selectedProdotto.sku}` : ""}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedProdotto(null)}
                    className="bg-zinc-700 hover:bg-zinc-600 text-white px-3 py-1 rounded text-sm transition-colors"
                    title={t("gestioneProduzione.title_deseleziona")}
                  >
                    ✖ {t("gestioneProduzione.btn_rimuovi")}
                  </button>
                </div>
              )}
            </div>

            {/* ========== CARD PRODUZIONE PER FORMATO ========== */}
            <div className="grid md:grid-cols-3 gap-4">
              <ProduzioneCard
                formato="10ml"
                selectedProdotto={selectedProdotto}
                sfusoData={sfusoData}
                onPrenota={handlePrenota}
              />
              <ProduzioneCard
                formato="12ml"
                selectedProdotto={selectedProdotto}
                sfusoData={sfusoData}
                onPrenota={handlePrenota}
              />
              <ProduzioneCard
                formato="100ml"
                selectedProdotto={selectedProdotto}
                sfusoData={sfusoData}
                onPrenota={handlePrenota}
              />
            </div>
          </>
        )}

        {/* ========== PRENOTAZIONI IN LAVORAZIONE ========== */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="bg-yellow-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              ⚙️ {t("gestioneProduzione.section_in_lavorazione")}
              <span className="text-sm font-normal opacity-90">
                ({prenotazioniInLavorazione.length})
              </span>
            </h2>
          </div>

          <div className="p-6">
            {prenotazioniInLavorazione.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">{t("gestioneProduzione.empty_no_lavorazione")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-800 text-white">
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_nome_prodotto")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_formato")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_quantita")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_lotto")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_note")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_azioni")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prenotazioniInLavorazione.map((p) => (
                      <React.Fragment key={p.id}>
                        <tr className="bg-yellow-900/20 hover:bg-yellow-900/30 transition-colors">
                          <td className="p-3 border border-zinc-700 text-white">
                            {(p.nome_prodotto || "-").replace(/\(NUOVO\)|\(VECCHIO\)/gi, "").trim()}
                          </td>
                          <td className="p-3 border border-zinc-700 text-white">{p.formato}</td>
                          <td className="p-3 border border-zinc-700">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                defaultValue={p.prodotti}
                                min="1"
                                onChange={(e) => {
                                  setPrenotazioni((prev) =>
                                    prev.map((row) =>
                                      row.id === p.id ? { ...row, nuovaQuantita: e.target.value } : row
                                    )
                                  );
                                }}
                                className="bg-zinc-800 border border-zinc-700 text-white px-2 py-1 rounded w-24 focus:ring-2 focus:ring-emerald-500"
                              />
                              <button
                                onClick={() => handleModificaQuantita(p.id, p.nuovaQuantita || p.prodotti)}
                                className="bg-emerald-600 hover:bg-emerald-700 px-3 py-1 rounded text-white transition-colors"
                                title={t("gestioneProduzione.title_aggiorna_quantita")}
                              >
                                ✅
                              </button>
                            </div>
                          </td>
                          <td className="p-3 border border-zinc-700 text-white">
                            {p.lotto || "-"}{" "}
                            {(() => {
                              const sfuso = sfusoData.find((s) => s.id === p.id_sfuso);
                              if (!sfuso) return "";
                              if (p.lotto === sfuso.lotto_old) return `(${t("gestioneProduzione.lbl_vecchio")})`;
                              if (p.lotto === sfuso.lotto) return `(${t("gestioneProduzione.lbl_nuovo")})`;
                              return "";
                            })()}
                          </td>
                          <td className="p-3 border border-zinc-700">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                defaultValue=""
                                placeholder={t("gestioneProduzione.ph_aggiungi_nota")}
                                onChange={(e) =>
                                  setPrenotazioni((prev) =>
                                    prev.map((row) =>
                                      row.id === p.id ? { ...row, nuovaNota: e.target.value } : row
                                    )
                                  )
                                }
                                className="bg-zinc-800 border border-zinc-700 text-white px-2 py-1 rounded w-full focus:ring-2 focus:ring-emerald-500"
                              />
                              <button
                                onClick={() => handleSalvaNota(p.id, p.nuovaNota)}
                                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white transition-colors"
                                title={t("gestioneProduzione.title_salva_nota")}
                              >
                                💾
                              </button>
                            </div>
                          </td>
                          <td className="p-3 border border-zinc-700">
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleConfermaProduzione(p)}
                                className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white transition-colors font-medium"
                              >
                                ✅ {t("gestioneProduzione.btn_conferma")}
                              </button>
                              <button
                                onClick={() => handleAggiornaStato(p.id, "annullato")}
                                className="bg-red-600 hover:bg-red-700 px-3 py-1 rounded text-white transition-colors font-medium"
                              >
                                ❌ {t("gestioneProduzione.btn_annulla")}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {p.note && (
                          <tr className="bg-yellow-900/10">
                            <td colSpan="6" className="p-3 border border-zinc-700 text-zinc-300 text-xs whitespace-pre-wrap">
                              <strong className="text-yellow-400">{t("gestioneProduzione.note_precedenti")}</strong> {p.note}
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ========== PRENOTAZIONI ATTIVE ========== */}
        <div className="bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden">
          <div className="bg-emerald-600 px-6 py-4">
            <h2 className="text-xl font-semibold text-white flex items-center gap-2">
              📦 {t("gestioneProduzione.section_prenotazioni_attive")}
              <span className="text-sm font-normal opacity-90">
                ({prenotazioniAttive.length})
              </span>
            </h2>
          </div>

          <div className="p-6">
            {prenotazioniAttive.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">{t("gestioneProduzione.empty_no_attive")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-zinc-800 text-white">
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_nome_prodotto")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_formato")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_litri")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_lotto")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_prodotti")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_priorita")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_data")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_note")}</th>
                      <th className="p-3 border border-zinc-700 text-left">{t("gestioneProduzione.th_azioni")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prenotazioniAttive.map((p, idx) => {
                      const stableKey = p.id ?? p.tempKey ?? `pren-${idx}`;
                      const hasId = Boolean(p.id);

                      return (
                        <tr key={stableKey} className="hover:bg-zinc-800/50 transition-colors">
                          <td className="p-3 border border-zinc-700 text-white">
                            {(p.nome_prodotto || "-").replace(/\(NUOVO\)|\(VECCHIO\)/gi, "").trim()}
                          </td>
                          <td className="p-3 border border-zinc-700 text-white">{p.formato}</td>
                          <td className="p-3 border border-zinc-700 text-emerald-400 font-medium">
                            {p.litriImpegnati?.toFixed(1)}
                          </td>
                          <td className="p-3 border border-zinc-700 text-white">{p.lotto || "-"}</td>
                          <td className="p-3 border border-zinc-700 text-white font-medium">{p.prodotti}</td>
                          <td className="p-3 border border-zinc-700 text-white">{p.priorita}</td>
                          <td className="p-3 border border-zinc-700 text-zinc-400 text-xs">{p.dataRichiesta}</td>
                          <td className="p-3 border border-zinc-700">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={p.note ?? ""}
                                placeholder={t("gestioneProduzione.ph_aggiungi_nota")}
                                onChange={(e) =>
                                  setPrenotazioni((prev) =>
                                    prev.map((row) =>
                                      row.id === p.id ? { ...row, note: e.target.value } : row
                                    )
                                  )
                                }
                                className="bg-zinc-800 border border-zinc-700 text-white px-2 py-1 rounded w-full focus:ring-2 focus:ring-emerald-500"
                              />
                              <button
                                onClick={() => handleSalvaNota(p.id, p.note)}
                                className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-white transition-colors"
                                title={t("gestioneProduzione.title_salva_nota")}
                              >
                                💾
                              </button>
                            </div>
                          </td>
                          <td className="p-3 border border-zinc-700">
                            <button
                              disabled={!hasId}
                              title={hasId ? t("gestioneProduzione.title_metti_lavorazione") : t("gestioneProduzione.title_id_mancante")}
                              onClick={() => hasId && handleAggiornaStato(p.id, "in_corso")}
                              className={`px-3 py-1 rounded font-medium transition-colors ${hasId
                                ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                                : "bg-zinc-700 cursor-not-allowed text-zinc-500"
                                }`}
                            >
                              ▶️ {t("gestioneProduzione.btn_in_lavorazione")}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* ========== STATISTICHE ========== */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-emerald-500">{prenotazioni.length}</p>
            <p className="text-sm text-zinc-400 mt-1">{t("gestioneProduzione.stat_totali")}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-blue-500">
              {prenotazioni.filter((p) => normalizeState(p.stato) === "pending").length}
            </p>
            <p className="text-sm text-zinc-400 mt-1">{t("gestioneProduzione.stat_prenotazioni")}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-yellow-500">
              {prenotazioni.filter((p) => normalizeState(p.stato) === "in_corso").length}
            </p>
            <p className="text-sm text-zinc-400 mt-1">{t("gestioneProduzione.stat_in_lavorazione")}</p>
          </div>
          <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 text-center">
            <p className="text-3xl font-bold text-green-500">
              {prenotazioni.filter((p) => normalizeState(p.stato) === "completato").length}
            </p>
            <p className="text-sm text-zinc-400 mt-1">{t("gestioneProduzione.stat_completate")}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GestioneProduzione;