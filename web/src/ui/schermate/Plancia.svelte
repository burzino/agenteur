<script lang="ts">
  import type { Indizio, Squadra, VistaCarta } from "../../gioco/modelli";
  import DialogoConferma from "../componenti/DialogoConferma.svelte";
  import GrigliaCarte from "../componenti/GrigliaCarte.svelte";
  import Pagina from "../componenti/Pagina.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
  import { costruisciGriglia, nomeSquadra } from "../logica";
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
  let daConfermare = $state<number | null>(null);
  const cartaScelta = $derived(daConfermare === null ? undefined : carte[daConfermare]);

  const ruolo = $derived(
    squadraGiocatore === null
      ? null
      : riempi(ePiaSpia ? t.planciaSeiSpia : t.planciaSeiAgente, { squadra: nomeSquadra(squadraGiocatore) }),
  );

  function conferma(): void {
    const i = daConfermare;
    daConfermare = null;
    if (i !== null) onScopri(i);
  }
</script>

<Pagina titolo={t.planciaTitolo} {onHome}>
  {#snippet testata()}
    <div class="info">
      <p class="turno {squadraDiTurno}">{riempi(t.planciaTurno, { squadra: nomeSquadra(squadraDiTurno) })}</p>
      <p class="indizio">
        {#if indizio}
          <span class="etichetta">{t.planciaIndizio}</span>
          {riempi(t.planciaIndizioNumero, { parola: indizio.parola, numero: indizio.numero })}
        {:else}
          {t.planciaNessunIndizio}
        {/if}
      </p>
      <p class="rimaste">
        <span class="conta rosso" title={t.planciaRimasteRosse} aria-label="{t.planciaRimasteRosse}: {rimaste.rosso}"
          >{rimaste.rosso}</span
        >
        <span class="conta blu" title={t.planciaRimasteBlu} aria-label="{t.planciaRimasteBlu}: {rimaste.blu}"
          >{rimaste.blu}</span
        >
      </p>
    </div>
    {#if ruolo}<p class="ruolo">{ruolo}</p>{/if}
  {/snippet}

  <GrigliaCarte carte={griglia} onTocca={puoAgire ? (i) => (daConfermare = i) : undefined} />

  {#snippet piede()}
    {#if puoAgire}
      <Pulsante onClick={onTermina} disabilitato={scopertiNelTurno === 0}>{t.planciaTerminaTurno}</Pulsante>
    {/if}
  {/snippet}
</Pagina>

<DialogoConferma
  aperto={daConfermare !== null}
  titolo={riempi(t.scopriTitolo, { parola: cartaScelta?.parola ?? "" })}
  messaggio={t.scopriMessaggio}
  etichettaSi={t.scopriConferma}
  etichettaNo={t.scopriAnnulla}
  onSi={conferma}
  onNo={() => (daConfermare = null)}
/>

<style>
  .info {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spazio-1) var(--spazio-3);
  }
  .turno {
    font: var(--testo-etichetta);
    padding: var(--spazio-1) var(--spazio-3);
    border-radius: var(--raggio-pieno);
    color: var(--colore-su-avatar);
  }
  .turno.rosso {
    background: var(--colore-avatar-0);
  }
  .turno.blu {
    background: var(--colore-avatar-4);
  }
  .indizio {
    flex: 1;
    min-width: 0;
    font: var(--testo-titolo);
    overflow-wrap: anywhere;
  }
  .etichetta {
    font: var(--testo-didascalia);
    color: var(--colore-su-superficie-variante);
    margin-right: var(--spazio-1);
  }
  .rimaste {
    display: flex;
    gap: var(--spazio-2);
  }
  .conta {
    min-width: 32px;
    padding: 2px var(--spazio-2);
    border-radius: var(--raggio-pieno);
    font: var(--testo-etichetta);
    text-align: center;
    color: var(--colore-su-avatar);
  }
  .conta.rosso {
    background: var(--colore-avatar-0);
  }
  .conta.blu {
    background: var(--colore-avatar-4);
  }
  .ruolo {
    margin-top: var(--spazio-1);
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
</style>
