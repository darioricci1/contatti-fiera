// contatti-fiera/api/estrai.js
// version: 0.1.0
//
// L'IA che compila i campi: dal testo dettato, o dalla foto di un biglietto da
// visita o di un badge. Si accende solo se nel progetto Vercel c'e'
// ANTHROPIC_API_KEY; senza, la pagina usa il riconoscitore del telefono
// (public/estrai.js), che fa lo stesso lavoro con regole fisse.

import { autorizzato, corpo, risposta } from "../lib/porta.js";

const MODELLO = process.env.FIERA_MODELLO || "claude-haiku-5-5";

const CAMPI = {
  nome: "Nome di battesimo, con le maiuscole giuste.",
  cognome: "Cognome, con particelle e apostrofi (De Vitis, D'Ascanio).",
  ruolo: "Ruolo breve con la prima maiuscola: Comandante, Vice comandante, Agente, Ispettore, Sindaco, Assessore...",
  comune: "Nome ufficiale del comune italiano dell'ente, con accenti (Forlì, Santa Margherita Ligure). Vuoto se non detto.",
  provincia: "Sigla della provincia del comune (FC, GE). Vuota se non la sai.",
  email: "Email in minuscolo, ricostruita dal parlato («chiocciola» = @, «punto» = .).",
  telefono: "Numero di telefono senza +39; cellulari nel formato 333 313 2729.",
  interesse: "Il prodotto o il tema che interessa, breve. Prodotti Alma: Multi Video Trappola, Easy, videosorveglianza cittadina, lettura targhe, fototrappole.",
  note: "Altro di utile detto (richieste, tempi, chi richiamare). Vuoto se niente.",
};

const STRUMENTO = {
  name: "compila_contatto",
  description: "Compila la scheda del contatto conosciuto in fiera.",
  input_schema: {
    type: "object",
    properties: Object.fromEntries(Object.entries(CAMPI).map(([k, d]) => [k, { type: "string", description: d }])),
    required: Object.keys(CAMPI),
  },
};

const ISTRUZIONI = `Sei allo stand di Alma Sicurezza in una fiera per polizie locali e comuni.
Un commerciale ti detta (o ti fotografa) il contatto appena conosciuto. Compila la scheda con lo strumento compila_contatto.
Regole: non inventare; un campo non detto resta stringa vuota. Correggi gli errori tipici del riconoscimento vocale
(nomi di comuni storpiati, email dette a voce, numeri spezzati). Se c'e' una scheda gia' compilata dal telefono,
usala come punto di partenza e correggila.`;

export default async function handler(req, res) {
  if (!autorizzato(req)) return risposta(res, 401, { errore: "codice della squadra mancante o sbagliato" });
  const chiave = (process.env.ANTHROPIC_API_KEY || "").trim();
  if (!chiave) return risposta(res, 501, { errore: "IA non attiva: manca ANTHROPIC_API_KEY" });
  if (req.method !== "POST") return risposta(res, 405, { errore: "solo POST" });
  try {
    const b = await corpo(req);
    const testo = String(b.testo || "").slice(0, 6000);
    const contenuto = [];
    if (b.immagine && /^data:image\/(jpeg|png|webp);base64,/.test(b.immagine)) {
      const [testa, dati] = b.immagine.split(",");
      contenuto.push({ type: "image", source: { type: "base64", media_type: testa.slice(5, testa.indexOf(";")), data: dati } });
    }
    if (!testo && !contenuto.length) return risposta(res, 400, { errore: "niente da leggere" });
    contenuto.push({ type: "text", text:
      (testo ? `Testo dettato:\n${testo}\n\n` : "Leggi il biglietto o il badge nella foto.\n\n") +
      (b.bozza ? `Scheda gia' compilata dal telefono:\n${JSON.stringify(b.bozza)}` : "") });

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": chiave, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: MODELLO, max_tokens: 800, system: ISTRUZIONI,
        tools: [STRUMENTO], tool_choice: { type: "tool", name: STRUMENTO.name },
        messages: [{ role: "user", content: contenuto }],
      }),
    });
    const j = await r.json();
    if (!r.ok) return risposta(res, 502, { errore: j?.error?.message || `IA: errore ${r.status}` });
    const uso = (j.content || []).find((c) => c.type === "tool_use");
    if (!uso) return risposta(res, 502, { errore: "l'IA non ha compilato la scheda" });
    const campi = Object.fromEntries(Object.keys(CAMPI).map((k) => [k, String(uso.input?.[k] ?? "").trim()]));
    return risposta(res, 200, { campi, modello: j.model });
  } catch (e) {
    return risposta(res, 500, { errore: String(e.message || e) });
  }
}
