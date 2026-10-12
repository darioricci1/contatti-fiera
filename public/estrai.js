// contatti-fiera/public/estrai.js
// version: 0.2.0
//
// Dal parlato ai campi del foglio «Contatti fiera». Funziona senza rete e
// senza IA: cerca le parole guida (nome, cognome, ruolo, comune, email,
// telefono, interesse) e, dove mancano, riconosce da solo i ruoli della
// polizia locale, i comuni italiani, le email dette a voce («chiocciola»,
// «punto») e i numeri di telefono. Se sul server c'e' l'IA, il suo risultato
// sostituisce questo; i campi restano comunque da controllare prima di salvare.

export const CAMPI = ["data", "nome", "cognome", "ruolo", "comune", "email", "telefono", "interesse"];
export const INTESTAZIONI = ["Data contatto", "Nome", "Cognome", "Ruolo", "Comune", "Email", "Telefono", "Interesse"];

// Ruoli piu' lunghi prima, cosi' «vice comandante» vince su «comandante».
const RUOLI = [
  ["vice comandante", "Vice comandante"], ["vicecomandante", "Vice comandante"],
  ["comandante", "Comandante"], ["vice commissario", "Vice commissario"],
  ["commissario", "Commissario"], ["ispettore superiore", "Ispettore superiore"],
  ["ispettore", "Ispettore"], ["sovrintendente", "Sovrintendente"],
  ["assistente", "Assistente"], ["agente", "Agente"], ["vigile urbano", "Vigile"], ["vigilessa", "Vigile"], ["vigile", "Vigile"], ["ufficiale", "Ufficiale"],
  ["istruttore direttivo", "Istruttore direttivo"], ["istruttore", "Istruttore"],
  ["luogotenente", "Luogotenente"], ["maresciallo", "Maresciallo"],
  ["brigadiere", "Brigadiere"], ["appuntato", "Appuntato"], ["capitano", "Capitano"],
  ["tenente", "Tenente"], ["vice sindaco", "Vice sindaco"], ["vicesindaco", "Vice sindaco"],
  ["sindaco", "Sindaco"], ["assessore", "Assessore"], ["consigliere", "Consigliere"],
  ["segretario comunale", "Segretario comunale"], ["segretario", "Segretario"],
  ["dirigente", "Dirigente"], ["responsabile", "Responsabile"], ["funzionario", "Funzionario"],
  ["geometra", "Geometra"], ["ingegnere", "Ingegnere"], ["architetto", "Architetto"],
  ["tecnico", "Tecnico"], ["impiegato", "Impiegato"], ["impiegata", "Impiegata"],
  ["titolare", "Titolare"], ["consulente", "Consulente"],
];

// Prodotti di Alma con il nome come sta nel foglio.
const PRODOTTI = [
  [/multi ?-?video ?-?trappol\w*/, "Multi Video Trappola"],
  [/\beasy\b/, "Easy"],
];

// Le parole guida di ogni campo. Il testo e' gia' senza accenti e minuscolo.
const GUIDE = [
  ["cognome", /\bcognome\b/g],
  ["nome", /\b(?:il )?nome\b/g],
  ["ruolo", /\b(?:ruolo|qualifica|incarico|grado)\b/g],
  ["comune", /\b(?:comune|citta|ente)\b/g],
  ["email", /\b(?:indirizzo )?(?:e-?mail|mail|posta elettronica)\b/g],
  ["telefono", /\b(?:numero di telefono|telefono|tel|cellulare|cell|numero|recapito telefonico)\b/g],
  ["interesse", /\b(?:interessat[oaie]|interesse|interessa(?:no)?|vuole vedere|cerca)\b/g],
  ["provincia", /\b(?:provincia|prov)\b/g],
  ["note", /\b(?:note|nota|appunti)\b/g],
];

// Parole comuni che sono anche nomi di comuni: mai riconosciute da sole.
const NON_COMUNI = new Set(["ora", "lei", "ne", "re", "ala", "rio", "bra", "uri", "ome", "opi", "rea", "vo'", "tu",
  "nome", "orta", "piazza", "valle", "monte", "castello", "porto", "san", "santa", "villa", "campo", "fiume", "lago",
  "isola", "chiesa", "torre", "ponte", "colle", "costa", "riva", "sale", "calendario", "mercato", "salto", "vasto",
  "buono", "pace", "massa", "carrara", "nove", "dieci", "trenta", "cento", "mille", "vita", "lu", "po", "lavoro"]);

// Le province con la sigla, e i modi in cui si dicono a voce.
const PROVINCE = [["Agrigento","AG"],["Alessandria","AL"],["Ancona","AN"],["Arezzo","AR"],["Ascoli Piceno","AP"],["Asti","AT"],
  ["Avellino","AV"],["Bari","BA"],["Barletta Andria Trani","BT"],["Barletta","BT"],["Belluno","BL"],["Benevento","BN"],["Bergamo","BG"],
  ["Biella","BI"],["Bologna","BO"],["Bolzano","BZ"],["Alto Adige","BZ"],["Brescia","BS"],["Brindisi","BR"],["Cagliari","CA"],
  ["Caltanissetta","CL"],["Campobasso","CB"],["Caserta","CE"],["Catania","CT"],["Catanzaro","CZ"],["Chieti","CH"],["Como","CO"],
  ["Cosenza","CS"],["Cremona","CR"],["Crotone","KR"],["Cuneo","CN"],["Enna","EN"],["Fermo","FM"],["Ferrara","FE"],["Firenze","FI"],
  ["Foggia","FG"],["Forli Cesena","FC"],["Forli","FC"],["Cesena","FC"],["Frosinone","FR"],["Genova","GE"],["Gorizia","GO"],
  ["Grosseto","GR"],["Imperia","IM"],["Isernia","IS"],["L'Aquila","AQ"],["Aquila","AQ"],["La Spezia","SP"],["Spezia","SP"],
  ["Latina","LT"],["Lecce","LE"],["Lecco","LC"],["Livorno","LI"],["Lodi","LO"],["Lucca","LU"],["Macerata","MC"],["Mantova","MN"],
  ["Massa Carrara","MS"],["Massa","MS"],["Matera","MT"],["Messina","ME"],["Milano","MI"],["Modena","MO"],
  ["Monza e della Brianza","MB"],["Monza e Brianza","MB"],["Monza Brianza","MB"],["Monza","MB"],["Napoli","NA"],["Novara","NO"],
  ["Nuoro","NU"],["Oristano","OR"],["Padova","PD"],["Palermo","PA"],["Parma","PR"],["Pavia","PV"],["Perugia","PG"],
  ["Pesaro e Urbino","PU"],["Pesaro Urbino","PU"],["Pesaro","PU"],["Pescara","PE"],["Piacenza","PC"],["Pisa","PI"],["Pistoia","PT"],
  ["Pordenone","PN"],["Potenza","PZ"],["Prato","PO"],["Ragusa","RG"],["Ravenna","RA"],["Reggio Calabria","RC"],
  ["Reggio nell'Emilia","RE"],["Reggio Emilia","RE"],["Rieti","RI"],["Rimini","RN"],["Roma","RM"],["Rovigo","RO"],["Salerno","SA"],
  ["Sassari","SS"],["Savona","SV"],["Siena","SI"],["Siracusa","SR"],["Sondrio","SO"],["Sud Sardegna","SU"],["Taranto","TA"],
  ["Teramo","TE"],["Terni","TR"],["Torino","TO"],["Trapani","TP"],["Trento","TN"],["Treviso","TV"],["Trieste","TS"],["Udine","UD"],
  ["Valle d'Aosta","AO"],["Aosta","AO"],["Varese","VA"],["Venezia","VE"],["Verbano Cusio Ossola","VB"],["Verbania","VB"],
  ["Vercelli","VC"],["Verona","VR"],["Vibo Valentia","VV"],["Vicenza","VI"],["Viterbo","VT"]]
  .map(([n, s]) => [n.toLowerCase().replace(/[^a-z' ]/g, " ").replace(/\s+/g, " "), s])
  .sort((a, b) => b[0].length - a[0].length);
const SIGLE = new Set(PROVINCE.map(([, s]) => s));

/** «Forlì Cesena», «provincia di Forlì», «FC», «effe ci» -> «FC». */
export function provinciaDaVoce(s) {
  const b = " " + minuscolo(s).replace(/[-/]/g, " ").replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ").trim() + " ";
  for (const [n, sigla] of PROVINCE) if (b.includes(" " + n + " ")) return sigla;
  const lettere = b.replace(/\b(?:di|della|del|la|e)\b/g, " ").trim().replace(/\s+/g, " ");
  const sillabe = { a: "A", bi: "B", ci: "C", di: "D", e: "E", effe: "F", gi: "G", acca: "H", i: "I", elle: "L", emme: "M",
    enne: "N", o: "O", pi: "P", qu: "Q", erre: "R", esse: "S", ti: "T", u: "U", vu: "V", vi: "V", zeta: "Z", cappa: "K" };
  const sigla = lettere.length === 2 ? lettere.toUpperCase()
    : lettere.split(" ").map((x) => sillabe[x] || "?").join("");
  return SIGLE.has(sigla) ? sigla : "";
}

const PAROLE_NUMERO = { zero: "0", uno: "1", due: "2", tre: "3", quattro: "4", cinque: "5", sei: "6",
  sette: "7", otto: "8", nove: "9" };

export const piano = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "");
const minuscolo = (s) => piano(s).toLowerCase();

/** «de vitis» -> «De Vitis», «d'ascanio» -> «D'Ascanio». */
export function maiuscole(s) {
  return String(s || "").trim().toLowerCase().replace(/(^|[\s'’-])(\p{L})/gu, (m, a, b) => a + b.toUpperCase());
}
const primaMaiuscola = (s) => { s = String(s || "").trim(); return s ? s[0].toUpperCase() + s.slice(1) : s; };

/** Toglie in testa le parole di raccordo («di», «e'», «alla», due punti, virgole). */
function pulisci(s) {
  let t = String(s || "").trim();
  for (let i = 0; i < 4; i++) {
    t = t.replace(/^[\s,.:;'’-]+/, "")
      .replace(/^(?:e|è|e'|ed|ha|il suo|la sua|suo|sua|del|della|dello|di|da|a|al|alla|allo|ai|agli|alle|per|il|la|lo|i|gli|le|come|ossia|cioe|cioè|sarebbe)\s+/i, "");
  }
  return t.replace(/[\s,.;:]+$/, "").trim();
}

/** Dove inizia e finisce ogni campo detto con la sua parola guida. */
function segmenti(testo) {
  const basso = minuscolo(testo);
  const trovati = [];
  for (const [campo, re] of GUIDE) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(basso))) {
      // Dentro un'email detta a voce («chiocciola comune punto forli») non e' una parola guida.
      const prima = basso.slice(Math.max(0, m.index - 12), m.index), dopo = basso.slice(m.index + m[0].length, m.index + m[0].length + 8);
      if (/(?:chiocciola|punto|@|\.)\s*$/.test(prima) || /^\s*(?:punto\b|\.\w|@|chiocciola)/.test(dopo)) continue;
      trovati.push({ campo, inizio: m.index, fine: m.index + m[0].length });
    }
  }
  trovati.sort((a, b) => a.inizio - b.inizio || b.fine - a.fine);
  // Via le sovrapposizioni («numero di telefono» contiene «telefono»).
  const puliti = [];
  for (const t of trovati) if (!puliti.length || t.inizio >= puliti[puliti.length - 1].fine) puliti.push(t);
  const out = { testa: testo.slice(0, puliti.length ? puliti[0].inizio : testo.length) };
  puliti.forEach((t, i) => {
    const pezzo = testo.slice(t.fine, i + 1 < puliti.length ? puliti[i + 1].inizio : testo.length);
    if (!(t.campo in out)) out[t.campo] = pezzo;
  });
  return out;
}

/** Email detta a voce: «mario punto rossi chiocciola comune punto forli punto it». */
export function emailDaVoce(s) {
  let t = minuscolo(s)
    .replace(/\b(?:chiocciolina|chiocciola|at)\b/g, "@")
    .replace(/\b(?:trattino basso|underscore)\b/g, "_")
    .replace(/\b(?:trattino|meno)\b/g, "-")
    .replace(/\b(?:punto|dot)\b/g, ".")
    .replace(/[\s,;:]+/g, "");
  t = t.replace(/^[.\-_]+|[.\-_]+$/g, "");
  const m = t.match(/[a-z0-9._%+'-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/);
  return m ? m[0] : (t.includes("@") ? t : "");
}

/** Email senza parola guida: le parole intorno a «chiocciola», o una gia' scritta. */
function emailLibera(testo) {
  const scritta = testo.match(/[\w.%+'-]+@[\w-]+(?:\.[\w-]+)+/);
  if (scritta) return scritta[0].toLowerCase();
  const parole = minuscolo(testo).split(/\s+/);
  const i = parole.findIndex((p) => /^(?:chiocciola|chiocciolina)[,.]?$/.test(p));
  if (i < 0) return "";
  let a = i;
  while (a > 0 && i - a < 5 && !/[,;:]$/.test(parole[a - 1]) && !/^(?:email|mail|e|ed|è|indirizzo|telefono|interessato|comune|di)$/.test(parole[a - 1])) a--;
  let b = i + 1;
  while (b + 2 < parole.length && /^(?:punto|trattino)$/.test(parole[b + 1])) b += 2;
  return emailDaVoce(parole.slice(a, b + 1).join(" "));
}

/** Numero di telefono: cifre dette o scritte, anche «tre tre tre». */
export function telefonoDaVoce(s) {
  let t = minuscolo(s).replace(/\+\s*39|\bpiu\s*39\b/g, " ");
  t = t.replace(/\b(zero|uno|due|tre|quattro|cinque|sei|sette|otto|nove)\b/g, (m) => PAROLE_NUMERO[m]);
  const gruppi = t.match(/\d[\d\s./-]{5,}\d/g) || [];
  for (const g of gruppi) {
    const cifre = g.replace(/\D/g, "");
    if (cifre.length >= 8 && cifre.length <= 12) return formattaTelefono(cifre);
  }
  return "";
}

/** Come nel foglio: «333 313 2729» per i cellulari, «0543 712345» per i fissi. */
export function formattaTelefono(cifre) {
  const c = String(cifre).replace(/\D/g, "");
  if (c.length === 10 && c[0] === "3") return `${c.slice(0, 3)} ${c.slice(3, 6)} ${c.slice(6)}`;
  if (c[0] === "0") {
    const pref = /^0[2-6]/.test(c) && c.length <= 10 && /^0(2|6)/.test(c) ? 2 : (c.length >= 10 ? 4 : 3);
    return `${c.slice(0, pref)} ${c.slice(pref)}`;
  }
  return c;
}

function ruoloIn(s) {
  const b = " " + minuscolo(s).replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ") + " ";
  for (const [k, v] of RUOLI) if (b.includes(" " + k + " ")) return { ruolo: v, chiave: k };
  return null;
}

let INDICE = null; // [{nome, sigla, chiave}] dal piu' lungo al piu' corto

/** I comuni: [[nome, sigla], ...] come in comuni.json. */
export function caricaComuni(lista) {
  INDICE = lista.map(([nome, sigla]) => ({ nome, sigla, chiave: minuscolo(nome).replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ").trim() }))
    .sort((a, b) => b.chiave.length - a.chiave.length);
}
export const comuniCaricati = () => !!INDICE;

/** Il comune che compare nel testo. Con `inTesta` deve essere all'inizio. */
export function comuneIn(s, { inTesta = false } = {}) {
  if (!INDICE) return null;
  const b = " " + minuscolo(s).replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ").trim() + " ";
  for (const c of INDICE) {
    if (!c.chiave) continue;
    if (inTesta) {
      if (b.startsWith(" " + c.chiave + " ")) return c;
    } else if (c.chiave.length >= 4 && !NON_COMUNI.has(c.chiave) && b.includes(" " + c.chiave + " ")) {
      return c;
    }
  }
  return null;
}

function interesseDa(s) {
  const basso = minuscolo(s);
  for (const [re, nome] of PRODOTTI) if (re.test(basso)) return nome;
  return primaMaiuscola(pulisci(s));
}

const ATTACCHI = /^(?:mi chiamo|il mio nome e|si chiama|chiamato|chiamata|ho parlato con|abbiamo parlato con|parlato con|nuovo contatto|contatto|si chiama|lui e|lei e|e|sono|allora|ok|dunque|il signor|la signora|il signore|signor|signora|il dottor|la dottoressa|dottor|dottoressa|dott|il comandante|la comandante)\b[\s,.:]*/i;

/** Nome e cognome dalla testa della frase («Carlo De Vitis, vice comandante di ...»). */
function personaDaTesta(testa) {
  let t = String(testa || "").trim();
  for (let i = 0; i < 4; i++) t = t.replace(ATTACCHI, "").trim();
  // Si ferma alla prima virgola, a un ruolo o a «di/del/della/da/comune».
  t = t.split(/[,;:.\n]/)[0];
  const parole = t.split(/\s+/).filter(Boolean);
  const fuori = [];
  for (let i = 0; i < parole.length; i++) {
    const p = minuscolo(parole[i]);
    if (/^(?:del|della|dello|dal|dalla|comune|polizia|vigili|ufficio|che|ed|e)$/.test(p)) break;
    if ((p === "di" || p === "da") && fuori.length >= 2) break;
    if (ruoloIn(parole.slice(i).join(" ")) && RUOLI.some(([k]) => (p + " " + minuscolo(parole[i + 1] || "")).startsWith(k) || p === k)) break;
    fuori.push(parole[i]);
    if (fuori.length >= 5) break;
  }
  if (!fuori.length) return { nome: "", cognome: "" };
  return { nome: maiuscole(fuori[0]), cognome: maiuscole(fuori.slice(1).join(" ")) };
}

const oggi = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

/** Il testo detto -> { data, nome, cognome, ruolo, comune, provincia, email, telefono, interesse, note }. */
export function estrai(testo, { data } = {}) {
  testo = String(testo || "").replace(/\s+/g, " ").trim();
  const r = { data: data || oggi(), nome: "", cognome: "", ruolo: "", comune: "", provincia: "", email: "", telefono: "", interesse: "", note: "" };
  if (!testo) return r;
  const s = segmenti(testo);

  // Persona
  if (s.nome != null) {
    const p = pulisci(s.nome).split(/[,;.]/)[0].trim().split(/\s+/).filter(Boolean);
    if (s.cognome != null) r.nome = maiuscole(p.slice(0, 2).join(" ")); else { r.nome = maiuscole(p[0] || ""); r.cognome = maiuscole(p.slice(1, 4).join(" ")); }
  }
  if (s.cognome != null) r.cognome = maiuscole(pulisci(s.cognome).split(/[,;.]/)[0].trim().split(/\s+/).slice(0, 3).join(" "));
  if (!r.nome && !r.cognome) Object.assign(r, personaDaTesta(s.testa));
  else if (!r.nome) { const p = personaDaTesta(s.testa); r.nome = [p.nome, p.cognome].filter(Boolean).join(" "); }

  // Ruolo
  if (s.ruolo != null) { const k = ruoloIn(s.ruolo); r.ruolo = k ? k.ruolo : primaMaiuscola(pulisci(s.ruolo)); }
  if (!r.ruolo) { const k = ruoloIn(testo); if (k) r.ruolo = k.ruolo; }

  // Comune e provincia. Il nome della provincia non vale come comune («Forlì Cesena» non e' Cesena).
  const provDetta = s.provincia != null ? provinciaDaVoce(pulisci(s.provincia).split(/[,;.]/)[0]) : "";
  const senzaProv = s.provincia != null ? testo.replace(s.provincia, " ") : testo;
  let c = null;
  if (s.comune != null) c = comuneIn(pulisci(s.comune), { inTesta: true }) || comuneIn(s.comune);
  if (!c) {
    const dopo = minuscolo(senzaProv).match(/\b(?:comune di|citta di|polizia locale di|municipale di|comando di|di|da|del comune di)\s+([a-z' ]{2,40})/g) || [];
    for (const d of dopo) { c = comuneIn(d.replace(/^\S+(?:\s+(?:di|locale di|di))?\s+/, "").replace(/^(?:comune di|di|locale di)\s+/, ""), { inTesta: true }); if (c && !NON_COMUNI.has(c.chiave)) break; c = null; }
  }
  if (!c) c = comuneIn(senzaProv.replace(new RegExp(`\\b${r.nome}\\b|\\b${r.cognome}\\b`, "gi"), " "));
  if (c) { r.comune = c.nome; r.provincia = c.sigla; } else if (s.comune != null) r.comune = maiuscole(pulisci(s.comune).split(/[,;.]/)[0]);
  if (provDetta) r.provincia = provDetta;

  // Email e telefono
  if (s.email != null) r.email = emailDaVoce(pulisci(s.email.split(/[,;]/)[0])) || emailDaVoce(pulisci(s.email));
  if (!r.email) r.email = emailLibera(testo);
  if (s.telefono != null) r.telefono = telefonoDaVoce(s.telefono);
  if (!r.telefono) r.telefono = telefonoDaVoce(testo.replace(/\S+@\S+/g, " "));

  // Interesse e note
  if (s.interesse != null) r.interesse = interesseDa(s.interesse.split(/[.;]/)[0]);
  if (!r.interesse) { const b = minuscolo(testo); for (const [re, nome] of PRODOTTI) if (re.test(b)) { r.interesse = nome; break; } }
  if (s.note != null) r.note = primaMaiuscola(pulisci(s.note));
  return r;
}
