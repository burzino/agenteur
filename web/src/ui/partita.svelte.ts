// UNICA fonte di stato di rete dell'interfaccia. Collega le schermate a `rete/` (host autorevole, D2).
// L'host e' anche un giocatore: le sue azioni passano per `gestisci` con la connessione logica HOST,
// senza inviare nulla a se stesso. Un host "solo regia" (D4) non ha posto e vede la vista di un Agente.
import parole from "../data/parole.json";
import { casualeDefault, generaChiavePartita } from "../gioco/casuale";
import type { Giocatore, Ruolo, Squadra } from "../gioco/modelli";
import { creaPlancia } from "../gioco/plancia";
import type { MessaggioGuest, VistaGiocatore } from "../rete/contratto";
import { validaMessaggioHost } from "../rete/validazione";
import {
  assegna,
  avviaPartita,
  chiudiStanza,
  connessioneCaduta,
  creaStanza,
  gestisci,
  nuovaPartita,
  vistaDi,
  type Risultato,
  type Stanza,
} from "../rete/stanza";
import {
  apriStanza,
  cancellaSessione,
  connettiAStanza,
  leggiSessione,
  salvaSessione,
  type Trasporto,
} from "../rete/trasporto";
import { mostraToast } from "./componenti/notifiche.svelte";
import { riempi, t } from "./testi";

/** Connessione logica dell'host verso la propria stanza (mai sulla rete). */
const HOST = "host";
/** Giocatore fittizio per l'host che fa solo regia: nessun posto, vista da Agente (colori nascosti). */
const REGIA: Giocatore = { id: "regia", nome: "", squadra: null, ruolo: null };

const CHIAVE_NOME = "agenteur.nome";
const CHIAVE_HOST_ATTIVO = "agenteur.host-attivo";
const TIMEOUT_COLLEGAMENTO_MS = 15000;
const PAUSA_RIPROVA_MS = 2500;
const MAX_TENTATIVI = 8;

export type Collegamento = "inattivo" | "connessione" | "attivo";
export type Modalita = "nessuna" | "host" | "guest";

function leggiLocale(chiave: string): string | null {
  try {
    return localStorage.getItem(chiave);
  } catch {
    return null;
  }
}
function scriviLocale(chiave: string, valore: string): void {
  try {
    localStorage.setItem(chiave, valore);
  } catch {
    /* storage non disponibile */
  }
}
function rimuoviLocale(chiave: string): void {
  try {
    localStorage.removeItem(chiave);
  } catch {
    /* storage non disponibile */
  }
}

/** Tipo di errore PeerJS (`peer-unavailable`, `unavailable-id`, `network`...), o "" se non riconoscibile. */
function tipoErrore(e: unknown): string {
  if (typeof e === "object" && e !== null && "type" in e) {
    const tipo = (e as { type: unknown }).type;
    if (typeof tipo === "string") return tipo;
  }
  return "";
}

export function nomeSalvato(): string {
  return leggiLocale(CHIAVE_NOME) ?? "";
}

class Partita {
  /** Vista corrente di questo telefono (null: nessuna partita). */
  vista = $state<VistaGiocatore | null>(null);
  collegamento = $state<Collegamento>("inattivo");
  modalita = $state<Modalita>("nessuna");
  /** True per l'host che non ha un posto di gioco (D4). */
  regia = $state(false);
  /** Messaggio da mostrare in Home (partita chiusa, host irraggiungibile...). */
  avviso = $state<string | null>(null);
  /** Ultimo rifiuto dell'host a un'azione di questo giocatore (es. indizio non valido). */
  errore = $state<string | undefined>(undefined);
  /** Guest: collegamento perso, si sta riprovando con il token (D8). */
  riprovo = $state(false);

  #stanza: Stanza | null = null;
  #trasporto: Trasporto | null = null;
  #generazione = 0;
  #nome = "";
  #codice = "";
  #tentativi = 0;
  #timer: ReturnType<typeof setTimeout> | null = null;
  #inTentativo = false;
  #ascoltaVisibilita = false;

  get eHost(): boolean {
    return this.modalita === "host";
  }

  // ---------- Avvio ----------

  /** Da chiamare una volta all'avvio: l'host non sopravvive al ricaricamento, il guest si riconnette (D8). */
  riprendi(): void {
    if (!this.#ascoltaVisibilita && typeof document !== "undefined") {
      this.#ascoltaVisibilita = true;
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && this.riprovo && !this.#inTentativo) this.#riprovaSubito();
      });
    }
    if (this.collegamento !== "inattivo") return;
    if (leggiLocale(CHIAVE_HOST_ATTIVO) !== null) {
      rimuoviLocale(CHIAVE_HOST_ATTIVO);
      cancellaSessione();
      this.avviso = t.avvisoHostRicaricato;
      return;
    }
    const s = leggiSessione();
    if (!s) return;
    this.#nome = nomeSalvato() || t.nomePredefinitoGiocatore;
    this.#codice = s.codice;
    this.collegamento = "connessione";
    this.riprovo = true; // riconnessione: un fallimento di rete si riprova, host assente chiude
    void this.#collega();
  }

  // ---------- Host ----------

  async crea(nome: string): Promise<void> {
    if (this.collegamento !== "inattivo") return;
    this.avviso = null;
    this.collegamento = "connessione";
    this.#nome = nome || t.nomePredefinitoHost;
    if (nome) scriviLocale(CHIAVE_NOME, nome);
    cancellaSessione();
    const gen = ++this.#generazione;
    for (let prova = 0; prova < 3; prova++) {
      const codice = generaChiavePartita(casualeDefault);
      this.#stanza = creaStanza(codice);
      try {
        const tr = await apriStanza(
          codice,
          (conn, grezzo) => this.#daGuest(conn, grezzo),
          (conn) => this.#applica(connessioneCaduta(this.#stanzaOk(), conn)),
        );
        if (gen !== this.#generazione) {
          tr.chiudi();
          return;
        }
        this.#trasporto = tr;
        this.modalita = "host";
        scriviLocale(CHIAVE_HOST_ATTIVO, codice);
        this.#applica(gestisci(this.#stanzaOk(), HOST, { tipo: "unisciti", nome: this.#nome }));
        this.collegamento = "attivo";
        return;
      } catch (e) {
        if (gen !== this.#generazione) return;
        if (tipoErrore(e) === "unavailable-id") continue; // codice gia' in uso: se ne estrae un altro
        this.#azzera();
        mostraToast(t.erroreBroker);
        return;
      }
    }
    this.#azzera();
    mostraToast(t.erroreCodiceOccupato);
  }

  #stanzaOk(): Stanza {
    if (!this.#stanza) throw new Error("Stanza non inizializzata");
    return this.#stanza;
  }

  #daGuest(conn: string, grezzo: unknown): void {
    if (!this.#stanza) return;
    this.#applica(gestisci(this.#stanza, conn, grezzo));
  }

  /** Applica un risultato di `stanza.ts`: invia ai guest, tiene per l'host la propria vista. */
  #applica(r: Risultato): void {
    this.#stanza = r.stanza;
    for (const u of r.uscita) {
      if (u.a === HOST) {
        if (u.messaggio.tipo === "errore") this.#segnalaErrore(u.messaggio.messaggio);
        continue;
      }
      try {
        this.#trasporto?.invia(u.a, u.messaggio);
      } catch {
        /* connessione appena caduta: la gestira' il suo evento di chiusura */
      }
    }
    const st = r.stanza;
    const io = st.giocatori.find((g) => g.id === st.connessioni[HOST]);
    this.regia = io === undefined;
    this.vista = vistaDi(st, io ?? REGIA);
  }

  #segnalaErrore(messaggio: string): void {
    this.errore = messaggio;
    mostraToast(messaggio);
  }

  /** Host: gioca anche lui (con un posto) oppure fa solo regia. Solo in lobby. */
  impostaRegia(regia: boolean): void {
    if (!this.eHost || this.vista?.fase !== "lobby" || regia === this.regia) return;
    const msg: MessaggioGuest = regia ? { tipo: "esci" } : { tipo: "unisciti", nome: this.#nome };
    this.#applica(gestisci(this.#stanzaOk(), HOST, msg));
  }

  inizia(): void {
    if (!this.eHost) return;
    const r = avviaPartita(this.#stanzaOk(), creaPlancia(parole, casualeDefault));
    if ("errore" in r) {
      this.#segnalaErrore(r.errore);
      return;
    }
    this.#applica(r);
  }

  nuova(): void {
    if (!this.eHost) return;
    this.#applica(nuovaPartita(this.#stanzaOk()));
  }

  // ---------- Guest ----------

  async unisciti(codice: string, nome: string): Promise<void> {
    if (this.collegamento !== "inattivo") return;
    this.avviso = null;
    this.#nome = nome;
    scriviLocale(CHIAVE_NOME, nome);
    this.#codice = codice;
    this.#tentativi = 0;
    this.riprovo = false;
    this.collegamento = "connessione";
    await this.#collega();
  }

  /** Tenta il collegamento all'host; con `riprovo` attivo usa il token salvato e riprova su errori di rete. */
  async #collega(): Promise<void> {
    if (this.#inTentativo) return;
    this.#inTentativo = true;
    const gen = ++this.#generazione;
    const codice = this.#codice;
    try {
      const promessa = connettiAStanza(
        codice,
        (grezzo) => this.#daHost(gen, grezzo),
        () => this.#cadutaHost(gen),
      );
      // Una risoluzione tardiva (dopo timeout o annullamento) chiude il peer, non lo lascia aperto.
      promessa.then(
        (tr) => {
          if (gen !== this.#generazione) tr.chiudi();
        },
        () => undefined,
      );
      let scaduto: ReturnType<typeof setTimeout> | undefined;
      const limite = new Promise<never>((_, rifiuta) => {
        scaduto = setTimeout(() => rifiuta({ type: "timeout" }), TIMEOUT_COLLEGAMENTO_MS);
      });
      let tr: Trasporto;
      try {
        tr = await Promise.race([promessa, limite]);
      } finally {
        clearTimeout(scaduto);
      }
      if (gen !== this.#generazione) return;
      this.#trasporto = tr;
      this.modalita = "guest";
      const s = leggiSessione();
      const msg: MessaggioGuest =
        s && s.codice === codice
          ? { tipo: "unisciti", nome: this.#nome, token: s.token }
          : { tipo: "unisciti", nome: this.#nome };
      tr.invia("", msg);
    } catch (e) {
      if (gen !== this.#generazione) return;
      this.#fallitoCollegamento(tipoErrore(e));
    } finally {
      this.#inTentativo = false;
    }
  }

  #fallitoCollegamento(tipo: string): void {
    if (tipo === "peer-unavailable") {
      // L'host non esiste (piu'): codice sbagliato, oppure partita finita (D8).
      const eraRiconnessione = this.riprovo || this.vista !== null;
      this.#azzera();
      if (eraRiconnessione) this.avviso = t.avvisoHostIrraggiungibile;
      else mostraToast(t.erroreStanzaNonTrovata);
      return;
    }
    if (this.riprovo || this.vista !== null) {
      this.#programmaRiprova();
      return;
    }
    this.#azzera();
    mostraToast(t.erroreBroker);
  }

  #cadutaHost(gen: number): void {
    if (gen !== this.#generazione || this.modalita !== "guest") return;
    this.#trasporto = null;
    this.#tentativi = 0;
    this.riprovo = true;
    this.#programmaRiprova();
  }

  #programmaRiprova(): void {
    this.riprovo = true;
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#tentativi++;
    if (this.#tentativi > MAX_TENTATIVI) {
      this.#azzera();
      this.avviso = t.avvisoHostIrraggiungibile;
      return;
    }
    this.#timer = setTimeout(() => {
      this.#timer = null;
      void this.#collega();
    }, PAUSA_RIPROVA_MS);
  }

  #riprovaSubito(): void {
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
    void this.#collega();
  }

  #daHost(gen: number, grezzo: unknown): void {
    if (gen !== this.#generazione) return;
    const m = validaMessaggioHost(grezzo);
    if (!m) return;
    switch (m.tipo) {
      case "benvenuto":
        salvaSessione({ codice: this.#codice, token: m.token, idGiocatore: m.idGiocatore });
        break;
      case "stato":
        this.vista = m.vista;
        this.collegamento = "attivo";
        this.modalita = "guest";
        this.riprovo = false;
        this.#tentativi = 0;
        break;
      case "errore":
        if (this.vista === null) {
          // Rifiutato all'ingresso (partita iniziata, stanza piena): non c'e' nulla da riprovare.
          this.#azzera();
          this.avviso = riempi(t.avvisoRifiutato, { motivo: m.messaggio });
        } else {
          this.#segnalaErrore(m.messaggio);
        }
        break;
      case "chiusa":
        this.#azzera();
        this.avviso = t.avvisoHostChiuso;
        break;
    }
  }

  // ---------- Azioni di gioco (host e guest) ----------

  #azione(m: MessaggioGuest): void {
    this.errore = undefined;
    if (this.eHost) {
      this.#applica(gestisci(this.#stanzaOk(), HOST, m));
    } else {
      this.#trasporto?.invia("", m);
    }
  }

  scopri(indice: number): void {
    this.#azione({ tipo: "scopri", indice });
  }

  indizio(parola: string, numero: number): void {
    this.#azione({ tipo: "indizio", parola, numero });
  }

  terminaTurno(): void {
    this.#azione({ tipo: "terminaTurno" });
  }

  /** Lobby: l'host sposta chiunque; un guest sposta solo se stesso. */
  scegli(idGiocatore: string, squadra: Squadra, ruolo: Ruolo): void {
    if (this.eHost) {
      const r = assegna(this.#stanzaOk(), idGiocatore, squadra, ruolo);
      if ("errore" in r) this.#segnalaErrore(r.errore);
      else this.#applica(r);
    } else if (this.vista && idGiocatore === this.vista.io.id) {
      this.#azione({ tipo: "scegli", squadra, ruolo });
    }
  }

  // ---------- Uscita ----------

  /** Esce dalla partita. L'host la chiude per tutti. */
  esci(): void {
    if (this.eHost && this.#stanza) {
      for (const u of chiudiStanza(this.#stanza)) {
        try {
          this.#trasporto?.invia(u.a, u.messaggio);
        } catch {
          /* ignora */
        }
      }
      this.#azzera(300);
    } else {
      if (this.modalita === "guest") {
        try {
          this.#trasporto?.invia("", { tipo: "esci" });
        } catch {
          /* ignora */
        }
      }
      this.#azzera(300);
    }
  }

  /** Torna allo stato iniziale. `ritardoChiusuraMs` lascia partire gli ultimi messaggi prima di distruggere il peer. */
  #azzera(ritardoChiusuraMs = 0): void {
    this.#generazione++;
    if (this.#timer !== null) clearTimeout(this.#timer);
    this.#timer = null;
    const tr = this.#trasporto;
    this.#trasporto = null;
    if (tr) {
      if (ritardoChiusuraMs > 0) setTimeout(() => tr.chiudi(), ritardoChiusuraMs);
      else tr.chiudi();
    }
    this.#stanza = null;
    this.#inTentativo = false;
    this.#tentativi = 0;
    this.vista = null;
    this.collegamento = "inattivo";
    this.modalita = "nessuna";
    this.regia = false;
    this.riprovo = false;
    this.errore = undefined;
    cancellaSessione();
    rimuoviLocale(CHIAVE_HOST_ATTIVO);
  }

  /** Annulla un collegamento in corso (schermata "Mi collego..."). */
  annulla(): void {
    this.#azzera();
  }

  cancellaAvviso(): void {
    this.avviso = null;
  }
}

export const partita = new Partita();
