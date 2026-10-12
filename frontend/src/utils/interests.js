export const INTEREST_CATALOG = [
  { id: "tecnologia", label: "Tecnología" },
  { id: "musica", label: "Música" },
  { id: "deporte", label: "Deporte" },
  { id: "arte", label: "Arte y diseño" },
  { id: "estudio", label: "Estudio" },
  { id: "idiomas", label: "Idiomas" },
  { id: "emprendimiento", label: "Emprendimiento" },
  { id: "voluntariado", label: "Voluntariado" },
  { id: "vida-social", label: "Vida social" },
  { id: "gaming", label: "Gaming" },
  { id: "ciencia", label: "Ciencia" },
  { id: "bienestar", label: "Bienestar" },
];

const ALLOWED = new Set(INTEREST_CATALOG.map((item) => item.id));

export const sanitizeInterests = (list) => {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((item) => String(item || "").trim().toLowerCase()).filter((id) => ALLOWED.has(id)))];
};

export const toggleInterest = (list, id) => {
  const current = sanitizeInterests(list);
  return current.includes(id) ? current.filter((item) => item !== id) : [...current, id];
};
