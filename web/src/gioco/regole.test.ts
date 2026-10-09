import { describe, expect, it } from "vitest";
import type { Colore, Giocatore, Plancia, Ruolo, Squadra, Stato } from "./modelli";
import {
  creaStato,
  daiIndizio,
  puoIniziare,
  scopri,
  terminaTurno,
  validaIndizio,
  vistaPer,
} from "./regole";

// Plancia fissa: 0-8 rosso, 9-16 blu, 17-23 neutrale, 24 assassino. Inizia rosso.
function plancia(): Plancia {
  return Array.from({ length: 25 }, (_, i) => {
    const colore: Colore = i < 9 ? "rosso" : i < 17 ? "blu" : i < 24 ? "neutrale" : "assassino";
    return { parola: `parola${i}`, colore, scoperta: false };
  });
}

function g(id: string, squadra: Squadra | null, ruolo: Ruolo | null): Giocatore {
  return { id, nome: id, squadra, ruolo };
}

const spiaRossa = g("sr", "rosso", "spia");
const agenteRosso = g("ar", "rosso", "agente");
const spiaBlu = g("sb", "blu", "spia");
const agenteBlu = g("ab", "blu", "agente");

function conIndizio(numero: number): Stato {
  const r = daiIndizio(creaStato(plancia()), { parola: "mare", numero }, spiaRossa);
  if (!r.ok) throw new Error(r.motivo);
  return r.stato;
}

function scopriOk(stato: Stato, indice: number, giocatore: Giocatore = agenteRosso): Stato {
  const r = scopri(stato, indice, giocatore);
  if (!r.ok) throw new Error(r.motivo);
  return r.stato;
}

describe("validaIndizio", () => {
  const p = plancia();
  const ok = (parola: string, numero: number) => validaIndizio({ parola, numero }, p);

  it("CA-03 accetta un indizio valido", () => {
    expect(ok("mare", 2)).toEqual({ ok: true });
    expect(ok("mare", 0)).toEqual({ ok: true });
    expect(ok("mare", 9)).toEqual({ ok: true });
    expect(ok("a".repeat(24), 1)).toEqual({ ok: true });
  });

  it("CA-03 rifiuta la parola vuota", () => {
    const r = ok("", 1);
    expect(r.ok).toBe(false);
    expect(ok("   ", 1).ok).toBe(false);
  });

  it("CA-03 rifiuta parole con spazi", () => {
    const r = ok("due parole", 1);
    expect(r).toMatchObject({ ok: false });
    if (!r.ok) expect(r.motivo).not.toBe("");
  });

  it("CA-03 rifiuta una parola della plancia, senza maiuscole e accenti", () => {
    expect(ok("parola3", 1).ok).toBe(false);
    expect(ok("PAROLA3", 1).ok).toBe(false);
    const accentata: Plancia = [{ parola: "citta", colore: "neutrale", scoperta: false }];
    expect(validaIndizio({ parola: "CITTÀ", numero: 1 }, accentata).ok).toBe(false);
  });

  it("CA-03 rifiuta oltre 24 caratteri", () => {
    expect(ok("a".repeat(25), 1).ok).toBe(false);
  });

  it("CA-03 rifiuta numeri fuori da 0-9 o non interi", () => {
    for (const n of [-1, 10, 1.5, NaN, Infinity]) expect(ok("mare", n).ok).toBe(false);
  });
});

describe("turno e scoperte", () => {
  it("CA-04 un indizio valido apre il turno della squadra", () => {
    const s = conIndizio(2);
    expect(s.indizio).toEqual({ parola: "mare", numero: 2 });
    expect(s.squadraDiTurno).toBe("rosso");
  });

  it("CA-04 un indizio non valido o di una Spia sbagliata non cambia lo stato", () => {
    const s0 = creaStato(plancia());
    expect(daiIndizio(s0, { parola: "parola1", numero: 1 }, spiaRossa).ok).toBe(false);
    expect(daiIndizio(s0, { parola: "mare", numero: 1 }, spiaBlu).ok).toBe(false);
    expect(daiIndizio(s0, { parola: "mare", numero: 1 }, agenteRosso).ok).toBe(false);
    expect(s0.indizio).toBeNull();
  });

  it("CA-04 un Agente di un'altra squadra non puo' scoprire", () => {
    const s = conIndizio(2);
    expect(scopri(s, 0, agenteBlu).ok).toBe(false);
    expect(scopri(s, 0, spiaRossa).ok).toBe(false);
  });

  it("CA-04 non si scopre prima dell'indizio", () => {
    expect(scopri(creaStato(plancia()), 0, agenteRosso).ok).toBe(false);
  });

  it("CA-05 carta della propria squadra con altre rimaste: il turno continua", () => {
    const s = scopriOk(conIndizio(3), 0);
    expect(s.plancia[0].scoperta).toBe(true);
    expect(s.squadraDiTurno).toBe("rosso");
    expect(s.indizio).not.toBeNull();
    expect(s.scopertiNelTurno).toBe(1);
  });

  it("CA-06 carta avversaria: il turno passa", () => {
    const s = scopriOk(conIndizio(3), 9);
    expect(s.squadraDiTurno).toBe("blu");
    expect(s.indizio).toBeNull();
    expect(s.scopertiNelTurno).toBe(0);
    expect(s.vincitore).toBeNull();
  });

  it("CA-06 carta neutrale: il turno passa", () => {
    const s = scopriOk(conIndizio(3), 17);
    expect(s.squadraDiTurno).toBe("blu");
    expect(s.indizio).toBeNull();
  });

  it("CA-07 con N=2 dopo 3 scoperte corrette il turno finisce", () => {
    let s = conIndizio(2);
    s = scopriOk(s, 0);
    s = scopriOk(s, 1);
    expect(s.squadraDiTurno).toBe("rosso");
    s = scopriOk(s, 2);
    expect(s.squadraDiTurno).toBe("blu");
    expect(s.indizio).toBeNull();
  });

  it("CA-07 con N=1 dopo 2 scoperte corrette il turno finisce", () => {
    let s = scopriOk(conIndizio(1), 0);
    expect(s.squadraDiTurno).toBe("rosso");
    s = scopriOk(s, 1);
    expect(s.squadraDiTurno).toBe("blu");
  });

  it("CA-07 con 0 non c'e' limite finche' le scoperte sono corrette", () => {
    let s = conIndizio(0);
    for (let i = 0; i < 8; i++) s = scopriOk(s, i);
    expect(s.squadraDiTurno).toBe("rosso");
    expect(s.vincitore).toBeNull();
  });

  it("CA-08 scoprire l'assassino finisce la partita: perde chi l'ha scoperto", () => {
    const s = scopriOk(conIndizio(2), 24);
    expect(s.vincitore).toBe("blu");
    expect(s.motivo).toBe("assassino");
    expect(scopri(s, 0, agenteRosso).ok).toBe(false);
  });

  it("CA-08 vale anche per la squadra blu", () => {
    const passato = scopriOk(conIndizio(1), 17);
    const r = daiIndizio(passato, { parola: "cielo", numero: 1 }, spiaBlu);
    if (!r.ok) throw new Error(r.motivo);
    const s = scopriOk(r.stato, 24, agenteBlu);
    expect(s.vincitore).toBe("rosso");
  });

  it("CA-09 scoperte tutte le carte della squadra, vince", () => {
    let s = conIndizio(0);
    for (let i = 0; i < 9; i++) s = scopriOk(s, i);
    expect(s.vincitore).toBe("rosso");
    expect(s.motivo).toBe("completata");
  });

  it("CA-09 se si scopre l'ultima carta avversaria vince l'avversario", () => {
    let s = conIndizio(0);
    // prepara: tutte le blu tranne una gia' scoperte
    const pl = s.plancia.map((c, i) => (i >= 9 && i < 16 ? { ...c, scoperta: true } : c));
    s = { ...s, plancia: pl };
    s = scopriOk(s, 16);
    expect(s.vincitore).toBe("blu");
    expect(s.motivo).toBe("completata");
  });

  it("CA-10 una carta gia' scoperta non si scopre di nuovo", () => {
    const s = scopriOk(conIndizio(3), 0);
    const r = scopri(s, 0, agenteRosso);
    expect(r.ok).toBe(false);
  });

  it("CA-10 indice inesistente rifiutato senza eccezioni", () => {
    const s = conIndizio(3);
    for (const i of [-1, 25, 1.5, NaN]) expect(scopri(s, i, agenteRosso).ok).toBe(false);
  });

  it("CA-05 scopri non muta lo stato di partenza", () => {
    const s = conIndizio(3);
    const copia = JSON.parse(JSON.stringify(s));
    scopriOk(s, 0);
    expect(s).toEqual(copia);
  });
});

describe("terminaTurno", () => {
  it("CA-32 e' rifiutato prima della prima scoperta", () => {
    expect(terminaTurno(conIndizio(2)).ok).toBe(false);
    expect(terminaTurno(creaStato(plancia())).ok).toBe(false);
  });

  it("CA-32 dopo una scoperta passa il turno", () => {
    const r = terminaTurno(scopriOk(conIndizio(3), 0));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.stato.squadraDiTurno).toBe("blu");
      expect(r.stato.indizio).toBeNull();
    }
  });
});

describe("vistaPer", () => {
  const s = scopriOk(conIndizio(3), 0);

  it("CA-11 la Spia vede i colori di tutte le carte", () => {
    const v = vistaPer(s, spiaBlu);
    expect(v).toHaveLength(25);
    expect(v.every((c) => c.colore !== null)).toBe(true);
    expect(v[24].colore).toBe("assassino");
  });

  it("CA-11 un Agente vede solo i colori delle carte scoperte", () => {
    const v = vistaPer(s, agenteRosso);
    expect(v[0].colore).toBe("rosso");
    expect(v.filter((c) => c.colore !== null)).toHaveLength(1);
    expect(JSON.stringify(v)).not.toContain("assassino");
  });

  it("CA-11 chi non ha ruolo non vede colori nascosti", () => {
    const v = vistaPer(s, g("x", null, null));
    expect(v.filter((c) => c.colore !== null)).toHaveLength(1);
  });
});

describe("puoIniziare", () => {
  const base = [
    g("1", "rosso", "spia"),
    g("2", "rosso", "agente"),
    g("3", "blu", "spia"),
    g("4", "blu", "agente"),
  ];

  it("CA-13 accetta 4 giocatori con spia e agente per squadra", () => {
    expect(puoIniziare(base)).toEqual({ ok: true });
  });

  it("CA-13 rifiuta meno di 4 o piu' di 10 giocatori", () => {
    expect(puoIniziare(base.slice(0, 3)).ok).toBe(false);
    const dieci = [...base];
    for (let i = 5; i <= 10; i++) dieci.push(g(String(i), i % 2 ? "rosso" : "blu", "agente"));
    expect(puoIniziare(dieci)).toEqual({ ok: true });
    expect(puoIniziare([...dieci, g("11", "rosso", "agente")]).ok).toBe(false);
  });

  it("CA-13 rifiuta una squadra senza Spia o senza Agente", () => {
    const senzaSpia = [...base.slice(0, 2), g("3", "blu", "agente"), g("4", "blu", "agente")];
    expect(puoIniziare(senzaSpia).ok).toBe(false);
    const senzaAgente = [g("1", "rosso", "spia"), g("2", "rosso", "spia"), base[2], base[3]];
    expect(puoIniziare(senzaAgente).ok).toBe(false);
    const dueSpie = [...base, g("5", "rosso", "spia")];
    expect(puoIniziare(dueSpie).ok).toBe(false);
  });

  it("CA-13 con 4 giocatori rifiuta una squadra con 0 Agenti", () => {
    const zeroAgenti = [
      g("1", "rosso", "spia"),
      g("2", "blu", "spia"),
      g("3", "blu", "agente"),
      g("4", "blu", "agente"),
    ];
    expect(puoIniziare(zeroAgenti).ok).toBe(false);
  });

  const squadre = (agentiPerSquadra: number, rosso = agentiPerSquadra, blu = agentiPerSquadra) => {
    const l = [g("r0", "rosso", "spia"), g("b0", "blu", "spia")];
    for (let i = 0; i < rosso; i++) l.push(g(`r${i + 1}`, "rosso", "agente"));
    for (let i = 0; i < blu; i++) l.push(g(`b${i + 1}`, "blu", "agente"));
    return l;
  };

  it("CA-13 con 6 giocatori servono 2 Agenti per squadra", () => {
    expect(puoIniziare(squadre(1, 1, 3)).ok).toBe(false); // 6 giocatori, rosso con 1 Agente
    expect(puoIniziare(squadre(2)).ok).toBe(true); // 6 giocatori, 2+2
  });

  it("CA-13 con 8 giocatori servono 3 Agenti per squadra", () => {
    expect(puoIniziare(squadre(2, 4, 2)).ok).toBe(false); // 8 giocatori, blu con 2
    expect(puoIniziare(squadre(3)).ok).toBe(true); // 8 giocatori, 3+3
  });

  it("CA-13 con 5 giocatori basta 1 Agente per squadra", () => {
    expect(puoIniziare(squadre(1, 2, 1)).ok).toBe(true);
  });

  it("CA-13 rifiuta giocatori senza squadra o ruolo", () => {
    expect(puoIniziare([...base.slice(0, 3), g("4", null, null)]).ok).toBe(false);
  });
});
