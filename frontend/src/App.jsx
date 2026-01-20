import { Routes, Route, Navigate } from "react-router-dom";

// ==================== 🧭 LAYOUT ==================== //
import Layout from "./components/Layout";

// ==================== 🏠 PAGINA INIZIALE ==================== //
import Home from "./pages/Home";
import DashboardAmazon from "./pages/DashboardAmazon";

// ==================== 🏗️ SEZIONE GESTIONALE ==================== //
import Magazzino from "./pages/Magazzino";
import Inventario from "./pages/Inventario";
import InventarioMagazzino from "./pages/InventarioMagazzino";
import GestioneSpedizioni from "./pages/GestioneSpedizioni";
import GestioneSpedizioniMagazzino from "./pages/GestioneSpedizioniMagazzino";

import GestioneProduzioneUfficio from "./pages/GestioneProduzioneUfficio";
import GestioneProduzioneMagazzino from "./pages/GestioneProduzioneMagazzino";

// ==================== 📦 MODULI DI PRODUZIONE ==================== //
import Sfuso from "./pages/Sfuso";
import StoricoProduzioniSfuso from "./pages/StoricoProduzioniSfuso";

// ==================== 🧾 DDT E SPEDIZIONI ==================== //
import DDTNuovo from "./pages/DDTNuovo";
import DDTIndex from "./pages/DDTIndex";
import DDTDettaglio from "./pages/DDTDettaglio";
import DDTStorico from "./pages/DDTStorico";
import StoricoSpedizioni from "./components/spedizioni/StoricoSpedizioni";
import DDTPrebolle from "./pages/DDTPrebolle";
import DDTScomposizione from "./pages/DDTScomposizione";

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
import StoricoScatolette from "./pages/StoricoScatolette";

function App() {
  return (
    <Routes>
      {/* ==================== HOME ==================== */}
      <Route path="/" element={<Home />} />
      <Route path="/dashboard" element={<DashboardAmazon />} />

      {/* ==================== AREA GESTIONALE ==================== */}
      <Route element={<Layout />}>

        {/* ==================== AREA MAGAZZINO ==================== */}
        <Route path="/magazzino" element={<Magazzino />} />
        <Route path="/magazzino/inventario" element={<InventarioMagazzino />} />
        <Route path="/magazzino/produzione" element={<GestioneProduzioneMagazzino />} />
        <Route path="/magazzino/sfuso" element={<Sfuso />} />
        <Route path="/magazzino/spedizioni" element={<GestioneSpedizioniMagazzino />} />
        <Route path="/magazzino/storici/movimenti" element={<StoricoMovimenti />} />
        <Route path="/magazzino/storici/sfuso" element={<StoricoProduzioniSfuso />} />
        <Route path="/magazzino/storici/scatolette" element={<StoricoScatolette />} />

        {/* ==================== AREA UFFICI ==================== */}
        <Route path="/uffici" element={<Inventario />} />
        <Route path="/uffici/inventario" element={<Inventario />} />
        <Route path="/uffici/produzione" element={<GestioneProduzioneUfficio />} />

        <Route path="/uffici/spedizioni" element={<GestioneSpedizioni />} />
        <Route path="/uffici/spedizioni/storico" element={<StoricoSpedizioni />} />

        <Route path="/uffici/ddt" element={<DDTIndex />} />
        <Route path="/uffici/ddt/nuovo" element={<DDTNuovo />} />
        <Route path="/uffici/ddt/storico" element={<DDTStorico />} />
        <Route path="/uffici/ddt/:idSpedizione" element={<DDTDettaglio />} />
        
        {/* DDT Uffici */}
        <Route path="/uffici/ddt" element={<DDTIndex />} />
        <Route path="/uffici/ddt/prebolle" element={<DDTPrebolle />} />
        <Route path="/uffici/ddt/scomponi/:idSpedizione" element={<DDTScomposizione />} />
        <Route path="/uffici/ddt/:idSpedizione" element={<DDTDettaglio />} />
        <Route path="/uffici/ddt/:idSpedizione/:ddtNumero" element={<DDTDettaglio />} />
        <Route path="/uffici/ddt/nuovo" element={<DDTNuovo />} />
        <Route path="/uffici/ddt/storico" element={<DDTStorico />} />

        <Route path="/uffici/fornitori" element={<Fornitori />} />
        <Route path="/uffici/ordini" element={<Ordini />} />

        <Route path="/uffici/listing" element={<Listing />} />
        <Route path="/uffici/listing/:asin" element={<DettaglioProdotto />} />
        <Route path="/uffici/listing/immagini/:asin/:paese" element={<PaginaImmagini />} />
        <Route path="/uffici/listing/aplus/:asin/:paese" element={<PaginaAPlus />} />

        <Route path="/uffici/bilancio" element={<GestioneBilancio />} />

        <Route path="/uffici/storici/movimenti" element={<StoricoMovimenti />} />
        <Route path="/uffici/storici/:asin" element={<StoricoProdotto />} />

        {/* ==================== ALTRE ROTTE ==================== */}
        <Route path="/accessori" element={<Accessori />} />
        <Route path="/accessori/storico" element={<StoricoAccessori />} />
        <Route path="/etichette" element={<Etichette />} />
        <Route path="/scatolette" element={<Scatolette />} />
        <Route path="/fba-gestione-prodotti" element={<FbaGestioneProdotti />} />
        <Route path="/europe" element={<EuropeMenu />} />
        <Route path="/marketplaces" element={<ListaMarketplace />} />
        <Route path="/recensioni" element={<Recensioni />} />

        {/* ==================== REDIRECT VECCHIE ROTTE ==================== */}

        <Route path="/magazzino/home" element={<Navigate to="/magazzino" replace />} />
        <Route path="/uffici/home" element={<Navigate to="/uffici" replace />} />

        <Route path="/inventario" element={<Navigate to="/uffici/inventario" replace />} />
        <Route path="/inventario-magazzino" element={<Navigate to="/magazzino/inventario" replace />} />

        <Route path="/gestione-produzione" element={<Navigate to="/uffici/produzione" replace />} />

        <Route path="/spedizioni" element={<Navigate to="/uffici/spedizioni" replace />} />
        <Route path="/spedizioni/storico" element={<Navigate to="/uffici/spedizioni/storico" replace />} />

        <Route path="/sfuso" element={<Navigate to="/magazzino/sfuso" replace />} />
        <Route path="/storico-sfuso" element={<Navigate to="/magazzino/storici/sfuso" replace />} />
        <Route path="/storicosfuso" element={<Navigate to="/magazzino/storici/sfuso" replace />} />
        <Route path="/storico-produzioni-sfuso" element={<Navigate to="/magazzino/storici/sfuso" replace />} />
        <Route path="/storico-sfuso-inventario" element={<Navigate to="/magazzino/storici/sfuso" replace />} />

        <Route path="/ddt" element={<Navigate to="/uffici/ddt" replace />} />
        <Route path="/ddt-nuovo" element={<Navigate to="/uffici/ddt/nuovo" replace />} />
        <Route path="/ddt-index" element={<Navigate to="/uffici/ddt" replace />} />
        <Route path="/ddt-storico" element={<Navigate to="/uffici/ddt/storico" replace />} />
        <Route path="/ddt/:idSpedizione" element={<Navigate to="/uffici/ddt/:idSpedizione" replace />} />
        <Route path="/uffici/ddt" element={<DDTIndex />} />
        <Route path="/uffici/ddt/prebolle" element={<DDTPrebolle />} />  // ← AGGIUNGI QUESTA
        <Route path="/uffici/ddt/nuovo" element={<DDTNuovo />} />

        <Route path="/fornitori" element={<Navigate to="/uffici/fornitori" replace />} />
        <Route path="/ordini" element={<Navigate to="/uffici/ordini" replace />} />
        <Route path="/bilancio" element={<Navigate to="/uffici/bilancio" replace />} />

        <Route path="/scatolette/storico" element={<Navigate to="/magazzino/storici/scatolette" replace />} />

        <Route path="/listing" element={<Navigate to="/uffici/listing" replace />} />
        <Route path="/listing/:asin" element={<Navigate to="/uffici/listing/:asin" replace />} />
        <Route path="/immagini/:asin/:paese" element={<Navigate to="/uffici/listing/immagini/:asin/:paese" replace />} />
        <Route path="/aplus/:asin/:paese" element={<Navigate to="/uffici/listing/aplus/:asin/:paese" replace />} />

        <Route path="/storico/:asin" element={<Navigate to="/uffici/storici/:asin" replace />} />
        <Route path="/storico" element={<Navigate to="/uffici/storici/movimenti" replace />} />

      </Route>
    </Routes>
  );
}

export default App;