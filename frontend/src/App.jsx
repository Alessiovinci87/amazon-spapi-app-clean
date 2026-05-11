import { Routes, Route, Navigate } from "react-router-dom";

// ==================== 🧭 LAYOUT ==================== //
import Layout from "./components/Layout";

// ==================== 🏠 PAGINA INIZIALE ==================== //
import Home from "./pages/Home";
import DashboardAmazon from "./pages/DashboardAmazon";
import Panoramica from "./pages/Panoramica";

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

// ==================== 🏭 GESTIONE BILANCIO ==================== //
import GestioneBilancio from "./pages/GestioneBilancio";

// ==================== 🚀 LANCIO (COGS) ==================== //
import CostiUnitari from "./pages/CostiUnitari";

// ==================== 🧩 PRODOTTI E ACCESSORI ==================== //
import StoricoAccessori from "./pages/StoricoAccessori";
import Etichette from "./pages/Etichette";
import Scatolette from "./pages/Scatolette";
import FbaGestioneProdotti from "./pages/FbaGestioneProdotti";

// ==================== 🌍 MARKETPLACE / LISTING AMAZON ==================== //
import EuropeMenu from "./components/EuropeMenu";
import EuropaDashboard from "./pages/EuropaDashboard";
import EuropaAlertConfig from "./pages/EuropaAlertConfig";
import EuropaListingEditor from "./pages/EuropaListingEditor";
import EuropaListingItemEditor from "./pages/EuropaListingItemEditor";
import ListaMarketplace from "./pages/ListaMarketplace";
import Listing from "./pages/Listing";
import DettaglioProdotto from "./pages/DettaglioProdotto";
import PaginaImmagini from "./pages/PaginaImmagini";
import PaginaAPlus from "./pages/PaginaAPlus";
import PaginaListing from "./pages/PaginaListing";
import Recensioni from "./pages/Recensioni";
import GestioneOneStep from "./pages/GestioneOneStep";
import GestioneTopCoat from "./pages/GestioneTopCoat";
import GestioneModuloCustom from "./pages/GestioneModuloCustom";

// ==================== 📚 STORICI E TRACCIAMENTI ==================== //
import StoricoProdotto from "./components/inventario/StoricoProdotto";
import StoricoMovimenti from "./pages/StoricoMovimenti";
import StoricoScatolette from "./pages/StoricoScatolette";
import Settings from "./pages/Settings";
import CentroAlert from "./pages/CentroAlert";
import ResiFBA from "./pages/ResiFBA";
import DashboardVendite from "./pages/DashboardVendite";
import DashboardProfitability from "./pages/DashboardProfitability";
import CopertureFBA from "./pages/CopertureFBA";
import CentroSync from "./pages/CentroSync";
import CompetitorWatch from "./pages/CompetitorWatch";
import CompetitorStorico from "./pages/CompetitorStorico";
import PrezziAmazon from "./pages/PrezziAmazon";
import PrevisioneDomanda from "./pages/PrevisioneDomanda";
import PlMensile from "./pages/PlMensile";
import CommissioniAmazon from "./pages/CommissioniAmazon";
import Tracking17 from "./pages/Tracking17";

function App() {
  return (
    <Routes>
      {/* ==================== HOME (login, senza sidebar) ==================== */}
      <Route path="/" element={<Home />} />

      {/* ==================== AREA GESTIONALE (con sidebar) ==================== */}
      <Route element={<Layout />}>

        {/* ==================== DASHBOARD ==================== */}
        <Route path="/uffici/panoramica" element={<Panoramica />} />
        <Route path="/dashboard" element={<DashboardAmazon />} />

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
        <Route path="/uffici/tracking17" element={<Tracking17 />} />

        {/* DDT Uffici */}
        <Route path="/uffici/ddt" element={<DDTIndex />} />
        <Route path="/uffici/ddt/nuovo" element={<DDTNuovo />} />
        <Route path="/uffici/ddt/storico" element={<DDTStorico />} />
        <Route path="/uffici/ddt/prebolle" element={<DDTPrebolle />} />
        <Route path="/uffici/ddt/scomponi/:idSpedizione" element={<DDTScomposizione />} />
        <Route path="/uffici/ddt/:idSpedizione" element={<DDTDettaglio />} />
        <Route path="/uffici/ddt/:idSpedizione/:ddtNumero" element={<DDTDettaglio />} />

        <Route path="/uffici/fornitori" element={<Fornitori />} />
        {/* /uffici/ordini era una pagina duplicata (form legacy, POST a endpoint inesistente).
            La gestione ordini vera vive in /uffici/fornitori (tab Storico ordini). */}
        <Route path="/uffici/ordini" element={<Navigate to="/uffici/fornitori" replace />} />

        <Route path="/uffici/listing" element={<Listing />} />
        <Route path="/uffici/listing/:asin" element={<DettaglioProdotto />} />
        <Route path="/uffici/listing/immagini/:asin/:paese" element={<PaginaImmagini />} />
        <Route path="/uffici/listing/aplus/:asin/:paese" element={<PaginaAPlus />} />
        <Route path="/uffici/listing/testo/:asin/:paese" element={<PaginaListing />} />
        <Route path="/uffici/prezzi" element={<PrezziAmazon />} />
        <Route path="/uffici/previsione" element={<PrevisioneDomanda />} />
        <Route path="/uffici/pl-mensile" element={<PlMensile />} />
        <Route path="/uffici/commissioni" element={<CommissioniAmazon />} />

        <Route path="/uffici/one-step" element={<GestioneOneStep />} />
        <Route path="/uffici/top-coat" element={<GestioneTopCoat />} />
        <Route path="/uffici/modulo/:slug" element={<GestioneModuloCustom />} />
        <Route path="/uffici/bilancio" element={<GestioneBilancio />} />
        <Route path="/uffici/costi-unitari" element={<CostiUnitari />} />

        <Route path="/uffici/storici/movimenti" element={<StoricoMovimenti />} />
        <Route path="/uffici/storici/:asin" element={<StoricoProdotto />} />

        {/* ==================== ALTRE ROTTE ==================== */}
        {/* /accessori legacy -> confluito nell'inventario con deep link */}
        <Route path="/accessori" element={<Navigate to="/uffici/inventario?sezione=accessori" replace />} />
        <Route path="/accessori/storico" element={<StoricoAccessori />} />
        <Route path="/etichette" element={<Etichette />} />
        <Route path="/scatolette" element={<Scatolette />} />
        <Route path="/fba-gestione-prodotti" element={<FbaGestioneProdotti />} />
        <Route path="/europe" element={<EuropeMenu />} />
        <Route path="/europe/dashboard" element={<EuropaDashboard />} />
        <Route path="/europe/alert-config/:asin" element={<EuropaAlertConfig />} />
        <Route path="/europe/listing-editor" element={<EuropaListingEditor />} />
        <Route path="/europe/listing-editor/:country" element={<EuropaListingEditor />} />
        <Route path="/europe/listing-editor/:country/:sku" element={<EuropaListingItemEditor />} />
        <Route path="/marketplaces" element={<ListaMarketplace />} />
        <Route path="/recensioni" element={<Recensioni />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/uffici/alert-center" element={<CentroAlert />} />
        <Route path="/uffici/resi-fba" element={<ResiFBA />} />
        <Route path="/uffici/vendite" element={<DashboardVendite />} />
        <Route path="/uffici/profittabilita" element={<DashboardProfitability />} />
        <Route path="/uffici/copertura-fba" element={<CopertureFBA />} />
        <Route path="/uffici/sync" element={<CentroSync />} />
        <Route path="/uffici/competitor" element={<CompetitorWatch />} />
        <Route path="/uffici/competitor/storico" element={<CompetitorStorico />} />

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

        <Route path="/fornitori" element={<Navigate to="/uffici/fornitori" replace />} />
        <Route path="/ordini" element={<Navigate to="/uffici/fornitori" replace />} />
        <Route path="/bilancio" element={<Navigate to="/uffici/bilancio" replace />} />

        <Route path="/scatolette/storico" element={<Navigate to="/magazzino/storici/scatolette" replace />} />

        <Route path="/listing" element={<Navigate to="/uffici/listing" replace />} />
        <Route path="/listing/:asin" element={<Navigate to="/uffici/listing/:asin" replace />} />
        <Route path="/immagini/:asin/:paese" element={<Navigate to="/uffici/listing/immagini/:asin/:paese" replace />} />
        <Route path="/aplus/:asin/:paese" element={<Navigate to="/uffici/listing/aplus/:asin/:paese" replace />} />

        <Route path="/storico/:asin" element={<Navigate to="/uffici/storici/:asin" replace />} />
        <Route path="/storico" element={<Navigate to="/uffici/storici/movimenti" replace />} />

      </Route>

      {/* 404 catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;