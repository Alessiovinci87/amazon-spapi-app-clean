import React from "react";

import CatalogoCostiTable from "../components/bilancio/CatalogoCostiTable";
import RiepilogoValori from "../components/bilancio/RiepilogoValori";
import MovimentiTable from "../components/bilancio/MovimentiTable";

const GestioneBilancio = () => {
    return (

        <div className="min-h-screen bg-zinc-950 text-white p-8">


            <h1 className="text-4xl font-bold mb-6">Gestione Bilancio</h1>
            <p className="text-zinc-400 mb-10">
                Analisi completa del valore del magazzino, dei costi e dei movimenti economici.
            </p>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* ===================== DASHBOARD VALORE MAGAZZINO ===================== */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h2 className="text-2xl font-semibold mb-4">Dashboard Valore Magazzino</h2>
                    <p className="text-zinc-400 mb-4">
                        Qui verranno mostrati i valori di prodotti, sfuso e accessori.
                    </p>

                    <div className="space-y-3">
                        <RiepilogoValori />
                    </div>
                </div>

                {/* ========================== CATALOGO COSTI ========================== */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h2 className="text-2xl font-semibold mb-4">Catalogo Costi</h2>
                    <p className="text-zinc-400 mb-4">
                        Inserisci o modifica i costi unitari di prodotti, accessori e sfuso.
                    </p>

                    <div className="p-6 bg-zinc-800 rounded-lg border border-zinc-700">
                        <CatalogoCostiTable />
                    </div>
                </div>

                {/* ======================== MOVIMENTI ECONOMICI ======================== */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                    <h2 className="text-2xl font-semibold mb-4">Movimenti Economici</h2>
                    <p className="text-zinc-400 mb-4">
                        Registra spese, acquisti, rettifiche e costi operativi.
                    </p>

                    <div className="space-y-3">
                        <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                            <p className="font-semibold mb-3">Registro Movimenti</p>
                            <MovimentiTable />
                        </div>

                        <div className="p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                            <p className="font-semibold">Aggiungi Movimento</p>
                            <p className="text-zinc-400 text-sm">In arrivo…</p>
                        </div>
                    </div>
                </div>

            </div>

        </div>
    );
};

export default GestioneBilancio;
