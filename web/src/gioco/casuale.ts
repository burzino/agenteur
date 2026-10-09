/** Generatore iniettabile: restituisce un numero in [0,1). */
export type Casuale = () => number;

export const ALFABETO_CHIAVE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const LUNGHEZZA_CHIAVE = 6;

/** Generatore di produzione. */
export const casualeDefault: Casuale = () => Math.random();

/** Generatore deterministico (mulberry32), utile per test e per riprodurre una plancia. */
export function casualeDaSeme(seme: number): Casuale {
  let s = seme >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Intero in [0, n). */
export function interoCasuale(casuale: Casuale, n: number): number {
  return Math.min(n - 1, Math.floor(casuale() * n));
}

/** Chiave di partita: 6 caratteri dall'alfabeto senza 0, O, 1, I, L. */
export function generaChiavePartita(casuale: Casuale): string {
  let chiave = "";
  for (let i = 0; i < LUNGHEZZA_CHIAVE; i++) {
    chiave += ALFABETO_CHIAVE[interoCasuale(casuale, ALFABETO_CHIAVE.length)];
  }
  return chiave;
}
