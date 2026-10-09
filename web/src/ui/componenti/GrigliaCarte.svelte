<script lang="ts">
  import type { CartaGriglia } from "../logica";
  import { riempi, t } from "../testi";

  interface Props {
    carte: CartaGriglia[];
    /** Tocco su una carta non scoperta; senza, la griglia e' di sola lettura. */
    onTocca?: (indice: number) => void;
    /** Carta scelta in attesa di conferma (evidenziata). */
    selezionata?: number | null;
    /**
     * Vista Spia con velo: i colori delle carte coperte restano nascosti e compare il pulsante
     * "Tieni premuto per vedere"; il velo torna su quando il dito si alza.
     */
    velabile?: boolean;
  }
  let { carte, onTocca, selezionata = null, velabile = false }: Props = $props();

  /** True solo mentre il pulsante e' tenuto premuto. */
  let premuto = $state(false);
  const velo = $derived(velabile && !premuto);

  const mostrate = $derived(
    velo
      ? carte.map((c) =>
          c.scoperta
            ? c
            : { ...c, stile: null, suggerito: false, etichettaAria: riempi(t.planciaCartaNascosta, { parola: c.parola }) },
        )
      : carte,
  );

  // Il velo torna su anche se la pagina passa in background o se la griglia non e' piu' velabile.
  $effect(() => {
    if (!velabile) premuto = false;
  });
  $effect(() => {
    const alCambio = (): void => {
      if (document.visibilityState === "hidden") premuto = false;
    };
    document.addEventListener("visibilitychange", alCambio);
    return () => document.removeEventListener("visibilitychange", alCambio);
  });

  function giu(e: PointerEvent): void {
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignorato
    }
    premuto = true;
  }
  function su(): void {
    premuto = false;
  }
  function tastoGiu(e: KeyboardEvent): void {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      premuto = true;
    }
  }
  function tastoSu(e: KeyboardEvent): void {
    if (e.key === " " || e.key === "Enter") premuto = false;
  }

  // Icone (forme, non solo colore): rosso triangolo, blu quadrato, neutrale trattino, assassino croce.
  const ICONE: Record<string, string> = {
    rosso: "M12 4 21 20H3z",
    blu: "M5 5h14v14H5z",
    neutrale: "M5 11h14v2H5z",
    assassino: "M6.4 5 12 10.6 17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6 10.6 12 5 6.4z",
  };
</script>

<div class="griglia" role="group" aria-label={t.planciaTitolo}>
  {#each mostrate as c (c.indice)}
    {@const attiva = !!onTocca && !c.scoperta}
    <button
      type="button"
      class="carta {c.stile ?? 'nascosta'}"
      class:scoperta={c.scoperta}
      class:suggerito={c.suggerito}
      class:scelta={c.indice === selezionata}
      class:attiva
      aria-pressed={attiva ? c.indice === selezionata : undefined}
      disabled={!attiva}
      aria-label={c.etichettaAria}
      onclick={() => onTocca?.(c.indice)}
    >
      {#if c.stile}
        <svg class="icona {c.stile}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path fill="currentColor" d={ICONE[c.stile]} />
        </svg>
      {/if}
      <span class="parola">{c.parola}</span>
    </button>
  {/each}
</div>

{#if velabile}
  <button
    type="button"
    class="velo"
    class:premuto
    aria-pressed={premuto}
    onpointerdown={giu}
    onpointerup={su}
    onpointercancel={su}
    onlostpointercapture={su}
    onkeydown={tastoGiu}
    onkeyup={tastoSu}
    onblur={su}
    oncontextmenu={(e) => e.preventDefault()}
  >
    {t.planciaVelo}
  </button>
{/if}

<style>
  .griglia {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    grid-template-rows: repeat(5, minmax(0, 1fr));
    gap: 3px;
    /* Bordo largo: la griglia sporge fino a 8 px dal bordo dello schermo. */
    margin-inline: calc(var(--spazio-2) - var(--margine-schermata));
    width: calc(100% + 2 * (var(--margine-schermata) - var(--spazio-2)));
    aspect-ratio: 1;
  }
  .carta {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    min-width: 0;
    min-height: 0;
    padding: 2px;
    border: 1px solid var(--colore-contorno-variante);
    border-radius: var(--raggio-s);
    background: var(--colore-contenitore-superficie-alto);
    color: var(--colore-su-superficie);
    cursor: pointer;
    overflow: hidden;
    transition:
      transform var(--durata-veloce) ease-out,
      background-color var(--molla-effetti);
  }
  .carta:disabled {
    cursor: default;
  }
  .carta:not(:disabled):active {
    transform: scale(0.96);
  }
  /* Carte su cui si puo' agire: bordo piu' marcato, cosi' si capisce che si toccano. */
  .carta.attiva {
    border-color: var(--colore-contorno);
  }
  /* Carta scelta, in attesa di conferma: anello e leggero ingrandimento. */
  .carta.scelta {
    z-index: 1;
    border-color: var(--colore-primario);
    outline: 4px solid var(--colore-primario);
    outline-offset: -1px;
    transform: scale(1.06);
  }
  .carta.scelta .parola {
    font-weight: 800;
  }
  .parola {
    max-width: 100%;
    font: var(--testo-didascalia);
    font-size: clamp(0.7rem, 3.1vw, 0.85rem);
    font-weight: 600;
    line-height: 1.1;
    text-align: center;
    /* Va a capo sulle sillabe (lang="it"); break-word solo come rete di sicurezza per le parole piu' lunghe. */
    overflow-wrap: break-word;
    hyphens: auto;
  }
  .icona {
    flex: none;
    width: 14px;
    height: 14px;
  }
  .icona.neutrale {
    width: 18px;
    height: 18px;
  }

  /* Spia, carta coperta: tinta leggera + icona */
  .suggerito.rosso {
    background: color-mix(in srgb, var(--colore-avatar-0) 22%, var(--colore-contenitore-superficie-alto));
    border-color: var(--colore-avatar-0);
  }
  .suggerito.blu {
    background: color-mix(in srgb, var(--colore-avatar-4) 22%, var(--colore-contenitore-superficie-alto));
    border-color: var(--colore-avatar-4);
  }
  .suggerito.neutrale {
    background: var(--colore-superficie-variante);
    border-style: dashed;
  }
  .suggerito.assassino {
    border-color: var(--colore-su-superficie);
    border-width: 2px;
  }

  /* Carta scoperta: colore pieno, icona e parola barrata (niente trasparenza) */
  .scoperta.rosso {
    background: var(--colore-avatar-0);
    border-color: var(--colore-avatar-0);
    color: var(--colore-su-avatar);
  }
  .scoperta.blu {
    background: var(--colore-avatar-4);
    border-color: var(--colore-avatar-4);
    color: var(--colore-su-avatar);
  }
  .scoperta.neutrale {
    background: var(--colore-superficie-variante);
    border-style: dashed;
    color: var(--colore-su-superficie-variante);
  }
  .scoperta.assassino {
    background: var(--colore-su-superficie);
    border-color: var(--colore-su-superficie);
    color: var(--colore-superficie);
  }
  .scoperta .parola {
    text-decoration: line-through;
    text-decoration-thickness: 1px;
  }

  /* Pulsante "Tieni premuto per vedere": il gesto e' lo stesso di Imposteur. */
  .velo {
    display: block;
    width: 100%;
    min-height: var(--altezza-tocco);
    margin-top: var(--spazio-3);
    padding: var(--spazio-2) var(--spazio-4);
    border: 2px solid var(--colore-primario);
    border-radius: var(--raggio-pieno);
    background: transparent;
    color: var(--colore-primario);
    font: var(--testo-titolo);
    cursor: pointer;
    touch-action: none;
    user-select: none;
    -webkit-user-select: none;
    -webkit-touch-callout: none;
  }
  .velo.premuto {
    background: var(--colore-primario);
    color: var(--colore-su-primario);
  }
</style>
