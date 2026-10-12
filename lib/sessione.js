// attrezzi/accesso-google/sessione.js  (nel progetto: lib/sessione.js)
// VERSION: 1.2.0 (da bbs-squadre; il nome del cookie ora si sceglie per progetto)
// LA SESSIONE: un biglietto firmato, non una chiave conservata da qualche parte.
//
// Chi entra riceve un cookie che dice chi è e fino a quando vale, con in coda
// una firma fatta con un segreto che sta solo sul server. A ogni richiesta si
// ricontrolla la firma: se qualcuno cambia anche una lettera — l'indirizzo, la
// scadenza — la firma non torna e il biglietto vale zero.
//
// PERCHÉ NON UN ELENCO DI SESSIONI IN DATABASE. Perché costerebbe una lettura a
// ogni richiesta, su ogni pagina e ogni chiamata, per sapere una cosa che il
// biglietto stesso può dire. Il prezzo di questa scelta è che una sessione non
// si può revocare prima della scadenza: per questo dura poco (una settimana) e
// per questo il blocco di una persona si controlla dove conta — all'ingresso e
// sulle chiamate che scrivono.
//
// Le funzioni di crittografia sono quelle standard del web (WebCrypto), le
// stesse in Node e sull'Edge di Vercel: questo file gira uguale nei due posti,
// e il controllo all'ingresso del sito può stare nel middleware.

const PREFISSO = "v1";
// un nome per progetto, cosi' due siti sullo stesso dominio non si pestano
export const NOME_COOKIE = (typeof process !== "undefined" && process.env && process.env.NOME_COOKIE) || "sessione";
export const DURATA_MS = 7 * 24 * 60 * 60 * 1000;   // una settimana

function aBase64Url(byte) {
  let s = "";
  for (const b of byte) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function daBase64Url(testo) {
  const t = String(testo).replace(/-/g, "+").replace(/_/g, "/");
  const s = atob(t + "===".slice((t.length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

async function chiave(segreto) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(String(segreto)),
    { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

/** Il biglietto firmato per questa persona. `dati` è quello che ci si scrive dentro. */
export async function firma(dati, segreto, opzioni = {}) {
  if (!segreto) throw new Error("Manca il segreto delle sessioni");
  const adesso = opzioni.adesso || Date.now();
  const corpo = { ...dati, s: adesso + (opzioni.durataMs || DURATA_MS) };
  const testo = aBase64Url(new TextEncoder().encode(JSON.stringify(corpo)));
  const sig = await crypto.subtle.sign("HMAC", await chiave(segreto), new TextEncoder().encode(testo));
  return `${PREFISSO}.${testo}.${aBase64Url(new Uint8Array(sig))}`;
}

/**
 * Chi è, se il biglietto è valido. `null` in tutti gli altri casi — scritto
 * male, firma che non torna, scaduto — e chi chiama non deve distinguerli:
 * dire «la firma è sbagliata» invece di «no» è un'informazione regalata.
 */
export async function leggi(token, segreto, opzioni = {}) {
  if (!token || !segreto) return null;
  const pezzi = String(token).split(".");
  if (pezzi.length !== 3 || pezzi[0] !== PREFISSO) return null;
  let ok;
  try {
    ok = await crypto.subtle.verify("HMAC", await chiave(segreto),
      daBase64Url(pezzi[2]), new TextEncoder().encode(pezzi[1]));
  } catch { return null; }
  if (!ok) return null;
  let corpo;
  try { corpo = JSON.parse(new TextDecoder().decode(daBase64Url(pezzi[1]))); } catch { return null; }
  if (!corpo || typeof corpo !== "object") return null;
  const adesso = opzioni.adesso || Date.now();
  if (!Number.isFinite(corpo.s) || corpo.s <= adesso) return null;
  return corpo;
}

/** Il valore di un cookie dentro l'intestazione «Cookie:» di una richiesta. */
export function leggiCookie(intestazione, nome) {
  const cerca = String(nome) + "=";
  for (const pezzo of String(intestazione || "").split(";")) {
    const t = pezzo.trim();
    if (t.startsWith(cerca)) {
      try { return decodeURIComponent(t.slice(cerca.length)); } catch { return t.slice(cerca.length); }
    }
  }
  return null;
}

/**
 * L'intestazione «Set-Cookie» che mette il biglietto.
 * HttpOnly: il javascript della pagina non lo può leggere, quindi uno script
 * finito dentro per sbaglio non se lo porta via. SameSite=Lax: non viene
 * mandato dietro a una richiesta partita da un altro sito.
 */
export function cookieDaMettere(token, opzioni = {}) {
  const durata = Math.round((opzioni.durataMs || DURATA_MS) / 1000);
  const sicuro = opzioni.sicuro === false ? "" : " Secure;";
  return `${NOME_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${durata};` +
    ` HttpOnly;${sicuro} SameSite=Lax`;
}

/** L'intestazione che lo toglie: stesso nome, scadenza nel passato. */
export function cookieDaTogliere(opzioni = {}) {
  const sicuro = opzioni.sicuro === false ? "" : " Secure;";
  return `${NOME_COOKIE}=; Path=/; Max-Age=0; HttpOnly;${sicuro} SameSite=Lax`;
}
