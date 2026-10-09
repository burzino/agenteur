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

  // D4: vibrazione al proprio turno, chiave `agenteur.vibrazione` ("1" / "0"); se manca o lo storage non c'e', e' attiva.
  const CHIAVE_VIBRAZIONE = "agenteur.vibrazione";
  function leggiVibrazione(): boolean {
    try {
      return localStorage.getItem(CHIAVE_VIBRAZIONE) !== "0";
    } catch {
      return true;
    }
  }
  let vibra = $state(leggiVibrazione());
  const opzioniVibra = [
    { valore: "si", etichetta: t.impostazioniVibraAttiva },
    { valore: "no", etichetta: t.impostazioniVibraSpenta },
  ];

  function cambiaVibra(v: string): void {
    vibra = v === "si";
    try {
      localStorage.setItem(CHIAVE_VIBRAZIONE, vibra ? "1" : "0");
    } catch {
      /* storage non disponibile: vale solo per questa sessione */
    }
  }
</script>

<Pagina titolo={t.impostazioniTitolo} {onIndietro}>
  <section class="blocco">
    <Selettore etichetta={t.homeTemaEtichetta} opzioni={opzioniTema} valore={tema} onCambia={cambiaTema} colonne={2} />
    <p class="nota">{t.impostazioniAspettoAiuto}</p>
  </section>
  <section class="blocco">
    <Selettore
      etichetta={t.impostazioniVibra}
      opzioni={opzioniVibra}
      valore={vibra ? "si" : "no"}
      onCambia={cambiaVibra}
      colonne={2}
    />
    <p class="nota">{t.impostazioniVibraAiuto}</p>
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
