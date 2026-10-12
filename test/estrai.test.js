// contatti-fiera/test/estrai.test.js
// version: 0.1.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { estrai, caricaComuni, emailDaVoce, telefonoDaVoce } from "../public/estrai.js";

caricaComuni(JSON.parse(readFileSync(new URL("../public/comuni.json", import.meta.url), "utf8")));
const D = { data: "2026-10-12" };

test("con le parole guida", () => {
  const r = estrai("Nome Carlo cognome De Vitis, ruolo vice comandante, comune Fara San Martino, email carlo punto devitis chiocciola fsm punto it, telefono 333 313 2729, interessato alla multi video trappola", D);
  assert.deepEqual([r.nome, r.cognome, r.ruolo, r.comune, r.provincia, r.email, r.telefono, r.interesse],
    ["Carlo", "De Vitis", "Vice comandante", "Fara San Martino", "CH", "carlo.devitis@fsm.it", "333 313 2729", "Multi Video Trappola"]);
});

test("parlato libero", () => {
  const r = estrai("Ho parlato con Laura Adami, comandante della polizia locale di Santa Margherita Ligure. La mail è adami chiocciola comunesml punto it, cellulare 3357423729. È interessata a Easy", D);
  assert.equal(r.nome, "Laura"); assert.equal(r.cognome, "Adami");
  assert.equal(r.ruolo, "Comandante"); assert.equal(r.comune, "Santa Margherita Ligure");
  assert.equal(r.email, "adami@comunesml.it"); assert.equal(r.telefono, "335 742 3729");
  assert.equal(r.interesse, "Easy");
});

test("apostrofi, email gia' scritta, interesse libero", () => {
  const r = estrai("Filippo D'Ascanio agente di Bologna filippo.dascanio@comune.bologna.it telefono 334 742 4724 interessato alla videosorveglianza cittadina", D);
  assert.equal(r.nome, "Filippo"); assert.equal(r.cognome, "D'Ascanio");
  assert.equal(r.ruolo, "Agente"); assert.equal(r.comune, "Bologna");
  assert.equal(r.email, "filippo.dascanio@comune.bologna.it");
  assert.equal(r.telefono, "334 742 4724");
  assert.equal(r.interesse, "Videosorveglianza cittadina");
});

test("comune con 'di' e numeri a parole", () => {
  const r = estrai("Mario Rossi, ispettore del comune di Forlì, numero tre tre tre uno due tre quattro cinque sei sette", D);
  assert.equal(r.comune, "Forlì"); assert.equal(r.provincia, "FC");
  assert.equal(r.ruolo, "Ispettore"); assert.equal(r.telefono, "333 123 4567");
  assert.equal(r.nome, "Mario"); assert.equal(r.cognome, "Rossi");
});

test("pezzi", () => {
  assert.equal(emailDaVoce("mario trattino rossi chiocciola gmail punto com"), "mario-rossi@gmail.com");
  assert.equal(telefonoDaVoce("+39 340 1234567"), "340 123 4567");
  assert.equal(estrai("", D).data, "2026-10-12");
});
