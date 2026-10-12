// contatti-fiera/lib/db.js
// version: 0.1.0
//
// Il collegamento al database unico di Alma, come alma-alert/lib/db.js:
// l'integrazione Neon di Vercel scrive piu' nomi a seconda del prefisso.

import { Pool } from "@neondatabase/serverless";
import { readFile } from "node:fs/promises";

const NOMI = ["ALMA_DATABASE_URL", "DATABASE_URL", "ALMA_POSTGRES_URL", "POSTGRES_URL"];

export function stringaDiConnessione(env = process.env) {
  for (const nome of NOMI) {
    const v = env[nome];
    if (v && v.trim()) return v.trim();
  }
  return null;
}

export const configurato = () => !!stringaDiConnessione();

let pool = null;
function piscina() {
  if (pool) return pool;
  const url = stringaDiConnessione();
  if (!url) throw new Error("Database non configurato: manca ALMA_DATABASE_URL nelle variabili del progetto Vercel.");
  pool = new Pool({ connectionString: url });
  return pool;
}

export async function query(testo, valori = []) {
  return (await piscina().query(testo, valori)).rows;
}

export const versioneSchema = (testo) => (String(testo).match(/--\s*version:\s*([\d.]+)/) || [])[1] || "0";

let pronto = false;
/** Crea o aggiorna lo schema `fiera` quando la versione nel database e' diversa da quella del file. */
export async function preparaSchema() {
  if (pronto) return;
  const testo = await readFile(new URL("../schema.sql", import.meta.url), "utf8");
  const voluta = versioneSchema(testo);
  const [c] = await query("select valore from fiera.impostazione where chiave = 'schema'").catch(() => []);
  if (!c || c.valore !== voluta) {
    await query(testo);
    await query("insert into fiera.impostazione (chiave, valore) values ('schema', $1) on conflict (chiave) do update set valore = excluded.valore", [voluta]);
  }
  pronto = true;
}
