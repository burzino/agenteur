<script lang="ts">
  interface Props {
    valore: string;
    onCambia: (v: string) => void;
    etichetta: string;
    segnaposto?: string;
    maxLunghezza?: number;
    errore?: string;
    multilinea?: boolean;
    righe?: number;
    /** Campo per un codice: tastiera maiuscola, niente autocorrezione, testo ben spaziato. */
    tipoCodice?: boolean;
    /** Ripulisce il testo digitato o incollato prima di salvarlo (es. estrae il codice da un link). */
    trasforma?: (v: string) => string;
    /** Come mostrare il valore salvato (es. "ABC · DEF"). */
    formatta?: (v: string) => string;
    /** Tasto di invio della tastiera (es. "go"). */
    invio?: "go" | "next" | "done";
  }
  let {
    valore,
    onCambia,
    etichetta,
    segnaposto,
    maxLunghezza,
    errore,
    multilinea = false,
    righe = 3,
    tipoCodice = false,
    trasforma,
    formatta,
    invio,
  }: Props = $props();

  const id = $props.id();
  const mostrato = $derived(formatta ? formatta(valore) : valore);

  /** Attributi che Svelte non tipizza in modo uniforme: si impostano sul nodo. */
  function attributi(nodo: HTMLInputElement, codice: boolean) {
    if (codice) {
      nodo.setAttribute("autocapitalize", "characters");
      nodo.setAttribute("autocorrect", "off");
      nodo.setAttribute("spellcheck", "false");
    }
  }

  function alDigitare(e: Event & { currentTarget: HTMLInputElement }): void {
    const grezzo = e.currentTarget.value;
    const pulito = trasforma ? trasforma(grezzo) : grezzo;
    // Riscrive il nodo: se il valore salvato non cambia (es. settimo carattere) Svelte non lo aggiornerebbe.
    e.currentTarget.value = formatta ? formatta(pulito) : pulito;
    onCambia(pulito);
  }
</script>

<div class="campo" class:con-errore={!!errore}>
  <label for="{id}-c">{etichetta}</label>
  {#if multilinea}
    <textarea
      id="{id}-c"
      rows={righe}
      value={valore}
      placeholder={segnaposto}
      maxlength={maxLunghezza}
      aria-invalid={errore ? "true" : undefined}
      aria-describedby={errore ? `${id}-e` : undefined}
      oninput={(e) => onCambia(e.currentTarget.value)}
    ></textarea>
  {:else}
    <input
      id="{id}-c"
      class:codice={tipoCodice}
      type="text"
      value={mostrato}
      placeholder={segnaposto}
      maxlength={maxLunghezza}
      autocomplete="off"
      enterkeyhint={invio}
      use:attributi={tipoCodice}
      aria-invalid={errore ? "true" : undefined}
      aria-describedby={errore ? `${id}-e` : undefined}
      oninput={alDigitare}
    />
  {/if}
  {#if errore}
    <p id="{id}-e" class="errore" role="alert">{errore}</p>
  {/if}
</div>

<style>
  .campo {
    display: flex;
    flex-direction: column;
    gap: var(--spazio-1);
  }
  label {
    font: var(--testo-didascalia);
    color: var(--colore-su-superficie-variante);
  }
  /* campo riempito: contenitore alto, angoli superiori s, indicatore inferiore da 2 px */
  input,
  textarea {
    width: 100%;
    min-height: var(--altezza-tocco);
    padding: var(--spazio-3) var(--spazio-4);
    border: 0;
    border-bottom: 2px solid var(--colore-su-superficie-variante);
    border-radius: var(--raggio-s) var(--raggio-s) 0 0;
    background: var(--colore-contenitore-superficie-alto);
    color: var(--colore-su-superficie);
    font-size: max(16px, 1rem); /* niente zoom automatico su iOS */
    line-height: 1.4;
    transition: border-color var(--molla-effetti);
  }
  input.codice {
    min-height: var(--altezza-pulsante);
    font: var(--testo-nome-grande);
    font-size: max(20px, 1.75rem);
    letter-spacing: 0.12em;
    text-align: center;
    text-transform: uppercase;
  }
  input.codice::placeholder {
    letter-spacing: 0.12em;
    color: var(--colore-su-superficie-variante);
  }
  textarea {
    resize: vertical;
  }
  input:focus,
  textarea:focus {
    outline: none;
    border-bottom-color: var(--colore-primario);
    box-shadow: 0 1px 0 0 var(--colore-primario);
  }
  :global([data-tema="alto-contrasto"]) input,
  :global([data-tema="alto-contrasto"]) textarea {
    border: 2px solid var(--colore-contorno);
    border-radius: var(--raggio-s);
  }
  .con-errore input,
  .con-errore textarea {
    border-bottom-color: var(--colore-errore);
    box-shadow: none;
  }
  .con-errore label {
    color: var(--colore-errore);
  }
  .errore {
    font: var(--testo-corpo-piccolo);
    color: var(--colore-errore);
  }
</style>
