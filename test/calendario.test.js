// contatti-fiera/test/calendario.test.js
// version: 0.1.0
import { test } from "node:test";
import assert from "node:assert/strict";
import { fieraDelGiorno } from "../lib/calendario.js";

const E = [
  { nome: "Expo Riccione", dal: "2026-10-07", al: "2026-10-09" },
  { nome: "Convegno Bologna", dal: "2026-10-08", al: "2026-10-08" },
];
test("la fiera del giorno", () => {
  assert.equal(fieraDelGiorno(E, "2026-10-07"), "Expo Riccione");
  assert.equal(fieraDelGiorno(E, "2026-10-08"), "Convegno Bologna"); // la piu' corta vince
  assert.equal(fieraDelGiorno(E, "2026-10-09"), "Expo Riccione");
  assert.equal(fieraDelGiorno(E, "2026-10-10"), "");
});
