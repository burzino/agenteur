<script lang="ts">
  import type { Ruolo, Squadra } from "../../gioco/modelli";
  import { puoIniziare } from "../../gioco/regole";
  import type { VistaGiocatore } from "../../rete/contratto";
  import Pagina from "../componenti/Pagina.svelte";
  import Pulsante from "../componenti/Pulsante.svelte";
  import Selettore from "../componenti/Selettore.svelte";
  import { mostraToast } from "../componenti/notifiche.svelte";
  import { descriviPosto } from "../logica";
  import { riempi, t } from "../testi";

  interface Props {
    vista: VistaGiocatore;
    eHost: boolean;
    /** Host che non gioca (D4): non ha un posto. */
    regia: boolean;
    onScegli: (idGiocatore: string, squadra: Squadra, ruolo: Ruolo) => void;
    onRegia: (regia: boolean) => void;
    onInizia: () => void;
    onEsci: () => void;
  }
  let { vista, eHost, regia, onScegli, onRegia, onInizia, onEsci }: Props = $props();

  const opzioniPosto = [
    { valore: "rosso-spia", etichetta: t.lobbyPostoRossoSpia },
    { valore: "rosso-agente", etichetta: t.lobbyPostoRossoAgente },
    { valore: "blu-spia", etichetta: t.lobbyPostoBluSpia },
    { valore: "blu-agente", etichetta: t.lobbyPostoBluAgente },
  ];
  const opzioniModo = [
    { valore: "gioca", etichetta: t.lobbyHostGioca },
    { valore: "regia", etichetta: t.lobbyHostRegia },
  ];

  // CA-13 / CA-31: "Inizia" solo se le regole sono soddisfatte (l'host regia non e' nell'elenco).
  const avvio = $derived(puoIniziare(vista.giocatori));
  const link = $derived(`${window.location.origin}${import.meta.env.BASE_URL}#/unisciti/${vista.codice}`);

  function valorePosto(squadra: Squadra | null, ruolo: Ruolo | null): string {
    return squadra !== null && ruolo !== null ? `${squadra}-${ruolo}` : "";
  }

  function scegli(id: string, v: string): void {
    const [squadra, ruolo] = v.split("-");
    if ((squadra === "rosso" || squadra === "blu") && (ruolo === "spia" || ruolo === "agente")) {
      onScegli(id, squadra, ruolo);
    }
  }

  async function copia(testo: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(testo);
      mostraToast(t.copiato);
    } catch {
      mostraToast(t.copiaNonRiuscita);
    }
  }

  const mioPosto = $derived(descriviPosto(vista.io.squadra, vista.io.ruolo));
</script>

<Pagina titolo={t.lobbyTitolo} onHome={onEsci}>
  <div class="contenuto">
    <section class="codice-blocco">
      <p class="etichetta">{t.lobbyCodice}</p>
      <p class="codice" aria-label={vista.codice.split("").join(" ")}>{vista.codice}</p>
      {#if eHost}
        <div class="azioni">
          <Pulsante variante="tonale" onClick={() => copia(vista.codice)}>{t.lobbyCopiaCodice}</Pulsante>
          <Pulsante variante="contorno" onClick={() => copia(link)}>{t.lobbyCopiaLink}</Pulsante>
        </div>
        <p class="link">{link}</p>
      {/if}
    </section>

    {#if eHost}
      <section class="blocco">
        <Selettore
          etichetta={t.lobbyHostModo}
          opzioni={opzioniModo}
          valore={regia ? "regia" : "gioca"}
          onCambia={(v) => onRegia(v === "regia")}
        />
      </section>
    {:else}
      <p class="mio">{riempi(t.lobbyRuoloTuo, { posto: mioPosto })}</p>
    {/if}

    <section class="blocco">
      <h2>{riempi(t.lobbyGiocatori, { n: vista.giocatori.length })}</h2>
      {#if vista.giocatori.length === 0}
        <p class="nota">{t.lobbyNessunGiocatore}</p>
      {/if}
      <ul class="elenco">
        {#each vista.giocatori as g (g.id)}
          {@const io = g.id === vista.io.id}
          {@const modificabile = eHost || io}
          <li class="giocatore">
            <div class="riga">
              <span class="nome">
                {g.nome}
                {#if io}<span class="tag">{t.lobbyIo}</span>{/if}
                {#if !g.connesso}<span class="tag spento">{t.nonConnesso}</span>{/if}
              </span>
              {#if !modificabile}
                <span class="posto {g.squadra ?? ''}">{descriviPosto(g.squadra, g.ruolo)}</span>
              {/if}
            </div>
            {#if modificabile}
              <Selettore
                etichetta={riempi(t.lobbyScegliDi, { nome: g.nome })}
                opzioni={opzioniPosto}
                valore={valorePosto(g.squadra, g.ruolo)}
                onCambia={(v) => scegli(g.id, v)}
                colonne={2}
              />
            {/if}
          </li>
        {/each}
      </ul>
    </section>

    {#if eHost && !avvio.ok}
      <p class="nota" role="status">{avvio.motivo} {t.lobbyRegolaIniziare}</p>
    {/if}
  </div>

  {#snippet piede()}
    {#if eHost}
      <div class="piede-azioni">
        <Pulsante disabilitato={!avvio.ok} onClick={onInizia}>{t.lobbyIniziaPartita}</Pulsante>
        <Pulsante variante="testo" onClick={onEsci}>{t.esci}</Pulsante>
      </div>
    {:else}
      <div class="piede-azioni">
        <p class="nota centro">{t.lobbyAttesaHost}</p>
        <Pulsante variante="contorno" onClick={onEsci}>{t.esci}</Pulsante>
      </div>
    {/if}
  {/snippet}
</Pagina>

<style>
  .contenuto {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-5);
  }
  .codice-blocco {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
    padding: var(--spazio-4);
    border-radius: var(--raggio-l);
    background: var(--colore-contenitore-primario);
    color: var(--colore-su-contenitore-primario);
    text-align: center;
  }
  .etichetta {
    font: var(--testo-didascalia);
  }
  .codice {
    font: var(--testo-display);
    letter-spacing: 0.2em;
    padding-left: 0.2em;
    overflow-wrap: anywhere;
  }
  .azioni {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spazio-2);
  }
  .link {
    font: var(--testo-didascalia);
    overflow-wrap: anywhere;
  }
  .blocco {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-3);
  }
  h2 {
    font: var(--testo-titolo-sezione);
  }
  .mio {
    font: var(--testo-titolo);
  }
  .elenco {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: var(--spazio-3);
  }
  .giocatore {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
    padding: var(--spazio-3);
    border-radius: var(--raggio-m);
    background: var(--colore-contenitore-superficie);
    color: var(--colore-su-superficie);
  }
  .riga {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: var(--spazio-2);
  }
  .nome {
    font: var(--testo-titolo);
    overflow-wrap: anywhere;
  }
  .tag {
    margin-left: var(--spazio-1);
    padding: 2px var(--spazio-2);
    border-radius: var(--raggio-pieno);
    font: var(--testo-didascalia);
    background: var(--colore-contenitore-secondario);
    color: var(--colore-su-contenitore-secondario);
  }
  .tag.spento {
    background: var(--colore-contenitore-errore);
    color: var(--colore-su-contenitore-errore);
  }
  .posto {
    font: var(--testo-etichetta);
    padding: 2px var(--spazio-3);
    border-radius: var(--raggio-pieno);
    background: var(--colore-contenitore-superficie-alto);
    color: var(--colore-su-superficie);
  }
  .posto.rosso {
    background: var(--colore-avatar-0);
    color: var(--colore-su-avatar);
  }
  .posto.blu {
    background: var(--colore-avatar-4);
    color: var(--colore-su-avatar);
  }
  .nota {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-su-superficie-variante);
  }
  .centro {
    text-align: center;
  }
  .piede-azioni {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-2);
  }
</style>
