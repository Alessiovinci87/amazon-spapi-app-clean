import React, { useState, useEffect } from "react";
import { 
  sommaPerTipo,
  calcolaCostoTotale,
  calcolaMargine,
  sommaDueColonne,
  calcolaMargineMultiplo,
  calcolaPercentualeCosto,
  calcolaPrezzoMinimo,
  sommaTotFattura 
} from '../utils/formuleCalcoli';
import { 
  ArrowLeft,
  Box,
  DollarSign,
  TrendingUp,
  FileText,
  RotateCcw,
  Calculator,
  Package
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const initialFornitoriRows = [
  { tipo: "a", fornitore: "Materia Prima Completa", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "Materia Prima Sfusa", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "confezione (boccetta/vaso)", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "confezionamento", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "confezione secondaria (scatola)", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "Etichette prodotto", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "a", fornitore: "Etichette", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "b", fornitore: "Commissioni Amazon no iva", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "Etichetta + bustina amazon codebar", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "Spedizione ad Amazon", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "Spedizione Pics", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "packagin spedizione box o busta", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "imballo e cancelleria", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
  { tipo: "c", fornitore: "eventuale costo stoccaggio", codice: "", data: "", imponibile: "", ivaPagata: "", totFattura: "", note: "" },
];

const FbaGestioneProdotti = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("margini");
  const [rows, setRows] = useState(initialFornitoriRows);

  const [costoProdotto, setCostoProdotto] = useState({
    prodotto: "",
    costoBase: 28.47,
    altreSpese: 0,
    commissioniAmazon: 17.95,
    prezzoVenditaIvato: 99.99,
    speseSpedizione: 0.04,
    margineNoIva: 35.5,
    ivaProdotto: 22,
    costoTotale: 46.46,
    prezzoMinimoPubblico: 0,
    costoPubblicitarioEffettivo: 5,
    utilePercentualeEffettivo: 107.13,
    utileEffettivo: 30.5,
    margineX2: 56.94,
    pubblicitaMaxX2: -21.44,
    margineX3: 85.41,
    pubblicitaMaxX3: -49.91,
    margineX4: 113.88,
    pubblicitaMaxX4: -78.38,
    imponibileTipoD: 0,
    speseSpedizioneCalcolate: 0,
    percentualeCostoTotale: 0,
  });

  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    setResetting(true);
    setCostoProdotto({
      prodotto: "",
      costoBase: 0,
      altreSpese: 0,
      commissioniAmazon: 0,
      prezzoVenditaIvato: 0,
      speseSpedizione: 0,
      margineNoIva: 0,
      ivaProdotto: 0,
      costoTotale: 0,
      prezzoMinimoPubblico: 0,
      costoPubblicitarioEffettivo: 0,
      utilePercentualeEffettivo: 0,
      utileEffettivo: 0,
      margineX2: 0,
      pubblicitaMaxX2: 0,
      margineX3: 0,
      pubblicitaMaxX3: 0,
      margineX4: 0,
      pubblicitaMaxX4: 0,
      imponibileTipoD: 0,
      speseSpedizioneCalcolate: 0,
    });
    setRows(initialFornitoriRows);
    setTimeout(() => setResetting(false), 100);
  };

  useEffect(() => {
    const imponibileTipoA = sommaPerTipo(rows, "a", "imponibile");
    const imponibileTipoB = sommaPerTipo(rows, "b", "imponibile");
    const imponibileTipoC = sommaPerTipo(rows, "c", "imponibile");
    const imponibileTipoD = sommaPerTipo(rows, "D", "imponibile");

    const percentualeCostoTotale = calcolaPercentualeCosto(
      costoProdotto.costoBase,
      costoProdotto.prezzoVenditaIvato
    );

    const prezzoMinimoPubblico = calcolaPrezzoMinimo(
      costoProdotto.prezzoVenditaIvato,
      costoProdotto.costoTotale
    );

    const costoTot = calcolaCostoTotale(
      costoProdotto.costoBase,
      costoProdotto.altreSpese,
      imponibileTipoB,
      imponibileTipoC
    );

    const margine = calcolaMargine(costoProdotto.prezzoVenditaIvato, costoTot);
    const margineX2 = calcolaMargineMultiplo(margine, 2);
    const margineX3 = calcolaMargineMultiplo(margine, 3);
    const margineX4 = calcolaMargineMultiplo(margine, 4);

    const costoMoltiplicatoX2 = costoProdotto.costoBase * 2;
    const costoMoltiplicatoX3 = costoProdotto.costoBase * 3;
    const costoMoltiplicatoX4 = costoProdotto.costoBase * 4;

    const pubblicitaMaxX2 = margine - costoMoltiplicatoX2;
    const pubblicitaMaxX3 = margine - costoMoltiplicatoX3;
    const pubblicitaMaxX4 = margine - costoMoltiplicatoX4;

    const ivaDecimale = (parseFloat(costoProdotto.ivaProdotto) || 0) / 100;
    const speseSpedizioneCalcolate =
      (parseFloat(costoProdotto.costoBase) || 0) / (1 + ivaDecimale) -
      (parseFloat(costoProdotto.speseSpedizione) || 0);

    setCostoProdotto((prev) => ({
      ...prev,
      costoTotale: costoTot,
      margineNoIva: margine,
      margineX2,
      margineX3,
      margineX4,
      pubblicitaMaxX2,
      pubblicitaMaxX3,
      pubblicitaMaxX4,
      costoMoltiplicatoX2,
      costoMoltiplicatoX3,
      costoMoltiplicatoX4,
      imponibileTipoD,
      speseSpedizioneCalcolate,
      percentualeCostoTotale,
      prezzoMinimoPubblico,
    }));
  }, [
    rows,
    costoProdotto.costoBase,
    costoProdotto.altreSpese,
    costoProdotto.prezzoVenditaIvato,
    costoProdotto.ivaProdotto,
    costoProdotto.speseSpedizione,
  ]);

  const handleInputChange = (field, value) => {
    setCostoProdotto((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleFornitoriChange = (index, field, value) => {
    const newRows = [...rows];
    newRows[index][field] = value;
    newRows[index].totFattura = sommaTotFattura(newRows[index]);
    setRows(newRows);
  };

  const InputField = ({ label, value, onChange, readOnly, highlight, icon: Icon }) => (
    <div className="col-span-2">
      <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide flex items-center gap-2">
        {Icon && <Icon className="w-4 h-4" />}
        {label}
      </label>
      <input
        type="number"
        className={`w-full px-4 py-3 rounded-lg border text-white transition-all ${
          readOnly
            ? 'bg-zinc-800 border-zinc-700 cursor-not-allowed'
            : 'bg-zinc-800 border-zinc-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
        } ${highlight === 'orange' ? 'border-orange-500 ring-2 ring-orange-500/20' : ''}
          ${highlight === 'green' ? 'border-green-500 ring-2 ring-green-500/20' : ''}
          ${highlight === 'yellow' ? 'bg-yellow-500/10 border-yellow-500' : ''}`}
        value={typeof value === 'number' ? value.toFixed(2) : value}
        onChange={onChange}
        readOnly={readOnly}
      />
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="w-full space-y-6">
        
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
                <Box className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">FBA - Gestione Prodotti</h1>
                <p className="text-zinc-400 mt-1">Calcolo margini e gestione fornitori</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              >
                <RotateCcw className="w-4 h-4" />
                Reset
              </button>
              <button
                onClick={() => navigate("/")}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              >
                <ArrowLeft className="w-4 h-4" />
                Home
              </button>
            </div>
          </div>
        </div>

        {/* ========== COSTO PRODOTTO ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-white">
            <Calculator className="w-6 h-6 text-blue-400" />
            Costo Prodotto
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-6">
            {/* Nome Prodotto */}
            <div className="col-span-2">
              <label className="block text-xs font-medium text-zinc-400 mb-2 uppercase tracking-wide flex items-center gap-2">
                <Package className="w-4 h-4" />
                Nome Prodotto
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                value={costoProdotto.prodotto}
                onChange={(e) => handleInputChange("prodotto", e.target.value)}
                placeholder="Inserisci nome prodotto"
              />
            </div>

            <InputField 
              label="Somma Imponibile Tipo D" 
              value={costoProdotto.imponibileTipoD} 
              readOnly 
              icon={DollarSign}
            />

            <InputField 
              label="% Costo Totale" 
              value={costoProdotto.percentualeCostoTotale} 
              readOnly 
              icon={TrendingUp}
            />

            <InputField 
              label="Altre Spese (€)" 
              value={costoProdotto.altreSpese} 
              onChange={(e) => handleInputChange("altreSpese", parseFloat(e.target.value) || 0)}
              icon={DollarSign}
            />

            <InputField 
              label="Spese Spedizione Calc." 
              value={costoProdotto.speseSpedizioneCalcolate} 
              readOnly 
            />

            <InputField 
              label="Commissioni Amazon (€)" 
              value={costoProdotto.commissioniAmazon} 
              onChange={(e) => handleInputChange("commissioniAmazon", parseFloat(e.target.value) || 0)}
            />

            <InputField 
              label="Prezzo Vendita Ivato (€)" 
              value={costoProdotto.prezzoVenditaIvato} 
              onChange={(e) => handleInputChange("prezzoVenditaIvato", parseFloat(e.target.value) || 0)}
            />

            <InputField 
              label="Spese Spedizione (€)" 
              value={costoProdotto.speseSpedizione} 
              onChange={(e) => handleInputChange("speseSpedizione", parseFloat(e.target.value) || 0)}
            />

            <InputField 
              label="Margine No IVA (€)" 
              value={costoProdotto.margineNoIva} 
              readOnly 
              highlight="orange"
            />

            <InputField 
              label="IVA Prodotto (%)" 
              value={costoProdotto.ivaProdotto} 
              onChange={(e) => handleInputChange("ivaProdotto", parseFloat(e.target.value) || 0)}
            />

            <InputField 
              label="Costo Pubblicitario (€)" 
              value={costoProdotto.costoPubblicitarioEffettivo} 
              onChange={(e) => handleInputChange("costoPubblicitarioEffettivo", parseFloat(e.target.value) || 0)}
            />

            <InputField 
              label="Prezzo Minimo Pubblico (€)" 
              value={costoProdotto.prezzoMinimoPubblico} 
              readOnly 
            />

            <InputField 
              label="Costo Totale (€)" 
              value={costoProdotto.costoTotale} 
              readOnly 
            />

            <InputField 
              label="% Utile Effettivo" 
              value={costoProdotto.utilePercentualeEffettivo} 
              onChange={(e) => handleInputChange("utilePercentualeEffettivo", parseFloat(e.target.value) || 0)}
            />

            <InputField 
              label="Utile Effettivo (€)" 
              value={costoProdotto.utileEffettivo} 
              onChange={(e) => handleInputChange("utileEffettivo", parseFloat(e.target.value) || 0)}
              highlight="green"
            />
          </div>

          {/* ========== MARGINI E PUBBLICITÀ ========== */}
          <div className="mt-8 bg-zinc-800 rounded-xl border border-zinc-700 p-6">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-white">
              <TrendingUp className="w-5 h-5 text-yellow-400" />
              Margini e Pubblicità Massima
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Headers */}
              <div className="font-bold text-zinc-400"></div>
              <div className="text-center font-bold text-yellow-400">2X</div>
              <div className="text-center font-bold text-yellow-400">3X</div>
              <div className="text-center font-bold text-yellow-400">4X</div>

              {/* Margine Row */}
              <div className="font-bold text-white">MARGINE</div>
              <input
                type="number"
                className="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-white text-center font-semibold"
                value={costoProdotto.margineX2?.toFixed(2) || ""}
                readOnly
              />
              <input
                type="number"
                className="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-white text-center font-semibold"
                value={costoProdotto.margineX3?.toFixed(2) || ""}
                readOnly
              />
              <input
                type="number"
                className="px-4 py-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30 text-white text-center font-semibold"
                value={costoProdotto.margineX4?.toFixed(2) || ""}
                readOnly
              />

              {/* Pubblicità Row */}
              <div className="font-bold text-white">PUBBLICITÀ MAX €</div>
              <input
                type="number"
                className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-white text-center font-semibold"
                value={costoProdotto.pubblicitaMaxX2?.toFixed(2) || ""}
                readOnly
              />
              <input
                type="number"
                className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-white text-center font-semibold"
                value={costoProdotto.pubblicitaMaxX3?.toFixed(2) || ""}
                readOnly
              />
              <input
                type="number"
                className="px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-white text-center font-semibold"
                value={costoProdotto.pubblicitaMaxX4?.toFixed(2) || ""}
                readOnly
              />
            </div>
          </div>
        </div>

        {/* ========== GESTIONE FORNITORI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 text-white">
            <FileText className="w-6 h-6 text-green-400" />
            Gestione Fornitori e Fatture
          </h2>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-zinc-800 border-b border-zinc-700">
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Tipo</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Fornitore</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Codice</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Data</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Imponibile</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">IVA Pagata</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Tot Fattura</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={i}
                    className={`border-b border-zinc-800 transition-colors ${
                      row.tipo === "a"
                        ? "bg-green-500/5 hover:bg-green-500/10"
                        : row.tipo === "b"
                        ? "bg-red-500/5 hover:bg-red-500/10"
                        : "bg-blue-500/5 hover:bg-blue-500/10"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        row.tipo === "a" ? "bg-green-500/20 text-green-400" :
                        row.tipo === "b" ? "bg-red-500/20 text-red-400" :
                        "bg-blue-500/20 text-blue-400"
                      }`}>
                        {row.tipo.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold italic text-white">{row.fornitore}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.codice}
                        onChange={(e) => handleFornitoriChange(i, "codice", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        value={row.data}
                        onChange={(e) => handleFornitoriChange(i, "data", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.imponibile}
                        onChange={(e) => handleFornitoriChange(i, "imponibile", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.ivaPagata}
                        onChange={(e) => handleFornitoriChange(i, "ivaPagata", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        value={row.totFattura}
                        onChange={(e) => handleFornitoriChange(i, "totFattura", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={row.note}
                        onChange={(e) => handleFornitoriChange(i, "note", e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FbaGestioneProdotti;