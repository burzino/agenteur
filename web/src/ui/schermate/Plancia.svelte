<script lang="ts">
  import { onDestroy } from "svelte";
  import type { Indizio, Squadra, VistaCarta } from "../../gioco/modelli";
  import GrigliaCarte from "../componenti/GrigliaCarte.svelte";
  import Pagina from "../componenti/Pagina.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
  import { costruisciGriglia, istruzioneTurno, nomeSquadra } from "../logica";
  import { vibra } from "../schermo";
  import { riempi, t } from "../testi";

  interface Props {
    /** Vista gia' calcolata da `vistaPer` (25 carte; colore null se nascosto). */
    carte: VistaCarta[];
    squadraDiTurno: Squadra;
    indizio: Indizio | null;
    rimaste: Record<Squadra, number>;
    /** Vista Spia: i colori delle carte coperte compaiono (dietro il velo) come tinta + icona. */
    ePiaSpia: boolean;
    /** Squadra di chi guarda, per la pillola del ruolo; null se non assegnata. */
    squadraGiocatore: Squadra | null;
    /** Carte scoperte nel turno corrente (CA-32). */
    scopertiNelTurno: number;
    /** True solo per un Agente della squadra di turno con indizio dato: abilita tocco e "Termina turno". */
    puoAgire: boolean;
    /** Collegamento in riprovo: i pulsanti di azione sono disattivati e compare il motivo. */
    offline?: boolean;
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
    offline = false,
    onScopri,
    onTermina,
    onHome,
  }: Props = $props();

  const griglia = $derived(costruisciGriglia(carte, ePiaSpia));
  /** Carta scelta e in attesa della conferma leggera (barra in basso, niente finestra). */
  let scelta = $state<number | null>(null);
  const cartaScelta = $derived(scelta === null ? undefined : carte[scelta]);
  /** "Scopri" inviato: si attende il cambio di vista (al massimo 5 s). */
  let inAttesa = $state(false);
  let timerAttesa: ReturnType<typeof setTimeout> | undefined;

  function finisciAttesa(): void {
    clearTimeout(timerAttesa);
    inAttesa = false;
  }

  // La scelta decade se non si puo' piu' agire o se la carta e' stata scoperta nel frattempo.
  $effect(() => {
    if (scelta !== null && (!puoAgire || carte[scelta]?.scoperta !== false)) {
      scelta = null;
      finisciAttesa();
    }
  });

  // Vibrazione quando il proprio turno diventa attivo (U9).
  let eraAttivo = false;
  $effect(() => {
    if (puoAgire && !eraAttivo) vibra();
    eraAttivo = puoAgire;
  });

  // Striscia "chi ha scoperto cosa": confronto fra la vista precedente e la nuova (U7), per 4 s.
  let striscia = $state<string[]>([]);
  let timerStriscia: ReturnType<typeof setTimeout> | undefined;
  let precedente: { carte: VistaCarta[]; squadra: Squadra } | null = null;
  $effect(() => {
    const corrente = carte;
    const squadra = squadraDiTurno;
    if (precedente) {
      const nuove: string[] = [];
      const prima = precedente;
      corrente.forEach((c, i) => {
        if (c.scoperta && c.colore !== null && prima.carte[i]?.scoperta === false) {
          const colore = {
            rosso: t.coloreRosso,
            blu: t.coloreBlu,
            neutrale: t.coloreNeutrale,
            assassino: t.coloreAssassino,
          }[c.colore];
          nuove.push(riempi(t.planciaScopertaDa, { squadra: nomeSquadra(prima.squadra), parola: c.parola, colore }));
        }
      });
      if (nuove.length > 0) {
        striscia = nuove;
        clearTimeout(timerStriscia);
        timerStriscia = setTimeout(() => (striscia = []), 4000);
      }
    }
    precedente = { carte: corrente, squadra };
  });

  onDestroy(() => {
    clearTimeout(timerAttesa);
    clearTimeout(timerStriscia);
  });

  const squadraRuolo = $derived(
    squadraGiocatore === null
      ? null
      : riempi(t.planciaPillola, {
          ruolo: ePiaSpia ? t.ruoloSpia : t.ruoloAgente,
          squadra: nomeSquadra(squadraGiocatore),
        }),
  );
  const istruzione = $derived(
    istruzioneTurno({ squadraDiTurno, haIndizio: indizio !== null, puoAgire, ePiaSpia, squadraGiocatore }),
  );

  function tocca(i: number): void {
    if (inAttesa) return;
    scelta = scelta === i ? null : i;
  }

  function conferma(): void {
    const i = scelta;
    if (i === null || inAttesa || offline) return;
    inAttesa = true;
    clearTimeout(timerAttesa);
    timerAttesa = setTimeout(() => (inAttesa = false), 5000);
    onScopri(i);
  }

  function annulla(): void {
    scelta = null;
    finisciAttesa();
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
    {#if squadraGiocatore && squadraRuolo}
      <p class="pillola {squadraGiocatore}">
        {#if ePiaSpia}
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path
              fill="currentColor"
              d="M12 5C7 5 2.7 8.1 1 12.5 2.7 16.9 7 20 12 20s9.3-3.1 11-7.5C21.3 8.1 17 5 12 5m0 12.5a5 5 0 1 1 0-10 5 5 0 0 1 0 10m0-8a3 3 0 1 0 0 6 3 3 0 0 0 0-6"
            />
          </svg>
        {:else}
          <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
            <path fill="currentColor" d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9m0 2.25c-3 0-9 1.5-9 4.5V21h18v-2.25c0-3-6-4.5-9-4.5" />
          </svg>
        {/if}
        {squadraRuolo}
      </p>
    {/if}
    <p class="istruzione" class:tocca-a-te={puoAgire} role="status">{istruzione}</p>
    <p class="indizio">
      {#if indizio}
        <span class="etichetta">{t.planciaIndizio}</span>
        {riempi(t.planciaIndizioNumero, { parola: indizio.parola, numero: indizio.numero })}
      {:else}
        <span class="etichetta">{t.planciaNessunIndizio}</span>
      {/if}
    </p>
    {#if striscia.length > 0}
      <ul class="striscia" role="status">
        {#each striscia as riga (riga)}
          <li>{riga}</li>
        {/each}
      </ul>
    {/if}
  {/snippet}

  <GrigliaCarte
    carte={griglia}
    onTocca={puoAgire && !offline ? tocca : undefined}
    selezionata={scelta}
    velabile={ePiaSpia}
  />

  {#snippet piede()}
    {#if puoAgire && scelta !== null && cartaScelta}
      <div class="azioni conferma">
        {#if offline}
          <p class="nota">{t.riconnessioneInCorso}</p>
        {/if}
        <Pulsante onClick={conferma} inCorso={inAttesa} disabilitato={offline}
          >{riempi(t.planciaConferma, { parola: cartaScelta.parola })}</Pulsante
        >
        <Pulsante variante="contorno" onClick={annulla}>{t.annulla}</Pulsante>
      </div>
    {:else if puoAgire}
      <div class="azioni">
        <p class="nota">
          {offline ? t.riconnessioneInCorso : scopertiNelTurno === 0 ? t.planciaTerminaSpiega : t.planciaScegliCarta}
        </p>
        <Pulsante variante="tonale" onClick={onTermina} disabilitato={offline || scopertiNelTurno === 0}
          >{t.planciaTerminaTurno}</Pulsante
        >
      </div>
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
  /* Il proprio ruolo, sempre visibile: icona + testo + colore della squadra. */
  .pillola {
    display: inline-flex;
    align-items: center;
    gap: var(--spazio-2);
    margin-top: var(--spazio-2);
    padding: var(--spazio-1) var(--spazio-3);
    border-radius: var(--raggio-pieno);
    font: var(--testo-etichetta);
    color: var(--colore-su-avatar);
  }
  .pillola.rosso {
    background: var(--colore-avatar-0);
  }
  .pillola.blu {
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
  /* Chi ha scoperto cosa, per 4 s dopo il cambio di vista. */
  .striscia {
    margin: var(--spazio-2) 0 0;
    padding: var(--spazio-2) var(--spazio-3);
    list-style: none;
    border-radius: var(--raggio-m);
    background: var(--colore-contenitore-secondario);
    color: var(--colore-su-contenitore-secondario);
    font: var(--testo-corpo-piccolo);
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
