// contatti-fiera/api/entra.js
// version: 0.3.0
//
// L'ingresso con Google. POST {accessToken} dal nostro pulsante o
// {credential} da quello ufficiale: Google conferma chi e', qui si guarda se
// puo' entrare e si mette il cookie (una settimana). DELETE: esce.

import * as db from "../lib/db.js";
import { verificaAccessToken, verificaIdToken } from "../lib/google-id.js";
import { firma, cookieDaMettere, cookieDaTogliere } from "../lib/sessione.js";
import { amministratori, ammessoDaVariabili, corpo, risposta } from "../lib/porta.js";

const tentativi = new Map(); // ip -> [istanti], 30 ogni 10 minuti

export default async function handler(req, res) {
  if (req.method === "DELETE") {
    res.setHeader("Set-Cookie", cookieDaTogliere());
    return risposta(res, 200, { uscito: true });
  }
  if (req.method !== "POST") return risposta(res, 405, { errore: "solo POST" });
  const ip = String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "?";
  const ora = Date.now(), l = (tentativi.get(ip) || []).filter((t) => ora - t < 600000);
  if (l.length >= 30) return risposta(res, 429, { errore: "Troppi tentativi: riprova fra qualche minuto." });
  tentativi.set(ip, [...l, ora]);
  if (!process.env.SESSIONE_SEGRETO) return risposta(res, 503, { errore: "Accesso Google non configurato (SESSIONE_SEGRETO)." });
  try {
    const b = await corpo(req);
    const g = b.accessToken ? await verificaAccessToken(b.accessToken) : await verificaIdToken(b.credential);
    let ammesso = ammessoDaVariabili(g.email);
    if (!ammesso && db.configurato()) {
      await db.preparaSchema();
      ammesso = (await db.query("select 1 from fiera.ammesso where email = $1", [g.email])).length > 0;
    }
    if (!ammesso) return risposta(res, 403, { errore: `${g.email} non è ancora nella squadra: chiedi a Dario di aggiungerti.` });
    res.setHeader("Set-Cookie", cookieDaMettere(await firma({ e: g.email, n: g.nome }, process.env.SESSIONE_SEGRETO)));
    return risposta(res, 200, { email: g.email, nome: g.nome, admin: amministratori().includes(g.email) });
  } catch (e) {
    return risposta(res, 401, { errore: "Accesso non riuscito: " + (e.message || e) });
  }
}
