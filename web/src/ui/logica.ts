// Logica pura dell'interfaccia (testabile in Node, senza Svelte).
import type { Colore, Ruolo, Squadra, VistaCarta } from "../gioco/modelli";
import { riempi, t } from "./testi";

export const LUNGHEZZA_CODICE = 6;

/** Maiuscole, solo lettere e cifre, al massimo 6 caratteri. */
export function normalizzaCodice(s: string): string {
  return s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, LUNGHEZZA_CODICE);
}

/** CA-30: un codice di lunghezza diversa da 6 non si invia. */
export function codiceCompleto(s: string): boolean {
  return normalizzaCodice(s).length === LUNGHEZZA_CODICE;
}

/** Descrizione di una carta per la griglia. `stile` e' il colore da mostrare, o null se nascosto. */
export interface CartaGriglia {
  indice: number;
  parola: string;
  scoperta: boolean;
  /** Colore visibile a questo giocatore (null: carta senza colore). */
  stile: Colore | null;
  /** True per la Spia su carta non ancora scoperta: tinta leggera con icona. */
  suggerito: boolean;
  etichettaAria: string;
}

const NOME_COLORE: Record<Colore, string> = {
  rosso: t.coloreRosso,
  blu: t.coloreBlu,
  neutrale: t.coloreNeutrale,
  assassino: t.coloreAssassino,
};

/** Costruisce la prop della griglia da una vista: l'Agente non vede mai un colore che la vista non contiene. */
export function costruisciGriglia(vista: VistaCarta[], ePiaSpia: boolean): CartaGriglia[] {
  return vista.map((c, indice) => {
    const colore = c.colore;
    const visibile = colore !== null && (c.scoperta || ePiaSpia);
    let etichettaAria: string;
    if (c.scoperta && colore !== null) {
      etichettaAria = riempi(t.planciaCartaScoperta, { parola: c.parola, colore: NOME_COLORE[colore] });
    } else if (visibile && colore !== null) {
      etichettaAria = riempi(t.planciaCartaSpia, { parola: c.parola, colore: NOME_COLORE[colore] });
    } else {
      etichettaAria = riempi(t.planciaCartaNascosta, { parola: c.parola });
    }
    return {
      indice,
      parola: c.parola,
      scoperta: c.scoperta,
      stile: visibile ? colore : null,
      suggerito: visibile && !c.scoperta,
      etichettaAria,
    };
  });
}

/** Fine partita: unisce le carte della vista con i colori finali (CA-23); senza `finali` restano quelli della vista. */
export function carteConColori(carte: VistaCarta[], finali: Colore[] | undefined): VistaCarta[] {
  return carte.map((c, i) => ({ ...c, colore: finali?.[i] ?? c.colore }));
}

export function nomeRuolo(r: Ruolo): string {
  return r === "spia" ? t.ruoloSpia : t.ruoloAgente;
}

/** Descrizione del posto di un giocatore, es. "Rossa · Spia", o "Senza posto". */
export function descriviPosto(squadra: Squadra | null, ruolo: Ruolo | null): string {
  if (squadra === null || ruolo === null) return t.senzaPosto;
  return riempi(t.squadraRuolo, { squadra: nomeSquadra(squadra), ruolo: nomeRuolo(ruolo) });
}

export function nomeSquadra(s: Squadra): string {
  return s === "rosso" ? t.squadraRossa : t.squadraBlu;
}
