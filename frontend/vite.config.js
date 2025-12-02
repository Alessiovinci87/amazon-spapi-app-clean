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
  server: {
    port: 5174,  // ✅ Porta frontend
    proxy: {
      "/api": {
        target: "http://localhost:3005",  // ✅ Backend Express
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path,  // ✅ Mantiene intatto /api
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            console.log(`➡️ Proxying ${req.method} ${req.url}`);
          });
        },
      },
    },
  },
});
