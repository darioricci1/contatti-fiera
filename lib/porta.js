// contatti-fiera/lib/porta.js
// version: 0.3.0
//
// Chi entra. Con Google: il cookie firmato (lib/sessione.js) messo da
// /api/entra a chi e' fra gli amministratori (FIERA_AMMINISTRATORI) o nella
// tabella fiera.ammesso. Di riserva il codice della squadra (FIERA_CODICE),
// mandato dal telefono in `x-codice`, finche' l'accesso Google non e' pronto
// per tutti.

import { timingSafeEqual } from "node:crypto";
import { leggi, leggiCookie, NOME_COOKIE } from "./sessione.js";

function uguali(a, b) {
  const x = Buffer.from(String(a || "")), y = Buffer.from(String(b || ""));
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

export const codiceImpostato = (env = process.env) => !!(env.FIERA_CODICE || "").trim();

export const amministratori = (env = process.env) =>
  String(env.FIERA_AMMINISTRATORI || "").toLowerCase().split(/[\s,;]+/).filter(Boolean);

/** Indirizzi e domini ammessi dalle variabili: FIERA_AMMESSI e FIERA_DOMINI («almasicurezza.it»). */
export const ammessiFissi = (env = process.env) =>
  String(env.FIERA_AMMESSI || "").toLowerCase().split(/[\s,;]+/).filter(Boolean);
export const dominiAmmessi = (env = process.env) =>
  String(env.FIERA_DOMINI || "").toLowerCase().split(/[\s,;]+/).map((d) => d.replace(/^@/, "")).filter(Boolean);

/** Vero se l'indirizzo entra senza guardare la tabella fiera.ammesso. */
export function ammessoDaVariabili(email, env = process.env) {
  const e = String(email || "").toLowerCase();
  const dominio = e.split("@")[1] || "";
  return amministratori(env).includes(e) || ammessiFissi(env).includes(e) || dominiAmmessi(env).includes(dominio);
}

function codiceGiusto(req, env) {
  const atteso = (env.FIERA_CODICE || "").trim();
  if (!atteso) return false;
  return uguali(String(req.headers?.["x-codice"] || "").trim().toLowerCase(), atteso.toLowerCase());
}

/** { email, nome, admin, via } per chi e' entrato, altrimenti null. */
export async function chi(req, env = process.env) {
  const s = await leggi(leggiCookie(req.headers?.cookie, NOME_COOKIE), env.SESSIONE_SEGRETO);
  if (s && s.e) return { email: s.e, nome: s.n || s.e, admin: amministratori(env).includes(s.e), via: "google" };
  if (codiceGiusto(req, env)) return { email: "", nome: "", admin: false, via: "codice" };
  return null;
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
