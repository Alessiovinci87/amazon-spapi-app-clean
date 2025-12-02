import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { fetchJSON } from "../../utils/api";
import {
  Trash2,
  Edit3,
  FileText,
  Package,
  Droplet,
  Save,
  AlertCircle,
  CheckCircle,
  Box,
  ChevronDown,
  ChevronUp
} from "lucide-react";

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
  } = prodotto;

  const [quantitaDaAggiungere, setQuantitaDaAggiungere] = useState("");
  const [isHovered, setIsHovered] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(`sfusoLitri_${asin}`);
    if (saved) {
      handleChange(asin, "sfusoLitri", Number(saved));
    }
  }, [asin]);

  const giacenzaFinale = Math.max((Number(pronto) || 0) - (Number(utilizzo) || 0), 0);

  const mostraPennellini = nome.toLowerCase().includes("12 ml");
  const isKit = nome.toLowerCase().includes("kit");

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

    if (nomeLower.includes("kit") && nomeLower.includes("12") && nomeLower.includes("2")) {
      return Math.floor(totMlDisponibili / (12 * 2));
    }
    if (nomeLower.includes("kit") && nomeLower.includes("100") && nomeLower.includes("2")) {
      return Math.floor(totMlDisponibili / (100 * 2));
    }
    if (nomeLower.includes("kit") && nomeLower.includes("9") && nomeLower.includes("12")) {
      return Math.floor(totMlDisponibili / (12 * 9));
    }

    if (nomeLower.includes("12 ml") || nomeLower.includes("12ml")) {
      return Math.floor(totMlDisponibili / 12);
    }
    if (nomeLower.includes("100 ml") || nomeLower.includes("100ml")) {
      return Math.floor(totMlDisponibili / 100);
    }

    return 0;
  };

  const calcolaAccessoriDaSfuso = (sfusoLitri, nomeProdotto) => {
    const prodotti = calcolaProdottiDaSfuso(sfusoLitri, nomeProdotto);
    const nomeLower = nomeProdotto.toLowerCase();

    let boccette = 0;
    let tappini = 0;
    let pennellini = 0;

    if (nomeLower.includes("kit") && nomeLower.includes("12") && nomeLower.includes("2")) {
      boccette = prodotti * 2;
      tappini = prodotti * 2;
      pennellini = prodotti * 2;
    } else if (nomeLower.includes("kit") && nomeLower.includes("100") && nomeLower.includes("2")) {
      boccette = prodotti * 2;
      tappini = prodotti * 2;
    } else if (nomeLower.includes("kit") && nomeLower.includes("9") && nomeLower.includes("12")) {
      boccette = prodotti * 9;
      tappini = prodotti * 9;
      pennellini = prodotti * 9;
    } else if (nomeLower.includes("12 ml") || nomeLower.includes("12ml")) {
      boccette = prodotti;
      tappini = prodotti;
      pennellini = prodotti;
    } else if (nomeLower.includes("100 ml") || nomeLower.includes("100ml")) {
      boccette = prodotti;
      tappini = prodotti;
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
    if (isNaN(quantita)) return alert("Valore non valido");
    if (!note?.trim()) return alert("La nota è obbligatoria");
    if (!operatore?.trim()) return alert("L'operatore è obbligatorio");




    try {

      console.log("➡️ Payload rettifica:", {
        asin,
        pronto: quantita,
        note,
        operatore
      });


      const json = await fetchJSON(`/magazzino/${asin}/pronto`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pronto: quantita, note, operatore }),
      });

      const nuovoPronto = json.data?.pronto ?? json.pronto ?? quantita;
      handleChange(asin, "pronto", nuovoPronto);

      alert(`✅ Rettifica completata. Nuovo Pronto: ${nuovoPronto}`);
    } catch (err) {
      console.error("❌ Errore rettifica:", err);
      alert("Errore nella rettifica: " + err.message);
    }
  };

  return (
    <div
      className="relative bg-zinc-900 border border-zinc-800 text-white rounded-xl shadow-lg overflow-hidden transition-all duration-300 hover:shadow-2xl hover:border-emerald-500/30"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header sempre visibile - Nome, Immagine, Info base e pulsante espandi */}
      <div
        className="cursor-pointer hover:bg-zinc-800/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-4 p-6">
          {/* Immagine */}
          <div className="flex-shrink-0">
            <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-zinc-800 border-2 border-zinc-700">
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
          </div>

          {/* Info prodotto */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold text-white truncate mb-1">
              {nome || "Prodotto senza nome"}
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded text-emerald-400 text-xs font-medium">
                {asin}
              </span>
              <span className="text-zinc-400 text-sm">
                Pronto: <span className="text-white font-semibold">{pronto || 0}</span>
              </span>
              <span className="text-zinc-400 text-sm">
                Giacenza: <span className="text-emerald-400 font-semibold">{giacenzaFinale}</span>
              </span>
            </div>
          </div>

          {/* Pulsanti azione rapida */}
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-all hover:scale-110"
              title="Elimina prodotto"
            >
              <Trash2 className="w-4 h-4" />
            </button>

            <button
              className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded(!isExpanded);
              }}
            >
              {isExpanded ? (
                <ChevronUp className="w-5 h-5 text-white" />
              ) : (
                <ChevronDown className="w-5 h-5 text-white" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Contenuto espandibile */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-6 border-t border-zinc-800 pt-6">
          {/* Nome editabile */}
          <div>
            <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
              Nome Prodotto
            </label>
            <input
              type="text"
              value={nome ?? ""}
              onChange={(e) => handleChange(asin, "nome", e.target.value)}
              className="w-full text-lg font-semibold p-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              placeholder="Nome prodotto"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => rettificaAssoluto(prodotto.asin)}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 px-5 py-2.5 rounded-lg font-medium transition-all hover:scale-[1.02]"
              type="button"
            >
              <Edit3 className="w-4 h-4" />
              Rettifica
            </button>
            <button
              onClick={() => navigate(`/storico/${asin}`)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-2.5 rounded-lg font-medium transition-all hover:scale-[1.02]"
              type="button"
            >
              <FileText className="w-4 h-4" />
              Storico
            </button>
          </div>

          {/* Main Fields Grid */}
          <div className="bg-zinc-800/50 rounded-xl p-6 border border-zinc-700">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-emerald-400">
              <Package className="w-5 h-5" />
              Informazioni Prodotto
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                  Pronto
                </label>
                <input
                  type="number"
                  value={pronto === undefined ? "" : pronto}
                  readOnly
                  className="w-full p-3 rounded-lg bg-zinc-700 border border-zinc-600 text-white font-semibold cursor-not-allowed"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                  Box / Pezzi
                </label>
                <input
                  type="text"
                  value={calcolaBoxPezzi(pronto, nome)}
                  readOnly
                  className="w-full p-3 rounded-lg bg-zinc-700 border border-zinc-600 text-white cursor-not-allowed"
                  title="Calcolato automaticamente"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                  Confezionati + Lotto
                </label>
                <input
                  type="text"
                  value={confezionatiLotto ?? ""}
                  onChange={(e) => handleChange(asin, "confezionatiLotto", e.target.value)}
                  className="w-full p-3 rounded-lg bg-zinc-700 border border-zinc-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                  Etichette
                </label>
                <input
                  type="number"
                  value={etichette ?? ""}
                  onChange={(e) => handleChange(asin, "etichette", Number(e.target.value))}
                  className="w-full p-3 rounded-lg bg-zinc-700 border border-zinc-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                  Totale da Sfuso
                </label>
                <input
                  type="number"
                  value={totaleSfuso ?? ""}
                  onChange={(e) => handleChange(asin, "totaleSfuso", Number(e.target.value))}
                  className="w-full p-3 rounded-lg bg-zinc-700 border border-zinc-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-400 block mb-2 uppercase tracking-wide">
                  Utilizzo
                </label>
                <input
                  type="number"
                  value={utilizzo === 0 ? "" : utilizzo ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleChange(asin, "utilizzo", val === "" ? 0 : Number(val));
                  }}
                  className="w-full p-3 rounded-lg bg-zinc-700 border border-zinc-600 text-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Sfuso Section */}
          <div className="bg-gradient-to-br from-blue-900/20 to-emerald-900/20 rounded-xl p-6 border border-blue-500/30">
            <h3 className="text-lg font-semibold mb-6 flex items-center gap-2 text-blue-400">
              <Droplet className="w-5 h-5" />
              Fornitura da Creare
            </h3>

            {/* Input Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-2 uppercase tracking-wide">
                  Litri di Sfuso
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={sfusoLitri === null || sfusoLitri === undefined ? "" : sfusoLitri}
                    onChange={handleSfusoLitriChange}
                    className="flex-1 p-3 rounded-lg bg-zinc-800 border border-zinc-600 text-white font-semibold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                    min={0}
                    placeholder="0"
                  />
                  <button
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

                        alert(`✅ Produzione registrata: ${quantita} pz (${formato})`);

                        const nuovoPronto = json.data?.pronto ?? json.pronto ?? pronto + quantita;
                        handleChange(asin, "pronto", nuovoPronto);
                      } catch (err) {
                        console.error("❌ Errore produzione:", err);
                        alert("Errore nel salvataggio sfuso: " + err.message);
                      }
                    }}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium transition-all hover:scale-105"
                    title="Conferma produzione"
                  >
                    <Save className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-2 uppercase tracking-wide">
                  Quantità Bidoni
                </label>
                <div className="flex items-center gap-2 p-3 rounded-lg bg-zinc-800 border border-zinc-600">
                  <Box className="w-5 h-5 text-blue-400" />
                  <span className="font-semibold text-white">
                    {Math.floor((sfusoLitri ?? 0) / 5)}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-zinc-300 block mb-2 uppercase tracking-wide">
                  Lotto Sfuso
                </label>
                <input
                  type="text"
                  value={sfusoLotto ?? ""}
                  onChange={(e) => handleChange(asin, "sfusoLotto", e.target.value)}
                  className="w-full p-3 rounded-lg bg-zinc-800 border border-zinc-600 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  placeholder="Lotto"
                />
              </div>
            </div>

            {/* Calculated Results */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wide">Prodotti da Sfuso</p>
                <p className="text-2xl font-bold text-emerald-400">
                  {calcolaProdottiDaSfuso(sfusoLitri, nome).toLocaleString() || "0"}
                </p>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wide">Boccette</p>
                <p className="text-2xl font-bold text-blue-400">
                  {accessoriDaSfuso.boccette.toLocaleString()}
                </p>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wide">Tappini</p>
                <p className="text-2xl font-bold text-blue-400">
                  {accessoriDaSfuso.tappini.toLocaleString()}
                </p>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-4 border border-zinc-700">
                <p className="text-xs text-zinc-400 mb-1 uppercase tracking-wide">Pennellini</p>
                <p className="text-2xl font-bold text-blue-400">
                  {accessoriDaSfuso.pennellini.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Giacenza Footer */}
          <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-xs text-zinc-400 uppercase tracking-wide">Giacenza Aggiornata</p>
              <p className="text-lg font-bold text-emerald-400">{giacenzaFinale.toLocaleString()} pz</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProdottoCard;