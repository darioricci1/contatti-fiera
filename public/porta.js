// attrezzi/accesso-google/porta.js
// VERSION: 1.0.0 (estratta da bbs-squadre 2.185.0, funzione porta)
//
// LA PORTA: la schermata d'accesso «Entra con Google».
// Senza menu, una scheda sola al centro, nei colori del telefono (scura se il
// telefono è scuro). Il pulsante è nostro (il pulsante ufficiale di Google non
// si può ridisegnare): chiede a Google un biglietto d'accesso (access token)
// con nome e indirizzo, e lo manda al server, che lo fa controllare a Google
// (google-id.js, verificaAccessToken).
//
// Rete di sicurezza: se il nostro pulsante non riesce (finestra di Google
// bloccata, errore), sotto compare il pulsante ufficiale di Google, che manda
// un ID token (google-id.js, verificaIdToken).
//
// USO
//   <link rel="stylesheet" href="porta.css">
//   <script src="https://accounts.google.com/gsi/client" async defer></script>
//   <script src="porta.js"></script>
//   portaGoogle(document.getElementById("app"), {
//     clientId: "123-abc.apps.googleusercontent.com",   // o letto da /api/config
//     marchio: "BBS", titolo: "Squadre",
//     testo: "Entra con l'account Google che hai dato alla BBS.",
//     entra: (biglietto) => fetch("/api/entra", { method: "POST", ... body: JSON.stringify(biglietto) }),
//     //       biglietto è { accessToken } dal nostro pulsante, { credential } da quello ufficiale;
//     //       deve sollevare un errore con un messaggio leggibile se il server dice di no
//     dopo: () => location.reload(),
//   });

(function () {
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const G = '<svg width="17" height="17" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M21.35 11.1h-9.17v2.92h5.26c-.23 1.37-1.6 4.02-5.26 4.02-3.17 0-5.75-2.62-5.75-5.85s2.58-5.85 5.75-5.85c1.8 0 3.01.77 3.7 1.43l2.52-2.43C16.9 3.82 14.76 2.9 12.18 2.9 6.98 2.9 2.77 7.1 2.77 12.3s4.21 9.4 9.41 9.4c5.43 0 9.03-3.82 9.03-9.2 0-.62-.07-1.09-.16-1.4"/></svg>';

  function portaGoogle(dove, o) {
    document.body.classList.add("in-porta");
    dove.innerHTML = `<div class="porta"><div class="porta-scheda">
      ${o.marchio ? `<div class="porta-marchio">${esc(o.marchio)}</div>` : ""}
      <h2>${esc(o.titolo || "Entra")}</h2>
      <p>${esc(o.testo || "Entra con il tuo account Google.")}</p>
      <button type="button" class="bottone-google" disabled>${G} ${esc(o.testoBottone || "Entra con Google")}</button>
      <div class="porta-msg"></div><div class="porta-riserva"></div>
    </div></div>`;
    const b = dove.querySelector(".bottone-google"), msg = dove.querySelector(".porta-msg");
    const avvisa = (t, tipo) => { msg.innerHTML = t ? `<div class="porta-avviso ${tipo || ""}">${esc(t)}</div>` : ""; };
    const manda = (biglietto) => {
      avvisa("Un momento…");
      Promise.resolve(o.entra(biglietto)).then(() => o.dopo && o.dopo())
        .catch((e) => { b.disabled = false; avvisa(e.message || "Accesso non riuscito.", "male"); });
    };
    if (!o.clientId) return avvisa("Manca il client ID di Google (la variabile d'ambiente su Vercel).", "male");

    // la libreria di Google arriva quando vuole: si aspetta fino a 12 secondi
    const inizio = Date.now();
    const t = setInterval(() => {
      if (!(window.google && google.accounts && google.accounts.oauth2)) {
        if (Date.now() - inizio > 12000) { clearInterval(t); avvisa("Non riesco a caricare l'accesso con Google: controlla la connessione, disattiva eventuali blocchi della pubblicità per questo sito e ricarica la pagina.", "male"); }
        return;
      }
      clearInterval(t);
      if (!b.isConnected) return;
      const riserva = () => {
        const box = dove.querySelector(".porta-riserva");
        if (!box || box.childElementCount || !(google.accounts && google.accounts.id)) return;
        google.accounts.id.initialize({ client_id: o.clientId, callback: (r) => manda({ credential: r.credential }) });
        box.style.marginTop = "12px";
        google.accounts.id.renderButton(box, { theme: "outline", size: "large", text: "signin_with", locale: "it" });
      };
      const cliente = google.accounts.oauth2.initTokenClient({
        client_id: o.clientId, scope: "openid email profile",
        callback: (r) => {
          if (!r || r.error || !r.access_token) { b.disabled = false; riserva(); return avvisa("Accesso non riuscito: riprova, o usa il pulsante qui sotto.", "male"); }
          manda({ accessToken: r.access_token });
        },
        // finestra di Google chiusa o bloccata: si può riprovare, o usare il pulsante ufficiale
        error_callback: (e) => { b.disabled = false; if (e && e.type !== "popup_closed") riserva(); },
      });
      b.disabled = false;
      b.onclick = () => { b.disabled = true; avvisa(""); cliente.requestAccessToken({ prompt: "select_account" }); };
    }, 120);
  }

  window.portaGoogle = portaGoogle;
})();
