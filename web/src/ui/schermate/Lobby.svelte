<script lang="ts">
  import { tick, untrack } from "svelte";
  import { toString as qrSvg } from "qrcode";
  import type { Ruolo, Squadra } from "../../gioco/modelli";
  import type { VistaGiocatore } from "../../rete/contratto";
  import Pagina from "../componenti/Pagina.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
  import SceltaPosto from "../componenti/SceltaPosto.svelte";
  import Selettore from "../componenti/Selettore.svelte";
  import { mostraToast } from "../componenti/notifiche.svelte";
  import { copiaTesto } from "../componenti/appunti";
  import { descriviPosto, formattaCodice, motivoBlocco } from "../logica";
  import { riempi, t } from "../testi";

  interface Props {
    vista: VistaGiocatore;
    eHost: boolean;
    /** Host che non gioca (D4): non ha un posto. */
    regia: boolean;
    /** Guest: posto scelto e non ancora confermato dall'host. */
    postoInAttesa?: string | null;
    onScegli: (idGiocatore: string, squadra: Squadra, ruolo: Ruolo) => void;
    onRegia: (regia: boolean) => void;
    onInizia: () => void;
    onEsci: () => void;
  }
  let { vista, eHost, regia, postoInAttesa = null, onScegli, onRegia, onInizia, onEsci }: Props = $props();

  const opzioniModo = [
    { valore: "gioca", etichetta: t.lobbyHostGioca },
    { valore: "regia", etichetta: t.lobbyHostRegia },
  ];

  // CA-13 / CA-31: "Inizia" solo se le regole sono soddisfatte (l'host regia non e' nell'elenco).
  const blocco = $derived(motivoBlocco(vista.giocatori));
  const link = $derived(`${window.location.origin}${import.meta.env.BASE_URL}#/unisciti/${vista.codice}`);

  // L'host puo' scegliere il posto di chiunque: il giocatore "in mano" (di default lui stesso).
  let selezionato = $state<string | null>(untrack(() => vista.io.id));
  const bersaglioId = $derived.by(() => {
    if (!eHost) return vista.io.id;
    if (selezionato !== null && vista.giocatori.some((g) => g.id === selezionato)) return selezionato;
    return regia ? null : vista.io.id;
  });
  const bersaglio = $derived(vista.giocatori.find((g) => g.id === bersaglioId));

  // Feedback di copia sul pulsante stesso, per due secondi.
  let copiato = $state<"codice" | "link" | null>(null);
  let timerCopia: ReturnType<typeof setTimeout> | null = null;

  async function copia(cosa: "codice" | "link"): Promise<void> {
    const ok = await copiaTesto(cosa === "codice" ? vista.codice : link);
    if (!ok) {
      mostraToast(t.copiaNonRiuscita);
      return;
    }
    copiato = cosa;
    if (timerCopia !== null) clearTimeout(timerCopia);
    timerCopia = setTimeout(() => (copiato = null), 2000);
  }

  // U22: "Condividi" dove esiste il Web Share; altrove resta "Copia link".
  const puoCondividere = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function condividi(): Promise<void> {
    try {
      await navigator.share({ title: t.lobbyCondividiTitolo, url: link });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      await copia("link");
    }
  }

  // D3: QR del link; sfondo bianco e moduli neri per il contrasto, qualunque sia il tema.
  let qr = $state("");
  $effect(() => {
    const url = link;
    let attivo = true;
    qrSvg(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" })
      .then((svg) => {
        if (attivo) qr = svg;
      })
      .catch(() => {
        if (attivo) qr = "";
      });
    return () => {
      attivo = false;
    };
  });

  // U15: dopo il tocco su una riga l'host vede subito la griglia dei posti.
  let sezionePosti = $state<HTMLElement | null>(null);
  async function seleziona(id: string): Promise<void> {
    selezionato = id;
    await tick();
    const ridotto = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
    sezionePosti?.scrollIntoView({ behavior: ridotto ? "auto" : "smooth", block: "start" });
  }

  const titoloPosto = $derived(
    bersaglio && bersaglio.id !== vista.io.id
      ? riempi(t.lobbyPostoDi, { nome: bersaglio.nome })
      : t.lobbyIlTuoPosto,
  );
</script>

<Pagina titolo={t.lobbyTitolo} onHome={onEsci}>
  <div class="contenuto">
    {#if bersaglioId !== null}
      {@const idB = bersaglioId}
      <section class="blocco" bind:this={sezionePosti}>
        <h2>{titoloPosto}</h2>
        {#if eHost}<p class="nota">{t.lobbyHostGuida}</p>{/if}
        <SceltaPosto
          giocatori={vista.giocatori}
          bersaglioId={idB}
          ioId={vista.io.id}
          inAttesa={idB === vista.io.id && !eHost ? postoInAttesa : null}
          onScegli={(squadra, ruolo) => onScegli(idB, squadra, ruolo)}
        />
      </section>
    {:else}
      <p class="nota">{t.lobbyScegliGiocatore}</p>
    {/if}

    <section class="codice-blocco" aria-labelledby="etichetta-codice">
      <p class="etichetta" id="etichetta-codice">{t.lobbyInvita}</p>
      <div class="riga-codice">
        <p class="codice" aria-label={vista.codice.split("").join(" ")}>{formattaCodice(vista.codice)}</p>
        <div class="azioni">
          <Pulsante variante="pieno" onClick={() => copia("codice")}>
            {copiato === "codice" ? `✓ ${t.lobbyCopiato}` : t.lobbyCopiaCodice}
          </Pulsante>
          {#if puoCondividere}
            <Pulsante variante="tonale" onClick={condividi}>{t.lobbyCondividi}</Pulsante>
          {:else}
            <Pulsante variante="tonale" onClick={() => copia("link")}>
              {copiato === "link" ? `✓ ${t.lobbyCopiato}` : t.lobbyCopiaLink}
            </Pulsante>
          {/if}
        </div>
      </div>
      <p class="solo-lettori" role="status">{copiato !== null ? t.copiato : ""}</p>
      {#if qr}
        <div class="qr" role="img" aria-label={t.lobbyQrEtichetta}>{@html qr}</div>
      {/if}
    </section>

    <section class="blocco">
      <h2>{riempi(t.lobbyGiocatori, { n: vista.giocatori.length })}</h2>
      {#if vista.giocatori.length === 0}
        <p class="nota">{t.lobbyNessunGiocatore}</p>
      {/if}
      <!-- Ordine fisso (d'ingresso): cambiare posto non sposta mai le righe. -->
      <ul class="elenco">
        {#each vista.giocatori as g (g.id)}
          {@const io = g.id === vista.io.id}
          {@const inMano = eHost && g.id === bersaglioId}
          <li>
            {#snippet riga()}
              <span class="nome">
                {g.nome}
                {#if io}<span class="tag">{t.lobbyIo}</span>{/if}
                {#if !g.connesso}<span class="tag spento">{t.nonConnesso}</span>{/if}
              </span>
              <span class="posto {g.squadra ?? ''}">{descriviPosto(g.squadra, g.ruolo)}</span>
            {/snippet}
            {#if eHost}
              <button
                type="button"
                class="giocatore toccabile"
                class:in-mano={inMano}
                aria-pressed={inMano}
                aria-label={riempi(t.lobbyCambiaPostoDiOra, { nome: g.nome, posto: descriviPosto(g.squadra, g.ruolo) })}
                onclick={() => seleziona(g.id)}
              >
                {@render riga()}
              </button>
            {:else}
              <div class="giocatore">
                {@render riga()}
              </div>
            {/if}
          </li>
        {/each}
      </ul>
    </section>

    {#if eHost}
      <section class="blocco">
        <Selettore
          etichetta={t.lobbyHostModo}
          opzioni={opzioniModo}
          valore={regia ? "regia" : "gioca"}
          onCambia={(v) => onRegia(v === "regia")}
        />
      </section>
    {/if}
  </div>

  {#snippet piede()}
    {#if eHost}
      <div class="piede-azioni">
        <p class="stato" class:ok={blocco === null} role="status">{blocco ?? t.lobbyPronti}</p>
        <Pulsante disabilitato={blocco !== null} onClick={onInizia}>{t.lobbyIniziaPartita}</Pulsante>
      </div>
    {:else}
      <div class="piede-azioni">
        <p class="stato" role="status">{t.lobbyAttesaGuest}</p>
        <Pulsante variante="contorno" onClick={onEsci}>{t.esci}</Pulsante>
      </div>
    {/if}
  {/snippet}
</Pagina>

<style>
  .contenuto {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-5);
  }
  .codice-blocco {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
    padding: var(--spazio-4);
    border-radius: var(--raggio-xl);
    border: var(--spessore-contorno) solid var(--colore-bordo-livello);
    background: var(--colore-contenitore-primario);
    color: var(--colore-su-contenitore-primario);
    text-align: center;
  }
  .etichetta {
    font: var(--testo-etichetta);
  }
  .riga-codice {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: var(--spazio-2) var(--spazio-3);
  }
  .codice {
    font: var(--testo-titolo-sezione);
    font-size: 1.75rem;
    letter-spacing: 0.08em;
    overflow-wrap: anywhere;
  }
  .azioni {
    display: flex;
    flex: 1 1 auto;
    justify-content: center;
    gap: var(--spazio-2);
  }
  .azioni :global(.pulsante) {
    width: auto;
    flex: 1 1 0;
    min-height: 48px;
    padding-left: var(--spazio-3);
    padding-right: var(--spazio-3);
  }
  .qr {
    align-self: center;
    width: min(60vw, 200px);
    padding: var(--spazio-2);
    border-radius: var(--raggio-m);
    background: #fff;
    line-height: 0;
  }
  .qr :global(svg) {
    width: 100%;
    height: auto;
  }
  .blocco {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-3);
  }
  h2 {
    font: var(--testo-titolo-sezione);
  }
  .elenco {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
  }
  .giocatore {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spazio-2);
    width: 100%;
    min-height: var(--altezza-tocco);
    padding: var(--spazio-2) var(--spazio-3);
    border: 2px solid transparent;
    border-radius: var(--raggio-m);
    background: var(--colore-contenitore-superficie);
    color: var(--colore-su-superficie);
    text-align: left;
    transition:
      background-color var(--molla-effetti),
      border-color var(--molla-effetti);
  }
  .toccabile {
    cursor: pointer;
  }
  .toccabile.in-mano {
    border-color: var(--colore-primario);
    background: var(--colore-contenitore-superficie-alto);
  }
  .nome {
    font: var(--testo-titolo);
    overflow-wrap: anywhere;
  }
  .tag {
    margin-left: var(--spazio-1);
    padding: 2px var(--spazio-2);
    border-radius: var(--raggio-pieno);
    font: var(--testo-didascalia);
    background: var(--colore-contenitore-secondario);
    color: var(--colore-su-contenitore-secondario);
  }
  .tag.spento {
    background: var(--colore-contenitore-errore);
    color: var(--colore-su-contenitore-errore);
  }
  .posto {
    font: var(--testo-etichetta);
    padding: 2px var(--spazio-3);
    border-radius: var(--raggio-pieno);
    background: var(--colore-contenitore-superficie-massimo);
    color: var(--colore-su-superficie);
  }
  .posto.rosso {
    background: var(--colore-avatar-0);
    color: var(--colore-su-avatar);
  }
  .posto.blu {
    background: var(--colore-avatar-4);
    color: var(--colore-su-avatar);
  }
  .nota {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
  .piede-azioni {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
  }
  .stato {
    font: var(--testo-etichetta);
    text-align: center;
    color: var(--colore-su-superficie-variante);
  }
  .stato.ok {
    color: var(--colore-primario);
  }
</style>
