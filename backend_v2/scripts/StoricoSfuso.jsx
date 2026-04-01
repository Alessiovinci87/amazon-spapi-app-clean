// frontend/src/pages/StoricoSfuso.jsx
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function StoricoSfuso() {
  const navigate = useNavigate();

  useEffect(() => {
    // 🔄 Reindirizza automaticamente allo storico PRODUZIONI SFUSO corretto
    navigate("/storico-produzioni-sfuso", { replace: true });
  }, [navigate]);

  return null;
}
