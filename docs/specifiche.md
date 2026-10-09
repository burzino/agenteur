# Agenteur - Specifiche (v1, PWA multi-telefono)

Gioco ispirato a Codenames, giocato con più telefoni. Un telefono fa da **host** (crea la partita e ne custodisce lo stato); gli altri si collegano con un **codice di partita** (la "chiave"). Rispondere in italiano; testi dell'interfaccia in italiano.

Ambito di questa versione: solo PWA (Svelte 5 + TypeScript + Vite + vite-plugin-pwa, test Vitest), stesso stack e stesso design di Imposteur (`../imposteur/docs/design.md`, `web/src/ui/tema.css`). Fuori ambito: app Android, account, classifiche, chat vocale, partite con più di una squadra oltre le due.

## 1. Decisioni prese (da confermare)

| # | Decisione | Motivo |
|---|---|---|
| D1 | Collegamento con **PeerJS 1.5.5** (WebRTC, broker cloud pubblico gratuito). Il codice di partita è la chiave: l'host registra il peer `agenteur-<CODICE>`, i guest si connettono a quello. | Nessun server proprio; GitHub Pages è statico. Un broker pubblico è dipendenza esterna: se cade, non si crea né si unisce nessuna partita. |
| D2 | Topologia a stella: i guest parlano solo con l'host; l'host è l'unica fonte di verità e manda a ciascuno la propria vista. | Una sola logica di regole, nel codice dell'host. |
| D3 | "Seed" e "chiave" coincidono: il **codice di partita** di 6 caratteri (alfabeto senza 0/O/1/I/L). La plancia è estratta a caso dall'host. | Una sola cosa da digitare. |
| D4 | L'host è anche un giocatore (può prendere una squadra) oppure solo regia: la scelta è sua nella lobby. | Utile con pochi telefoni. |
| D5 | 4–10 giocatori, due squadre (Rosso, Blu), ciascuna con una Spia e almeno un Agente. | Regola minima di Codenames. |
| D6 | Numero dell'indizio 0–9. 0 = nessun numero: gli agenti possono scoprire quante carte vogliono, fino a una carta sbagliata. N ≥ 1: fino a N+1 scoperte per turno. | Semplificazione della regola ufficiale (dove 0 e ∞ sono carte speciali). |
| D7 | Chi scopre l'assassino perde la partita per la sua squadra. | Regola classica. |
| D8 | Riconnessione: un guest che cade ritrova il suo posto con lo stesso token salvato sul telefono. Se l'host chiude, la partita finisce. | Telefoni che vanno in standby sono la norma. |
| D9 | Sicurezza: la chiave della plancia (colori delle carte) va solo alle Spie. Un giocatore esperto può leggere il traffico con gli strumenti del browser: accettato, è un gioco fra amici, non un sistema di sicurezza. | Limite dichiarato, non nascosto. |

## 2. Regole di gioco

- **Plancia**: 25 carte (griglia 5×5) estratte a caso da `web/src/data/parole.json` (465 parole italiane, singole, senza nomi propri; CA-01 richiede almeno 400).
- **Distribuzione colori**: 9 carte della squadra che inizia, 8 dell'altra, 7 neutrali, 1 assassino. La squadra che ha 9 carte gioca per prima.
- **Turno**: la Spia della squadra di turno dà un indizio (una parola + un numero 0–9). Poi gli Agenti della stessa squadra scoprono le carte.
- **Indizio valido**: una sola parola (niente spazi), non uguale a nessuna parola della plancia (confronto senza maiuscole e senza accenti), non vuota, massimo 24 caratteri.
- **Scoperta**: carta della propria squadra → si continua (se ci sono scoperte rimaste). Carta avversaria o neutrale → il turno finisce. Assassino → partita finita, perde la squadra che l'ha scoperto.
- **Fine turno**: volontario (pulsante "Termina turno") dopo almeno una scoperta, oppure automatico alla scoperta sbagliata o al limite N+1.
- **Vittoria**: una squadra scopre tutte le sue carte, oppure l'altra scopre l'assassino.

## 3. Schermate (PWA)

1. **Home**: titolo, "Crea partita" (host), "Unisciti" (campo per il codice + nome). Barra in basso con tema e "Come si gioca".
2. **Lobby (host)**: codice grande con pulsante "Copia" e condivisione del link `…/agenteur/#/unisciti/<CODICE>`; elenco giocatori con squadra e ruolo; ogni giocatore si sceglie squadra e ruolo (l'host può spostare chiunque); "Inizia" attivo con 4–10 giocatori e ogni squadra con Spia + Agente.
3. **Lobby (guest)**: stato di attesa, lista, ruolo proprio, "Esci".
4. **Plancia**: griglia 5×5. Vista Spia: colori delle carte visibili (tinta leggera + icona). Vista Agente: solo le carte scoperte. Barra con squadra di turno, indizio corrente, carte rimaste per squadra. Azioni: scopri (tocco su una carta, con conferma), "Termina turno".
5. **Indizio (Spia di turno)**: campo parola + selettore numero 0–9; errore inline se non valido.
6. **Fine partita**: squadra vincitrice, motivo, "Nuova partita" (solo host: torna in lobby con gli stessi giocatori).
7. **Come si gioca**: regole in breve, testo di §2.

Su tutti i telefoni la schermata mostra il ruolo e la squadra in modo chiaro, senza icone che rivelino le carte a chi non è Spia.

## 4. Protocollo (messaggi tra peer)

Tutti i messaggi sono oggetti JSON con campo `tipo`. Il contratto completo di tipi e firme vive in `web/src/rete/contratto.ts` e si cambia prima del codice.

Guest → host:
- `unisciti { nome, token? }`: prima richiesta (token assente) o riconnessione (token presente).
- `scegli { squadra, ruolo }`: cambio di posto (solo in lobby).
- `esci`.
- `indizio { parola, numero }` (solo la Spia di turno).
- `scopri { indice }` (solo un Agente della squadra di turno).
- `terminaTurno`.
- `nuovaPartita` (solo host, ma inviato dal guest viene ignorato).

Host → guest (ciascuno riceve solo la sua vista):
- `benvenuto { token, idGiocatore }` dopo `unisciti`.
- `stato { vista }`: la `VistaGiocatore` calcolata per il destinatario (per un Agente non contiene i colori delle carte non scoperte).
- `errore { messaggio }`.
- `chiusa`: l'host ha chiuso la partita.

Un messaggio non valido (campo mancante o tipo sconosciuto) viene scartato senza rispondere.

## 5. Criteri di accettazione (CA)

Ogni test cita il CA che verifica.

**Logica (`web/src/gioco/`, senza DOM né rete)**
- CA-01: la plancia ha 25 parole distinte estratte da `parole.json`; con un generatore casuale iniettato il risultato è deterministico.
- CA-02: colori: 9 + 8 + 7 + 1 = 25; la squadra con 9 carte è quella che inizia.
- CA-03: l'indizio con parola vuota, con spazi, uguale a una parola della plancia (senza maiuscole/accenti), oltre 24 caratteri o numero fuori da 0–9 viene rifiutato con motivo.
- CA-04: un indizio valido apre il turno della squadra; un Agente di un'altra squadra non può scoprire.
- CA-05: scoperta di una carta della propria squadra con altre rimaste: il turno continua.
- CA-06: scoperta di una carta avversaria o neutrale: il turno passa.
- CA-07: con N ≥ 1, dopo N+1 scoperte corrette il turno finisce; con 0 non c'è limite finché le scoperte sono corrette.
- CA-08: scoperta dell'assassino: partita finita, perde la squadra che l'ha scoperto.
- CA-09: tutte le carte di una squadra scoperte: vince quella squadra.
- CA-10: una carta già scoperta non si può scoprire di nuovo.
- CA-11: `vistaPer(giocatore)`: la Spia riceve i colori di tutte le carte; un Agente riceve i colori solo delle carte scoperte; nessuna vista contiene le carte nascoste di un altro tipo.
- CA-12: la chiave di partita ha 6 caratteri dall'alfabeto ammesso; generata due volte non dà sempre lo stesso risultato.
- CA-13: l'avvio della partita richiede 4–10 giocatori e, per ogni squadra, una Spia e almeno un Agente.

**Protocollo (`web/src/rete/`)**
- CA-20: un messaggio con tipo sconosciuto o campi mancanti è scartato (la funzione restituisce errore, non lancia).
- CA-21: un guest non può inviare `indizio` se non è la Spia di turno; l'host risponde `errore` e non cambia stato.
- CA-22: un guest con token valido riprende il suo posto e ottiene una nuova `stato`; con token sconosciuto viene trattato come nuovo.
- CA-23: l'host invia a ogni guest la vista del suo ruolo; un Agente non riceve mai i colori delle carte nascoste (test sul payload).

**Interfaccia (PWA)**
- CA-30: Home permette di creare o unirsi con il codice; un codice di lunghezza diversa da 6 non si invia.
- CA-31: la lobby dell'host mostra il codice a 6 caratteri e il pulsante "Inizia" è disattivato finché la regola di CA-13 non è soddisfatta.
- CA-32: il pulsante "Termina turno" è disattivato prima della prima scoperta del turno.
- CA-33: dopo la scoperta di una carta, un dialogo chiede conferma prima di inviare `scopri`.
- CA-34: la plancia rispetta il layout a 360 px senza scroll orizzontale; la griglia resta quadrata.
- CA-35: il tema segue lo stesso token di Imposteur (chiaro, scuro, sistema, alto contrasto).

## 6. Fuori ambito di questa versione

- App Android.
- Dopo la chiusura di una partita non si conservano statistiche.
- Nessun server proprio: la dipendenza dal broker PeerJS è dichiarata in §1 (D1).
- Partite con più di 10 giocatori, più di due squadre, parole personalizzate.
