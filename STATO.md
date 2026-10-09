# Agenteur - Stato

## Decisioni (2026-10-09)
- Gioco ispirato a Codenames, più telefoni: un host crea la partita, gli altri entrano con un codice di 6 caratteri. Solo PWA per ora (Android in seguito).
- Stack e design come Imposteur (`../imposteur/web`, `../imposteur/docs/design.md`): Svelte 5 + TypeScript + Vite + vite-plugin-pwa, Vitest.
- Collegamento: PeerJS 1.5.5 con broker cloud pubblico, topologia a stella, host autorevole. Dettagli e motivazioni in `docs/specifiche.md` §1 (D1-D9).

## Ondate
1. [fatto e verificato: `npm install` ok, vitest 44/44, svelte-check 0 errori; `vite build` fallisce come atteso finché manca `src/main.ts` (ondata 3). Avviso: esbuild postinstall non approvato] Scaffold `web/` + logica pura `web/src/gioco/` + 400 parole in `web/src/data/parole.json` + test CA-01..13.
2. [scritta, da verificare con build] Rete `web/src/rete/` (contratto, validazione, stanza, trasporto) + test CA-20..23.
3a. [fatto] UI senza rete: Home, ComeSiGioca, Plancia, Indizio, Fine, App
3b. [fatto] Lobby, collegamento, partita completa, fine partita, tema
3. [fatto e verificato, secondo giro: vitest 71/71, svelte-check 0 errori e 0 avvisi, build verde] Interfaccia completa. Il CA-01 ora richiede almeno 400 parole (la lista ne ha 465). Correzione degli avvisi di Home con `untrack`.
4. [da fare] Collaudo su due telefoni (uno host, uno guest) e in Chrome con due finestre.
6. [scritta, da verificare con build] Revisione UX/UI (docs/ux-revisione.md)
7. [scritta, da verificare con build] Seconda ronda UX: Impostazioni, Home divisa, ruoli leggibili
8. [scritta, da verificare con build] Regola ruoli per numero di giocatori (D10)
9. [scritta, da verificare con build] Home a due schede Crea e Unisci
10. [fatto] Logo Agenteur (icone PWA e SVG)
5. [fatto] Deploy: repository pubblico `burzino/agenteur` (main), Pages con sorgente GitHub Actions, workflow verde. Sito: https://burzi.eu/agenteur/ (200, HTTPS attivo; "Enforce HTTPS" attivato dall'utente). Carta "Agenteur" su burzi.eu (commit c99eb50 in burzino.github.io). Certificato burzi.eu valido fino al 2027-01-07.

## Punti aperti
- Icone: per ora copiate da Imposteur; servono icone proprie.
- Repository e hosting (GitHub Pages, burzino/agenteur?): da decidere con l'utente. Nessuna pubblicazione finora.
- Agenti di progetto in `.claude/agents/` non ancora creati: per ora si usano agenti generici con prompt chiusi.
- Il broker PeerJS pubblico è una dipendenza esterna (D1): da verificare su rete reale, anche tra reti diverse (WebRTC può fallire dietro NAT stretti; senza TURN non si garantisce).

## Ondata 1
- Creati: scaffold `web/` (package.json con peerjs 1.5.5, vite.config.ts, tsconfig, index.html, tema.css, icone), `web/src/data/parole.json` (400), `web/src/gioco/{modelli,casuale,plancia,regole}.ts` + 3 file `.test.ts` (44 test, CA-01..13). Non eseguiti.
- `index.html` punta a `/src/main.ts` che non esiste ancora (ondata 3): `vite build` fallisce finche' manca; `vitest run` e `svelte-check` non ne dipendono.
- `package-lock.json` da generare con `npm install` (a cura dell'esecutore).

## Ondata 1 - ambiguita (letture scelte)
- `scopri` e `daiIndizio` prendono anche il `Giocatore` (serve a CA-04: Agente di altra squadra rifiutato); `terminaTurno(stato)` non controlla chi.
- N+1 scoperte = scoperte totali del turno (tutte corrette, perche' la sbagliata chiude gia' il turno).
- Scoprire l'ultima carta dell'avversario fa vincere l'avversario (CA-09 letto alla lettera).
- `puoIniziare`: esattamente UNA Spia per squadra; giocatori senza squadra/ruolo bloccano l'avvio. L'host "solo regia" non va passato nell'elenco.
- `vistaPer` non svela i colori a fine partita: l'UI di fine partita dovra' ottenerli altrimenti (ondata 3).
- Indizio: spazi ai bordi tollerati (trim), spazi interni rifiutati; `creaPlancia` lancia Error solo se le parole distinte sono < 25 (errore di programmazione).

## Ondata 2 - ambiguita
- `gestisci(stanza, idConn, msg, casuale?)`: 4o parametro opzionale (generatore per il token); id giocatore progressivi `g1, g2...`.
- Avvio e nuova partita sono azioni dell'host (`avviaPartita`, `nuovaPartita`, `chiudiStanza`, `connessioneCaduta`), non messaggi; `nuovaPartita` da un guest e' ignorata.
- Messaggi non validi o da connessioni non presentate: scartati senza risposta. Permessi violati (CA-21): `errore`, stato invariato.
- `terminaTurno` richiesto da un Agente della squadra di turno (stessa regola di `scopri`).
- `unisciti` con token sconosciuto a partita iniziata o stanza piena (10): `errore`. `esci` in lobby libera il posto; in partita lo tiene riservato (D8).
- Riconnessione: `benvenuto` (stesso token) + `stato` a tutti; la vecchia connessione dello stesso giocatore decade.
- `VistaGiocatore` include elenco giocatori (senza token), fase, carte da `vistaPer`, turno, indizio, vincitore. CA-12 gia' coperto in `casuale.test.ts`.
