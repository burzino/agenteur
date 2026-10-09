<script lang="ts">
  import type { Indizio, Squadra, VistaCarta } from "../../gioco/modelli";
  import GrigliaCarte from "../componenti/GrigliaCarte.svelte";
  import Pagina from "../componenti/Pagina.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
  import { costruisciGriglia, istruzioneTurno, nomeSquadra } from "../logica";
  import { riempi, t } from "../testi";

  interface Props {
    /** Vista gia' calcolata da `vistaPer` (25 carte; colore null se nascosto). */
    carte: VistaCarta[];
    squadraDiTurno: Squadra;
    indizio: Indizio | null;
    rimaste: Record<Squadra, number>;
    /** Vista Spia: i colori delle carte coperte compaiono come tinta + icona. */
    ePiaSpia: boolean;
    /** Squadra di chi guarda, per l'etichetta del ruolo; null se non assegnata. */
    squadraGiocatore: Squadra | null;
    /** Carte scoperte nel turno corrente (CA-32). */
    scopertiNelTurno: number;
    /** True solo per un Agente della squadra di turno con indizio dato: abilita tocco e "Termina turno". */
    puoAgire: boolean;
    onScopri: (indice: number) => void;
    onTermina: () => void;
    onHome?: () => void;
  }
  let {
    carte,
    squadraDiTurno,
    indizio,
    rimaste,
    ePiaSpia,
    squadraGiocatore,
    scopertiNelTurno,
    puoAgire,
    onScopri,
    onTermina,
    onHome,
  }: Props = $props();

  const griglia = $derived(costruisciGriglia(carte, ePiaSpia));
  /** Carta scelta e in attesa della conferma leggera (barra in basso, niente finestra). */
  let scelta = $state<number | null>(null);
  const cartaScelta = $derived(scelta === null ? undefined : carte[scelta]);

  // La scelta decade se non si puo' piu' agire o se la carta e' stata scoperta nel frattempo.
  $effect(() => {
    if (scelta !== null && (!puoAgire || carte[scelta]?.scoperta !== false)) scelta = null;
  });

  const ruolo = $derived(
    squadraGiocatore === null
      ? null
      : riempi(ePiaSpia ? t.planciaSeiSpia : t.planciaSeiAgente, { squadra: nomeSquadra(squadraGiocatore) }),
  );
  const istruzione = $derived(
    istruzioneTurno({ squadraDiTurno, haIndizio: indizio !== null, puoAgire, ePiaSpia, squadraGiocatore }),
  );

  function tocca(i: number): void {
    scelta = scelta === i ? null : i;
  }

  function conferma(): void {
    const i = scelta;
    scelta = null;
    if (i !== null) onScopri(i);
  }
</script>

<Pagina titolo={t.planciaTitolo} {onHome}>
  {#snippet testata()}
    <div class="info">
      <p class="turno {squadraDiTurno}">{riempi(t.planciaTurno, { squadra: nomeSquadra(squadraDiTurno) })}</p>
      <ul class="rimaste" aria-label={t.planciaCarteRimaste}>
        <li class="conta rosso">
          <span class="num">{rimaste.rosso}</span>
          <span class="et">{t.planciaRosse}</span>
        </li>
        <li class="conta blu">
          <span class="num">{rimaste.blu}</span>
          <span class="et">{t.planciaBlu}</span>
        </li>
      </ul>
    </div>
    <p class="istruzione" class:tocca-a-te={puoAgire} role="status">{istruzione}</p>
    <p class="indizio">
      {#if indizio}
        <span class="etichetta">{t.planciaIndizio}</span>
        {riempi(t.planciaIndizioNumero, { parola: indizio.parola, numero: indizio.numero })}
      {:else}
        <span class="etichetta">{t.planciaNessunIndizio}</span>
      {/if}
    </p>
  {/snippet}

  <GrigliaCarte carte={griglia} onTocca={puoAgire ? tocca : undefined} selezionata={scelta} />

  {#snippet piede()}
    {#if puoAgire && scelta !== null && cartaScelta}
      <div class="azioni conferma">
        <Pulsante onClick={conferma}>{riempi(t.planciaConferma, { parola: cartaScelta.parola })}</Pulsante>
        <Pulsante variante="contorno" onClick={() => (scelta = null)}>{t.annulla}</Pulsante>
      </div>
    {:else if puoAgire}
      <div class="azioni">
        <p class="nota">{scopertiNelTurno === 0 ? t.planciaTerminaSpiega : t.planciaScegliCarta}</p>
        <Pulsante variante="tonale" onClick={onTermina} disabilitato={scopertiNelTurno === 0}
          >{t.planciaTerminaTurno}</Pulsante
        >
      </div>
    {:else if ruolo}
      <p class="nota centro">{ruolo}</p>
    {/if}
  {/snippet}
</Pagina>

<style>
  .info {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spazio-3);
  }
  .turno {
    font: var(--testo-titolo);
    padding: var(--spazio-2) var(--spazio-4);
    border-radius: var(--raggio-pieno);
    color: var(--colore-su-avatar);
  }
  .turno.rosso {
    background: var(--colore-avatar-0);
  }
  .turno.blu {
    background: var(--colore-avatar-4);
  }
  /* Contatori sempre visibili: numero grande + nome della squadra (non solo il colore). */
  .rimaste {
    display: flex;
    gap: var(--spazio-2);
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .conta {
    display: flex;
    flex-direction: column;
    align-items: center;
    min-width: 52px;
    padding: 2px var(--spazio-3);
    border-radius: var(--raggio-m);
    color: var(--colore-su-avatar);
  }
  .conta.rosso {
    background: var(--colore-avatar-0);
  }
  .conta.blu {
    background: var(--colore-avatar-4);
  }
  .num {
    font: var(--testo-titolo-sezione);
  }
  .et {
    font: var(--testo-didascalia);
  }
  .istruzione {
    margin-top: var(--spazio-2);
    font: var(--testo-titolo);
  }
  .istruzione.tocca-a-te {
    padding: var(--spazio-2) var(--spazio-3);
    border-radius: var(--raggio-m);
    background: var(--colore-contenitore-primario);
    color: var(--colore-su-contenitore-primario);
  }
  .indizio {
    margin-top: var(--spazio-1);
    font: var(--testo-titolo-sezione);
    overflow-wrap: anywhere;
  }
  .etichetta {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
    margin-right: var(--spazio-1);
  }
  .azioni {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
  }
  .nota {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
    text-align: center;
  }
</style>
