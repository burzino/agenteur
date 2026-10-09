<script lang="ts">
  import type { MotivoFine, Squadra, VistaCarta } from "../../gioco/modelli";
  import GrigliaCarte from "../componenti/GrigliaCarte.svelte";
  import Pagina from "../componenti/Pagina.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
  import Spinner from "../componenti/Spinner.svelte";
  import { costruisciGriglia, nomeSquadra } from "../logica";
  import { riempi, t } from "../testi";

  interface Props {
    vincitore: Squadra;
    motivo: MotivoFine;
    /** Plancia con tutti i colori visibili (calcolata fuori, a fine partita). */
    carte: VistaCarta[];
    /** Solo l'host puo' avviare una nuova partita. */
    eHost: boolean;
    onNuova: () => void;
    onHome?: () => void;
  }
  let { vincitore, motivo, carte, eHost, onNuova, onHome }: Props = $props();

  const griglia = $derived(costruisciGriglia(carte, true));
</script>

<Pagina titolo={t.fineTitolo} {onHome}>
  <div class="esito">
    <section class="vincitore {vincitore}" role="status">
      <p class="etichetta">{t.fineVincitore}</p>
      <h2>{riempi(t.fineVincono, { squadra: nomeSquadra(vincitore) })}</h2>
      <p>{motivo === "assassino" ? t.fineMotivoAssassino : t.fineMotivoCompletata}</p>
    </section>
    <p class="nota">{t.fineColori}</p>
    <GrigliaCarte carte={griglia} />
  </div>

  {#snippet piede()}
    {#if eHost}
      <Pulsante onClick={onNuova}>{t.fineNuovaPartita}</Pulsante>
    {:else}
      <p class="attesa" role="status">
        <Spinner misura={1.25} />
        {t.fineAttendeHost}
      </p>
    {/if}
  {/snippet}
</Pagina>

<style>
  .esito {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-3);
  }
  /* Vincitore in evidenza: pannello a tinta piena della squadra, testo bianco (AA). */
  .vincitore {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-1);
    padding: var(--spazio-5) var(--spazio-4);
    border-radius: var(--raggio-xl);
    text-align: center;
    color: var(--colore-su-avatar);
  }
  .vincitore.rosso {
    background: var(--colore-avatar-0);
  }
  .vincitore.blu {
    background: var(--colore-avatar-4);
  }
  .etichetta {
    font: var(--testo-etichetta);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  h2 {
    font: var(--testo-display);
    font-size: max(2rem, 1.75rem);
    line-height: 1.15;
  }
  .nota {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
  .attesa {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: var(--spazio-3);
    min-height: var(--altezza-pulsante);
    font: var(--testo-corpo);
    color: var(--colore-su-superficie-variante);
  }
</style>
