// attrezzi/accesso-google/google-id.js  (nel progetto: lib/google-id.js)
// VERSION: 1.1.1 (da bbs-squadre, che l'aveva ripreso da mappakit)
// CHI DICE DI ESSERE, E CHI LO GARANTISCE.
//
// Il pulsante «Accedi con Google» non ci manda una password: ci manda un
// biglietto firmato DA GOOGLE che dice «questa persona è dario@…, l'indirizzo
// è verificato, il biglietto vale fino alle 14:32». Il nostro lavoro è
// controllare la firma, e controllarla davvero.
//
// I TRE CONTROLLI CHE CONTANO, e perché saltarne uno è un buco:
//  - la FIRMA, contro le chiavi pubbliche di Google. Senza, chiunque si scrive
//    un biglietto a nome di chiunque.
//  - il DESTINATARIO (`aud`): il biglietto dev'essere stato fatto per la NOSTRA
//    applicazione. Senza, un biglietto vero preso da un'altra app che usa
//    Google entrerebbe qui dentro.
//  - la SCADENZA. Senza, un biglietto vecchio vale per sempre.
// E poi `iss`, che dice che a firmare è stato Google e non qualcun altro.
//
// Le chiavi pubbliche si tengono in memoria per il tempo che Google stesso
// dice: sono le stesse per tutti e cambiano di rado, e richiederle a ogni
// accesso vorrebbe dire aspettare una chiamata di rete per entrare.

const CHIAVI = "https://www.googleapis.com/oauth2/v3/certs";
const EMITTENTI = ["https://accounts.google.com", "accounts.google.com"];

let cache = { chiavi: null, fino: 0 };

/**
 * IL CLIENT DELL'ACCESSO PUO' ESSERE UN ALTRO.
 *
 * `GOOGLE_CLIENT_ID` fa coppia con `GOOGLE_REFRESH_TOKEN`: e' il permesso con
 * cui l'applicazione legge i fogli, e cambiarlo vorrebbe dire rifare il
 * consenso e restare senza dati nel frattempo. Ma per il pulsante «Accedi con
 * Google» serve un client su cui si possa registrare l'origine del sito, e
 * quel client puo' stare in un progetto Google che non si controlla.
 *
 * Quindi: se c'e' `GOOGLE_CLIENT_ID_ACCESSO`, l'accesso usa quello e i fogli
 * restano dove sono. Se non c'e', si usa quello di sempre e non cambia niente.
 */
export function clientDiAccesso() {
  return String(process.env.GOOGLE_CLIENT_ID_ACCESSO || process.env.GOOGLE_CLIENT_ID || "").trim();
}

function b64url(testo) {
  const t = String(testo).replace(/-/g, "+").replace(/_/g, "/");
  const s = atob(t + "===".slice((t.length + 3) % 4));
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
  return out;
}

/** Le tre parti di un JWT, già decodificate. `null` se non è un JWT. */
export function pezziDelToken(token) {
  const p = String(token || "").split(".");
  if (p.length !== 3) return null;
  try {
    return {
      testata: JSON.parse(new TextDecoder().decode(b64url(p[0]))),
      corpo: JSON.parse(new TextDecoder().decode(b64url(p[1]))),
      firmato: p[0] + "." + p[1],
      firma: b64url(p[2]),
    };
  } catch { return null; }
}

/** Quanto tenere in memoria le chiavi, letto dall'intestazione della risposta. */
export function secondiDiCache(cacheControl) {
  const m = /max-age=(\d+)/i.exec(String(cacheControl || ""));
  const n = m ? Number(m[1]) : 0;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 24 * 3600) : 3600;
}

async function chiaviDiGoogle(opzioni = {}) {
  const adesso = opzioni.adesso || Date.now();
  if (cache.chiavi && cache.fino > adesso && !opzioni.senzaCache) return cache.chiavi;
  const doFetch = opzioni.fetchImpl || fetch;
  const r = await doFetch(CHIAVI);
  if (!r.ok) throw new Error("Non riesco a leggere le chiavi pubbliche di Google");
  const dati = await r.json();
  if (!dati || !Array.isArray(dati.keys)) throw new Error("Le chiavi di Google sono arrivate storte");
  cache = { chiavi: dati.keys, fino: adesso + secondiDiCache(r.headers && r.headers.get && r.headers.get("cache-control")) * 1000 };
  return dati.keys;
}

/**
 * Chi è, se il biglietto di Google è buono. Solleva se non lo è: qui un errore
 * non è un caso da gestire in silenzio, è un tentativo di entrare.
 *
 * Torna { email, nome, foto, sub, dominio }.
 */
export async function verificaIdToken(token, opzioni = {}) {
  const clientId = opzioni.clientId || clientDiAccesso();
  if (!clientId) throw new Error("Manca GOOGLE_CLIENT_ID");
  const pezzi = pezziDelToken(token);
  if (!pezzi) throw new Error("Il biglietto di Google non è nel formato giusto");
  if (pezzi.testata.alg !== "RS256") throw new Error("Firma di un tipo che non accettiamo");

  const chiavi = await chiaviDiGoogle(opzioni);
  const jwk = chiavi.find((k) => k.kid === pezzi.testata.kid) || null;
  if (!jwk) throw new Error("La chiave con cui è firmato non è fra quelle di Google");

  const chiave = await crypto.subtle.importKey("jwk", jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const ok = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", chiave, pezzi.firma,
    new TextEncoder().encode(pezzi.firmato));
  if (!ok) throw new Error("La firma non torna");

  const c = pezzi.corpo;
  const adesso = Math.floor((opzioni.adesso || Date.now()) / 1000);
  const tolleranza = 60;   // gli orologi non sono mai perfettamente uguali
  if (!EMITTENTI.includes(String(c.iss))) throw new Error("Non l'ha firmato Google");
  if (String(c.aud) !== String(clientId)) throw new Error("Questo biglietto è per un'altra applicazione");
  if (!Number.isFinite(c.exp) || c.exp + tolleranza < adesso) throw new Error("Biglietto scaduto");
  if (Number.isFinite(c.iat) && c.iat - tolleranza > adesso) throw new Error("Biglietto datato nel futuro");
  if (!c.email) throw new Error("Il biglietto non dice l'indirizzo");
  if (c.email_verified === false) throw new Error("Indirizzo non verificato da Google");

  return {
    email: String(c.email).trim().toLowerCase(),
    nome: String(c.name || c.given_name || "").trim(),
    foto: String(c.picture || ""),
    sub: String(c.sub || ""),
    dominio: String(c.hd || "").toLowerCase(),
  };
}

// Solo per le prove: rimette le chiavi come non lette.
export function scordaLeChiavi() { cache = { chiavi: null, fino: 0 }; }

/**
 * L'ALTRO BIGLIETTO: QUELLO DEL PULSANTE FATTO A MANO.
 *
 * Il pulsante ufficiale di Google non si puo' ridisegnare. Per avere il nostro
 * («Entra con Google», come nel Gestionale ALMA) la pagina chiede a Google un
 * biglietto d'accesso (access token) per leggere nome e indirizzo, e lo manda
 * qui. Non e' firmato come l'ID token: lo si fa controllare a Google stesso.
 *
 * I controlli sono gli stessi tre di sopra, fatti da Google per noi:
 *  - tokeninfo dice se il biglietto e' vero e quanto vale ancora;
 *  - `aud` deve essere il NOSTRO client: un biglietto preso da un'altra app che
 *    usa Google non entra;
 *  - l'indirizzo dev'essere verificato.
 * Poi userinfo da' nome e foto, per lo stesso indirizzo.
 */
export async function verificaAccessToken(token) {
  const t = String(token || "").trim();
  if (!t || t.length > 4096) throw new Error("Manca il biglietto");
  const client = clientDiAccesso();
  if (!client) throw new Error("Accesso Google non configurato");
  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?access_token=" + encodeURIComponent(t), { signal: AbortSignal.timeout(8000) });
  if (!r.ok) throw new Error("Biglietto non valido o scaduto");
  const info = await r.json();
  if (info.aud !== client && info.azp !== client) throw new Error("Biglietto fatto per un'altra applicazione");
  if (!(Number(info.expires_in) > 0)) throw new Error("Biglietto scaduto");
  if (!info.email) throw new Error("Il biglietto non dice l'indirizzo");
  if (String(info.email_verified) !== "true") throw new Error("Indirizzo non verificato da Google");
  let profilo = {};
  try {
    const u = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: "Bearer " + t }, signal: AbortSignal.timeout(8000) });
    if (u.ok) profilo = await u.json();
  } catch { /* nome e foto non sono indispensabili */ }
  const email = String(info.email).trim().toLowerCase();
  if (profilo.email && String(profilo.email).toLowerCase() !== email) throw new Error("Indirizzi diversi fra i due controlli");
  return { email, nome: String(profilo.name || profilo.given_name || "").trim(), foto: String(profilo.picture || "") };
}
