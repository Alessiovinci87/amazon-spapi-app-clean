// backend_v2/routes/centriLogistici.js
const express = require("express");
const router = express.Router();

/**
 * 📦 Lista centri logistici Amazon Europa
 * Ogni centro ha: id, codice, paese, indirizzo
 */
const centriLogistici = [
  // 🇨🇿 Repubblica Ceca
  { id: 1, codice: "PRG1", paese: "CZ", indirizzo: "Amazon Logistic Prague sro, U Trati 216, 25261 Dobrovíz" },
  { id: 2, codice: "PRG2", paese: "CZ", indirizzo: "K Amazonu 245, 25261 Dobrovíz" },

  // 🇫🇷 Francia
  { id: 3, codice: "XFR", paese: "FR", indirizzo: "91-135 Rue du Brisson, 38290 Satolas-et-Bonce, Alvernia-Rodano-Alpi" },
  { id: 4, codice: "LYS1", paese: "FR", indirizzo: "Distripôle Chalon, ZAC du Parc d'Activité du Val de Bourgogne, 71100 Sevrey, Borgogna" },
  { id: 5, codice: "XFRG", paese: "FR", indirizzo: "ZAC Moulin, 101 Le Chemin de Poupry, 45410 Artenay, Centro-Valle della Loira" },
  { id: 6, codice: "MRS1", paese: "FR", indirizzo: "Rue Joseph Garde, ZAC, Les Portes de Provence, 26200 Montélimar, Drôme" },
  { id: 7, codice: "BVA1", paese: "FR", indirizzo: "7 Rue des Indes Noirs, 80440 Boves, Somme, Alta Francia" },
  { id: 8, codice: "XFR", paese: "FR", indirizzo: "Avenue Louis Renault, ZAC du Val Bréon, 77610 Châtres, Île-de-France" },
  { id: 9, codice: "XFRH", paese: "FR", indirizzo: "900 Rue Denis Papin, 77550 Moissy-Cramayel, Île-de-France" },
  { id: 10, codice: "ORI1", paese: "FR", indirizzo: "Pôle 45, 1401 Rue du Champ Rouge, 45770 Saran, Loiret" },
  { id: 11, codice: "LIL1", paese: "FR", indirizzo: "Parco logistico di Lauwin-Planque, Rue Amazon Douai, 59553 Lauwin-Planque" },

  // 🇩🇪 Germania (estratti principali)
  { id: 12, codice: "FRA1", paese: "DE", indirizzo: "Am Schloß Eichhof 1, 36251 Bad Hersfeld" },
  { id: 13, codice: "FRA3", paese: "DE", indirizzo: "Amazonstraße 1 / Obere Kühnbach, 36251 Bad Hersfeld" },
  { id: 14, codice: "DTM2", paese: "DE", indirizzo: "Kaltband Straße 4, 44145 Dortmund" },
  { id: 15, codice: "MUC3", paese: "DE", indirizzo: "Amazonstrasse 1 Zeppelinstrasse 2, 86836 Graben" },
  { id: 16, codice: "LEJ1", paese: "DE", indirizzo: "Amazonstrasse 1, 04347 Lipsia" },
  { id: 17, codice: "STR1", paese: "DE", indirizzo: "Amazonstraße 1, 75177 Pforzheim" },
  { id: 18, codice: "DU2", paese: "DE", indirizzo: "Amazonstraße 1 / Alte Landstrasse, 47495 Rheinberg" },
  { id: 19, codice: "EDE4", paese: "DE", indirizzo: "Wahrbrink 25, 59368 Werne" },
  { id: 20, codice: "EDE5", paese: "DE", indirizzo: "Wahrbrink 23, 59368 Werne" },

  // 🇮🇹 Italia
  { id: 21, codice: "XITD", paese: "IT", indirizzo: "Viale Maestri del Lavoro 990, 45031 Arquà Polesine" },
  { id: 22, codice: "MXP5", paese: "IT", indirizzo: "Strada Dogana Po 2U, 29015 Castel San Giovanni" },
  { id: 23, codice: "FCO1", paese: "IT", indirizzo: "Via della Meccanica, 4, 02032 Passo Corese" },
  { id: 24, codice: "TRN1", paese: "IT", indirizzo: "Strada Provinciale per Rondissone 90, 10037 Torrazza Piemonte" },
  { id: 25, codice: "MXP3", paese: "IT", indirizzo: "Via Rita Levi Montalcini, 2, 13100 Vercelli" },
  { id: 26, codice: "BGY1", paese: "IT", indirizzo: "SP98, 24050 Cividate al Piano BG" },
  { id: 27, codice: "LIN8", paese: "IT", indirizzo: "Via Gioacchino Rossini, 24040 Casirate d'Adda BG" },
  { id: 28, codice: "BLQ1", paese: "IT", indirizzo: "45020 Castelguglielmo, Provincia di Rovigo" },
  { id: 29, codice: "MXP6", paese: "IT", indirizzo: "Via Luigi Einaudi, 28100 Novara NO" },

  // 🇪🇸 Spagna
  { id: 30, codice: "BCN1", paese: "ES", indirizzo: "Avinguda De les Garrigues 6-8, 08820 El Prat de Llobregat, Barcellona" },
  { id: 31, codice: "BCN3", paese: "ES", indirizzo: "Carrer Ferro, 12, 08755 Castellbisbal, Barcellona" },
  { id: 32, codice: "MAD4", paese: "ES", indirizzo: "Avenida De Astronomía, 24, 28830 San Fernando De Henares, Madrid" },
  { id: 33, codice: "MAD5", paese: "ES", indirizzo: "Polígono Industrial Los Gavilanes, C. Severo Ochoa, 28, 28906 Getafe, Madrid" },
  { id: 34, codice: "SVQ1", paese: "ES", indirizzo: "Poligono Sen, 23, 41703 Dos Hermanas, Siviglia" },
  { id: 35, codice: "VLC1", paese: "ES", indirizzo: "Calle Panamá, 31, 12220 Onda, Castellón" },

  // 🇵🇱 Polonia (estratti)
  { id: 36, codice: "KTW3", paese: "PL", indirizzo: "ul. Bojkowska 80, 44-141 Gliwice" },
  { id: 37, codice: "KTW1", paese: "PL", indirizzo: "Inwestycyjna 19, 41-208 Sosnowiec" },
  { id: 38, codice: "LCJ2", paese: "PL", indirizzo: "95-200 Pawlikowice" },
  { id: 39, codice: "WRO1", paese: "PL", indirizzo: "Czekoladowa 1, 55-040 Bielany Wrocławskie" },

  // 🇳🇱 Olanda
  { id: 40, codice: "AMS1", paese: "NL", indirizzo: "Zevenheuvelenweg 14, 5048 AN Tilburg" },
  { id: 41, codice: "RTM1", paese: "NL", indirizzo: "Veerweg 1, 5145 NS Waalwijk" },

  // 🇧🇪 Belgio
  { id: 42, codice: "BRU2", paese: "BE", indirizzo: "Boulevard de l'Europe 100, 1300 Wavre" },
  { id: 43, codice: "LGG1", paese: "BE", indirizzo: "Rue Louis Blériot 5, 4460 Grâce-Hollogne" },

  // 🇸🇪 Svezia
  { id: 44, codice: "ARN1", paese: "SE", indirizzo: "Sörredsvägen 7, 418 78 Göteborg" },
  { id: 45, codice: "ARN8", paese: "SE", indirizzo: "Eskilstunavägen 5, 645 94 Strängnäs" },

  // 🇮🇪 Irlanda
  { id: 46, codice: "SNN4", paese: "IE", indirizzo: "Unità E, Baldonnell Business Park, Baldonnell, D22 V5R3, Dublino" },

  // 🇸🇰 Slovacchia
  { id: 47, codice: "BTS2", paese: "SK", indirizzo: "Amazonska 4753/1, 926 01 Sereď" },

  // 🇫🇮 Finlandia
  { id: 48, codice: "HEL1", paese: "FI", indirizzo: "Manttaalitie 5, 01530 Vantaa" },

  // 🇳🇴 Norvegia
  { id: 49, codice: "OSL1", paese: "NO", indirizzo: "Strømsveien 344, 1081 Oslo" },

  // 🇩🇰 Danimarca
  { id: 50, codice: "CPH1", paese: "DK", indirizzo: "Regnemarksvej 10, 2625 Vallensbæk" },
];

// GET lista centri
router.get("/", (req, res) => {
  res.json(centriLogistici);
});

module.exports = router;
