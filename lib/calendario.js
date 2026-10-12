// contatti-fiera/lib/calendario.js
// version: 0.1.0
//
// A quale fiera appartiene un contatto: quella del calendario che comprende il
// giorno del contatto. Se due fiere si sovrappongono vince la piu' corta (la
// piu' precisa).

export const SQL_FIERA_DEL_GIORNO = `
  select nome from fiera.evento
   where $1::date between dal and al
   order by (al - dal), dal desc limit 1`;

/**
 * Riattribuisce i contatti dopo un cambio di calendario: chi cade in una fiera
 * prende il suo nome; chi aveva il nome di una fiera tolta (`tolta`) e non cade
 * piu' in nessuna resta senza. Gli altri restano come sono (anche i nomi
 * scritti prima che ci fosse il calendario).
 */
export async function riattribuisci(db, tolta = "") {
  await db.query(`
    update fiera.contatto c set fiera = e.nome
      from (select distinct on (c2.id) c2.id, e2.nome
              from fiera.contatto c2 join fiera.evento e2 on c2.data_contatto between e2.dal and e2.al
             order by c2.id, (e2.al - e2.dal), e2.dal desc) e
     where c.id = e.id and c.cancellato_il is null and c.fiera is distinct from e.nome`);
  if (tolta) await db.query(`
    update fiera.contatto c set fiera = ''
     where c.fiera = $1 and not exists (select 1 from fiera.evento e where c.data_contatto between e.dal and e.al)`, [tolta]);
}

/** La stessa scelta in JavaScript, per la pagina e per le prove. */
export function fieraDelGiorno(eventi, giorno) {
  const l = eventi.filter((e) => e.dal <= giorno && giorno <= e.al);
  l.sort((a, b) => (Date.parse(a.al) - Date.parse(a.dal)) - (Date.parse(b.al) - Date.parse(b.dal)) || b.dal.localeCompare(a.dal));
  return l[0] ? l[0].nome : "";
}
