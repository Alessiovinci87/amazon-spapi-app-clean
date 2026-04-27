import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),  // ✅ Alias @ → /src
    },
  },
  build: {
    // Soglia warning a 800KB (oltre i 500KB di default che generavano warning con il nostro bundle)
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        // Splitta le dipendenze pesanti in chunk separati per migliorare il caching
        // (cambiano raramente) e ridurre il First Load del bundle principale.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-router")) return "vendor-router";
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) return "vendor-react";
          if (id.includes("@chakra-ui") || id.includes("@emotion")) return "vendor-chakra";
          if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
          if (id.includes("framer-motion")) return "vendor-motion";
          if (id.includes("i18next") || id.includes("react-i18next")) return "vendor-i18n";
          if (id.includes("react-select") || id.includes("react-datepicker")) return "vendor-forms";
          if (id.includes("@radix-ui")) return "vendor-radix";
          if (id.includes("lucide-react")) return "vendor-icons";
          if (id.includes("axios")) return "vendor-axios";
          return "vendor";
        },
      },
    },
  },
  server: {
    port: 5174,  // ✅ Porta frontend
    host: true,  // ✅ Ascolta su 0.0.0.0 (accessibile dalla LAN)
    hmr: {
      host: "localhost",
    },
    proxy: {
      "/api": {
        target: "http://localhost:3005",  // ✅ Backend Express
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,
      },
    },
  },
});
