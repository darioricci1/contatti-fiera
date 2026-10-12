// contatti-fiera/test/porta.test.js
// version: 0.2.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { chi, ammessoDaVariabili } from "../lib/porta.js";
import { firma, NOME_COOKIE } from "../lib/sessione.js";

const env = { SESSIONE_SEGRETO: "un-segreto-di-prova-lungo", FIERA_CODICE: "alma-1", FIERA_AMMINISTRATORI: "capo@x.it" };

test("cookie Google valido", async () => {
  const t = await firma({ e: "capo@x.it", n: "Capo" }, env.SESSIONE_SEGRETO);
  const io = await chi({ headers: { cookie: `${NOME_COOKIE}=${encodeURIComponent(t)}` } }, env);
  assert.deepEqual(io, { email: "capo@x.it", nome: "Capo", admin: true, via: "google" });
});

test("cookie falso, codice giusto, niente", async () => {
  assert.equal(await chi({ headers: { cookie: `${NOME_COOKIE}=v1.abc.def` } }, env), null);
  assert.equal((await chi({ headers: { "x-codice": "ALMA-1" } }, env)).via, "codice");
  assert.equal(await chi({ headers: {} }, env), null);
});

test("domini e indirizzi ammessi", () => {
  const e = { FIERA_AMMINISTRATORI: "dario.ricci1@gmail.com", FIERA_AMMESSI: "maralb75@gmail.com", FIERA_DOMINI: "almasicurezza.it" };
  assert.ok(ammessoDaVariabili("Mario.Rossi@AlmaSicurezza.it", e));
  assert.ok(ammessoDaVariabili("maralb75@gmail.com", e));
  assert.ok(ammessoDaVariabili("dario.ricci1@gmail.com", e));
  assert.ok(!ammessoDaVariabili("x@almasicurezza.it.truffa.com", e));
  assert.ok(!ammessoDaVariabili("altro@gmail.com", e));
});
