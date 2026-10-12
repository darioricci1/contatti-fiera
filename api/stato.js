// contatti-fiera/api/stato.js
// version: 0.2.0
//
// Cosa c'e' acceso: il database, l'IA, il codice. Con il codice giusto
// risponde anche `entrato: true`, cosi' la pagina sa che puo' andare avanti.

import * as db from "../lib/db.js";
import { autorizzato, codiceImpostato, risposta } from "../lib/porta.js";

export default async function handler(req, res) {
  return risposta(res, 200, {
    versione: "0.2.0",
    database: db.configurato(),
    ia: !!(process.env.ANTHROPIC_API_KEY || "").trim(),
    codice: codiceImpostato(),
    entrato: autorizzato(req),
  });
}
