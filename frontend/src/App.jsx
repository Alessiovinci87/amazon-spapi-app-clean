import { Routes, Route } from "react-router-dom";

// ==================== 🧭 LAYOUT ==================== //
import Layout from "./components/Layout";

// ==================== 🏠 PAGINA INIZIALE ==================== //
import Home from "./pages/Home";

// ==================== 🏗️ SEZIONE GESTIONALE ==================== //
import Magazzino from "./pages/Magazzino";
import Inventario from "./pages/Inventario";
import InventarioMagazzino from "./pages/InventarioMagazzino";
import GestioneProduzione from "./pages/GestioneProduzione";
import GestioneSpedizioni from "./pages/GestioneSpedizioni";

import GestioneProduzioneUfficio from "./pages/GestioneProduzioneUfficio";
import GestioneProduzioneMagazzino from "./pages/GestioneProduzioneMagazzino";

import GestioneProduzioneWrapper from "./pages/GestioneProduzioneWrapper";


// ==================== 📦 MODULI DI PRODUZIONE ==================== //
import Sfuso from "./pages/Sfuso";
import StoricoSfuso from "./pages/archivio_old/StoricoSfuso";
import StoricoProduzioniSfuso from "./pages/StoricoProduzioniSfuso";
import StoricoSfusoInventario from "./pages/StoricoSfusoInventario";

// ==================== 🧾 DDT E SPEDIZIONI ==================== //
import DDT from "./components/ddt/DDT";
import DDTNuovo from "./pages/DDTNuovo";
import DDTIndex from "./pages/DDTIndex";
import DDTDettaglio from "./pages/DDTDettaglio";
import DDTStorico from "./pages/DDTStorico";
import StoricoSpedizioni from "./components/spedizioni/StoricoSpedizioni";

// ==================== 🏭 FORNITORI E ORDINI ==================== //
import Fornitori from "./pages/Fornitori";
import Ordini from "./pages/Ordini";

// ==================== 🏭 GESTIONE BILANCIO ==================== //
import GestioneBilancio from "./pages/GestioneBilancio";


// ==================== 🧩 PRODOTTI E ACCESSORI ==================== //
import Accessori from "./pages/Accessori";
import StoricoAccessori from "./pages/StoricoAccessori";
import Etichette from "./pages/Etichette";
import Scatolette from "./pages/Scatolette";
import FbaGestioneProdotti from "./pages/FbaGestioneProdotti";

// ==================== 🌍 MARKETPLACE / LISTING AMAZON ==================== //
import EuropeMenu from "./components/EuropeMenu";
import ListaMarketplace from "./pages/ListaMarketplace";
import Listing from "./pages/Listing";
import DettaglioProdotto from "./pages/DettaglioProdotto";
import PaginaImmagini from "./pages/PaginaImmagini";
import PaginaAPlus from "./pages/PaginaAPlus";
import Recensioni from "./pages/Recensioni";

// ==================== 📚 STORICI E TRACCIAMENTI ==================== //
import StoricoProdotto from "./components/inventario/StoricoProdotto";
import StoricoMovimenti from "./pages/StoricoMovimenti";

// ============================================================ //

function App() {
  return (
    <Routes>
      {/* ==================== HOME (senza layout) ==================== */}
      <Route path="/" element={<Home />} />

      {/* ==================== AREA GESTIONALE (con sidebar) ==================== */}
      <Route element={<Layout />}>

        {/* === SEZIONI PRINCIPALI === */}
        <Route path="/magazzino" element={<Magazzino />} />
        <Route path="/inventario" element={<Inventario />} />
        <Route path="/inventario-magazzino" element={<InventarioMagazzino />} />
        <Route path="/gestione-produzione" element={<GestioneProduzioneWrapper />} />
        

        <Route path="/spedizioni" element={<GestioneSpedizioni />} />

        {/* === SFUSO E PRODUZIONI === */}
        <Route path="/sfuso" element={<Sfuso />} />
        <Route path="/storico-sfuso" element={<StoricoProduzioniSfuso />} />
        <Route path="/storicosfuso" element={<StoricoProduzioniSfuso />} /> {/* alias vecchio */}
        <Route path="/storico-produzioni-sfuso" element={<StoricoProduzioniSfuso />} />
        <Route path="/storico-sfuso-inventario" element={<StoricoSfusoInventario />} />

        {/* === DDT / SPEDIZIONI === */}
        <Route path="/ddt" element={<DDT />} />
        <Route path="/ddt-nuovo" element={<DDTNuovo />} />
        <Route path="/ddt-index" element={<DDTIndex />} />
        <Route path="/ddt-storico" element={<DDTStorico />} />
        <Route path="/ddt/:idSpedizione" element={<DDTDettaglio />} />
        <Route path="/spedizioni/storico" element={<StoricoSpedizioni />} />

        {/* === FORNITORI / ORDINI === */}
        <Route path="/fornitori" element={<Fornitori />} />
        <Route path="/ordini" element={<Ordini />} />

        {/* === GESTIONE / BILANCIO === */}
        <Route path="/bilancio" element={<GestioneBilancio />} />

        {/* === PRODOTTI / ACCESSORI === */}
        <Route path="/accessori" element={<Accessori />} />
        <Route path="/accessori/storico" element={<StoricoAccessori />} />
        <Route path="/etichette" element={<Etichette />} />
        <Route path="/scatolette" element={<Scatolette />} />
        <Route path="/fba-gestione-prodotti" element={<FbaGestioneProdotti />} />

        {/* === MARKETPLACE / LISTING === */}
        <Route path="/europe" element={<EuropeMenu />} />
        <Route path="/marketplaces" element={<ListaMarketplace />} />
        <Route path="/listing" element={<Listing />} />
        <Route path="/listing/:asin" element={<DettaglioProdotto />} />
        <Route path="/immagini/:asin/:paese" element={<PaginaImmagini />} />
        <Route path="/aplus/:asin/:paese" element={<PaginaAPlus />} />
        <Route path="/recensioni" element={<Recensioni />} />

        {/* === STORICI GENERALI === */}
        <Route path="/storico/:asin" element={<StoricoProdotto />} />
        <Route path="/storico" element={<StoricoMovimenti />} />



      </Route>
    </Routes>
  );
}

export default App;
