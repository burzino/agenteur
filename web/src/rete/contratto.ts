// Contratto dei messaggi tra peer (docs/specifiche.md §4). Tipi puri.
import type { Colore, Indizio, MotivoFine, Ruolo, Squadra, VistaCarta } from "../gioco/modelli";

// Guest -> host
export interface MsgUnisciti { tipo: "unisciti"; nome: string; token?: string }
export interface MsgScegli { tipo: "scegli"; squadra: Squadra; ruolo: Ruolo }
export interface MsgEsci { tipo: "esci" }
export interface MsgIndizio { tipo: "indizio"; parola: string; numero: number }
export interface MsgScopri { tipo: "scopri"; indice: number }
export interface MsgTerminaTurno { tipo: "terminaTurno" }
export interface MsgNuovaPartita { tipo: "nuovaPartita" }

export type MessaggioGuest =
  | MsgUnisciti
  | MsgScegli
  | MsgEsci
  | MsgIndizio
  | MsgScopri
  | MsgTerminaTurno
  | MsgNuovaPartita;

/** Elenco pubblico dei giocatori (nessun token). */
export interface GiocatoreVista {
  id: string;
  nome: string;
  squadra: Squadra | null;
  ruolo: Ruolo | null;
  connesso: boolean;
}

export type Fase = "lobby" | "partita" | "fine";

/** Vista calcolata dall'host per un singolo destinatario (via `vistaPer`). */
export interface VistaGiocatore {
  codice: string;
  io: { id: string; squadra: Squadra | null; ruolo: Ruolo | null };
  giocatori: GiocatoreVista[];
  fase: Fase;
  /** null in lobby. Il colore e' null per le carte nascoste a chi non e' Spia. */
  carte: VistaCarta[] | null;
  squadraDiTurno: Squadra | null;
  indizio: Indizio | null;
  scopertiNelTurno: number;
  vincitore: Squadra | null;
  motivo: MotivoFine | null;
  /** Carte non scoperte per squadra (conteggio pubblico, non rivela le posizioni). null in lobby. */
  rimaste: Record<Squadra, number> | null;
  /**
   * Colori di tutte le 25 carte, in ordine di plancia. Presente SOLO quando la fase e' `fine` (CA-23):
   * prima, la chiave della plancia non arriva a chi non e' Spia.
   */
  carteFinali?: Colore[];
}

// Host -> guest
export interface MsgBenvenuto { tipo: "benvenuto"; token: string; idGiocatore: string }
export interface MsgStato { tipo: "stato"; vista: VistaGiocatore }
export interface MsgErrore { tipo: "errore"; messaggio: string }
export interface MsgChiusa { tipo: "chiusa" }

export type MessaggioHost = MsgBenvenuto | MsgStato | MsgErrore | MsgChiusa;
