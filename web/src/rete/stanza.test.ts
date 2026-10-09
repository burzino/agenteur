import { describe, expect, it } from "vitest";
import { casualeDaSeme } from "../gioco/casuale";
import { creaPlancia } from "../gioco/plancia";
import type { MessaggioHost } from "./contratto";
import {
  avviaPartita,
  creaStanza,
  statoATutti,
  generaTokenGiocatore,
  gestisci,
  type Risultato,
  type Stanza,
  type Uscita,
} from "./stanza";

const PAROLE = Array.from({ length: 40 }, (_, i) => `parola${String.fromCharCode(97 + (i % 26))}${i}`);

function invia(stanza: Stanza, conn: string, msg: unknown): Risultato {
  return gestisci(stanza, conn, msg, casualeDaSeme(conn.length * 7 + stanza.prossimoId));
}

/** Lobby con 4 giocatori: c1 rosso spia, c2 rosso agente, c3 blu spia, c4 blu agente. */
function lobby(): Stanza {
  let s = creaStanza("ABC234");
  const posti = [
    ["c1", "rosso", "spia"],
    ["c2", "rosso", "agente"],
    ["c3", "blu", "spia"],
    ["c4", "blu", "agente"],
  ] as const;
  for (const [c, squadra, ruolo] of posti) {
    s = invia(s, c, { tipo: "unisciti", nome: `G-${c}` }).stanza;
    s = invia(s, c, { tipo: "scegli", squadra, ruolo }).stanza;
  }
  return s;
}

function partita(): Stanza {
  const s = lobby();
  const r = avviaPartita(s, creaPlancia(PAROLE, casualeDaSeme(5)));
  if ("errore" in r) throw new Error(r.errore);
  return r.stanza;
}

/** Connessioni dei giocatori della squadra di turno / dell'altra. */
function inTurno(s: Stanza) {
  const t = s.stato!.squadraDiTurno;
  const rosso = t === "rosso";
  return {
    spia: rosso ? "c1" : "c3",
    agente: rosso ? "c2" : "c4",
    spiaAltra: rosso ? "c3" : "c1",
    agenteAltro: rosso ? "c4" : "c2",
  };
}

function trova(uscita: Uscita[], a: string): MessaggioHost | undefined {
  return uscita.find((u) => u.a === a)?.messaggio;
}

describe("stanza", () => {
  it("generaTokenGiocatore usa il generatore iniettato", () => {
    expect(generaTokenGiocatore(casualeDaSeme(1))).toBe(generaTokenGiocatore(casualeDaSeme(1)));
    expect(generaTokenGiocatore(casualeDaSeme(1))).not.toBe(generaTokenGiocatore(casualeDaSeme(2)));
    expect(generaTokenGiocatore(casualeDaSeme(1))).toHaveLength(16);
  });

  it("CA-20 un messaggio non valido non cambia la stanza e non riceve risposta", () => {
    const s = lobby();
    for (const m of [{ tipo: "boh" }, null, { tipo: "scopri", indice: 99 }, 42]) {
      const r = invia(s, "c1", m);
      expect(r.stanza).toBe(s);
      expect(r.uscita).toEqual([]);
    }
  });

  it("CA-20 un messaggio valido da una connessione sconosciuta e' scartato", () => {
    const s = partita();
    const r = invia(s, "zzz", { tipo: "terminaTurno" });
    expect(r.stanza).toBe(s);
    expect(r.uscita).toEqual([]);
  });

  it("CA-21 un indizio da chi non e' la Spia di turno e' rifiutato senza cambiare stato", () => {
    const s = partita();
    const { agente, spiaAltra } = inTurno(s);
    for (const conn of [agente, spiaAltra]) {
      const r = invia(s, conn, { tipo: "indizio", parola: "zzz", numero: 2 });
      expect(r.stanza).toBe(s);
      expect(r.stanza.stato).toBe(s.stato);
      expect(r.uscita).toHaveLength(1);
      expect(trova(r.uscita, conn)?.tipo).toBe("errore");
    }
  });

  it("CA-21 l'indizio della Spia di turno e' accettato e arriva a tutti", () => {
    const s = partita();
    const r = invia(s, inTurno(s).spia, { tipo: "indizio", parola: "zzz", numero: 2 });
    expect(r.stanza.stato?.indizio).toEqual({ parola: "zzz", numero: 2 });
    expect(r.uscita.map((u) => u.messaggio.tipo)).toEqual(["stato", "stato", "stato", "stato"]);
  });

  it("CA-21 scopri da un Agente di un'altra squadra e' rifiutato senza cambiare stato", () => {
    let s = partita();
    s = invia(s, inTurno(s).spia, { tipo: "indizio", parola: "zzz", numero: 2 }).stanza;
    const { agenteAltro } = inTurno(s);
    const r = invia(s, agenteAltro, { tipo: "scopri", indice: 0 });
    expect(r.stanza).toBe(s);
    expect(trova(r.uscita, agenteAltro)?.tipo).toBe("errore");
    expect(s.stato!.plancia.every((c) => !c.scoperta)).toBe(true);
  });

  it("CA-21 scopri dalla Spia di turno e' rifiutato; dall'Agente di turno e' accettato", () => {
    let s = partita();
    s = invia(s, inTurno(s).spia, { tipo: "indizio", parola: "zzz", numero: 2 }).stanza;
    const { spia, agente } = inTurno(s);
    const no = invia(s, spia, { tipo: "scopri", indice: 0 });
    expect(no.stanza).toBe(s);
    expect(trova(no.uscita, spia)?.tipo).toBe("errore");
    const si = invia(s, agente, { tipo: "scopri", indice: 0 });
    expect(si.stanza.stato!.plancia[0].scoperta).toBe(true);
  });

  it("CA-22 il token riconosciuto riprende il posto e ottiene una nuova stato", () => {
    let s = partita();
    const token = Object.keys(s.token).find((t) => s.token[t] === "g2")!;
    s = { ...s, connessioni: { c1: "g1", c3: "g3", c4: "g4" } }; // c2 e' caduta
    const r = invia(s, "nuova", { tipo: "unisciti", nome: "Altro", token });
    expect(r.stanza.giocatori).toHaveLength(4);
    expect(r.stanza.connessioni["nuova"]).toBe("g2");
    const benvenuto = trova(r.uscita, "nuova");
    expect(benvenuto).toEqual({ tipo: "benvenuto", token, idGiocatore: "g2" });
    const stato = r.uscita.filter((u) => u.a === "nuova" && u.messaggio.tipo === "stato");
    expect(stato).toHaveLength(1);
    const m = stato[0].messaggio;
    if (m.tipo !== "stato") throw new Error("atteso stato");
    expect(m.vista.io).toEqual({ id: "g2", squadra: "rosso", ruolo: "agente" });
  });

  it("CA-22 una riconnessione sostituisce la vecchia connessione dello stesso giocatore", () => {
    const s = partita();
    const token = Object.keys(s.token).find((t) => s.token[t] === "g2")!;
    const r = invia(s, "nuova", { tipo: "unisciti", nome: "x", token });
    expect(r.stanza.connessioni["c2"]).toBeUndefined();
    expect(r.stanza.connessioni["nuova"]).toBe("g2");
  });

  it("CA-22 un token sconosciuto crea un nuovo giocatore con nuovo token", () => {
    const s = lobby();
    const r = invia(s, "c9", { tipo: "unisciti", nome: "Nuovo", token: "INVENTATO" });
    expect(r.stanza.giocatori).toHaveLength(5);
    const b = trova(r.uscita, "c9");
    if (b?.tipo !== "benvenuto") throw new Error("atteso benvenuto");
    expect(b.token).not.toBe("INVENTATO");
    expect(r.stanza.token[b.token]).toBe(b.idGiocatore);
  });

  it("CA-22 senza token si crea un nuovo giocatore", () => {
    const r = invia(creaStanza("ABC234"), "c1", { tipo: "unisciti", nome: "Anna" });
    expect(r.stanza.giocatori).toHaveLength(1);
    expect(trova(r.uscita, "c1")?.tipo).toBe("benvenuto");
  });

  it("CA-23 un Agente riceve nel payload stato solo i colori delle carte scoperte", () => {
    let s = partita();
    s = invia(s, inTurno(s).spia, { tipo: "indizio", parola: "zzz", numero: 3 }).stanza;
    const propria = s.stato!.plancia.findIndex((c) => c.colore === s.stato!.squadraDiTurno);
    s = invia(s, inTurno(s).agente, { tipo: "scopri", indice: propria }).stanza;
    expect(s.stato!.plancia[propria].scoperta).toBe(true);
    for (const conn of ["c2", "c4"]) {
      const m = trova(statoATutti(s), conn);
      if (m?.tipo !== "stato") throw new Error("atteso stato");
      for (const c of m.vista.carte!) expect(c.colore === null).toBe(!c.scoperta);
      expect(JSON.stringify(m)).not.toContain("assassino");
    }
  });

  it("CA-23 la Spia riceve i colori di tutte le carte", () => {
    const s = partita();
    for (const conn of ["c1", "c3"]) {
      const m = trova(statoATutti(s), conn);
      if (m?.tipo !== "stato") throw new Error("atteso stato");
      expect(m.vista.carte!.every((c) => c.colore !== null)).toBe(true);
      expect(m.vista.carte!.filter((c) => c.colore === "assassino")).toHaveLength(1);
    }
  });

  it("CA-23 in lobby nessuna carta e nessun colore nel payload", () => {
    const s = lobby();
    for (const u of statoATutti(s)) {
      if (u.messaggio.tipo !== "stato") throw new Error("atteso stato");
      expect(u.messaggio.vista.carte).toBeNull();
    }
  });
  it("CA-23 carteFinali (colori di tutte le carte) e' assente prima della fine e presente a fine partita per tutti", () => {
    const s = partita();
    for (const u of statoATutti(s)) {
      if (u.messaggio.tipo !== "stato") throw new Error("atteso stato");
      expect(u.messaggio.vista.carteFinali).toBeUndefined();
      expect("carteFinali" in u.messaggio.vista).toBe(false);
    }
    const finita: Stanza = { ...s, stato: { ...s.stato!, vincitore: "rosso", motivo: "completata" } };
    for (const u of statoATutti(finita)) {
      if (u.messaggio.tipo !== "stato") throw new Error("atteso stato");
      expect(u.messaggio.vista.fase).toBe("fine");
      expect(u.messaggio.vista.carteFinali).toEqual(finita.stato!.plancia.map((c) => c.colore));
    }
  });
});
