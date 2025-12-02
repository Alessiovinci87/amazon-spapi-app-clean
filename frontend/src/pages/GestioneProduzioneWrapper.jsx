import React from "react";
import GestioneProduzioneUfficio from "./GestioneProduzioneUfficio";
import GestioneProduzioneMagazzino from "./GestioneProduzioneMagazzino";

export default function GestioneProduzioneWrapper() {
  const role = localStorage.getItem("role"); // letto AD OGNI RENDER

  if (role === "ufficio") return <GestioneProduzioneUfficio />;
  return <GestioneProduzioneMagazzino />;
}
