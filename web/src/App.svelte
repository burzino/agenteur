<script lang="ts">
  import { onMount } from "svelte";
  import DialogoConferma from "./ui/componenti/DialogoConferma.svelte";
  import Toast from "./ui/componenti/Toast.svelte";
  import { carteConColori, normalizzaCodice } from "./ui/logica";
  import { nomeSalvato, partita } from "./ui/partita.svelte";
  import { mantieniSchermoAcceso } from "./ui/schermo";
  import Collegamento from "./ui/schermate/Collegamento.svelte";
  import ComeSiGioca from "./ui/schermate/ComeSiGioca.svelte";
  import Fine from "./ui/schermate/Fine.svelte";
  import Home from "./ui/schermate/Home.svelte";
  import Impostazioni from "./ui/schermate/Impostazioni.svelte";
  import Indizio from "./ui/schermate/Indizio.svelte";
  import Lobby from "./ui/schermate/Lobby.svelte";
  import Plancia from "./ui/schermate/Plancia.svelte";
  import { t } from "./ui/testi";

  type Schermata = "home" | "regole" | "impostazioni" | "connessione" | "lobby" | "indizio" | "plancia" | "fine";

  const PREFISSO_UNISCITI = "#/unisciti/";

  let hash = $state(window.location.hash);
  let confermaEsci = $state(false);

  /** Codice nel link `#/unisciti/<CODICE>`, se c'e' (precompila la Home). */
  const codiceDaLink = $derived(
    hash.startsWith(PREFISSO_UNISCITI) ? normalizzaCodice(hash.slice(PREFISSO_UNISCITI.length)) : "",
  );

  // La schermata dipende dallo stato di rete; la rotta in hash la segue (e non il contrario).
  const schermata = $derived.by<Schermata>(() => {
    if (hash === "#/come-si-gioca") return "regole";
    if (hash === "#/impostazioni") return "impostazioni";
    if (partita.collegamento === "connessione") return "connessione";
    const v = partita.vista;
    if (!v) return "home";
    if (v.fase === "lobby") return "lobby";
    if (v.fase === "fine" && v.vincitore && v.motivo && v.carte) return "fine";
    // Spia di turno, indizio non ancora dato (CA-04)
    if (v.io.ruolo === "spia" && v.io.squadra === v.squadraDiTurno && v.indizio === null) return "indizio";
    return "plancia";
  });

  const HASH_DI: Record<Schermata, string | null> = {
    home: null, // resta quello che c'e' (#/ oppure #/unisciti/<CODICE>)
    regole: null,
    impostazioni: null,
    connessione: null,
    lobby: "#/lobby",
    indizio: "#/plancia",
    plancia: "#/plancia",
    fine: "#/fine",
  };

  $effect(() => {
    const voluto = HASH_DI[schermata];
    if (voluto !== null && window.location.hash !== voluto) window.location.hash = voluto;
    // Senza partita le rotte di gioco non hanno senso: si torna alla Home.
    if (schermata === "home" && hash !== "#/" && !hash.startsWith(PREFISSO_UNISCITI)) window.location.hash = "#/";
  });

  // Schermo acceso in Lobby, Indizio e Plancia: uno spento a meta' partita manda il guest in riprovo.
  const tieniSchermo = $derived(schermata === "lobby" || schermata === "indizio" || schermata === "plancia");
  $effect(() => {
    if (!tieniSchermo) return;
    return mantieniSchermoAcceso();
  });

  onMount(() => {
    const aggiorna = () => (hash = window.location.hash);
    window.addEventListener("hashchange", aggiorna);
    partita.riprendi(); // guest: riconnessione col token (D8); host ricaricato: la partita e' finita
    return () => window.removeEventListener("hashchange", aggiorna);
  });

  function vaiHome(): void {
    window.location.hash = "#/";
  }

  function unisciti(dati: { codice: string; nome: string }): void {
    void partita.unisciti(dati.codice, dati.nome);
  }

  const messaggioEsci = $derived(partita.eHost ? t.esciMessaggioHost : t.esciMessaggioGuest);

  function esciConfermato(): void {
    confermaEsci = false;
    partita.esci();
    vaiHome();
  }

  // Vista di gioco (valida solo nelle schermate di partita)
  const v = $derived(partita.vista);
  const puoAgire = $derived(
    v !== null &&
      v.io.ruolo === "agente" &&
      v.io.squadra !== null &&
      v.io.squadra === v.squadraDiTurno &&
      v.indizio !== null &&
      v.fase === "partita",
  );
</script>

{#if schermata === "regole"}
  <ComeSiGioca onIndietro={vaiHome} />
{:else if schermata === "impostazioni"}
  <Impostazioni onIndietro={vaiHome} />
{:else if schermata === "connessione"}
  <Collegamento intento={partita.intento} codice={partita.ultimoCodice} onAnnulla={() => partita.annulla()} />
{:else if schermata === "lobby" && v}
  <Lobby
    vista={v}
    eHost={partita.eHost}
    regia={partita.regia}
    postoInAttesa={partita.postoInAttesa}
    onScegli={(id, squadra, ruolo) => partita.scegli(id, squadra, ruolo)}
    onRegia={(r) => partita.impostaRegia(r)}
    onInizia={() => partita.inizia()}
    onEsci={() => (confermaEsci = true)}
  />
{:else if schermata === "indizio" && v && v.carte}
  <Indizio
    paroleDellaPlancia={v.carte.map((c) => c.parola)}
    carte={v.carte}
    offline={partita.riprovo}
    erroreEsterno={partita.errore}
    onInvia={(i) => partita.indizio(i.parola, i.numero)}
    onHome={() => (confermaEsci = true)}
  />
{:else if schermata === "plancia" && v && v.carte && v.squadraDiTurno && v.rimaste}
  <Plancia
    carte={v.carte}
    squadraDiTurno={v.squadraDiTurno}
    indizio={v.indizio}
    rimaste={v.rimaste}
    ePiaSpia={v.io.ruolo === "spia"}
    squadraGiocatore={v.io.squadra}
    scopertiNelTurno={v.scopertiNelTurno}
    {puoAgire}
    offline={partita.riprovo}
    onScopri={(i) => partita.scopri(i)}
    onTermina={() => partita.terminaTurno()}
    onHome={() => (confermaEsci = true)}
  />
{:else if schermata === "fine" && v && v.carte && v.vincitore && v.motivo}
  <Fine
    vincitore={v.vincitore}
    motivo={v.motivo}
    carte={carteConColori(v.carte, v.carteFinali)}
    eHost={partita.eHost}
    onNuova={() => partita.nuova()}
    onHome={() => (confermaEsci = true)}
  />
{:else}
  {#key codiceDaLink}
    <Home
      onCrea={(nome) => void partita.crea(nome)}
      onUnisciti={unisciti}
      onRegole={() => (window.location.hash = "#/come-si-gioca")}
      onImpostazioni={() => (window.location.hash = "#/impostazioni")}
      codiceIniziale={codiceDaLink || partita.ultimoCodice}
      nomeIniziale={nomeSalvato()}
      avviso={partita.avviso}
      errore={partita.erroreAvvio}
      onRiprova={() => partita.ripetiAvvio()}
      onChiudiErrore={() => partita.cancellaErroreAvvio()}
    />
  {/key}
{/if}

{#if partita.riprovo && partita.vista}
  <p class="banner" role="status">{t.connessioneRiprovo}</p>
{/if}

<DialogoConferma
  aperto={confermaEsci}
  titolo={t.esciTitolo}
  messaggio={messaggioEsci}
  etichettaSi={t.esciConferma}
  etichettaNo={t.annulla}
  onSi={esciConfermato}
  onNo={() => (confermaEsci = false)}
/>

<Toast />

<style>
  .banner {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 10;
    padding: var(--spazio-2) var(--spazio-4);
    text-align: center;
    font: var(--testo-etichetta);
    background: var(--colore-contenitore-errore);
    color: var(--colore-su-contenitore-errore);
  }
</style>
