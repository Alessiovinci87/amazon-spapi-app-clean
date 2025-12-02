// src/pages/Accessori.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AccessorioCard from "../components/inventario/AccessorioCard";
import { 
  ArrowLeft, 
  FileText, 
  Wrench, 
  Filter,
  Package,
  Droplet,
  Box
} from "lucide-react";

const Accessori = () => {
  const [accessori, setAccessori] = useState([]);
  const [filtro, setFiltro] = useState("tutti"); // 👈 tutti di default
  const navigate = useNavigate();

  const fetchAccessori = async () => {
    try {
      const res = await fetch("/api/v2/accessori");
      if (!res.ok) throw new Error("Errore nel caricamento accessori");
      const data = await res.json();

      // 🔗 aggiungo percorso immagini
      const accessoriConImmagine = data.map((a) => {
        let imgPath = null;

        if (a.nome.toLowerCase().includes("boccetta 12")) {
          imgPath = "/images/accessori/boccetta12ml.png";
        } else if (a.nome.toLowerCase().includes("boccetta 100")) {
          imgPath = "/images/accessori/boccetta100ml.png";
        } else if (a.nome.toLowerCase().includes("pennell")) {
          imgPath = "/images/accessori/pennellino12ml.png";
        } else if (a.nome.toLowerCase().includes("scatol")) {
          imgPath = "/images/accessori/scatoletta12ml.png";
        } else if (
          a.nome.toLowerCase().includes("tappo 12") ||
          a.nome.toLowerCase().includes("tappino 12")
        ) {
          imgPath = "/images/accessori/tappino12ml.png";
        } else if (
          a.nome.toLowerCase().includes("tappo 100") ||
          a.nome.toLowerCase().includes("tappino 100")
        ) {
          imgPath = "/images/accessori/tappino100ml.png";
        }

        return { ...a, immagine: imgPath };
      });

      setAccessori(accessoriConImmagine);
    } catch (err) {
      console.error("❌ Errore fetch accessori:", err);
    }
  };

  useEffect(() => {
    fetchAccessori();
  }, []);

  const accessori12 = accessori.filter((a) =>
    a.nome.toLowerCase().includes("12")
  );
  const accessori100 = accessori.filter((a) =>
    a.nome.toLowerCase().includes("100")
  );

  const renderGrid = (lista) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {lista.map((a) => (
        <AccessorioCard
          key={a.asin_accessorio}
          asin_accessorio={a.asin_accessorio}
          nome={a.nome}
          quantita={a.quantita}
          immagine={a.immagine}
          fetchAccessori={fetchAccessori}
          layout="small"
        />
      ))}
    </div>
  );

  const getContatore = () => {
    switch (filtro) {
      case "12ml":
        return accessori12.length;
      case "100ml":
        return accessori100.length;
      case "tutti":
        return accessori.length;
      default:
        return 0;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-8xl mx-auto space-y-6">
        
        {/* ========== HEADER ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center shadow-lg">
                <Wrench className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-white">Gestione Accessori</h1>
                <p className="text-zinc-400 mt-1">Boccette, tappini, pennellini e scatolette</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => navigate("/accessori/storico")}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              >
                <FileText className="w-4 h-4" />
                Storico
              </button>
              <button
                onClick={() => navigate("/magazzino")}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-all hover:scale-[1.02]"
              >
                <ArrowLeft className="w-4 h-4" />
                Magazzino
              </button>
            </div>
          </div>
        </div>

        {/* ========== FILTRI ========== */}
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-orange-400" />
            Filtra per Formato
          </h2>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFiltro("12ml")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                filtro === "12ml"
                  ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg scale-105"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
              }`}
            >
              <Droplet className="w-4 h-4" />
              Accessori 12ml
              {filtro === "12ml" && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {accessori12.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setFiltro("100ml")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                filtro === "100ml"
                  ? "bg-gradient-to-r from-blue-500 to-cyan-600 text-white shadow-lg scale-105"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
              }`}
            >
              <Package className="w-4 h-4" />
              Accessori 100ml
              {filtro === "100ml" && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {accessori100.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setFiltro("tutti")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold transition-all ${
                filtro === "tutti"
                  ? "bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg scale-105"
                  : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
              }`}
            >
              <Box className="w-4 h-4" />
              Tutti gli Accessori
              {filtro === "tutti" && (
                <span className="ml-1 px-2 py-0.5 bg-white/20 rounded-full text-xs">
                  {accessori.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* ========== CONTATORE E TITOLO SEZIONE ========== */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 rounded-xl border border-orange-500/30 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-4xl">
                {filtro === "12ml" ? "💧" : filtro === "100ml" ? "🧴" : "🔧"}
              </span>
              <div>
                <h2 className="text-2xl font-bold text-white">
                  {filtro === "12ml" && "Accessori 12ml"}
                  {filtro === "100ml" && "Accessori 100ml"}
                  {filtro === "tutti" && "Tutti gli Accessori"}
                </h2>
                <p className="text-orange-100 text-sm mt-1">
                  {getContatore()} accessor{getContatore() === 1 ? "io" : "i"} disponibil{getContatore() === 1 ? "e" : "i"}
                </p>
              </div>
            </div>

            {/* Badge filtro attivo */}
            <div className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-lg border border-white/30">
              <p className="text-white text-sm font-medium uppercase">
                {filtro === "tutti" ? "Vista Completa" : `Solo ${filtro}`}
              </p>
            </div>
          </div>
        </div>

        {/* ========== LISTA ACCESSORI ========== */}
        {filtro === "12ml" && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h3 className="text-xl font-semibold text-emerald-400 mb-4 flex items-center gap-2">
              <Droplet className="w-5 h-5" />
              Accessori per prodotti 12ml
            </h3>
            {accessori12.length > 0 ? (
              renderGrid(accessori12)
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <p className="text-lg">Nessun accessorio 12ml trovato</p>
              </div>
            )}
          </div>
        )}

        {filtro === "100ml" && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h3 className="text-xl font-semibold text-blue-400 mb-4 flex items-center gap-2">
              <Package className="w-5 h-5" />
              Accessori per prodotti 100ml
            </h3>
            {accessori100.length > 0 ? (
              renderGrid(accessori100)
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <p className="text-lg">Nessun accessorio 100ml trovato</p>
              </div>
            )}
          </div>
        )}

        {filtro === "tutti" && (
          <>
            {/* Sezione 12ml */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-emerald-400 flex items-center gap-2">
                  <Droplet className="w-5 h-5" />
                  Accessori per prodotti 12ml
                </h3>
                <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 rounded-full text-emerald-400 text-sm font-medium">
                  {accessori12.length} accessori
                </span>
              </div>
              {accessori12.length > 0 ? (
                renderGrid(accessori12)
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <p className="text-lg">Nessun accessorio 12ml trovato</p>
                </div>
              )}
            </div>

            {/* Sezione 100ml */}
            <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-blue-400 flex items-center gap-2">
                  <Package className="w-5 h-5" />
                  Accessori per prodotti 100ml
                </h3>
                <span className="px-3 py-1 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-400 text-sm font-medium">
                  {accessori100.length} accessori
                </span>
              </div>
              {accessori100.length > 0 ? (
                renderGrid(accessori100)
              ) : (
                <div className="text-center py-12 text-zinc-500">
                  <p className="text-lg">Nessun accessorio 100ml trovato</p>
                </div>
              )}
            </div>
          </>
        )}

        {/* ========== EMPTY STATE (se non ci sono accessori) ========== */}
        {accessori.length === 0 && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-12 text-center">
            <div className="w-20 h-20 rounded-2xl bg-zinc-800 flex items-center justify-center mx-auto mb-4">
              <Wrench className="w-10 h-10 text-zinc-600" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              Nessun accessorio disponibile
            </h3>
            <p className="text-zinc-400 text-sm">
              Gli accessori appariranno qui una volta caricati dal database
            </p>
          </div>
        )}

        {/* ========== STATISTICHE RAPIDE ========== */}
        {accessori.length > 0 && (
          <div className="bg-zinc-900 rounded-xl border border-zinc-800 p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              📊 Statistiche Rapide
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-emerald-500/10 to-green-600/10 border border-emerald-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Droplet className="w-8 h-8 text-emerald-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Accessori 12ml</p>
                    <p className="text-2xl font-bold text-emerald-400">{accessori12.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-500/10 to-cyan-600/10 border border-blue-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Package className="w-8 h-8 text-blue-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Accessori 100ml</p>
                    <p className="text-2xl font-bold text-blue-400">{accessori100.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-orange-500/10 to-red-600/10 border border-orange-500/30 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <Box className="w-8 h-8 text-orange-400" />
                  <div>
                    <p className="text-sm text-zinc-400">Totale Accessori</p>
                    <p className="text-2xl font-bold text-orange-400">{accessori.length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Accessori;