import { describe, expect, it } from "vitest";
import parole from "../data/parole.json";
import { casualeDaSeme } from "./casuale";
import { creaPlancia, normalizza, squadraIniziale } from "./plancia";

describe("parole.json", () => {
  it("CA-01 contiene almeno 400 parole distinte, minuscole, senza accenti, 3-12 lettere", () => {
    expect(parole.length).toBeGreaterThanOrEqual(400);
    expect(new Set(parole).size).toBe(parole.length);
    for (const p of parole) expect(p).toMatch(/^[a-z]{3,12}$/);
  });
});

describe("creaPlancia", () => {
  it("CA-01 ha 25 parole distinte tratte da parole.json", () => {
    const plancia = creaPlancia(parole, casualeDaSeme(1));
    expect(plancia).toHaveLength(25);
    expect(new Set(plancia.map((c) => c.parola)).size).toBe(25);
    for (const c of plancia) {
      expect(parole).toContain(c.parola);
      expect(c.scoperta).toBe(false);
    }
  });

  it("CA-01 con lo stesso generatore il risultato e' deterministico", () => {
    expect(creaPlancia(parole, casualeDaSeme(42))).toEqual(creaPlancia(parole, casualeDaSeme(42)));
    expect(creaPlancia(parole, casualeDaSeme(42))).not.toEqual(creaPlancia(parole, casualeDaSeme(43)));
  });

  it("CA-01 non muta l'array delle parole", () => {
    const copia = [...parole];
    creaPlancia(parole, casualeDaSeme(3));
    expect(parole).toEqual(copia);
  });

  it("CA-02 i colori sono 9 + 8 + 7 + 1 e la squadra con 9 carte inizia", () => {
    const viste = new Set<string>();
    for (let seme = 1; seme <= 40; seme++) {
      const plancia = creaPlancia(parole, casualeDaSeme(seme));
      const conta = (col: string) => plancia.filter((c) => c.colore === col).length;
      const rosse = conta("rosso");
      const blu = conta("blu");
      expect(rosse + blu + conta("neutrale") + conta("assassino")).toBe(25);
      expect(conta("neutrale")).toBe(7);
      expect(conta("assassino")).toBe(1);
      expect([rosse, blu].sort()).toEqual([8, 9]);
      expect(squadraIniziale(plancia)).toBe(rosse === 9 ? "rosso" : "blu");
      viste.add(squadraIniziale(plancia));
    }
    // la squadra iniziale e' casuale: nei 40 tentativi escono entrambe
    expect(viste.size).toBe(2);
  });

  it("CA-02 rifiuta (con errore) meno di 25 parole distinte", () => {
    expect(() => creaPlancia(["a", "b", "a"], casualeDaSeme(1))).toThrow();
  });
});

describe("normalizza", () => {
  it("CA-03 ignora maiuscole e accenti", () => {
    expect(normalizza("CittÀ")).toBe("citta");
    expect(normalizza("  Perche ")).toBe("perche");
    expect(normalizza("caffè")).toBe("caffe");
  });
});
