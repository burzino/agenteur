<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import type { Carta, Indizio, VistaCarta } from "../../gioco/modelli";
  import { validaIndizio } from "../../gioco/regole";
  import GrigliaCarte from "../componenti/GrigliaCarte.svelte";
  import CampoTesto from "../componenti/CampoTesto.svelte";
  import Pagina from "../componenti/Pagina.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
  import Selettore from "../componenti/Selettore.svelte";
  import { costruisciGriglia } from "../logica";
  import { vibra } from "../schermo";
  import { riempi, t } from "../testi";

  interface Props {
    /** Le 25 parole della plancia (per rifiutare un indizio uguale a una di esse). */
    paroleDellaPlancia: string[];
    onInvia: (indizio: Indizio) => void;
    /** Motivo di un rifiuto arrivato dall'host, se c'e'. */
    erroreEsterno?: string;
    onHome?: () => void;
    /** Plancia con i colori (vista Spia, dietro il velo): la Spia la guarda mentre sceglie l'indizio. */
    carte?: VistaCarta[];
    /** Collegamento in riprovo: "Invia" e' disattivato e compare il motivo. */
    offline?: boolean;
  }
  let { paroleDellaPlancia, onInvia, erroreEsterno, onHome, carte, offline = false }: Props = $props();

  let parola = $state("");
  let numero = $state("1");
  /** "Invia" premuto: si attende il cambio di vista (la schermata sparisce da sola). */
  let inCorso = $state(false);
  let timerInCorso: ReturnType<typeof setTimeout> | undefined;

  const opzioni = Array.from({ length: 10 }, (_, i) => ({ valore: String(i), etichetta: String(i) }));
  const n = $derived(Number(numero));

  // validaIndizio guarda solo le parole; il colore qui non conta.
  const plancia = $derived<Carta[]>(
    paroleDellaPlancia.map((p) => ({ parola: p, colore: "neutrale", scoperta: false })),
  );
  const esito = $derived(validaIndizio({ parola, numero: n }, plancia));
  const errore = $derived(parola.trim() === "" ? undefined : esito.ok ? undefined : esito.motivo);

  const spiegazione = $derived(
    n === 0 ? t.indizioSpiegaZero : riempi(t.indizioSpiegaNumero, { max: n + 1 }),
  );

  onMount(() => vibra());
  onDestroy(() => clearTimeout(timerInCorso));

  // Un rifiuto dell'host sblocca di nuovo il pulsante.
  $effect(() => {
    if (erroreEsterno) {
      clearTimeout(timerInCorso);
      inCorso = false;
    }
  });

  function invia(): void {
    if (!esito.ok || inCorso || offline) return;
    inCorso = true;
    clearTimeout(timerInCorso);
    // Rete di sicurezza: se la risposta non arriva, si puo' riprovare.
    timerInCorso = setTimeout(() => (inCorso = false), 8000);
    onInvia({ parola: parola.trim(), numero: n });
  }

  /** Attributi della tastiera che `CampoTesto` non espone: tasto "Invia", niente autocorrezione. */
  function tastieraIndizio(nodo: HTMLElement) {
    const campo = nodo.querySelector("input");
    campo?.setAttribute("enterkeyhint", "send");
    campo?.setAttribute("autocorrect", "off");
    campo?.setAttribute("autocapitalize", "off");
    campo?.setAttribute("spellcheck", "false");
  }
</script>

<Pagina titolo={t.indizioTitolo} {onHome}>
  <div class="form">
    {#if carte}
      <GrigliaCarte carte={costruisciGriglia(carte, true)} velabile />
    {/if}
    <form
      use:tastieraIndizio
      onsubmit={(e) => {
        e.preventDefault();
        invia();
      }}
    >
      <CampoTesto
        etichetta={t.indizioCampoParola}
        valore={parola}
        onCambia={(v) => (parola = v)}
        errore={errore ?? erroreEsterno}
        maxLunghezza={24}
      />
    </form>
    <div class="numero">
      <Selettore
        etichetta={t.indizioCampoNumero}
        {opzioni}
        valore={numero}
        onCambia={(v) => (numero = v)}
        colonne={5}
      />
      <p class:zero={n === 0}>{spiegazione}</p>
    </div>
  </div>

  {#snippet piede()}
    {#if offline}
      <p class="nota">{t.riconnessioneInCorso}</p>
    {/if}
    <Pulsante disabilitato={!esito.ok || offline} {inCorso} onClick={invia}>{t.indizioInvia}</Pulsante>
  {/snippet}
</Pagina>

<style>
  .form {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-5);
  }
  .numero {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
  }
  p {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
  /* Lo 0 e' un caso speciale (nessun limite chiaro): la frase risalta. */
  p.zero {
    padding: var(--spazio-2) var(--spazio-3);
    border-radius: var(--raggio-m);
    background: var(--colore-contenitore-primario);
    color: var(--colore-su-contenitore-primario);
  }
  .nota {
    margin-bottom: var(--spazio-2);
    text-align: center;
  }
</style>
