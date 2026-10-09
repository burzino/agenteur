<script lang="ts">
  import { onMount } from "svelte";
  import Pagina from "../componenti/Pagina.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
  import Spinner from "../componenti/Spinner.svelte";
  import { formattaCodice } from "../logica";
  import { riempi, t } from "../testi";

  interface Props {
    intento: "crea" | "unisciti" | "riprendi";
    /** Codice che si sta cercando (solo "unisciti"). */
    codice?: string;
    onAnnulla: () => void;
  }
  let { intento, codice = "", onAnnulla }: Props = $props();

  const SOGLIA_LENTA_MS = 8000;
  let lenta = $state(false);

  onMount(() => {
    const timer = setTimeout(() => (lenta = true), SOGLIA_LENTA_MS);
    return () => clearTimeout(timer);
  });

  const titolo = $derived(
    intento === "crea" ? t.creazioneInCorso : intento === "unisciti" ? t.collegamentoInCorso : t.rientroInCorso,
  );
  const sotto = $derived(
    intento === "crea"
      ? t.creazioneSotto
      : intento === "unisciti"
        ? riempi(t.collegamentoSotto, { codice: formattaCodice(codice) })
        : null,
  );
</script>

<Pagina titolo={t.connessioneTitolo}>
  <div class="centro" role="status" aria-live="polite">
    <Spinner misura={3} />
    <p class="titolo">{titolo}</p>
    {#if sotto}<p class="sotto">{sotto}</p>{/if}
    {#if lenta}<p class="sotto lenta">{t.connessioneLenta}</p>{/if}
  </div>
  {#snippet piede()}
    <Pulsante variante="contorno" onClick={onAnnulla}>{t.annulla}</Pulsante>
  {/snippet}
</Pagina>

<style>
  .centro {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--spazio-3);
    padding-top: var(--spazio-7);
    text-align: center;
  }
  .titolo {
    font: var(--testo-titolo-sezione);
  }
  .sotto {
    font: var(--testo-corpo);
    color: var(--colore-su-superficie-variante);
  }
  .lenta {
    padding: var(--spazio-3) var(--spazio-4);
    border-radius: var(--raggio-m);
    background: var(--colore-contenitore-secondario);
    color: var(--colore-su-contenitore-secondario);
    font: var(--testo-corpo-piccolo);
  }
</style>
