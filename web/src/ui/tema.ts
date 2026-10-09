// Tema dell'interfaccia (CA-35): stessa logica di Imposteur, chiave di archiviazione propria.
export type Tema = "SISTEMA" | "CHIARO" | "SCURO" | "ALTO_CONTRASTO";

export const TEMI: readonly Tema[] = ["SISTEMA", "CHIARO", "SCURO", "ALTO_CONTRASTO"];
export const CHIAVE_ASPETTO = "agenteur.aspetto";

const VALORE_ATTRIBUTO: Record<Tema, string> = {
  SISTEMA: "sistema",
  CHIARO: "chiaro",
  SCURO: "scuro",
  ALTO_CONTRASTO: "alto-contrasto",
};

/** Legge il tema salvato (JSON `{ tema }`); qualunque anomalia -> SISTEMA. */
export function leggiTema(): Tema {
  try {
    const grezzo = localStorage.getItem(CHIAVE_ASPETTO);
    if (!grezzo) return "SISTEMA";
    const o = JSON.parse(grezzo) as { tema?: unknown };
    return TEMI.find((x) => x === o.tema) ?? "SISTEMA";
  } catch {
    return "SISTEMA";
  }
}

export function salvaTema(tema: Tema): void {
  try {
    localStorage.setItem(CHIAVE_ASPETTO, JSON.stringify({ tema }));
  } catch {
    /* storage non disponibile: il tema vale solo per questa sessione */
  }
}

function aggiornaMeta(): void {
  const meta = document.querySelector('meta[name="theme-color"]');
  const colore = getComputedStyle(document.documentElement).getPropertyValue("--colore-sfondo").trim();
  if (meta && colore) meta.setAttribute("content", colore);
}

let ascoltoSistema = false;
let temaCorrente: Tema = "SISTEMA";

/** Imposta `data-tema` su <html> e allinea `<meta name="theme-color">` allo sfondo risolto. No-op senza DOM. */
export function applicaTema(tema: Tema): void {
  try {
    if (typeof document === "undefined") return;
    temaCorrente = tema;
    document.documentElement.setAttribute("data-tema", VALORE_ATTRIBUTO[tema]);
    aggiornaMeta();
    if (!ascoltoSistema && typeof matchMedia === "function") {
      ascoltoSistema = true;
      matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
        if (temaCorrente === "SISTEMA") aggiornaMeta();
      });
    }
  } catch {
    /* ambiente senza DOM completo: ignorato */
  }
}
