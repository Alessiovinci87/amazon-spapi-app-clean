// backend_v2/modules/inventory/inventoryAmazonController.js
const express = require("express");
const { getAccessToken } = require("../auth/authService");
const { spApiGet } = require("../amazon/spApiClient"); // nuovo client firmato

const router = express.Router();

// ✅ marketplace EU attivi
const MARKETPLACES = [
  { paese: "Italy", marketplaceId: "APJ6JRA9NG5V4" },
  { paese: "France", marketplaceId: "A13V1IB3VIYZZH" },
  { paese: "Germany", marketplaceId: "A1PA6795UKMFR9" },
  { paese: "Spain", marketplaceId: "A1RKKUPIHCS9HS" },
  { paese: "UK", marketplaceId: "A1F83G8C2ARO7P" },
  { paese: "Netherlands", marketplaceId: "A1805IZSGTT6HS" },
  { paese: "Poland", marketplaceId: "A1C3SOZRARQ6R3" },
  { paese: "Belgium", marketplaceId: "AMEN7PMS3EDWL" }
];

router.get("/inventory/:asin", async (req, res) => {
  const { asin } = req.params;

  try {
    // 1. Ottieni access token
    const { access_token } = await getAccessToken();

    // 2. Chiamate parallele a tutti i marketplace
    const results = await Promise.all(
      MARKETPLACES.map(async (mp) => {
        try {
          const query = `marketplaceIds=${mp.marketplaceId}&granularityType=Marketplace&granularityId=${mp.marketplaceId}&details=true&asinFilter=${asin}`;

          const data = await spApiGet({
            path: "/fba/inventory/v1/summaries",
            query,
            accessToken: access_token,
            awsAccessKey: process.env.AWS_ACCESS_KEY_ID,
            awsSecretKey: process.env.AWS_SECRET_ACCESS_KEY
          });

          const summary = data?.payload?.inventorySummaries?.[0];

          return {
            paese: mp.paese,
            marketplaceId: mp.marketplaceId,
            stock: summary?.totalQuantity ?? 0,
            dettagli: {
              fulfillable: summary?.inventoryDetails?.fulfillableQuantity ?? 0,
              inboundReceiving: summary?.inventoryDetails?.inboundReceivingQuantity ?? 0,
              reserved: summary?.inventoryDetails?.reservedQuantity?.totalReservedQuantity ?? 0,
              unfulfillable: summary?.inventoryDetails?.unfulfillableQuantity?.totalUnfulfillableQuantity ?? 0
            }
          };
        } catch (err) {
          console.error(`Errore marketplace ${mp.paese}:`, err.response?.data || err.message);
          return { paese: mp.paese, marketplaceId: mp.marketplaceId, stock: "errore" };
        }
      })
    );

    res.json({ asin, marketplaces: results });
  } catch (err) {
    console.error("Errore API Inventory:", err);
    res.status(500).json({ error: "Errore interno" });
  }
});

module.exports = router;
