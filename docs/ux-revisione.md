# Agenteur - Revisione UX/UI (dopo il test su 4 telefoni)

Feedback: lobby e scelta dei ruoli poco fluide. Modificato solo `web/src/ui/` e l'uso in `App.svelte`. Nessun colore nuovo (solo token di `tema.css`), nessuna dipendenza, nessun cambio a `gioco/` e `rete/`.

## Home
- Era: un solo campo codice con limite di 6 caratteri (incollare un link non funzionava), errori solo in un toast di 3 s, nessun aiuto.
- Ora: codice con tastiera maiuscola, senza autocorrezione, mostrato a gruppi "ABC · DEF"; si può incollare il codice o l'intero link (`estraiCodice`). Sotto il campo un suggerimento dice cosa manca ("Mancano 3 caratteri", "Scrivi il tuo nome"). Invio dalla tastiera = Unisciti. Un errore di creazione o ingresso resta in un riquadro con "Riprova" e "Chiudi"; il codice digitato si ripropone.
- Perché: un toast sparisce e non offre un'azione; il link di invito è il modo più comune di passare il codice.

## Collegamento (nuova schermata `Collegamento.svelte`)
- Era: testo fisso "Mi collego alla partita…", uguale per host e guest, senza limite di tempo per chi crea.
- Ora: subito spinner e testo "Creazione in corso…" o "Collegamento…" (con il codice cercato), "Rientro nella partita…" alla riconnessione; dopo 8 s un avviso "Ci sta mettendo più del solito"; "Annulla" sempre. Il doppio tocco è già bloccato (`collegamento` non è più "inattivo" e la Home sparisce). Creazione e ingresso hanno un timeout di 15 s con messaggio dedicato e "Riprova" (`partita.ripetiAvvio`). Una risposta tardiva del broker chiude il peer, non lo lascia aperto.

## Lobby
- Era: codice con pulsanti solo per l'host, link in chiaro, un selettore a 4 segmenti per ogni giocatore (lista alta, molti controlli), conferma del copiato solo con un toast.
- Ora: in alto il riquadro "Fai entrare gli altri con questo codice" con il codice grande a gruppi e due pulsanti ("Copia codice", "Copia link") per tutti; al tocco il pulsante diventa "✓ Copiato" per 2 s (con riserva per pagine non sicure: `appunti.ts`). La lista è in ordine d'ingresso e non si riordina mai; ogni riga mostra nome, tag e posto in un'etichetta a colore squadra. L'host tocca una riga per scegliere il posto di quel giocatore (di default il proprio). Il selettore "Gioco anch'io / Solo regia" è in fondo.
- Perché: un solo controllo di scelta, sempre lo stesso, invece di uno per riga.

## Scelta del posto (nuovo componente `SceltaPosto.svelte`)
- Griglia 2x2 (Rossa a sinistra, Blu a destra; Spia sopra, Agente sotto), bersagli da 72 px. Il proprio posto è pieno col colore della squadra e una spunta; i posti occupati mostrano i nomi ("Anna, tu"), altrimenti "Libero". Nessuna doppia conferma.
- Guest: al tocco il posto appare subito "In attesa dell'host…" (tratteggiato); diventa pieno quando arriva la vista che lo contiene, torna al posto reale se l'host rifiuta o dopo 5 s (stato `postoInAttesa` in `partita.svelte.ts`). Host: applicato subito. Toccare il proprio posto non invia nulla.
- I posti non sono bloccati quando occupati: la regola (una sola Spia) resta all'host e al pulsante "Inizia".

## "Inizia"
- Era: pulsante nel piede ma con una nota in basso alla pagina, testo tecnico delle regole.
- Ora: sempre visibile nel piede; se disattivo, sopra c'è la ragione ("Servono almeno 4 giocatori", "Tutti devono scegliere un posto", "Serve una Spia per ogni squadra", "Ogni squadra può avere una sola Spia", "Serve almeno un Agente per ogni squadra"); se attivo, "Tutto pronto: puoi iniziare." (`motivoBlocco` in `logica.ts`, che usa `puoIniziare`). Guest: "In attesa che l'host inizi la partita." ed "Esci".

## Plancia
- Era: intestazione piccola, contatori con colore e numero piccolo, finestra modale per ogni scoperta, piede vuoto per chi non agisce.
- Ora: testata con squadra di turno, contatori grandi (numero + "Rosse"/"Blu"), una frase su chi deve agire ("Tocca a te: scegli una carta da scoprire", "La Spia della squadra Rossa sta pensando all'indizio", "Gli Agenti della squadra Blu scoprono le carte", `istruzioneTurno`) e l'indizio in grande. Carte su cui si può agire con bordo più marcato e parola un po' più grande. Scoperta in due tocchi senza finestra: la carta si ingrandisce con un anello e nel piede compare "Scopri «PAROLA»" e "Annulla" (toccare di nuovo la stessa carta annulla). "Termina turno" spiega perché è disattivo. Chi non agisce vede il proprio ruolo nel piede.
- Nota: CA-33 parla di "un dialogo"; la barra di conferma ne mantiene lo scopo (nessuna scoperta senza conferma). Da confermare con l'utente.

## Fine partita
- Era: titolo colorato e testo.
- Ora: pannello a tinta piena della squadra vincitrice con "Vincitore", nome in grande e motivo; "Nuova partita" solo per l'host; gli altri vedono spinner e "Aspetta che l'host avvii una nuova partita."

## Generale
- Nuovi `Spinner.svelte` e prop `inCorso` di `Pulsante`; con `prefers-reduced-motion` gli anelli restano fermi. Bersagli di tocco >= 48 px ovunque; testi bianchi su avatar-0/avatar-4 (>= 5,1:1), testi dei contenitori già verificati nel design. Tutti i testi in `testi.ts` (chiavi non vuote, CA-36).

## Seconda ronda (dopo la prova)
- Impostazioni: nuova schermata `Impostazioni.svelte` (rotta `#/impostazioni`) con il selettore Sistema / Chiaro / Scuro / Alto contrasto; la Home ha solo un pulsante "Impostazioni" in alto a destra. Il tema si applica e si salva come prima.
- Home divisa in due schede: "Crea una partita" (campo "Il tuo nome" + "Crea partita") e "Unisciti a una partita" (codice + "Il tuo nome" + "Unisciti"). Ogni campo ha l'etichetta visibile. Il nome è condiviso fra le due schede e salvato in `agenteur.nome` (try/catch) a ogni modifica, così non si riscrive.
- Scelta del posto: icona a occhio per la Spia, a persona per l'Agente (SVG inline), bordo e pieno nei colori `--colore-avatar-0` (Rossa) e `--colore-avatar-4` (Blu), etichetta testuale sempre presente. Il posto scelto è pieno con spunta.
- Posti disabilitati: una Spia già occupata da un altro giocatore (diverso dal giocatore di cui si sceglie il posto) in quella squadra: `aria-disabled`, spento, riporta "Preso da <nome>"; il tocco non fa nulla e mostra "Già preso da <nome>". Gli Agenti restano sempre selezionabili. Il blocco è solo di interfaccia: la regola resta all'host (vedi sotto).

## Richiede rete (non fatto)
- Rifiuto esplicito di `scegli` quando un posto di Spia è già preso: oggi l'host accetta tutto e blocca solo "Inizia".
- Conferma esplicita della scelta di posto dal guest: oggi si deduce dalla vista successiva (con timeout di 5 s).
- Annullamento del timeout di PeerJS lato trasporto e distinzione fra broker giù e host assente (ora lo stesso messaggio di rete).
- Un ordine di giocatori garantito dall'host (oggi è l'ordine dell'array, stabile ma non dichiarato nel contratto).
- Condivisione nativa del link (Web Share) e tasto "Pronto" per giocatore sono possibili solo con nuovi messaggi.
