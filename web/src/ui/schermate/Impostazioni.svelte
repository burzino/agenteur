<script lang="ts">
  import Pagina from "../componenti/Pagina.svelte";
  import Selettore from "../componenti/Selettore.svelte";
  import { t } from "../testi";
  import { applicaTema, leggiTema, salvaTema, TEMI, type Tema } from "../tema";

  interface Props {
    onIndietro: () => void;
  }
  let { onIndietro }: Props = $props();

  // CA-35: tema Sistema / Chiaro / Scuro / Alto contrasto, salvato in `agenteur.aspetto`.
  let tema = $state<Tema>(leggiTema());
  const ETICHETTE_TEMA: Record<Tema, string> = {
    SISTEMA: t.temaSistema,
    CHIARO: t.temaChiaro,
    SCURO: t.temaScuro,
    ALTO_CONTRASTO: t.temaAltoContrasto,
  };
  const opzioniTema = TEMI.map((x) => ({ valore: x, etichetta: ETICHETTE_TEMA[x] }));

  function cambiaTema(v: string): void {
    const nuovo = TEMI.find((x) => x === v);
    if (!nuovo) return;
    tema = nuovo;
    salvaTema(nuovo);
    applicaTema(nuovo);
  }
</script>

<Pagina titolo={t.impostazioniTitolo} {onIndietro}>
  <section class="blocco">
    <Selettore etichetta={t.homeTemaEtichetta} opzioni={opzioniTema} valore={tema} onCambia={cambiaTema} colonne={2} />
    <p class="nota">{t.impostazioniAspettoAiuto}</p>
  </section>
</Pagina>

<style>
  .blocco {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
  }
  .nota {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
</style>
