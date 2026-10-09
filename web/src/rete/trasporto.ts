// Trasporto PeerJS (D1). Nessuna logica di gioco; non coperto da test.
import { Peer } from "peerjs";
import type { DataConnection } from "peerjs";

export interface Trasporto {
  /** Host: `a` e' l'id della connessione. Guest: `a` e' ignorato (c'e' solo l'host). */
  invia(a: string, messaggio: unknown): void;
  chiudi(): void;
}

const PREFISSO = "agenteur-";
const CHIAVE_SESSIONE = "agenteur-sessione";

export interface Sessione {
  codice: string;
  token: string;
  idGiocatore: string;
}

export function salvaSessione(s: Sessione): void {
  try {
    localStorage.setItem(CHIAVE_SESSIONE, JSON.stringify(s));
  } catch {
    /* storage non disponibile: si perde solo la riconnessione */
  }
}

export function leggiSessione(): Sessione | null {
  try {
    const grezzo = localStorage.getItem(CHIAVE_SESSIONE);
    if (!grezzo) return null;
    const s = JSON.parse(grezzo) as Partial<Sessione>;
    if (typeof s.codice === "string" && typeof s.token === "string" && typeof s.idGiocatore === "string") {
      return { codice: s.codice, token: s.token, idGiocatore: s.idGiocatore };
    }
  } catch {
    /* ignora */
  }
  return null;
}

export function cancellaSessione(): void {
  try {
    localStorage.removeItem(CHIAVE_SESSIONE);
  } catch {
    /* ignora */
  }
}

/** Host: registra `agenteur-<CODICE>` e accetta connessioni. */
export function apriStanza(
  codice: string,
  alMessaggio: (idConnessione: string, grezzo: unknown) => void,
  allaCaduta: (idConnessione: string) => void,
): Promise<Trasporto> {
  return new Promise((resolve, reject) => {
    const peer = new Peer(PREFISSO + codice);
    const conns = new Map<string, DataConnection>();
    let aperto = false;
    peer.on("error", (e) => {
      if (aperto) return;
      peer.destroy(); // registrazione fallita: non lasciare il peer a riprovare in background
      reject(e);
    });
    peer.on("connection", (conn) => {
      conns.set(conn.connectionId, conn);
      conn.on("data", (d) => alMessaggio(conn.connectionId, d));
      const cade = () => {
        if (conns.delete(conn.connectionId)) allaCaduta(conn.connectionId);
      };
      conn.on("close", cade);
      conn.on("error", cade);
    });
    peer.on("open", () => {
      aperto = true;
      resolve({
        invia: (a, messaggio) => conns.get(a)?.send(messaggio),
        chiudi: () => peer.destroy(),
      });
    });
  });
}

/** Guest: si collega a `agenteur-<CODICE>`. */
export function connettiAStanza(
  codice: string,
  alMessaggio: (grezzo: unknown) => void,
  allaCaduta: () => void,
): Promise<Trasporto> {
  return new Promise((resolve, reject) => {
    const peer = new Peer();
    let collegato = false;
    peer.on("error", (e) => {
      if (collegato) return;
      peer.destroy();
      reject(e);
    });
    peer.on("open", () => {
      const conn = peer.connect(PREFISSO + codice, { reliable: true });
      conn.on("data", alMessaggio);
      conn.on("close", allaCaduta);
      conn.on("open", () => {
        collegato = true;
        resolve({
          invia: (_a, messaggio) => conn.send(messaggio),
          chiudi: () => peer.destroy(),
        });
      });
    });
  });
}
