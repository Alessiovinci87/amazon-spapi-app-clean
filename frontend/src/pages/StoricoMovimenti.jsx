import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const StoricoMovimenti = () => {
  const [movimenti, setMovimenti] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [filtroNome, setFiltroNome] = useState("");
  const [filtroFrom, setFiltroFrom] = useState("");
  const [filtroTo, setFiltroTo] = useState("");
  const [prodottoSelezionato, setProdottoSelezionato] = useState(null);
  const [prodottiDisponibili, setProdottiDisponibili] = useState([]);

  const navigate = useNavigate();



  useEffect(() => {
    const fetchMovimenti = async () => {
      try {
        const res = await fetch("/api/v2/storico");
        const data = await res.json();
        setMovimenti(data);
      } catch (err) {
        console.error("❌ Errore recupero storico globale:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMovimenti();
  }, []);

  useEffect(() => {
    // carica i movimenti
    fetch("/api/v2/storico")
      .then((res) => res.json())
      .then((data) => setMovimenti(data))
      .catch((err) => console.error("Errore caricamento storico:", err));

    // carica anche i prodotti disponibili
    fetch("/api/v2/inventario/nomi")
      .then((res) => res.json())
      .then((data) => setProdottiDisponibili(data))
      .catch((err) => console.error("Errore caricamento nomi prodotti:", err));
  }, []);



  const toggleExpand = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // 🔎 Applica i filtri (solo se selezionato un prodotto)
  // 🔎 Applica i filtri (se non selezionato un prodotto → mostra tutto)
  const movimentiFiltrati = movimenti.filter((m) => {
    // filtro per prodotto solo se selezionato
    if (prodottoSelezionato) {
      if (m.nome_prodotto !== prodottoSelezionato.nome) {
        return false;
      }
    }

    // filtro per date
    const dataMov = new Date(m.created_at);
    const fromOk = filtroFrom ? dataMov >= new Date(filtroFrom) : true;
    const toOk = filtroTo ? dataMov <= new Date(filtroTo) : true;

    return fromOk && toOk;
  });


  if (loading) return <p>Caricamento...</p>;

  return (
    <div className="p-4">
      {/* Titolo e pulsante */}
      <div className="relative mb-6">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-0 top-0 bg-zinc-600 hover:bg-zinc-700 px-4 py-2 rounded text-white"
        >
          ⬅️ Torna a Magazzino
        </button>
        <h2 className="text-2xl font-bold flex items-center justify-center gap-2 text-white">
          📦 Storico Globale
        </h2>
      </div>

      {/* 🔎 Filtri */}
      <div className="bg-zinc-700 p-4 rounded mb-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Ricerca con suggerimenti */}
        <div className="relative col-span-1">
          <label className="block text-sm mb-1">Filtro per nome prodotto</label>
          <div className="flex items-center relative">
            <input
              type="text"
              value={filtroNome}
              onChange={(e) => setFiltroNome(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtroNome.trim()) {
                  e.preventDefault();
                  const match = movimenti.find(
                    (m) =>
                      m.nome_prodotto &&
                      m.nome_prodotto.toLowerCase().includes(filtroNome.toLowerCase())
                  );
                  if (match) setProdottoSelezionato(match);
                }
              }}
              className="w-full p-2 rounded bg-zinc-800 text-white pr-8"
              placeholder="Es. Antimicotico"
            />
            {filtroNome && (
              <button
                type="button"
                onClick={() => {
                  setFiltroNome("");
                  setProdottoSelezionato(null);
                }}
                className="absolute right-2 text-zinc-400 hover:text-white"
              >
                ❌
              </button>
            )}
          </div>

          {filtroNome.length > 1 && (
            <ul className="absolute z-10 bg-zinc-700 w-full mt-1 rounded shadow max-h-40 overflow-y-auto">
              {prodottiDisponibili
                .filter((p) =>
                  p.nome.toLowerCase().includes(filtroNome.toLowerCase())
                )
                .map((p) => (
                  <li
                    key={p.asin}
                    className="p-2 cursor-pointer hover:bg-zinc-600 text-white"
                    onClick={() => {
                      setProdottoSelezionato(p);
                      setFiltroNome(p.nome);
                    }}
                  >
                    {p.nome}
                  </li>
                ))}
            </ul>
          )}

        </div>

        {/* Calendario Da data */}
        <div>
          <label className="block text-sm mb-1">Da data</label>
          <input
            type="date"
            value={filtroFrom}
            onChange={(e) => setFiltroFrom(e.target.value)}
            className="w-full p-2 rounded bg-zinc-800 text-white"
          />
        </div>

        {/* Calendario A data */}
        <div>
          <label className="block text-sm mb-1">A data</label>
          <input
            type="date"
            value={filtroTo}
            onChange={(e) => setFiltroTo(e.target.value)}
            className="w-full p-2 rounded bg-zinc-800 text-white"
          />
        </div>
      </div>

      {prodottoSelezionato && (
        <div className="flex items-center gap-4 mb-6 bg-zinc-700 p-4 rounded">
          <img
            src={`/images/${prodottoSelezionato.asin}.jpg`}
            alt={prodottoSelezionato.nome}
            className="w-20 h-20 object-cover rounded"
            onError={(e) => { e.target.src = "/images/placeholder.jpg"; }}
          />
          <h3 className="text-xl font-bold text-white">
            {prodottoSelezionato.nome}
          </h3>
        </div>
      )}


      {/* Lista movimenti */}

      <div className="space-y-4">
        {movimentiFiltrati.map((mov) => (
          <div
            key={mov.id}
            className="bg-zinc-800 p-4 rounded-lg shadow text-white cursor-pointer"
            onClick={() => toggleExpand(mov.id)}
          >
            <div className="flex justify-between items-center">
              <div>
                <p>
                  <strong>Tipo:</strong>{" "}
                  <span
                    className={`px-2 py-1 rounded text-black font-semibold ${mov.direzione === "RETTIFICA +"
                        ? "bg-green-400"
                        : mov.direzione === "RETTIFICA -"
                          ? "bg-orange-400"
                          : "bg-zinc-500"
                      }`}
                  >
                    {mov.direzione || mov.tipo}
                  </span>
                </p>
                <p>
                  <strong>Prodotto:</strong>{" "}
                  {mov.nome_prodotto || mov.asin_prodotto}
                </p>
                <p>
                  <strong>Data:</strong>{" "}
                  {new Date(mov.created_at).toLocaleString("it-IT")}
                </p>
              </div>
              <span className="text-yellow-400">
                {expanded[mov.id] ? "▲" : "▼"}
              </span>
            </div>

{/* Espansione DETTAGLI UNIFICATA */}
{expanded[mov.id] && (
  <div className="mt-2 text-sm text-zinc-200 border-t border-zinc-600 pt-2">
    <p>
      <strong>Delta:</strong> {mov.dettagli?.delta}
    </p>
    <p>
      <strong>Valore finale:</strong> {mov.dettagli?.finale}
    </p>
    <p>
      <strong>Nota:</strong> {mov.dettagli?.nota}
    </p>
    <p>
      <strong>Operatore:</strong> {mov.dettagli?.operatore}
    </p>

    {mov.accessori?.length > 0 && (
      <div className="mt-2">
        <p className="font-semibold">Accessori movimentati:</p>
        <ul className="list-disc list-inside">
          {mov.accessori.map((acc, idx) => (
            <li key={idx}>
              {acc.asin_accessorio} → {acc.qty > 0 ? `+${acc.qty}` : acc.qty}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
)}


            {/* Espansione RETTIFICA */}
            {mov.tipo === "RETTIFICA" && expanded[mov.id] && (
              <div className="mt-2 text-sm text-zinc-200 border-t border-zinc-600 pt-2">
                <p>
                  <strong>Delta:</strong> {mov.dettagli?.delta}
                </p>
                <p>
                  <strong>Valore finale:</strong> {mov.dettagli?.finale}
                </p>
                <p>
                  <strong>Nota:</strong> {mov.dettagli?.nota}
                </p>
                <p>
                  <strong>Operatore:</strong> {mov.dettagli?.operatore}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>


    </div>
  );
};

export default StoricoMovimenti;
