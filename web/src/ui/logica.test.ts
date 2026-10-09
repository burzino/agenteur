import { describe, expect, it } from "vitest";
import type { VistaCarta } from "../gioco/modelli";
import { codiceCompleto, costruisciGriglia, normalizzaCodice } from "./logica";
import { riempi, t } from "./testi";

describe("testi", () => {
  it("CA-36: ogni chiave ha un valore non vuoto", () => {
    for (const [chiave, valore] of Object.entries(t)) {
      expect(typeof valore, chiave).toBe("string");
      expect(valore.trim().length, chiave).toBeGreaterThan(0);
    }
  });
  it("riempi sostituisce i segnaposto e lascia quelli ignoti", () => {
    expect(riempi("a {x} b {y}", { x: 1 })).toBe("a 1 b {y}");
  });
});

describe("codice di partita", () => {
  it("CA-30: sotto i 6 caratteri non e' completo", () => {
    expect(codiceCompleto("ABC23")).toBe(false);
    expect(codiceCompleto("")).toBe(false);
    expect(codiceCompleto("ABC234")).toBe(true);
  });
  it("normalizza maiuscole, simboli e lunghezza", () => {
    expect(normalizzaCodice(" ab-c2 34xyz ")).toBe("ABC234");
  });
});

describe("costruisciGriglia", () => {
  const vista: VistaCarta[] = [
    { parola: "Gatto", scoperta: false, colore: "rosso" },
    { parola: "Cane", scoperta: true, colore: "blu" },
    { parola: "Sole", scoperta: false, colore: null },
  ];
  it("la Spia vede il colore delle carte coperte come suggerimento", () => {
    const g = costruisciGriglia(vista, true);
    expect(g[0]).toMatchObject({ stile: "rosso", suggerito: true, scoperta: false });
    expect(g[1]).toMatchObject({ stile: "blu", suggerito: false, scoperta: true });
    expect(g[2]).toMatchObject({ stile: null, suggerito: false });
  });
  it("l'Agente vede solo i colori delle carte scoperte", () => {
    const g = costruisciGriglia(
      [{ parola: "Gatto", scoperta: false, colore: "rosso" }, vista[1]],
      false,
    );
    expect(g[0].stile).toBeNull();
    expect(g[1].stile).toBe("blu");
  });
  it("mantiene l'indice della carta", () => {
    expect(costruisciGriglia(vista, false).map((c) => c.indice)).toEqual([0, 1, 2]);
  });
});
