<script lang="ts">
  import type { Carta, Indizio, VistaCarta } from "../../gioco/modelli";
  import { validaIndizio } from "../../gioco/regole";
  import GrigliaCarte from "../componenti/GrigliaCarte.svelte";
  import CampoTesto from "../componenti/CampoTesto.svelte";
  import Pagina from "../componenti/Pagina.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
  import Selettore from "../componenti/Selettore.svelte";
  import { costruisciGriglia } from "../logica";
  import { riempi, t } from "../testi";

  interface Props {
    /** Le 25 parole della plancia (per rifiutare un indizio uguale a una di esse). */
    paroleDellaPlancia: string[];
    onInvia: (indizio: Indizio) => void;
    /** Motivo di un rifiuto arrivato dall'host, se c'e'. */
    erroreEsterno?: string;
    onHome?: () => void;
    /** Plancia con i colori (vista Spia): la Spia la guarda mentre sceglie l'indizio. */
    carte?: VistaCarta[];
  }
  let { paroleDellaPlancia, onInvia, erroreEsterno, onHome, carte }: Props = $props();

  let parola = $state("");
  let numero = $state("1");

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

  function invia(): void {
    if (esito.ok) onInvia({ parola: parola.trim(), numero: n });
  }
</script>

<Pagina titolo={t.indizioTitolo} {onHome}>
  <div class="form">
    {#if carte}
      <GrigliaCarte carte={costruisciGriglia(carte, true)} />
    {/if}
    <CampoTesto
      etichetta={t.indizioCampoParola}
      valore={parola}
      onCambia={(v) => (parola = v)}
      errore={errore ?? erroreEsterno}
    />
    <div class="numero">
      <Selettore
        etichetta={t.indizioCampoNumero}
        {opzioni}
        valore={numero}
        onCambia={(v) => (numero = v)}
        colonne={5}
      />
      <p>{spiegazione}</p>
    </div>
  </div>

  {#snippet piede()}
    <Pulsante disabilitato={!esito.ok} onClick={invia}>{t.indizioInvia}</Pulsante>
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
</style>
