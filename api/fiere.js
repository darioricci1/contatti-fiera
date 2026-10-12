// contatti-fiera/api/fiere.js
// version: 0.1.0
//
// Il calendario delle fiere. GET: tutte (chiunque sia entrato). POST
// {nome, luogo, dal, al} e DELETE ?id=: solo gli amministratori; dopo ogni
// cambio i contatti vengono riattribuiti alla fiera del loro giorno.

import * as db from "../lib/db.js";
import { chi, corpo, risposta } from "../lib/porta.js";
import { riattribuisci } from "../lib/calendario.js";

const DATA = /^\d{4}-\d{2}-\d{2}$/;

async function elenco() {
  return db.query(`select id, nome, luogo, to_char(dal, 'YYYY-MM-DD') as dal, to_char(al, 'YYYY-MM-DD') as al
                     from fiera.evento order by dal desc`);
}

export default async function handler(req, res) {
  const io = await chi(req);
  if (!io) return risposta(res, 401, { errore: "non sei entrato" });
  if (!db.configurato()) return risposta(res, 503, { errore: "database non collegato" });
  try {
    await db.preparaSchema();
    if (req.method === "GET") return risposta(res, 200, { fiere: await elenco() });
    if (!io.admin) return risposta(res, 403, { errore: "il calendario lo cambia solo l'amministratore" });
    if (req.method === "POST") {
      const b = await corpo(req);
      const nome = String(b.nome || "").trim().slice(0, 120), luogo = String(b.luogo || "").trim().slice(0, 120);
      const dal = String(b.dal || ""), al = String(b.al || b.dal || "");
      if (!nome || !DATA.test(dal) || !DATA.test(al) || al < dal) return risposta(res, 400, { errore: "servono nome e date valide (dal ≤ al)" });
      if (b.id) await db.query("update fiera.evento set nome=$2, luogo=$3, dal=$4, al=$5 where id=$1", [Number(b.id), nome, luogo, dal, al]);
      else await db.query("insert into fiera.evento (nome, luogo, dal, al, creato_da) values ($1,$2,$3,$4,$5)", [nome, luogo, dal, al, io.email]);
    } else if (req.method === "DELETE") {
      const [via] = await db.query("delete from fiera.evento where id = $1 returning nome", [Number(new URL(req.url, "http://x").searchParams.get("id"))]);
      await riattribuisci(db, via ? via.nome : "");
      return risposta(res, 200, { fiere: await elenco() });
    } else return risposta(res, 405, { errore: "metodo non previsto" });
    await riattribuisci(db);
    return risposta(res, 200, { fiere: await elenco() });
  } catch (e) {
    return risposta(res, 400, { errore: String(e.message || e) });
  }
}
