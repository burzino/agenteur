# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Agenteur: gioco ispirato a Codenames da giocare con più telefoni. Un telefono fa da **host** e crea la partita; gli altri si collegano con un **codice di 6 caratteri**. Solo PWA per ora (Android in seguito). Rispondi in italiano; testi dell'interfaccia in italiano.

## Dove sta cosa

- `docs/specifiche.md`: regole, decisioni D1-D9, protocollo tra peer, criteri di accettazione CA-xx. È la fonte di verità per il comportamento. I test citano il CA che verificano.
- `STATO.md`: stato del lavoro per ondate, ambiguità scelte, punti aperti. Si aggiorna a fine di ogni ondata. Cose che cambiano spesso stanno lì e non qui.
- `web/CLAUDE.md`: comandi e architettura della PWA (dettaglio di `web/`).
- Design: quello di Imposteur, in `../imposteur/docs/design.md` e `../imposteur/web/src/ui/tema.css`. Questo progetto non ha un proprio documento di design: i token si copiano, non si reinventano. Il colore primario resta `#3F2B96` / `#CBBEFF`.

## Comandi (da `web/`)

```bash
npm install                                  # una volta, genera package-lock.json
npm test                                     # tutta la suite Vitest
npx vitest run src/gioco/regole.test.ts      # un file
npx vitest run -t "CA-03"                    # i test che citano un CA
npm run check                                # svelte-check (tipi)
npm run build                                # check + vite build -> dist/
npm run dev                                  # sviluppo, base /agenteur/
```

Build e test non si lanciano nella sessione principale: li esegue l'agente `esecutore-build`. Il lavoro di scrittura lo fa l'agente `sviluppatore`.

## Architettura

Dipendenze in una sola direzione: `ui/` → `rete/` e `gioco/`; `rete/` → `gioco/`; `gioco/` non importa nulla di UI, rete o storage.

- `web/src/gioco/`: logica pura. Plancia, regole, vista per giocatore. Nessuna dipendenza da DOM o PeerJS, così è testabile in Node. Il generatore casuale è iniettato (`casuale.ts`, con seme per i test).
- `web/src/rete/`: protocollo sopra PeerJS. L'**host** è l'unica fonte di verità: riceve le intenzioni dei guest, applica le regole di `gioco/`, e manda a ciascun guest solo la sua vista (`vistaPer`). I guest non calcolano mai lo stato di gioco.
- `web/src/data/`: `parole.json` (465 parole, in `web/src/data/`, letto al build).
- `web/src/ui/`: schermate Svelte 5 e stato dell'interfaccia. Rotte in hash (`#/...`), come Imposteur.

Invarianti:
- **La chiave della plancia non deve mai arrivare a un Agente.** Le Spie ricevono i colori di tutte le carte; gli Agenti solo quelli delle carte scoperte. Va verificato sul payload dei messaggi (CA-23), non solo sulla UI.
- **Il codice di partita è il peer ID dell'host** (`agenteur-<CODICE>`). Alfabeto senza 0, O, 1, I, L (CA-12).
- **Un messaggio non valido si scarta** senza rispondere e senza lanciare eccezioni (CA-20).
- **Riconnessione con token**: il guest salva il token e lo ripresenta; se l'host è sparito, la partita è finita (D8).

## Deploy

- Hosting previsto: GitHub Pages, base `/agenteur/` (`vite.config.ts`). Il repository e l'indirizzo finale non sono ancora decisi (vedi `STATO.md`, punti aperti). Finché non sono decisi, nessuna pubblicazione.
- Il broker PeerJS è un servizio pubblico gratuito di terze parti (D1): se è giù, nessuno crea o entra in una partita. Non c'è un server di proprietà.
- Su un telefono e in un browser separato si verifica davvero il collegamento; la prova in un'unica finestra non basta.

## Suddivisione agentica

Definizioni in `.claude/agents/`, con i vincoli nel frontmatter:
- `esecutore-build` (Haiku, nessuna modifica di file): esegue i comandi npm e riporta i risultati alla lettera.
- `sviluppatore` (Sonnet, `web/` soltanto): implementa un passo del piano; non esegue build né test.

Regole di lavoro: un passo per agente, dimensionato sul suo `maxTurns`; il prompt elenca i file toccabili e le sezioni di `docs/specifiche.md` da leggere, mai "leggi tutto". A fine di ogni ondata si aggiorna `STATO.md` e si riportano nelle definizioni degli agenti le lezioni emerse.

## Conoscenza condivisa

- Le specifiche stanno in `docs/`, una sola volta. Qui si rimanda, non si copia.
- Lo stato sta in `STATO.md`. Per riprendere una sessione basta leggere questo file e `STATO.md`.
- Le decisioni prese dall'utente vanno in `docs/specifiche.md` §1 con un numero (D1, D2…), così i riferimenti restano stabili.
