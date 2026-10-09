# Agenteur - Analisi UX/UI (dopo la seconda ronda)

Solo analisi, nessun codice toccato. Letti: specifiche §3, `ux-revisione.md`, tutte le schermate in `web/src/ui/schermate/`, i componenti principali, `partita.svelte.ts`, `tema.css`, design di Imposteur §1-2. Non sono stati eseguiti né build né test né prove sul dispositivo: i giudizi su contrasto e dimensioni derivano dal codice e dai token.

## Sintesi

1. Plancia della Spia: i colori sono sempre visibili su un telefono che sta in mezzo al tavolo. Imposteur (principio 2) tratta il segreto come regola di progetto; qui manca ogni velo (U4).
2. Azioni perse in silenzio: se il collegamento è in riprovo i pulsanti restano attivi ma `invia` viene ignorato; lo schermo che si spegne causa proprio questo perché non c'è Wake Lock (U5, U6).
3. Plancia poco leggibile a distanza: parole da 10-13 px, spezzate a metà parola; la scoperta di una carta e il cambio turno non danno feedback né segnale (U7, U8, U10).

## Problemi da correggere subito (solo UI, senza rete)

| ID | Schermata | Gravità | Problema | Proposta |
|---|---|---|---|---|
| U4 | Plancia/Indizio (Spia) | alta | `GrigliaCarte.svelte:114-128` mostra sempre tinta e icone per la Spia; vicino ci sono gli Agenti. | Velo di default: i colori si vedono solo tenendo premuto "Tieni premuto per vedere" (o interruttore con richiusura dopo 5 s e su `visibilitychange`). Stesso comportamento in `Indizio.svelte:49`. |
| U5 | Plancia/Lobby (tutte) | alta | Nessun Wake Lock (grep: assente). Lo schermo si spegne a metà partita, il guest va in riprovo, l'host sospeso perde la stanza. | `navigator.wakeLock.request("screen")` in Lobby/Indizio/Plancia, in try/catch, richiesto di nuovo a `visibilitychange`. È un'API del browser, non della rete. |
| U6 | Plancia/Indizio | alta | Durante il riprovo (`partita.riprovo`, `App.svelte:161`) i pulsanti restano attivi e `#azione` usa `this.#trasporto?.invia` (`partita.svelte.ts:444`): il tocco sparisce senza avviso. | Passare `offline={partita.riprovo}` a Lobby/Plancia/Indizio: pulsanti disattivati con il motivo "Riconnessione in corso..." nel posto della nota. |
| U7 | Plancia | media | Dopo "Scopri" nulla cambia finché arriva la vista; sul guest lento il tocco sembra ignorato e si può toccare due volte (errore spurio). Dopo una carta sbagliata il turno cambia senza spiegazione. `Plancia.svelte:64-68`, `Indizio.svelte:70`. | Dopo la conferma tenere la carta in stato "in attesa" (come `postoInAttesa`) con `inCorso` sul pulsante, max 5 s. Alla vista successiva mostrare per 4 s una striscia ricavata dal confronto con la vista precedente: "Rossa ha scoperto «MARE»: neutrale. Tocca a Blu." |
| U8 | Plancia | alta | Parola `clamp(0.6rem, 3.1vw, 0.85rem)` = 9,6-13,6 px (`GrigliaCarte.svelte:101`); `overflow-wrap: anywhere` (`:104`) spezza anche dove non serve; almeno 25 parole su 465 hanno 10+ lettere. | Minimo 0,7 rem; `overflow-wrap: normal` con `hyphens: auto` (lang="it" c'è); peso 600; gap 3 px e griglia a bordo largo (margine 8 px) per guadagnare ~8 px a carta. Verificare con la parola più lunga di `parole.json` a 320 px. |
| U9 | Plancia | media | Il turno cambia senza segnale: chi guarda altrove non sa che tocca a lui. Nessuna vibrazione (grep: assente). | `navigator.vibrate?.(150)` quando `puoAgire` diventa vero e quando appare la schermata Indizio. Nessun suono. |
| U10 | Plancia/Fine | media | `.scoperta .parola { opacity: .85 }` (`GrigliaCarte.svelte:150`): bianco su rosso/blu scende vicino a 4,5:1 con testo da 10-13 px. | Togliere l'opacità; distinguere la carta scoperta con l'icona e un tratto (barrato leggero), non con la trasparenza. |
| U11 | Lobby | media | `.posto.preso { opacity: .6 }` (`SceltaPosto.svelte:163`): "Preso da Anna" sotto AA. | Niente opacità: sfondo `--colore-superficie-variante`, testo `--colore-su-superficie-variante`, icona lucchetto; resta `aria-disabled`. |
| U12 | Home | media | Il form Unisci non si invia con Invio: ha due campi e nessun `type="submit"`, il `Pulsante` è `type="button"` (`Home.svelte:143-159`, `Pulsante.svelte:18`); `enterkeyhint="go"` promette il contrario. `ux-revisione.md` dice "Invio = Unisciti". | Gestire `onkeydown` Enter nei due campi, oppure un `<button type="submit">` nel form. |
| U13 | Home | media | Scheda predefinita "Crea" (`Home.svelte:65`) ma tre giocatori su quattro sono guest senza link: rischio di creare una partita per sbaglio, senza ritorno semplice. | Vedi domanda D1. Minimo: sottotitolo alle schede ("Sono l'host" / "Ho un codice"), spiegazione di una riga in "Crea". |
| U14 | Lobby | media | Il riquadro del codice (display 2,75 rem + due pulsanti da 56 px, ~220 px) spinge la scelta del posto sotto la piega su telefoni da 640-700 px. Per un guest già dentro è la parte meno utile. | Riquadro compatto: codice e due pulsanti da 48 px su una riga; la scelta del posto è il primo blocco dopo l'intestazione. |
| U15 | Lobby (host) | media | Toccare una riga (`Lobby.svelte:121-128`) cambia il bersaglio ma la griglia è sopra: su schermo piccolo l'host non vede che è cambiata. La guida `lobbyHostGuida` sta nella lista, lontana dalla griglia. | `scrollIntoView` della griglia dopo il tocco; guida sotto il titolo "Posto di X". |
| U16 | Plancia (non agisce) | media | Il ruolo proprio è una nota da 14 px nel piede (`Plancia.svelte:113`); con il telefono che passa di mano è l'informazione più importante. | Pillola "Spia · Rossa" con le icone occhio/persona di `SceltaPosto` nella testata, sempre visibile, anche se si agisce. |
| U17 | Indizio | media | Il piede con "Invia indizio" può finire sotto la tastiera (`Pagina` usa `100dvh`, che non segue la tastiera su Android); nessun Invio per inviare; manca `maxLunghezza` 24 (specifiche §2); autocorrezione attiva. | Meta viewport `interactive-widget=resizes-content`; `maxLunghezza={24}`; `enterkeyhint="send"` con Invio che invia; `autocorrect="off"`. |
| U18 | Indizio | bassa | Dopo "Invia" nessuno stato; su rete lenta si può inviare due volte. Il selettore 0-9 non dice che 0 e "illimitato" sono casi speciali. | `inCorso` fino al cambio vista; la frase di spiegazione evidenzia 0 (già `indizioSpiegaZero`). |
| U19 | Plancia (Spia) | bassa | Neutrale suggerita: tinta quasi uguale alla carta coperta, solo un trattino da 14 px (`GrigliaCarte.svelte:107-111,122`). | Icone da 18 px; bordo tratteggiato per le neutrali. |
| U20 | Home | bassa | Il nome è facoltativo in "Crea" ma obbligatorio in "Unisci" (`Home.svelte:51` e `:139`). | Stessa regola: nome predefinito anche per Unisci, oppure obbligatorio in entrambe. |
| U21 | Lobby | bassa | Con `aria-label` "Cambia posto di X" sulla riga si perde il posto attuale per i lettori di schermo (`Lobby.svelte:126`). | `aria-label` che include il posto, o `aria-describedby` sull'etichetta del posto. |
| U22 | Lobby | bassa | Nessun Web Share: copiare il link poi aprire un'altra app sono 3-4 tocchi. `ux-revisione.md` lo dà come "richiede rete", ma `navigator.share` non usa la rete di gioco. | Pulsante "Condividi" dove `navigator.share` esiste, al posto di "Copia link". |

## Punti di forza da non perdere

1. Frase "chi deve agire" (`istruzioneTurno`) più contatori grandi con nome squadra: il colore non è mai l'unico segnale.
2. Il motivo del blocco di "Inizia" scritto sopra il pulsante disattivato, con tono positivo quando tutto è pronto.
3. Griglia 2x2 dei posti: bersagli da 72 px, icona + nome squadra + ruolo + nomi, lista che non si riordina.
4. Scoperta in due tocchi senza finestra, con barra di conferma e annullamento toccando di nuovo.
5. Collegamento con intento diverso (crea, unisci, rientro), avviso dopo 8 s, "Annulla" e "Riprova" con il codice ripresentato.
6. Token e tono di Imposteur: `tema.css` identico, avatar-0/4 con bianco (>= 5,1:1), pulsanti e piedi uguali, movimento ridotto rispettato.

## Problemi che richiedono rete o regole (da non fare ora)

- Rifiuto esplicito di `scegli` per Spia già presa e conferma esplicita del posto (oggi si deduce dalla vista, timeout 5 s).
- Un evento "ultima azione" dall'host (chi ha scoperto cosa): U7 lo ricostruisce confrontando le viste, ma il guest che si riconnette a metà turno non lo avrebbe.
- Distinguere broker giù da host assente, e annullare il timeout PeerJS lato trasporto.
- Ordine dei giocatori dichiarato nel contratto; tasto "Pronto" per giocatore.
- Host che ricarica o sospende la pagina: la partita è persa (D8). Una vera soluzione richiede migrazione dell'host o un server.
- Squadre autobilanciate e scelta automatica del posto per giocatori che non scelgono (cambia le regole di `puoIniziare`).
- Annullamento dell'ultima scoperta o dell'indizio sbagliato (cambia il modello di gioco).

## Domande aperte per l'utente

1. D1. Chi apre il link va sempre su "Unisci"; chi apre l'app senza link va su "Crea" oggi. Preferisci una scelta a due grandi pulsanti prima delle schede, o schede con "Unisci" per prima?
2. D2. Velo sulla plancia della Spia: preferisci "tieni premuto per vedere" (più sicuro, più scomodo) o un interruttore con richiusura automatica?
3. D3. Un codice QR nella Lobby per entrare inquadrando (richiede una libreria o un generatore da circa 3 KB): vale la dipendenza?
4. D4. Vibrazione al proprio turno: sempre attiva, o con un'opzione in Impostazioni?
