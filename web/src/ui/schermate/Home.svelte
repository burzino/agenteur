<script lang="ts">
  import { untrack } from "svelte";
  import CampoTesto from "../componenti/CampoTesto.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
  import { LUNGHEZZA_CODICE, codiceCompleto, estraiCodice, formattaCodice, normalizzaCodice } from "../logica";
  import { riempi, t } from "../testi";

  interface Props {
    /** Crea una partita come host; `nome` puo' essere vuoto (il chiamante sceglie un nome predefinito). */
    onCrea: (nome: string) => void;
    onUnisciti: (dati: { codice: string; nome: string }) => void;
    onRegole: () => void;
    onImpostazioni: () => void;
    /** Codice precompilato (es. da un link `#/unisciti/<CODICE>`). */
    codiceIniziale?: string;
    nomeIniziale?: string;
    /** Messaggio persistente (partita chiusa, host irraggiungibile...). */
    avviso?: string | null;
    /** Errore di creazione o ingresso, con nuovo tentativo. */
    errore?: string | null;
    onRiprova?: () => void;
    onChiudiErrore?: () => void;
  }
  let {
    onCrea,
    onUnisciti,
    onRegole,
    onImpostazioni,
    codiceIniziale = "",
    nomeIniziale = "",
    avviso = null,
    errore = null,
    onRiprova,
    onChiudiErrore,
  }: Props = $props();

  let codice = $state(untrack(() => normalizzaCodice(codiceIniziale)));
  let nome = $state(untrack(() => nomeIniziale));

  // Il nome e' uno solo per le due sezioni e si ricorda: non va riscritto.
  function cambiaNome(v: string): void {
    nome = v;
    try {
      localStorage.setItem("agenteur.nome", v.trim());
    } catch {
      /* storage non disponibile: il nome vale solo qui */
    }
  }

  // CA-30: sotto i 6 caratteri "Unisciti" resta disattivato; serve anche un nome.
  const puoUnirsi = $derived(codiceCompleto(codice) && nome.trim() !== "");
  // U20: il nome serve in entrambe le schede; il messaggio compare dopo un tentativo a vuoto.
  let nomeTentato = $state(false);
  const erroreNome = $derived(nomeTentato && nome.trim() === "" ? t.homeNomeObbligatorio : undefined);
  const suggerimento = $derived(
    codice.length === 0
      ? t.homeCodiceAiuto
      : !codiceCompleto(codice)
        ? riempi(t.homeMancano, { n: LUNGHEZZA_CODICE - codice.length })
        : nome.trim() === ""
          ? t.homeServeNome
          : t.homePronto,
  );

  // Scheda attiva: vale solo per la visita corrente; "Unisci" e' la prima e la predefinita (anche con un codice dal link).
  const SCHEDE = [{ id: "unisci" }, { id: "crea" }] as const;
  type IdScheda = (typeof SCHEDE)[number]["id"];
  let scheda = $state<IdScheda>("unisci");

  function tastoScheda(e: KeyboardEvent): void {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Home" && e.key !== "End") return;
    e.preventDefault();
    const i = SCHEDE.findIndex((x) => x.id === scheda);
    const n = SCHEDE.length;
    const j = e.key === "Home" ? 0 : e.key === "End" ? n - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + n) % n;
    scheda = SCHEDE[j].id;
    document.getElementById(`tab-${scheda}`)?.focus();
  }

  function unisciti(): void {
    nomeTentato = true;
    if (puoUnirsi) onUnisciti({ codice, nome: nome.trim() });
  }

  function crea(): void {
    nomeTentato = true;
    if (nome.trim() !== "") onCrea(nome.trim());
  }
</script>

<main class="home">
  <div class="alto">
    <Pulsante variante="testo" onClick={onImpostazioni}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M19.14 12.94a7.1 7.1 0 0 0 .05-.94 7.1 7.1 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7 7 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.84a.5.5 0 0 0-.5.42l-.36 2.54a7 7 0 0 0-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.66 8.48a.5.5 0 0 0 .12.64l2.03 1.58a7.1 7.1 0 0 0-.05.94c0 .32.02.63.05.94l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.31.61.22l2.39-.96c.5.38 1.04.7 1.62.94l.36 2.54c.04.24.25.42.5.42h3.84c.25 0 .46-.18.5-.42l.36-2.54a7 7 0 0 0 1.62-.94l2.39.96c.23.09.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64zM12 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7"
        />
      </svg>
      {t.homeImpostazioni}
    </Pulsante>
  </div>

  <header class="intestazione">
    <h1>{t.homeTitolo}</h1>
    <p>{t.homeSottotitolo}</p>
  </header>

  {#if avviso}
    <p class="avviso" role="status">{avviso}</p>
  {/if}

  {#if errore}
    <div class="errore" role="alert">
      <p class="errore-titolo">{t.avvioErroreTitolo}</p>
      <p>{errore}</p>
      <div class="errore-azioni">
        <Pulsante onClick={() => onRiprova?.()}>{t.riprova}</Pulsante>
        <Pulsante variante="testo" onClick={() => onChiudiErrore?.()}>{t.chiudi}</Pulsante>
      </div>
    </div>
  {/if}

  <div class="schede" role="tablist" aria-label={t.homeSchede} aria-orientation="horizontal">
    {#each SCHEDE as s (s.id)}
      <button
        type="button"
        role="tab"
        class="tab"
        id="tab-{s.id}"
        aria-selected={scheda === s.id}
        aria-controls="pannello-{s.id}"
        tabindex={scheda === s.id ? 0 : -1}
        onclick={() => (scheda = s.id)}
        onkeydown={tastoScheda}
      >
        <span class="tab-titolo">{s.id === "crea" ? t.homeSchedaCrea : t.homeSchedaUnisci}</span>
        <span class="tab-sotto">{s.id === "crea" ? t.homeSottoCrea : t.homeSottoUnisci}</span>
      </button>
    {/each}
  </div>

  {#if scheda === "crea"}
    <div class="blocco pannello" role="tabpanel" id="pannello-crea" aria-labelledby="tab-crea" tabindex="-1">
      <form
        class="blocco"
        onsubmit={(e) => {
          e.preventDefault();
          crea();
        }}
      >
        <p class="nota">{t.homeCreaAiuto}</p>
        <CampoTesto
          etichetta={t.homeCampoNome}
          valore={nome}
          onCambia={cambiaNome}
          maxLunghezza={20}
          errore={erroreNome}
          invio="go"
        />
        <Pulsante onClick={crea}>{t.homeCreaPartita}</Pulsante>
      </form>
    </div>
  {:else}
    <div class="pannello" role="tabpanel" id="pannello-unisci" aria-labelledby="tab-unisci" tabindex="-1">
      <form class="blocco" onsubmit={(e) => e.preventDefault()}>
        <CampoTesto
          etichetta={t.homeCampoCodiceBreve}
          valore={codice}
          onCambia={(v) => (codice = v)}
          trasforma={estraiCodice}
          formatta={formattaCodice}
          segnaposto={t.homeSegnapostoCodice}
          tipoCodice
          invio="go"
          onInvio={unisciti}
        />
        <CampoTesto etichetta={t.homeCampoNome} valore={nome}
          onCambia={cambiaNome}
          maxLunghezza={20}
          errore={erroreNome}
          invio="go"
          onInvio={unisciti}
        />
        <p class="nota" role="status">{suggerimento}</p>
        <Pulsante variante="tonale" disabilitato={!codiceCompleto(codice)} onClick={unisciti}>{t.homeUnisciti}</Pulsante>
      </form>
    </div>
  {/if}

  <footer class="barra">
    <Pulsante variante="testo" onClick={onRegole}>{t.homeComeSiGioca}</Pulsante>
  </footer>
</main>

<style>
  .home {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-5);
    min-height: 100vh;
    min-height: 100dvh;
    max-width: var(--larghezza-max);
    margin: 0 auto;
    padding: var(--spazio-6) var(--margine-schermata) var(--spazio-4);
    background: var(--colore-sfondo);
    color: var(--colore-su-sfondo);
  }
  .intestazione {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
  }
  h1 {
    font: var(--testo-display);
    color: var(--colore-primario);
  }
  .intestazione p {
    font: var(--testo-corpo);
    color: var(--colore-su-superficie-variante);
  }
  .alto {
    display: flex;
    justify-content: flex-end;
  }
  .alto :global(.pulsante) {
    gap: var(--spazio-1);
  }
  .blocco {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
  }
  .schede {
    display: grid;
    grid-template-columns: 1fr 1fr;
    border-bottom: 1px solid var(--colore-contorno-variante);
  }
  .tab {
    position: relative;
    min-height: 48px;
    padding: var(--spazio-2) var(--spazio-4);
    border: 0;
    background: transparent;
    color: var(--colore-su-superficie-variante);
    font: var(--testo-titolo);
    cursor: pointer;
  }
  .tab[aria-selected="true"] {
    color: var(--colore-primario);
  }
  .tab-titolo,
  .tab-sotto {
    display: block;
  }
  .tab-sotto {
    font: var(--testo-didascalia);
  }
  .tab::after {
    content: "";
    position: absolute;
    inset: auto 0 -1px 0;
    height: 3px;
    border-radius: var(--raggio-pieno) var(--raggio-pieno) 0 0;
    background: var(--colore-primario);
    transform: scaleX(0);
    transition: transform var(--durata-barra) ease;
  }
  .tab[aria-selected="true"]::after {
    transform: scaleX(1);
  }
  .tab:focus-visible {
    outline: 2px solid var(--colore-primario);
    outline-offset: -2px;
  }
  .pannello:focus {
    outline: none;
  }
  @media (prefers-reduced-motion: reduce) {
    .tab::after {
      transition: none;
    }
  }
  .nota {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
  .avviso {
    padding: var(--spazio-3) var(--spazio-4);
    border-radius: var(--raggio-m);
    background: var(--colore-contenitore-secondario);
    color: var(--colore-su-contenitore-secondario);
    font: var(--testo-corpo-piccolo);
  }
  .errore {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
    padding: var(--spazio-4);
    border-radius: var(--raggio-l);
    border: var(--spessore-contorno) solid var(--colore-bordo-livello);
    background: var(--colore-contenitore-errore);
    color: var(--colore-su-contenitore-errore);
    font: var(--testo-corpo);
  }
  .errore-titolo {
    font: var(--testo-titolo);
  }
  .errore-azioni {
    display: flex;
    gap: var(--spazio-2);
    align-items: center;
  }
  /* Nel riquadro d'errore il pieno usa il colore primario: resta leggibile sul contenitore. */
  .errore-azioni :global(.testo) {
    color: var(--colore-su-contenitore-errore);
  }
  .barra {
    margin-top: auto;
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
    padding-bottom: env(safe-area-inset-bottom);
  }
</style>
