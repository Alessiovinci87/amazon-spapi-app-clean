// accessoriMapping.service.js

function getAccessoriPerFormato(formato) {
  const formatoNorm = formato.toString().trim().toLowerCase();

  const mapping = {
    "12ml": [
      { asin_accessorio: "BOCCETTA_12_ML" },
      { asin_accessorio: "TAPPO_12_ML" },
      { asin_accessorio: "PENNELLO_12_ML" }
    ],
    "10ml": [
      // per ora uguali ai 12ml, cambieremo appena inserirai accessori reali
      { asin_accessorio: "BOCCETTA_12_ML" },
      { asin_accessorio: "TAPPO_12_ML" },
      { asin_accessorio: "PENNELLO_12_ML" }
    ],
    "100ml": [
      { asin_accessorio: "BOCCETTA_100_ML" },
      { asin_accessorio: "TAPPO_100_ML" }
    ]
  };

  return mapping[formatoNorm] || [];
}

module.exports = { getAccessoriPerFormato };
