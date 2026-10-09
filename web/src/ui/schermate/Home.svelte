<script lang="ts">
  import { untrack } from "svelte";
  import CampoTesto from "../componenti/CampoTesto.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
  import { LUNGHEZZA_CODICE, codiceCompleto, estraiCodice, formattaCodice, normalizzaCodice } from "../logica";
  import Selettore from "../componenti/Selettore.svelte";
  import { riempi, t } from "../testi";
  import { applicaTema, leggiTema, salvaTema, TEMI, type Tema } from "../tema";

  interface Props {
    /** Crea una partita come host; `nome` puo' essere vuoto (il chiamante sceglie un nome predefinito). */
    onCrea: (nome: string) => void;
    onUnisciti: (dati: { codice: string; nome: string }) => void;
    onRegole: () => void;
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
    codiceIniziale = "",
    nomeIniziale = "",
    avviso = null,
    errore = null,
    onRiprova,
    onChiudiErrore,
  }: Props = $props();

  let codice = $state(untrack(() => normalizzaCodice(codiceIniziale)));
  let nome = $state(untrack(() => nomeIniziale));

  // CA-35: tema Sistema / Chiaro / Scuro / Alto contrasto, salvato in `agenteur.aspetto`.
  let tema = $state<Tema>(leggiTema());
  const ETICHETTE_TEMA: Record<Tema, string> = {
    SISTEMA: t.temaSistema,
    CHIARO: t.temaChiaro,
    SCURO: t.temaScuro,
    ALTO_CONTRASTO: t.temaAltoContrasto,
  };
  const opzioniTema = TEMI.map((x) => ({ valore: x, etichetta: ETICHETTE_TEMA[x] }));

  function cambiaTema(v: string): void {
    const nuovo = TEMI.find((x) => x === v);
    if (!nuovo) return;
    tema = nuovo;
    salvaTema(nuovo);
    applicaTema(nuovo);
  }

  // CA-30: sotto i 6 caratteri "Unisciti" resta disattivato; serve anche un nome.
  const puoUnirsi = $derived(codiceCompleto(codice) && nome.trim() !== "");
  const suggerimento = $derived(
    codice.length === 0
      ? t.homeCodiceAiuto
      : !codiceCompleto(codice)
        ? riempi(t.homeMancano, { n: LUNGHEZZA_CODICE - codice.length })
        : nome.trim() === ""
          ? t.homeServeNome
          : t.homePronto,
  );

  function invia(e: SubmitEvent): void {
    e.preventDefault();
    if (puoUnirsi) onUnisciti({ codice, nome: nome.trim() });
  }
</script>

<main class="home">
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

  <section class="blocco">
    <CampoTesto etichetta={t.homeCampoNome} valore={nome} onCambia={(v) => (nome = v)} maxLunghezza={20} />
    <p class="nota">{t.homeNomeAiuto}</p>
  </section>

  <section class="blocco">
    <Pulsante onClick={() => onCrea(nome.trim())}>{t.homeCreaPartita}</Pulsante>
    <p class="nota">{t.homeCreaAiuto}</p>
  </section>

  <form class="blocco" onsubmit={invia}>
    <h2>{t.homeUniscitiTitolo}</h2>
    <CampoTesto
      etichetta={t.homeCampoCodice}
      valore={codice}
      onCambia={(v) => (codice = v)}
      trasforma={estraiCodice}
      formatta={formattaCodice}
      segnaposto={t.homeSegnapostoCodice}
      tipoCodice
      invio="go"
    />
    <p class="nota" role="status">{suggerimento}</p>
    <Pulsante variante="tonale" disabilitato={!puoUnirsi} onClick={() => onUnisciti({ codice, nome: nome.trim() })}
      >{t.homeUnisciti}</Pulsante
    >
  </form>

  <footer class="barra">
    <Selettore etichetta={t.homeTemaEtichetta} opzioni={opzioniTema} valore={tema} onCambia={cambiaTema} colonne={2} />
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
  .blocco {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
  }
  h2 {
    font: var(--testo-titolo-sezione);
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
