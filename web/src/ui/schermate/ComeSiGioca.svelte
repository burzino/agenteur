<script lang="ts">
  import Pagina from "../componenti/Pagina.svelte";
  import { t } from "../testi";

  interface Props {
    onIndietro: () => void;
  }
  let { onIndietro }: Props = $props();

  const sezioni = [
    [t.regoleObiettivoTitolo, t.regoleObiettivo],
    [t.regolePlanciaTitolo, t.regolePlancia],
    [t.regoleRuoliTitolo, t.regoleRuoli],
    [t.regoleTurnoTitolo, t.regoleTurno],
    [t.regoleIndizioTitolo, t.regoleIndizio],
    [t.regoleScopertaTitolo, t.regoleScoperta],
    [t.regoleFineTurnoTitolo, t.regoleFineTurno],
    [t.regoleVittoriaTitolo, t.regoleVittoria],
  ] as const;
</script>

<Pagina titolo={t.regoleTitolo} {onIndietro}>
  <div class="regole">
    {#each sezioni as [titolo, testo] (titolo)}
      <section>
        <h2>{titolo}</h2>
        <p>{testo}</p>
      </section>
    {/each}
  </div>
</Pagina>

<style>
  .regole {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-4);
  }
  h2 {
    font: var(--testo-titolo-sezione);
    color: var(--colore-primario);
  }
  p {
    margin-top: var(--spazio-1);
    font: var(--testo-corpo);
  }
</style>
