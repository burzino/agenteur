// Tipi del dominio di Agenteur. TypeScript puro: nessuna dipendenza da UI o rete.

export type Squadra = "rosso" | "blu";
export type Colore = Squadra | "neutrale" | "assassino";
export type Ruolo = "spia" | "agente";

export interface Carta {
  parola: string;
  colore: Colore;
  scoperta: boolean;
}

/** 25 carte (griglia 5x5, in ordine di riga). */
export type Plancia = Carta[];

export interface Indizio {
  parola: string;
  numero: number;
}

export type MotivoFine = "completata" | "assassino";

export interface Stato {
  plancia: Plancia;
  squadraDiTurno: Squadra;
  /** Indizio del turno in corso; null finche' la Spia non lo da'. */
  indizio: Indizio | null;
  /** Carte scoperte nel turno corrente. */
  scopertiNelTurno: number;
  vincitore: Squadra | null;
  motivo: MotivoFine | null;
}

export interface Giocatore {
  id: string;
  nome: string;
  squadra: Squadra | null;
  ruolo: Ruolo | null;
}

/** Carta come la vede un giocatore: il colore e' null se nascosto. */
export interface VistaCarta {
  parola: string;
  scoperta: boolean;
  colore: Colore | null;
}

export type Esito = { ok: true } | { ok: false; motivo: string };
export type EsitoStato = { ok: true; stato: Stato } | { ok: false; motivo: string };
