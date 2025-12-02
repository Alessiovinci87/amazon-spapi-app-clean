// src/pages/DDTStorico.jsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const DDTStorico = () => {
    const [storico, setStorico] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        async function fetchData() {
            try {
                const res = await fetch("http://localhost:3005/api/v2/ddt/storico");
                if (!res.ok) throw new Error("Errore fetch storico DDT");
                const data = await res.json();
                setStorico(data);
            } catch (err) {
                console.error("Errore fetch storico DDT", err);
            }
        }
        fetchData();
    }, []);

    return (
        <div className="p-6 bg-gray-900 text-white min-h-screen relative">
            {/* Bottone Torna indietro */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-6 left-6 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg flex items-center gap-2"
            >
                ⬅ Torna indietro
            </button>

            {/* Aggiungo margin-top al titolo per lasciare aria */}
            <h1 className="text-xl font-bold mb-8 mt-20">📜 Storico DDT Generici</h1>


            <table className="w-full text-sm border border-gray-700">
                <thead>
                    <tr className="bg-gray-800">
                        <th className="p-2 border border-gray-700">ID</th>
                        <th className="p-2 border border-gray-700">Numero DDT</th>
                        <th className="p-2 border border-gray-700">Data</th>
                        <th className="p-2 border border-gray-700">Tot. Unità</th>
                        <th className="p-2 border border-gray-700">Tot. Colli</th>
                        <th className="p-2 border border-gray-700">PDF</th>
                    </tr>
                </thead>
                <tbody>
                    {storico.map((ddt) => (
                        <tr key={ddt.id} className="hover:bg-gray-800">
                            <td className="p-2 border border-gray-700">{ddt.id}</td>
                            <td className="p-2 border border-gray-700">{ddt.numeroDDT}</td>
                            <td className="p-2 border border-gray-700">{ddt.data}</td>
                            <td className="p-2 border border-gray-700">{ddt.totUnita}</td>
                            <td className="p-2 border border-gray-700">{ddt.totColli}</td>
                            <td className="p-2 border border-gray-700">
                                <a
                                    href={`http://localhost:3005/api/v2/ddt/storico/${ddt.id}/pdf`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-blue-400 hover:underline"
                                >
                                    📄 Apri PDF
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default DDTStorico;
