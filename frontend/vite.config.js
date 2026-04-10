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
    host: true,  // ✅ Ascolta su 0.0.0.0 (accessibile dalla LAN)
    hmr: {
      host: "192.168.1.5",  // ✅ HMR WebSocket raggiungibile dalla LAN
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
