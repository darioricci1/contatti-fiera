# Contatti fiera

<!-- version: 0.5.0 -->

Allo stand di Alma Sicurezza: si tocca il microfono, si dice il contatto
appena conosciuto e la pagina compila da sola il foglio «Contatti fiera»
(Data contatto, Nome, Cognome, Ruolo, Comune, Email, Telefono, Interesse).
Si controllano i campi, si salva, e il contatto arriva alla lista comune
della squadra. «Scarica Excel» rifà il file con le stesse colonne.

Si apre su https://contatti-fiera.vercel.app dal telefono (si può aggiungere
alla schermata Home). Si entra con Google: gli amministratori
(`FIERA_AMMINISTRATORI`), gli indirizzi di `FIERA_AMMESSI`, tutti quelli dei
domini di `FIERA_DOMINI` (almasicurezza.it) e chi l'amministratore aggiunge in
Impostazioni → «Chi può entrare con Google». Il nome della fiera si cambia in
Impostazioni. La data del contatto è quella del giorno in cui si salva;
«Scarica Excel» salva prima il contatto compilato e non ancora salvato.

## Come si detta

Meglio con le parole guida, in qualunque ordine:

> «Carlo De Vitis, vice comandante, comune di Fara San Martino, email carlo
> punto devitis chiocciola fsm punto it, telefono 333 313 2729, interessato
> alla Multi Video Trappola, note richiamare a novembre»

La provincia si può dire per nome («provincia Forlì Cesena») o per sigla
(«provincia FC», «effe ci»): nel foglio va la sigla. Se non la si dice, la
prende dal comune.

Funziona anche il parlato libero («ho parlato con Laura Adami, comandante
della polizia locale di Santa Margherita Ligure…»): ruoli, comuni italiani
(con la provincia), email dette a voce e numeri vengono riconosciuti lo stesso.

## Com'è fatto

- `public/index.html`: la pagina. Il riconoscimento vocale è quello del
  browser (Chrome su Android, Safari su iPhone), in italiano. Dove non c'è,
  si usa il microfono della tastiera nel riquadro di testo.
- `public/estrai.js`: il riconoscitore che dal testo compila i campi, senza
  rete e senza IA. `public/comuni.json`: i 7.904 comuni con la sigla.
- `api/estrai.js`: l'IA (Claude) che ricontrolla i campi e legge la foto di un
  biglietto da visita o di un badge. Si accende solo con `ANTHROPIC_API_KEY`
  nelle variabili del progetto Vercel; i campi che ha cambiato diventano gialli.
- `api/contatti.js`: la lista comune, nello schema `fiera` del database unico
  di Alma (Neon, lo stesso del gestionale). `schema.sql` ha la versione: lo
  schema si crea o si aggiorna da solo alla prima chiamata.
- `api/entra.js`, `api/ammessi.js`, `lib/google-id.js`, `lib/sessione.js`,
  `public/porta.js`: l'accesso con Google, copiato da `attrezzi/accesso-google`.
- `api/stato.js`: cosa è acceso (database, IA, Google) e chi è entrato.
- Senza rete la pagina si apre lo stesso (`sw.js`) e i contatti salvati
  restano sul telefono con «da inviare»; partono appena torna il segnale.

## Variabili del progetto Vercel `contatti-fiera`

- `GOOGLE_CLIENT_ID_ACCESSO`: il client Google dell'accesso, «contatti fiera»
  nel progetto Google AlmaSicurezza (`64260446108-4ne0q…`). Nelle sue «Origini
  JavaScript autorizzate» c'è `https://contatti-fiera.vercel.app`.
- `SESSIONE_SEGRETO`, `NOME_COOKIE`: la firma del cookie d'accesso.
- `FIERA_AMMINISTRATORI`: gli indirizzi di chi gestisce la squadra.
- `FIERA_DOMINI`: i domini che entrano tutti (`almasicurezza.it`).
- `FIERA_AMMESSI`: altri indirizzi che entrano sempre.
- `ALMA_DATABASE_URL` (e le altre `ALMA_*`): dall'integrazione Neon di Alma.
- `ANTHROPIC_API_KEY` (facoltativa): accende l'IA e la foto del biglietto.
  `FIERA_MODELLO` cambia il modello (predefinito `claude-haiku-5-5`).

## Prove

    npm test
