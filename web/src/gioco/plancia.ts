import { interoCasuale, type Casuale } from "./casuale";
import type { Colore, Plancia, Squadra } from "./modelli";

export const DIMENSIONE_PLANCIA = 25;

/** Minuscolo e senza accenti, per confrontare parole. */
export function normalizza(s: string): string {
  return s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

function mescola<T>(elementi: readonly T[], casuale: Casuale): T[] {
  const copia = [...elementi];
  for (let i = copia.length - 1; i > 0; i--) {
    const j = interoCasuale(casuale, i + 1);
    [copia[i], copia[j]] = [copia[j], copia[i]];
  }
  return copia;
}

/** Squadra che inizia = quella con 9 carte. */
export function squadraIniziale(plancia: Plancia): Squadra {
  const rosse = plancia.filter((c) => c.colore === "rosso").length;
  return rosse === 9 ? "rosso" : "blu";
}

/** Sceglie 25 parole distinte e assegna i colori (9 + 8 + 7 + 1). */
export function creaPlancia(parole: string[], casuale: Casuale): Plancia {
  const distinte = [...new Map(parole.map((p) => [normalizza(p), p])).values()];
  if (distinte.length < DIMENSIONE_PLANCIA) {
    throw new Error("servono almeno 25 parole distinte");
  }
  const scelte = mescola(distinte, casuale).slice(0, DIMENSIONE_PLANCIA);
  const inizia: Squadra = casuale() < 0.5 ? "rosso" : "blu";
  const altra: Squadra = inizia === "rosso" ? "blu" : "rosso";
  const colori: Colore[] = [
    ...Array<Colore>(9).fill(inizia),
    ...Array<Colore>(8).fill(altra),
    ...Array<Colore>(7).fill("neutrale"),
    "assassino",
  ];
  const mescolati = mescola(colori, casuale);
  return scelte.map((parola, i) => ({ parola, colore: mescolati[i], scoperta: false }));
}
