// contatti-fiera/lib/porta.js
// version: 0.1.0
//
// Chi entra: chi conosce il codice della squadra (FIERA_CODICE nelle
// variabili del progetto Vercel). Il telefono lo manda in `x-codice`.

import { timingSafeEqual } from "node:crypto";

function uguali(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

export const codiceImpostato = (env = process.env) => !!(env.FIERA_CODICE || "").trim();

export function autorizzato(req, env = process.env) {
  const atteso = (env.FIERA_CODICE || "").trim();
  if (!atteso) return false;
  return uguali(String(req.headers?.["x-codice"] || "").trim().toLowerCase(), atteso.toLowerCase());
}

export function risposta(res, stato, corpo) {
  res.statusCode = stato;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(corpo));
}

/** Il corpo JSON della richiesta, anche se Vercel non l'ha gia' letto. */
export async function corpo(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") return JSON.parse(req.body || "{}");
  let t = "";
  for await (const pezzo of req) t += pezzo;
  return t ? JSON.parse(t) : {};
}
