// contatti-fiera/api/stato.js
// version: 0.8.0
//
// Cosa c'e' acceso (database, IA, Google) e chi e' entrato.

import * as db from "../lib/db.js";
import { clientDiAccesso } from "../lib/google-id.js";
import { chi, risposta } from "../lib/porta.js";

export default async function handler(req, res) {
  const io = await chi(req);
  return risposta(res, 200, {
    versione: "0.8.0",
    database: db.configurato(),
    ia: !!(process.env.ANTHROPIC_API_KEY || "").trim(),
    google: !!(clientDiAccesso() && process.env.SESSIONE_SEGRETO),
    clientId: clientDiAccesso(),
    entrato: !!io,
    utente: io,
  });
}
