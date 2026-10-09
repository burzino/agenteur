<script lang="ts">
  import type { Ruolo, Squadra } from "../../gioco/modelli";
  import type { GiocatoreVista } from "../../rete/contratto";
  import { chiavePosto, nomeRuolo, nomeSquadra } from "../logica";
  import { riempi, t } from "../testi";

  interface Props {
    giocatori: GiocatoreVista[];
    /** Giocatore di cui si sceglie il posto (l'host puo' scegliere per altri). */
    bersaglioId: string;
    /** Chi guarda: serve a scrivere "tu" al posto del nome. */
    ioId: string;
    /** Posto scelto e non ancora confermato dall'host (solo guest), es. "blu-spia". */
    inAttesa?: string | null;
    onScegli: (squadra: Squadra, ruolo: Ruolo) => void;
  }
  let { giocatori, bersaglioId, ioId, inAttesa = null, onScegli }: Props = $props();

  const SQUADRE: Squadra[] = ["rosso", "blu"];
  const RUOLI: Ruolo[] = ["spia", "agente"];
  // Ordine di lettura: righe = ruoli, colonne = squadre (Rossa a sinistra, Blu a destra).
  const POSTI = RUOLI.flatMap((ruolo) => SQUADRE.map((squadra) => ({ squadra, ruolo })));

  const bersaglio = $derived(giocatori.find((g) => g.id === bersaglioId));

  function occupanti(squadra: Squadra, ruolo: Ruolo): string[] {
    return giocatori
      .filter((g) => g.squadra === squadra && g.ruolo === ruolo)
      .map((g) => (g.id === ioId ? t.lobbyPostoTuo : g.nome));
  }
</script>

<div class="posti" role="group" aria-label={riempi(t.lobbyPostoDi, { nome: bersaglio?.nome ?? "" })}>
  {#each POSTI as p (chiavePosto(p.squadra, p.ruolo))}
    {@const chiave = chiavePosto(p.squadra, p.ruolo)}
    {@const mio = bersaglio?.squadra === p.squadra && bersaglio?.ruolo === p.ruolo}
    {@const attesa = !mio && inAttesa === chiave}
    {@const nomi = occupanti(p.squadra, p.ruolo)}
    <button
      type="button"
      class="posto {p.squadra}"
      class:mio
      class:attesa
      aria-pressed={mio || attesa}
      onclick={() => onScegli(p.squadra, p.ruolo)}
    >
      <span class="titolo">
        {#if mio}
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="m9.55 17.65-4.4-4.4 1.4-1.4 3 3 7.9-7.9 1.4 1.4z" />
          </svg>
        {/if}
        {nomeSquadra(p.squadra)} · {nomeRuolo(p.ruolo)}
      </span>
      <span class="chi">
        {#if attesa}
          {t.lobbyPostoInAttesa}
        {:else if nomi.length === 0}
          {t.lobbyPostoLibero}
        {:else}
          {nomi.join(", ")}
        {/if}
      </span>
    </button>
  {/each}
</div>

<style>
  .posti {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: var(--spazio-2);
  }
  /* Bersaglio di tocco ampio; il colore della squadra e' anche nel testo ("Rossa · Spia"). */
  .posto {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 2px;
    min-height: 72px;
    padding: var(--spazio-3);
    border: 2px solid var(--colore-contorno);
    border-radius: var(--raggio-l);
    background: var(--colore-contenitore-superficie-alto);
    color: var(--colore-su-superficie);
    text-align: left;
    cursor: pointer;
    transition:
      background-color var(--molla-effetti),
      border-color var(--molla-effetti),
      transform var(--durata-veloce) ease-out;
  }
  .posto.rosso {
    border-color: var(--colore-avatar-0);
  }
  .posto.blu {
    border-color: var(--colore-avatar-4);
  }
  .posto:active {
    transform: scale(0.97);
  }
  /* Scelto: colore pieno della squadra, testo bianco. */
  .posto.mio {
    color: var(--colore-su-avatar);
  }
  .posto.mio.rosso {
    background: var(--colore-avatar-0);
  }
  .posto.mio.blu {
    background: var(--colore-avatar-4);
  }
  /* In attesa dell'host: tratteggio e tinta leggera, poi diventa pieno o torna com'era. */
  .posto.attesa {
    border-style: dashed;
  }
  .posto.attesa.rosso {
    background: color-mix(in srgb, var(--colore-avatar-0) 22%, var(--colore-contenitore-superficie-alto));
  }
  .posto.attesa.blu {
    background: color-mix(in srgb, var(--colore-avatar-4) 22%, var(--colore-contenitore-superficie-alto));
  }
  .titolo {
    display: inline-flex;
    align-items: center;
    gap: var(--spazio-1);
    font: var(--testo-titolo);
  }
  .chi {
    max-width: 100%;
    font: var(--testo-corpo-piccolo);
    overflow-wrap: anywhere;
  }
  :global([data-tema="alto-contrasto"]) .posto.mio {
    outline: 3px solid var(--colore-primario);
    outline-offset: 2px;
  }
</style>
