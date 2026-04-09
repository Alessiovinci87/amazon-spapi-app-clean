import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fetchJSON } from "../../utils/api";
import {
  Trash2,
  Edit3,
  History,
  Package,
  Droplet,
  Save,
  CheckCircle,
  Box,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Bell,
} from "lucide-react";

// === Subcomponents locali ===
function FieldLabel({ children }) {
  return (
    <label className="block text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1.5">
      {children}
    </label>
  );
}

function Field({ children }) {
  return (
    <input
      {...children.props}
      className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all placeholder-slate-600"
    />
  );
}

function ReadonlyField({ value, title }) {
  return (
    <div
      title={title}
      className="w-full px-3 py-2 rounded-md bg-slate-900/40 border border-slate-800 text-slate-400 text-sm cursor-default truncate"
    >
      {value || "—"}
    </div>
  );
}

function MetricBox({ label, value, accent = "slate" }) {
  const colors = {
    emerald: "text-emerald-400",
    blue:    "text-blue-400",
    cyan:    "text-cyan-400",
    slate:   "text-slate-200",
  };
  return (
    <div className="bg-slate-900/40 border border-slate-800 rounded-md p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-slate-500 mb-1">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${colors[accent]}`}>{value}</p>
    </div>
  );
}

const ProdottoCard = ({
  prodotto,
  accessoriImpegnati,
  handleChange,
  onDelete,
}) => {
  const navigate = useNavigate();
  const {
    asin,
    nome,
    pronto,
    utilizzo,
    confezionatiLotto,
    sfusoLotto,
    etichette,
    totaleSfuso,
    sfusoLitri = 0,
    soglia_minima = 10,
  } = prodotto;

  const [isExpanded, setIsExpanded] = useState(false);
  const [editingSoglia, setEditingSoglia] = useState(false);
  const [sogliaTemp, setSogliaTemp] = useState(soglia_minima);

  const sottoSoglia = (pronto ?? 0) < soglia_minima;

  const salvaSoglia = async () => {
    try {
      await fetchJSON(`/magazzino/${asin}/soglia`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ soglia_minima: Number(sogliaTemp) }),
      });
      handleChange(asin, "soglia_minima", Number(sogliaTemp));
      setEditingSoglia(false);
      toast.success("Soglia aggiornata");
    } catch (err) {
      toast.error("Errore: " + err.message);
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(`sfusoLitri_${asin}`);
    if (saved) handleChange(asin, "sfusoLitri", Number(saved));
  }, [asin]);

  const giacenzaFinale = Math.max((Number(pronto) || 0) - (Number(utilizzo) || 0), 0);

  const calcolaBoxPezzi = (pronto, nomeProdotto) => {
    if (!pronto || pronto <= 0) return "";
    let capacitaBox = 150;
    const nomeLower = nomeProdotto.toLowerCase();
    if (nomeLower.includes("12 ml")) capacitaBox = 300;
    else if (nomeLower.includes("100 ml")) capacitaBox = 150;
    const boxPieni = Math.floor(pronto / capacitaBox);
    const pezziParziali = pronto % capacitaBox;
    return pezziParziali > 0
      ? `${boxPieni} box da ${capacitaBox} + ${pezziParziali} sfusi`
      : `${boxPieni} box da ${capacitaBox}`;
  };

  const calcolaProdottiDaSfuso = (sfusoLitri, nomeProdotto) => {
    if (!sfusoLitri || sfusoLitri <= 0) return 0;
    const totMlDisponibili = sfusoLitri * 1000;
    const nomeLower = nomeProdotto.toLowerCase();
    if (nomeLower.includes("kit") && nomeLower.includes("12") && nomeLower.includes("2"))  return Math.floor(totMlDisponibili / (12 * 2));
    if (nomeLower.includes("kit") && nomeLower.includes("100") && nomeLower.includes("2")) return Math.floor(totMlDisponibili / (100 * 2));
    if (nomeLower.includes("kit") && nomeLower.includes("9") && nomeLower.includes("12"))  return Math.floor(totMlDisponibili / (12 * 9));
    if (nomeLower.includes("12 ml") || nomeLower.includes("12ml"))   return Math.floor(totMlDisponibili / 12);
    if (nomeLower.includes("100 ml") || nomeLower.includes("100ml")) return Math.floor(totMlDisponibili / 100);
    return 0;
  };

  const calcolaAccessoriDaSfuso = (sfusoLitri, nomeProdotto) => {
    const prodotti = calcolaProdottiDaSfuso(sfusoLitri, nomeProdotto);
    const nomeLower = nomeProdotto.toLowerCase();
    let boccette = 0, tappini = 0, pennellini = 0;
    if (nomeLower.includes("kit") && nomeLower.includes("12") && nomeLower.includes("2")) {
      boccette = prodotti * 2; tappini = prodotti * 2; pennellini = prodotti * 2;
    } else if (nomeLower.includes("kit") && nomeLower.includes("100") && nomeLower.includes("2")) {
      boccette = prodotti * 2; tappini = prodotti * 2;
    } else if (nomeLower.includes("kit") && nomeLower.includes("9") && nomeLower.includes("12")) {
      boccette = prodotti * 9; tappini = prodotti * 9; pennellini = prodotti * 9;
    } else if (nomeLower.includes("12 ml") || nomeLower.includes("12ml")) {
      boccette = prodotti; tappini = prodotti; pennellini = prodotti;
    } else if (nomeLower.includes("100 ml") || nomeLower.includes("100ml")) {
      boccette = prodotti; tappini = prodotti;
    }
    return { boccette, tappini, pennellini };
  };

  const handleSfusoLitriChange = (e) => {
    const val = e.target.value;
    const valNum = val === "" ? "" : Number(val);
    handleChange(asin, "sfusoLitri", valNum);
    localStorage.setItem(`sfusoLitri_${asin}`, valNum);
  };

  const accessoriDaSfuso = calcolaAccessoriDaSfuso(sfusoLitri, nome);

  const rettificaAssoluto = async (asin) => {
    const input = prompt("Inserisci la quantità PRONTO desiderata per la rettifica:");
    const note = prompt("Inserisci una nota per questa rettifica (obbligatoria):");
    const operatore = prompt("Inserisci il nome dell'operatore (Guido, David, Alessio, Tony):");
    const quantita = parseInt(input);
    if (isNaN(quantita)) return toast.info("Valore non valido");
    if (!note?.trim()) return toast.info("La nota è obbligatoria");
    if (!operatore?.trim()) return toast.info("L'operatore è obbligatorio");
    try {
      const json = await fetchJSON(`/magazzino/${asin}/pronto`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pronto: quantita, note, operatore }),
      });
      const nuovoPronto = json.data?.pronto ?? json.pronto ?? quantita;
      handleChange(asin, "pronto", nuovoPronto);
      toast.success(`Rettifica completata. Nuovo Pronto: ${nuovoPronto}`);
    } catch (err) {
      console.error("❌ Errore rettifica:", err);
      toast.info("Errore nella rettifica: " + err.message);
    }
  };

  const stockBasso = giacenzaFinale > 0 && giacenzaFinale < 20;
  const stockOk    = giacenzaFinale >= 20;
  const stockZero  = giacenzaFinale === 0;

  return (
    <div className="relative bg-slate-900/60 border border-slate-800 hover:border-slate-700 rounded-lg overflow-hidden transition-all">
      {/* Bordo sinistro stato stock */}
      <div className={`absolute left-0 top-0 bottom-0 w-[2px] ${
        stockZero  ? "bg-rose-500/60" :
        stockBasso ? "bg-amber-500/60" :
        stockOk    ? "bg-emerald-500/40" : "bg-slate-700"
      }`} />

      {/* Header riga sempre visibile */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full text-left hover:bg-slate-800/30 transition-colors"
      >
        <div className="flex items-center gap-5 sm:gap-6 px-6 sm:px-8 py-6 sm:py-7">
          {/* Immagine */}
          <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-slate-950 border border-slate-800 flex-shrink-0">
            <img
              src={prodotto.immagine_main || "/images/no_image2.png"}
              alt={nome}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                if (!e.target.dataset.error) {
                  e.target.src = "/images/no_image.jpg";
                  e.target.dataset.error = "true";
                }
              }}
            />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg sm:text-xl font-semibold text-white truncate mb-2.5 leading-tight">
              {nome || "Prodotto senza nome"}
            </h3>
            <div className="flex items-center gap-4 flex-wrap">
              <span className="font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded text-xs">
                {asin}
              </span>
              <span className="text-sm text-slate-500">
                Pronto{" "}
                <span className="text-slate-200 font-semibold tabular-nums text-base">
                  {pronto || 0}
                </span>
              </span>
              <span className="text-sm text-slate-500">
                Giacenza{" "}
                <span className={`font-semibold tabular-nums text-base ${
                  stockZero ? "text-rose-400" :
                  stockBasso ? "text-amber-400" : "text-emerald-400"
                }`}>
                  {giacenzaFinale}
                </span>
              </span>
              {sottoSoglia && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Sotto soglia
                </span>
              )}
            </div>
          </div>

          {/* Azioni rapide */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onDelete(); } }}
              className="w-10 h-10 rounded-md border border-slate-800 bg-slate-900 hover:bg-rose-500/10 hover:border-rose-500/40 hover:text-rose-400 text-slate-500 transition-colors flex items-center justify-center"
              title="Elimina prodotto"
            >
              <Trash2 className="w-4 h-4" />
            </span>
            <div className="w-10 h-10 rounded-md border border-slate-800 bg-slate-900 text-slate-500 flex items-center justify-center">
              {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </div>
          </div>
        </div>
      </button>

      {/* Contenuto espandibile */}
      {isExpanded && (
        <div className="px-5 pb-5 pt-2 border-t border-slate-800 space-y-5">
          {/* Nome editabile */}
          <div>
            <FieldLabel>Nome prodotto</FieldLabel>
            <input
              type="text"
              value={nome ?? ""}
              onChange={(e) => handleChange(asin, "nome", e.target.value)}
              className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
              placeholder="Nome prodotto"
            />
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => rettificaAssoluto(prodotto.asin)}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/40 hover:border-amber-400/60 text-amber-300 hover:text-amber-200 text-xs font-medium transition-all"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Rettifica
            </button>
            <button
              onClick={() => navigate(`/storico/${asin}`)}
              type="button"
              className="flex items-center gap-1.5 px-3 py-2 rounded-md bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/40 hover:border-blue-400/60 text-blue-300 hover:text-blue-200 text-xs font-medium transition-all"
            >
              <History className="w-3.5 h-3.5" />
              Storico
            </button>
          </div>

          {/* Soglia Alert */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-md bg-slate-900/40 border border-slate-800">
            <Bell className={`w-4 h-4 flex-shrink-0 ${sottoSoglia ? "text-amber-400" : "text-slate-500"}`} />
            <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Soglia alert</span>
            {editingSoglia ? (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="number"
                  min={0}
                  value={sogliaTemp}
                  onChange={(e) => setSogliaTemp(e.target.value)}
                  className="w-20 px-2 py-1 rounded bg-slate-950/60 border border-slate-700 text-white text-sm tabular-nums focus:outline-none focus:border-amber-500/50"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === "Enter") salvaSoglia(); if (e.key === "Escape") setEditingSoglia(false); }}
                />
                <button onClick={salvaSoglia} type="button" className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/40 text-amber-300 text-xs font-medium hover:bg-amber-500/20 transition-colors">
                  Salva
                </button>
                <button onClick={() => setEditingSoglia(false)} type="button" className="px-2 py-1 rounded bg-slate-800 border border-slate-700 text-slate-400 text-xs hover:text-slate-200 transition-colors">
                  Annulla
                </button>
              </div>
            ) : (
              <button
                onClick={() => { setSogliaTemp(soglia_minima); setEditingSoglia(true); }}
                type="button"
                className="ml-auto flex items-center gap-2 text-sm hover:text-amber-300 transition-colors"
              >
                <span className={`font-semibold tabular-nums ${sottoSoglia ? "text-amber-400" : "text-slate-300"}`}>
                  {pronto ?? 0} / {soglia_minima}
                </span>
                <Edit3 className="w-3 h-3 text-slate-500" />
              </button>
            )}
          </div>

          {/* Informazioni Prodotto */}
          <div className="relative bg-slate-900/40 border border-slate-800 rounded-md overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400/60" />
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center">
                  <Package className="w-3.5 h-3.5 text-emerald-400" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 leading-none mb-0.5">Sezione</div>
                  <h4 className="text-sm font-semibold text-white">Informazioni prodotto</h4>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                <div>
                  <FieldLabel>Pronto</FieldLabel>
                  <ReadonlyField value={pronto ?? 0} title="Calcolato automaticamente" />
                </div>
                <div>
                  <FieldLabel>Box / pezzi</FieldLabel>
                  <ReadonlyField value={calcolaBoxPezzi(pronto, nome)} title="Calcolato automaticamente" />
                </div>
                <div>
                  <FieldLabel>Confezionati + lotto</FieldLabel>
                  <input
                    type="text"
                    value={confezionatiLotto ?? ""}
                    onChange={(e) => handleChange(asin, "confezionatiLotto", e.target.value)}
                    className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all"
                  />
                </div>
                <div>
                  <FieldLabel>Etichette</FieldLabel>
                  <input
                    type="number"
                    value={etichette ?? ""}
                    onChange={(e) => handleChange(asin, "etichette", Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all tabular-nums"
                  />
                </div>
                <div>
                  <FieldLabel>Totale da sfuso</FieldLabel>
                  <input
                    type="number"
                    value={totaleSfuso ?? ""}
                    onChange={(e) => handleChange(asin, "totaleSfuso", Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all tabular-nums"
                  />
                </div>
                <div>
                  <FieldLabel>Utilizzo</FieldLabel>
                  <input
                    type="number"
                    value={utilizzo === 0 ? "" : utilizzo ?? ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleChange(asin, "utilizzo", val === "" ? 0 : Number(val));
                    }}
                    className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 transition-all tabular-nums"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Fornitura da creare (sfuso) */}
          <div className="relative bg-slate-900/40 border border-slate-800 rounded-md overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-cyan-400/60" />
            <div className="px-5 py-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-md bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
                  <Droplet className="w-3.5 h-3.5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-slate-500 leading-none mb-0.5">Produzione</div>
                  <h4 className="text-sm font-semibold text-white">Fornitura da creare</h4>
                </div>
              </div>

              {/* Input row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
                <div>
                  <FieldLabel>Litri di sfuso</FieldLabel>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={sfusoLitri === null || sfusoLitri === undefined ? "" : sfusoLitri}
                      onChange={handleSfusoLitriChange}
                      min={0}
                      placeholder="0"
                      className="flex-1 px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const quantita = calcolaProdottiDaSfuso(sfusoLitri, nome);
                          const formato = nome.toLowerCase().includes("100") ? "100ml" : "12ml";
                          const note = `Produzione automatica da ${sfusoLitri}L di sfuso`;
                          const json = await fetchJSON("/magazzino/produce", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ asin, quantita, formato, note }),
                          });
                          toast.success(`Produzione registrata: ${quantita} pz (${formato})`);
                          const nuovoPronto = json.data?.pronto ?? json.pronto ?? pronto + quantita;
                          handleChange(asin, "pronto", nuovoPronto);
                        } catch (err) {
                          console.error("❌ Errore produzione:", err);
                          toast.info("Errore nel salvataggio sfuso: " + err.message);
                        }
                      }}
                      className="flex items-center justify-center w-10 h-9 rounded-md bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/40 hover:border-emerald-400/60 text-emerald-300 transition-all"
                      title="Conferma produzione"
                    >
                      <Save className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <FieldLabel>Quantità bidoni</FieldLabel>
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md bg-slate-900/40 border border-slate-800">
                    <Box className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-semibold text-white tabular-nums">
                      {Math.floor((sfusoLitri ?? 0) / 5)}
                    </span>
                  </div>
                </div>

                <div>
                  <FieldLabel>Lotto sfuso</FieldLabel>
                  <input
                    type="text"
                    value={sfusoLotto ?? ""}
                    onChange={(e) => handleChange(asin, "sfusoLotto", e.target.value)}
                    placeholder="Lotto"
                    className="w-full px-3 py-2 rounded-md bg-slate-950/60 border border-slate-800 text-white text-sm focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/30 transition-all"
                  />
                </div>
              </div>

              {/* Calculated metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MetricBox label="Prodotti da sfuso" value={calcolaProdottiDaSfuso(sfusoLitri, nome).toLocaleString() || "0"} accent="emerald" />
                <MetricBox label="Boccette"           value={accessoriDaSfuso.boccette.toLocaleString()}     accent="cyan" />
                <MetricBox label="Tappini"            value={accessoriDaSfuso.tappini.toLocaleString()}      accent="cyan" />
                <MetricBox label="Pennellini"         value={accessoriDaSfuso.pennellini.toLocaleString()}   accent="cyan" />
              </div>
            </div>
          </div>

          {/* Footer giacenza */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-md bg-emerald-500/5 border border-emerald-500/30">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <div className="flex items-baseline gap-3">
              <span className="text-[10px] uppercase tracking-[0.12em] text-slate-500">Giacenza aggiornata</span>
              <span className="text-base font-semibold text-emerald-400 tabular-nums">{giacenzaFinale.toLocaleString()} pz</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProdottoCard;
