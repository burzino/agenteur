// CA-20: validazione dei messaggi in ingresso. Non lancia mai.
import type { MessaggioGuest, MessaggioHost, VistaGiocatore } from "./contratto";

export const MAX_NOME = 20;
const MAX_TOKEN = 64;

export type EsitoValidazione =
  | { ok: true; messaggio: MessaggioGuest }
  | { ok: false; motivo: string };

const no = (motivo: string): EsitoValidazione => ({ ok: false, motivo });

function intero(v: unknown, min: number, max: number): v is number {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
}

export function validaMessaggio(grezzo: unknown): EsitoValidazione {
  try {
    if (typeof grezzo !== "object" || grezzo === null || Array.isArray(grezzo)) {
      return no("Il messaggio non e' un oggetto.");
    }
    const m = grezzo as Record<string, unknown>;
    switch (m.tipo) {
      case "unisciti": {
        if (typeof m.nome !== "string") return no("Nome mancante.");
        const nome = m.nome.trim();
        if (nome === "" || nome.length > MAX_NOME) return no("Nome non valido.");
        if (m.token === undefined) return { ok: true, messaggio: { tipo: "unisciti", nome } };
        if (typeof m.token !== "string" || m.token.length > MAX_TOKEN) return no("Token non valido.");
        return { ok: true, messaggio: { tipo: "unisciti", nome, token: m.token } };
      }
      case "scegli":
        if (m.squadra !== "rosso" && m.squadra !== "blu") return no("Squadra non valida.");
        if (m.ruolo !== "spia" && m.ruolo !== "agente") return no("Ruolo non valido.");
        return { ok: true, messaggio: { tipo: "scegli", squadra: m.squadra, ruolo: m.ruolo } };
      case "esci":
      case "terminaTurno":
      case "nuovaPartita":
        return { ok: true, messaggio: { tipo: m.tipo } };
      case "indizio":
        if (typeof m.parola !== "string") return no("Parola mancante.");
        if (!intero(m.numero, 0, 9)) return no("Numero non valido.");
        return { ok: true, messaggio: { tipo: "indizio", parola: m.parola, numero: m.numero } };
      case "scopri":
        if (!intero(m.indice, 0, 24)) return no("Indice non valido.");
        return { ok: true, messaggio: { tipo: "scopri", indice: m.indice } };
      default:
        return no("Tipo di messaggio sconosciuto.");
    }
  } catch {
    return no("Messaggio illeggibile.");
  }
}

/** Lato guest: accetta solo messaggi dell'host ben formati; altrimenti null (scartato, non lancia). */
export function validaMessaggioHost(grezzo: unknown): MessaggioHost | null {
  try {
    if (typeof grezzo !== "object" || grezzo === null || Array.isArray(grezzo)) return null;
    const m = grezzo as Record<string, unknown>;
    switch (m.tipo) {
      case "benvenuto":
        return typeof m.token === "string" && typeof m.idGiocatore === "string"
          ? { tipo: "benvenuto", token: m.token, idGiocatore: m.idGiocatore }
          : null;
      case "stato": {
        const v = m.vista as Partial<VistaGiocatore> | null | undefined;
        if (typeof v !== "object" || v === null) return null;
        if (typeof v.codice !== "string" || typeof v.io !== "object" || v.io === null) return null;
        if (!Array.isArray(v.giocatori)) return null;
        if (v.fase !== "lobby" && v.fase !== "partita" && v.fase !== "fine") return null;
        return { tipo: "stato", vista: v as VistaGiocatore };
      }
      case "errore":
        return typeof m.messaggio === "string" ? { tipo: "errore", messaggio: m.messaggio } : null;
      case "chiusa":
        return { tipo: "chiusa" };
      default:
        return null;
    }
  } catch {
    return null;
  }
}
