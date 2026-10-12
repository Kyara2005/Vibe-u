export const INTEREST_CATALOG = [
  { id: "tecnologia", label: "Tecnología", keywords: ["tecnolog", "program", "codigo", "software", "hackathon", "informatica", "sistemas", "comput", "inteligencia", "robot", "developer", "datos", "web", "app", "ciber"] },
  { id: "musica", label: "Música", keywords: ["musica", "banda", "concierto", "karaoke", "canto", "guitarra", "dj"] },
  { id: "deporte", label: "Deporte", keywords: ["deporte", "futbol", "basket", "basquet", "gym", "correr", "voley", "tenis", "natacion", "fitness"] },
  { id: "arte", label: "Arte y diseño", keywords: ["arte", "dibujo", "pintura", "foto", "diseno", "ilustra", "cine", "teatro"] },
  { id: "estudio", label: "Estudio", keywords: ["estudio", "tutoria", "examen", "academia", "matem", "fisica", "quimica"] },
  { id: "idiomas", label: "Idiomas", keywords: ["ingles", "idioma", "frances", "aleman", "portugues", "intercambio"] },
  { id: "emprendimiento", label: "Emprendimiento", keywords: ["emprend", "negocio", "startup", "marketing", "finanzas"] },
  { id: "voluntariado", label: "Voluntariado", keywords: ["volunt", "social", "ayuda", "ong"] },
  { id: "vida-social", label: "Vida social", keywords: ["fiesta", "party", "encuentro", "mixer", "networking", "amigos"] },
  { id: "gaming", label: "Gaming", keywords: ["game", "gamer", "esport", "videojuego", "minecraft", "fortnite"] },
  { id: "ciencia", label: "Ciencia", keywords: ["ciencia", "lab", "investig", "biolog", "ambiente", "ecologia"] },
  { id: "bienestar", label: "Bienestar", keywords: ["salud", "yoga", "mente", "bienestar", "meditacion", "nutricion"] },
];

const ALLOWED = new Set(INTEREST_CATALOG.map((item) => item.id));
const LABEL_BY_ID = Object.fromEntries(INTEREST_CATALOG.map((item) => [item.id, item.label]));

export const normalizeText = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

export const sanitizeInterests = (list) => {
  if (!Array.isArray(list)) return [];
  return [...new Set(list.map((item) => String(item || "").trim().toLowerCase()).filter((id) => ALLOWED.has(id)))];
};

export const inferTags = (...texts) => {
  const haystack = normalizeText(texts.filter(Boolean).join(" "));
  if (!haystack) return [];
  return INTEREST_CATALOG.filter((item) => item.keywords.some((keyword) => haystack.includes(keyword))).map((item) => item.id);
};

export const mergeTags = (explicit, ...texts) =>
  [...new Set([...sanitizeInterests(explicit), ...inferTags(...texts)])];

export const collectUserTags = (user = {}) =>
  mergeTags(user.intereses, user.carrera, user.descripcion);

export const labelsForTags = (tags = []) =>
  sanitizeInterests(tags).map((id) => LABEL_BY_ID[id]).filter(Boolean);

export const carreraToken = (carrera = "") => {
  const tokens = normalizeText(carrera)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 3 && !["ingenieria", "licenciatura", "universidad"].includes(token));
  return tokens[0] || "";
};
