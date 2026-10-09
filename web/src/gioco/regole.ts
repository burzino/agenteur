import { normalizza, squadraIniziale } from "./plancia";
import type {
  Esito,
  EsitoStato,
  Giocatore,
  Indizio,
  Plancia,
  Squadra,
  Stato,
  VistaCarta,
} from "./modelli";

export const MAX_LUNGHEZZA_INDIZIO = 24;

export function altraSquadra(s: Squadra): Squadra {
  return s === "rosso" ? "blu" : "rosso";
}

/** Stato iniziale: inizia la squadra con 9 carte, senza indizio. */
export function creaStato(plancia: Plancia): Stato {
  return {
    plancia,
    squadraDiTurno: squadraIniziale(plancia),
    indizio: null,
    scopertiNelTurno: 0,
    vincitore: null,
    motivo: null,
  };
}

/** CA-03: controlla l'indizio rispetto alla plancia. */
export function validaIndizio(indizio: Indizio, plancia: Plancia): Esito {
  const parola = typeof indizio.parola === "string" ? indizio.parola : "";
  if (parola.trim() === "") return { ok: false, motivo: "La parola e' vuota." };
  if (/\s/.test(parola.trim())) return { ok: false, motivo: "L'indizio deve essere una sola parola." };
  if (parola.trim().length > MAX_LUNGHEZZA_INDIZIO) {
    return { ok: false, motivo: `La parola supera ${MAX_LUNGHEZZA_INDIZIO} caratteri.` };
  }
  const n = normalizza(parola);
  if (plancia.some((c) => normalizza(c.parola) === n)) {
    return { ok: false, motivo: "L'indizio e' una parola della plancia." };
  }
  const num = indizio.numero;
  if (typeof num !== "number" || !Number.isInteger(num) || num < 0 || num > 9) {
    return { ok: false, motivo: "Il numero deve essere un intero da 0 a 9." };
  }
  return { ok: true };
}

/** CA-04: l'indizio valido della Spia di turno apre il turno. */
export function daiIndizio(stato: Stato, indizio: Indizio, giocatore: Giocatore): EsitoStato {
  if (stato.vincitore) return { ok: false, motivo: "La partita e' finita." };
  if (stato.indizio) return { ok: false, motivo: "L'indizio e' gia' stato dato." };
  if (giocatore.ruolo !== "spia" || giocatore.squadra !== stato.squadraDiTurno) {
    return { ok: false, motivo: "Tocca alla Spia della squadra di turno." };
  }
  const v = validaIndizio(indizio, stato.plancia);
  if (!v.ok) return v;
  const pulito = { parola: indizio.parola.trim(), numero: indizio.numero };
  return { ok: true, stato: { ...stato, indizio: pulito, scopertiNelTurno: 0 } };
}

function passaTurno(stato: Stato): Stato {
  return { ...stato, squadraDiTurno: altraSquadra(stato.squadraDiTurno), indizio: null, scopertiNelTurno: 0 };
}

function squadraCompleta(plancia: Plancia, squadra: Squadra): boolean {
  return plancia.every((c) => c.colore !== squadra || c.scoperta);
}

/** CA-04..10: un Agente della squadra di turno scopre una carta. Funzione pura. */
export function scopri(stato: Stato, indice: number, giocatore: Giocatore): EsitoStato {
  if (stato.vincitore) return { ok: false, motivo: "La partita e' finita." };
  if (!stato.indizio) return { ok: false, motivo: "Aspetta l'indizio della Spia." };
  if (giocatore.ruolo !== "agente" || giocatore.squadra !== stato.squadraDiTurno) {
    return { ok: false, motivo: "Solo gli Agenti della squadra di turno possono scoprire." };
  }
  if (!Number.isInteger(indice) || indice < 0 || indice >= stato.plancia.length) {
    return { ok: false, motivo: "Carta inesistente." };
  }
  if (stato.plancia[indice].scoperta) return { ok: false, motivo: "Carta gia' scoperta." };

  const plancia = stato.plancia.map((c, i) => (i === indice ? { ...c, scoperta: true } : c));
  const colore = plancia[indice].colore;
  const scoperti = stato.scopertiNelTurno + 1;
  const squadra = stato.squadraDiTurno;
  const base: Stato = { ...stato, plancia, scopertiNelTurno: scoperti };

  if (colore === "assassino") {
    return { ok: true, stato: { ...base, vincitore: altraSquadra(squadra), motivo: "assassino" } };
  }
  if (colore === "rosso" || colore === "blu") {
    if (squadraCompleta(plancia, colore)) {
      return { ok: true, stato: { ...base, vincitore: colore, motivo: "completata" } };
    }
  }
  if (colore !== squadra) return { ok: true, stato: passaTurno(base) };
  // Propria carta: N >= 1 permette N+1 scoperte, 0 nessun limite.
  const numero = stato.indizio.numero;
  if (numero >= 1 && scoperti >= numero + 1) return { ok: true, stato: passaTurno(base) };
  return { ok: true, stato: base };
}

/** CA-32 (regola): il turno non si chiude prima della prima scoperta. */
export function terminaTurno(stato: Stato): EsitoStato {
  if (stato.vincitore) return { ok: false, motivo: "La partita e' finita." };
  if (!stato.indizio) return { ok: false, motivo: "Il turno non e' ancora iniziato." };
  if (stato.scopertiNelTurno < 1) {
    return { ok: false, motivo: "Scopri almeno una carta prima di terminare il turno." };
  }
  return { ok: true, stato: passaTurno(stato) };
}

/** CA-11: la Spia vede tutti i colori, gli altri solo quelli delle carte scoperte. */
export function vistaPer(stato: Stato, giocatore: Giocatore): VistaCarta[] {
  const vedeTutto = giocatore.ruolo === "spia";
  return stato.plancia.map((c) => ({
    parola: c.parola,
    scoperta: c.scoperta,
    colore: vedeTutto || c.scoperta ? c.colore : null,
  }));
}

/** CA-13: 4-10 giocatori; per squadra una Spia e almeno un Agente. */
export function puoIniziare(giocatori: Giocatore[]): Esito {
  if (giocatori.length < 4 || giocatori.length > 10) {
    return { ok: false, motivo: "Servono da 4 a 10 giocatori." };
  }
  if (giocatori.some((g) => g.squadra === null || g.ruolo === null)) {
    return { ok: false, motivo: "Tutti devono avere squadra e ruolo." };
  }
  for (const squadra of ["rosso", "blu"] as const) {
    const sq = giocatori.filter((g) => g.squadra === squadra);
    if (sq.filter((g) => g.ruolo === "spia").length !== 1) {
      return { ok: false, motivo: `La squadra ${squadra} deve avere una Spia.` };
    }
    if (!sq.some((g) => g.ruolo === "agente")) {
      return { ok: false, motivo: `La squadra ${squadra} deve avere almeno un Agente.` };
    }
  }
  return { ok: true };
}
