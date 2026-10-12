// contatti-fiera/api/contatti.js
// version: 0.3.0
//
// I contatti della squadra. GET: tutti (piu' recenti prima). POST: uno o piu'
// contatti, salvati per id (rimandarli non duplica: e' la coda del telefono
// che si svuota quando torna la rete). DELETE ?id=: lo nasconde.

import * as db from "../lib/db.js";
import { chi, corpo, risposta } from "../lib/porta.js";
import { SQL_FIERA_DEL_GIORNO } from "../lib/calendario.js";

const COLONNE = ["data_contatto", "nome", "cognome", "ruolo", "comune", "provincia", "email", "telefono",
  "interesse", "note", "fiera", "registrato_da", "trascrizione"];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

const testo = (v, max = 300) => String(v ?? "").trim().slice(0, max);

export function riga(c) {
  if (!UUID.test(String(c?.id || ""))) throw new Error("id mancante o non valido");
  return {
    id: c.id,
    data_contatto: DATA.test(String(c.data || c.data_contatto || "")) ? (c.data || c.data_contatto) : new Date().toISOString().slice(0, 10),
    nome: testo(c.nome), cognome: testo(c.cognome), ruolo: testo(c.ruolo), comune: testo(c.comune),
    provincia: testo(c.provincia, 4), email: testo(c.email), telefono: testo(c.telefono, 60),
    interesse: testo(c.interesse, 500), note: testo(c.note, 2000), fiera: testo(c.fiera),
    registrato_da: testo(c.registrato_da), trascrizione: testo(c.trascrizione, 5000),
  };
}

export default async function handler(req, res) {
  const io = await chi(req);
  if (!io) return risposta(res, 401, { errore: "non sei entrato" });
  if (!db.configurato()) return risposta(res, 503, { errore: "database non collegato" });
  try {
    await db.preparaSchema();
    if (req.method === "GET") {
      const righe = await db.query(
        `select id, to_char(data_contatto, 'YYYY-MM-DD') as data, ${COLONNE.slice(1).join(", ")},
                creato_il, aggiornato_il
           from fiera.contatto where cancellato_il is null
          order by data_contatto desc, creato_il desc`);
      return risposta(res, 200, { contatti: righe });
    }
    if (req.method === "POST") {
      const b = await corpo(req);
      const lista = (Array.isArray(b.contatti) ? b.contatti : [b]).slice(0, 200).map(riga);
      for (const c of lista) {
        // Chi registra lo dice l'accesso Google (il nome, o l'email se Google non da' il nome).
        if (!c.registrato_da) c.registrato_da = io.nome || io.email;
        // La fiera la decide il calendario, dal giorno del contatto.
        const [f] = await db.query(SQL_FIERA_DEL_GIORNO, [c.data_contatto]);
        if (f) c.fiera = f.nome; else if (!c.fiera) c.fiera = "";
      }
      for (const c of lista) {
        const valori = [c.id, ...COLONNE.map((k) => c[k])];
        await db.query(
          `insert into fiera.contatto (id, ${COLONNE.join(", ")})
           values (${valori.map((_, i) => "$" + (i + 1)).join(", ")})
           on conflict (id) do update set ${COLONNE.map((k) => `${k} = excluded.${k}`).join(", ")},
             aggiornato_il = now(), cancellato_il = null`, valori);
      }
      return risposta(res, 200, { salvati: lista.map((c) => c.id) });
    }
    if (req.method === "DELETE") {
      const id = new URL(req.url, "http://x").searchParams.get("id");
      if (!UUID.test(String(id || ""))) return risposta(res, 400, { errore: "id non valido" });
      await db.query("update fiera.contatto set cancellato_il = now() where id = $1", [id]);
      return risposta(res, 200, { cancellato: id });
    }
    return risposta(res, 405, { errore: "metodo non previsto" });
  } catch (e) {
    return risposta(res, 400, { errore: String(e.message || e) });
  }
}
