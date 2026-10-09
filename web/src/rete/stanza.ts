// Logica dell'host: funzioni pure, senza PeerJS e senza DOM.
import type { Casuale } from "../gioco/casuale";
import { ALFABETO_CHIAVE, casualeDefault, interoCasuale } from "../gioco/casuale";
import type { Giocatore, Plancia, Ruolo, Squadra, Stato } from "../gioco/modelli";
import { creaStato, daiIndizio, puoIniziare, scopri, terminaTurno, vistaPer } from "../gioco/regole";
import type { GiocatoreVista, MessaggioHost, VistaGiocatore } from "./contratto";
import { validaMessaggio } from "./validazione";

export const MAX_GIOCATORI = 10;

export interface Stanza {
  codice: string;
  giocatori: Giocatore[];
  /** null in lobby. */
  stato: Stato | null;
  /** idConnessione -> idGiocatore (solo connessioni attive). */
  connessioni: Record<string, string>;
  /** token -> idGiocatore. */
  token: Record<string, string>;
  prossimoId: number;
}

export interface Uscita {
  a: string;
  messaggio: MessaggioHost;
}

export interface Risultato {
  stanza: Stanza;
  uscita: Uscita[];
}

export function creaStanza(codice: string): Stanza {
  return { codice, giocatori: [], stato: null, connessioni: {}, token: {}, prossimoId: 1 };
}

/** Token di riconnessione: 16 caratteri dall'alfabeto della chiave, dal generatore iniettato. */
export function generaTokenGiocatore(casuale: Casuale): string {
  let t = "";
  for (let i = 0; i < 16; i++) t += ALFABETO_CHIAVE[interoCasuale(casuale, ALFABETO_CHIAVE.length)];
  return t;
}

function connessioniDi(stanza: Stanza, idGiocatore: string): string[] {
  return Object.keys(stanza.connessioni).filter((c) => stanza.connessioni[c] === idGiocatore);
}

/** Vista per un giocatore (CA-23): i colori passano solo da `vistaPer`. */
export function vistaDi(stanza: Stanza, giocatore: Giocatore): VistaGiocatore {
  const s = stanza.stato;
  const giocatori: GiocatoreVista[] = stanza.giocatori.map((g) => ({
    id: g.id,
    nome: g.nome,
    squadra: g.squadra,
    ruolo: g.ruolo,
    connesso: connessioniDi(stanza, g.id).length > 0,
  }));
  return {
    codice: stanza.codice,
    io: { id: giocatore.id, squadra: giocatore.squadra, ruolo: giocatore.ruolo },
    giocatori,
    fase: s === null ? "lobby" : s.vincitore ? "fine" : "partita",
    carte: s === null ? null : vistaPer(s, giocatore),
    squadraDiTurno: s?.squadraDiTurno ?? null,
    indizio: s?.indizio ?? null,
    scopertiNelTurno: s?.scopertiNelTurno ?? 0,
    vincitore: s?.vincitore ?? null,
    motivo: s?.motivo ?? null,
    rimaste: s
      ? {
          rosso: s.plancia.filter((c) => c.colore === "rosso" && !c.scoperta).length,
          blu: s.plancia.filter((c) => c.colore === "blu" && !c.scoperta).length,
        }
      : null,
    // CA-23: i colori di tutte le carte si svelano solo a partita finita.
    ...(s?.vincitore ? { carteFinali: s.plancia.map((c) => c.colore) } : {}),
  };
}

/** Una `stato` per ogni connessione attiva, ciascuna con la propria vista. */
export function statoATutti(stanza: Stanza): Uscita[] {
  const out: Uscita[] = [];
  for (const conn of Object.keys(stanza.connessioni)) {
    const g = stanza.giocatori.find((x) => x.id === stanza.connessioni[conn]);
    if (g) out.push({ a: conn, messaggio: { tipo: "stato", vista: vistaDi(stanza, g) } });
  }
  return out;
}

/** Avvio (azione dell'host, non e' un messaggio di rete). Rifiuta se CA-13 non e' soddisfatta. */
export function avviaPartita(stanza: Stanza, plancia: Plancia): Risultato | { errore: string } {
  const e = puoIniziare(stanza.giocatori);
  if (!e.ok) return { errore: e.motivo };
  const s = { ...stanza, stato: creaStato(plancia) };
  return { stanza: s, uscita: statoATutti(s) };
}

/** Torna in lobby con gli stessi giocatori (azione dell'host). */
export function nuovaPartita(stanza: Stanza): Risultato {
  const s = { ...stanza, stato: null };
  return { stanza: s, uscita: statoATutti(s) };
}

/** Azione dell'host in lobby: assegna squadra e ruolo a qualunque giocatore (anche a se stesso). */
export function assegna(stanza: Stanza, idGiocatore: string, squadra: Squadra, ruolo: Ruolo): Risultato | { errore: string } {
  if (stanza.stato !== null) return { errore: "La partita e' gia' iniziata." };
  if (!stanza.giocatori.some((g) => g.id === idGiocatore)) return { errore: "Giocatore sconosciuto." };
  const giocatori = stanza.giocatori.map((g) => (g.id === idGiocatore ? { ...g, squadra, ruolo } : g));
  const s = { ...stanza, giocatori };
  return { stanza: s, uscita: statoATutti(s) };
}

/** Chiusura da parte dell'host: `chiusa` a tutti. */
export function chiudiStanza(stanza: Stanza): Uscita[] {
  return Object.keys(stanza.connessioni).map((a) => ({ a, messaggio: { tipo: "chiusa" } }));
}

/** Connessione caduta: il posto resta riservato al token (D8). */
export function connessioneCaduta(stanza: Stanza, idConnessione: string): Risultato {
  if (!(idConnessione in stanza.connessioni)) return { stanza, uscita: [] };
  const connessioni = { ...stanza.connessioni };
  delete connessioni[idConnessione];
  const s = { ...stanza, connessioni };
  return { stanza: s, uscita: statoATutti(s) };
}

const errore = (stanza: Stanza, a: string, messaggio: string): Risultato => ({
  stanza,
  uscita: [{ a, messaggio: { tipo: "errore", messaggio } }],
});

export function gestisci(
  stanza: Stanza,
  idConnessione: string,
  messaggioGrezzo: unknown,
  casuale: Casuale = casualeDefault,
): Risultato {
  const v = validaMessaggio(messaggioGrezzo);
  if (!v.ok) return { stanza, uscita: [] }; // CA-20: scartato senza rispondere
  const m = v.messaggio;

  if (m.tipo === "unisciti") {
    const tokenIn = m.token;
    let giocatore =
      tokenIn !== undefined ? stanza.giocatori.find((g) => stanza.token[tokenIn] === g.id) : undefined;
    let s: Stanza;
    let tokenOut = tokenIn ?? "";
    if (giocatore) {
      // CA-22: riprende il posto; le vecchie connessioni dello stesso giocatore decadono.
      const connessioni = { ...stanza.connessioni };
      for (const c of connessioniDi(stanza, giocatore.id)) delete connessioni[c];
      connessioni[idConnessione] = giocatore.id;
      s = { ...stanza, connessioni };
    } else {
      if (stanza.stato !== null) return errore(stanza, idConnessione, "La partita e' gia' iniziata.");
      if (stanza.giocatori.length >= MAX_GIOCATORI) return errore(stanza, idConnessione, "La stanza e' piena.");
      giocatore = { id: `g${stanza.prossimoId}`, nome: m.nome, squadra: null, ruolo: null };
      tokenOut = generaTokenGiocatore(casuale);
      s = {
        ...stanza,
        giocatori: [...stanza.giocatori, giocatore],
        connessioni: { ...stanza.connessioni, [idConnessione]: giocatore.id },
        token: { ...stanza.token, [tokenOut]: giocatore.id },
        prossimoId: stanza.prossimoId + 1,
      };
    }
    const benvenuto: Uscita = {
      a: idConnessione,
      messaggio: { tipo: "benvenuto", token: tokenOut, idGiocatore: giocatore.id },
    };
    return { stanza: s, uscita: [benvenuto, ...statoATutti(s)] };
  }

  const mittente = stanza.giocatori.find((g) => g.id === stanza.connessioni[idConnessione]);
  if (!mittente) return { stanza, uscita: [] }; // connessione mai presentata: scartato

  switch (m.tipo) {
    case "scegli": {
      if (stanza.stato !== null) return errore(stanza, idConnessione, "La partita e' gia' iniziata.");
      const giocatori = stanza.giocatori.map((g) =>
        g.id === mittente.id ? { ...g, squadra: m.squadra, ruolo: m.ruolo } : g,
      );
      const s = { ...stanza, giocatori };
      return { stanza: s, uscita: statoATutti(s) };
    }
    case "esci": {
      const connessioni = { ...stanza.connessioni };
      for (const c of connessioniDi(stanza, mittente.id)) delete connessioni[c];
      let s: Stanza = { ...stanza, connessioni };
      if (stanza.stato === null) {
        // In lobby il posto si libera; in partita resta riservato (D8).
        const token = Object.fromEntries(Object.entries(stanza.token).filter(([, id]) => id !== mittente.id));
        s = { ...s, giocatori: stanza.giocatori.filter((g) => g.id !== mittente.id), token };
      }
      return { stanza: s, uscita: statoATutti(s) };
    }
    case "nuovaPartita":
      return { stanza, uscita: [] }; // solo l'host, via nuovaPartita(): dal guest e' ignorato
    case "indizio":
    case "scopri":
    case "terminaTurno": {
      if (stanza.stato === null) return errore(stanza, idConnessione, "La partita non e' iniziata.");
      // CA-21: indizio dalla Spia di turno; scopri e terminaTurno da un Agente della squadra di turno.
      const aTurno = mittente.squadra === stanza.stato.squadraDiTurno;
      if (m.tipo === "indizio" && !(mittente.ruolo === "spia" && aTurno)) {
        return errore(stanza, idConnessione, "Tocca alla Spia della squadra di turno.");
      }
      if (m.tipo !== "indizio" && !(mittente.ruolo === "agente" && aTurno)) {
        return errore(stanza, idConnessione, "Solo gli Agenti della squadra di turno possono farlo.");
      }
      const esito =
        m.tipo === "indizio"
          ? daiIndizio(stanza.stato, { parola: m.parola, numero: m.numero }, mittente)
          : m.tipo === "scopri"
            ? scopri(stanza.stato, m.indice, mittente)
            : terminaTurno(stanza.stato);
      if (!esito.ok) return errore(stanza, idConnessione, esito.motivo);
      const s = { ...stanza, stato: esito.stato };
      return { stanza: s, uscita: statoATutti(s) };
    }
  }
}
