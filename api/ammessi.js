// contatti-fiera/api/ammessi.js
// version: 0.3.0
//
// Chi puo' entrare con Google. Solo gli amministratori: GET l'elenco,
// POST {email} aggiunge, DELETE ?email= toglie.

import * as db from "../lib/db.js";
import { amministratori, ammessiFissi, chi, corpo, dominiAmmessi, risposta } from "../lib/porta.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
  const io = await chi(req);
  if (!io || !io.admin) return risposta(res, 403, { errore: "solo gli amministratori" });
  if (!db.configurato()) return risposta(res, 503, { errore: "database non collegato" });
  try {
    await db.preparaSchema();
    if (req.method === "POST") {
      const email = String((await corpo(req)).email || "").trim().toLowerCase();
      if (!EMAIL.test(email)) return risposta(res, 400, { errore: "indirizzo non valido" });
      await db.query("insert into fiera.ammesso (email, aggiunto_da) values ($1, $2) on conflict (email) do nothing", [email, io.email]);
    } else if (req.method === "DELETE") {
      const email = String(new URL(req.url, "http://x").searchParams.get("email") || "").trim().toLowerCase();
      await db.query("delete from fiera.ammesso where email = $1", [email]);
    } else if (req.method !== "GET") return risposta(res, 405, { errore: "metodo non previsto" });
    const righe = await db.query("select email, aggiunto_da, creato_il from fiera.ammesso order by email");
    return risposta(res, 200, { amministratori: amministratori(), fissi: ammessiFissi(), domini: dominiAmmessi(), ammessi: righe });
  } catch (e) {
    return risposta(res, 400, { errore: String(e.message || e) });
  }
}
