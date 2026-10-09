<script lang="ts">
  import type { MotivoFine, Squadra, VistaCarta } from "../../gioco/modelli";
  import GrigliaCarte from "../componenti/GrigliaCarte.svelte";
  import Pagina from "../componenti/Pagina.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
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
    <h2 class={vincitore}>{riempi(t.fineVincono, { squadra: nomeSquadra(vincitore) })}</h2>
    <p>{motivo === "assassino" ? t.fineMotivoAssassino : t.fineMotivoCompletata}</p>
    <p class="nota">{t.fineColori}</p>
    <GrigliaCarte carte={griglia} />
  </div>

  {#snippet piede()}
    {#if eHost}
      <Pulsante onClick={onNuova}>{t.fineNuovaPartita}</Pulsante>
    {:else}
      <p class="attesa">{t.fineAttendeHost}</p>
    {/if}
  {/snippet}
</Pagina>

<style>
  .esito {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-3);
  }
  h2 {
    font: var(--testo-titolo-schermata);
  }
  h2.rosso {
    color: var(--colore-avatar-0);
  }
  h2.blu {
    color: var(--colore-avatar-4);
  }
  .nota,
  .attesa {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
  .attesa {
    text-align: center;
  }
</style>
