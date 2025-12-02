// utils/listingUtils.js

export const abbreviaNome = (nome) => {
  if (!nome) return "";
  const parole = nome.split(" ");
  return parole.slice(0, 4).join(" ") + (parole.length > 4 ? "..." : "");
};

export const renderStars = (valutazione = 0) => {
  const stelle = [];
  const piena = Math.floor(valutazione);
  const decimale = valutazione - piena;

  const fullStar = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#facc15" stroke="#eab308" strokeWidth="0.5" className="w-3 h-3">
      <path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z" />
    </svg>
  );

  const halfStar = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="w-3 h-3">
      <defs>
        <linearGradient id="half3d">
          <stop offset="50%" stopColor="#facc15" />
          <stop offset="50%" stopColor="#d1d5db" />
        </linearGradient>
      </defs>
      <path fill="url(#half3d)" stroke="#eab308" strokeWidth="0.5" d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z" />
    </svg>
  );

  const emptyStar = (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#d1d5db" stroke="#9ca3af" strokeWidth="0.5" className="w-3 h-3">
      <path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z" />
    </svg>
  );

  for (let i = 0; i < piena; i++) {
    stelle.push({ ...fullStar, key: `full-${i}` });
  }
  if (decimale >= 0.25 && decimale < 0.75) {
    stelle.push({ ...halfStar, key: "half" });
  } else if (decimale >= 0.75) {
    stelle.push({ ...fullStar, key: "roundup" });
  }
  while (stelle.length < 5) {
    stelle.push({ ...emptyStar, key: `empty-${stelle.length}` });
  }

  return stelle;
};
